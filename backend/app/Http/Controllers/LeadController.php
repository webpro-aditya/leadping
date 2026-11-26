<?php

namespace App\Http\Controllers;

use App\Exceptions\AIProviderException;
use App\Http\Requests\GenerateOutreachRequest;
use App\Http\Requests\StoreLeadRequest;
use App\Http\Requests\UpdateLeadRequest;
use App\Models\Company;
use App\Models\Lead;
use App\Models\OutreachMessage;
use App\Models\User;
use App\Services\AI\AIManager;
use App\Services\LeadScoringService;
use App\Services\UsageService;
use App\Traits\ApiResponse;
use Exception;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected AIManager $aiManager,
        protected LeadScoringService $scoringService,
        protected UsageService $usageService
    ) {}

    /**
     * Display a paginated listing of leads with filters.
     */
    public function index(Request $request): JsonResponse
    {
        $relations = $request->boolean('compact')
            ? ['company:id,name,website,industry,location,company_size']
            : ['company', 'signals', 'painPoints', 'opportunities'];

        $query = $this->buildFilteredLeadsQuery($request->user(), $request)
            ->with($relations);

        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $leads = $query->paginate($perPage);

        return $this->successResponse($leads, 'Leads retrieved successfully');
    }

    /**
     * Return SQL-aggregated lead potential counters without loading full lead lists.
     */
    public function stats(Request $request): JsonResponse
    {
        $row = Lead::where('user_id', $request->user()->id)
            ->selectRaw('
                COUNT(*) as total,
                COALESCE(SUM(CASE WHEN icp_score >= 80 THEN 1 ELSE 0 END), 0) as high_potential,
                COALESCE(SUM(CASE WHEN icp_score >= 50 AND icp_score < 80 THEN 1 ELSE 0 END), 0) as medium_potential,
                COALESCE(SUM(CASE WHEN icp_score < 50 THEN 1 ELSE 0 END), 0) as low_potential
            ')
            ->first();

        return $this->successResponse([
            'total' => (int) ($row->total ?? 0),
            'high_potential' => (int) ($row->high_potential ?? 0),
            'medium_potential' => (int) ($row->medium_potential ?? 0),
            'low_potential' => (int) ($row->low_potential ?? 0),
        ], 'Lead statistics retrieved successfully');
    }

    /**
     * Build a strictly user-scoped, wildcard-safe filtered leads query.
     */
    protected function buildFilteredLeadsQuery(User $user, Request $request): Builder
    {
        $query = Lead::where('user_id', $user->id);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }

        $minScore = $request->input('min_score', $request->input('score_min'));
        if ($minScore !== null && $minScore !== '') {
            $query->where('overall_score', '>=', (int) $minScore);
        }

        $maxScore = $request->input('max_score', $request->input('score_max'));
        if ($maxScore !== null && $maxScore !== '') {
            $query->where('overall_score', '<=', (int) $maxScore);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        // Escape LIKE wildcards (%, _, !) with explicit ESCAPE '!' for cross-DB (MySQL + SQLite) safety
        if ($request->filled('search')) {
            $rawSearch = Str::limit(trim((string) $request->input('search')), 100, '');
            $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $rawSearch);
            $search = "%{$escaped}%";
            $query->where(function ($q) use ($search) {
                $q->whereRaw("source_url LIKE ? ESCAPE '!'", [$search])
                    ->orWhereRaw("notes LIKE ? ESCAPE '!'", [$search])
                    ->orWhereRaw("ai_summary LIKE ? ESCAPE '!'", [$search])
                    ->orWhereHas('company', function ($cq) use ($search) {
                        $cq->whereRaw("name LIKE ? ESCAPE '!'", [$search])
                            ->orWhereRaw("website LIKE ? ESCAPE '!'", [$search])
                            ->orWhereRaw("industry LIKE ? ESCAPE '!'", [$search]);
                    });
            });
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $sortDirRaw = $request->input('sort_order', $request->input('sort_dir', 'desc'));
        $sortOrder = strtolower((string) $sortDirRaw) === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'company_name') {
            $query->orderBy(
                Company::select('name')->whereColumn('companies.id', 'leads.company_id')->limit(1),
                $sortOrder
            );
        } elseif (in_array($sortBy, ['overall_score', 'icp_score', 'buying_intent_score', 'created_at', 'status', 'priority'], true)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        return $query;
    }

    /**
     * Bulk delete multiple leads belonging strictly to the authenticated user.
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'min:1'],
        ]);

        $deletedCount = Lead::where('user_id', $request->user()->id)
            ->whereIn('id', $validated['ids'])
            ->delete();

        return $this->successResponse(
            ['deleted_count' => $deletedCount],
            'Selected leads deleted successfully'
        );
    }

    /**
     * Store a newly created lead in storage.
     */
    public function store(StoreLeadRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $lock = Cache::lock("quota_lock_{$user->id}_leads", 10);

        $lead = $lock->block(5, function () use ($user, $validated) {
            if (! $this->usageService->checkUsage($user, 'leads')) {
                return null;
            }

            return DB::transaction(function () use ($user, $validated) {
                $companyId = $validated['company_id'] ?? null;

                if (! $companyId) {
                    $compData = $validated['company'] ?? [];
                    $companyName = $validated['company_name'] ?? $compData['name'] ?? 'Target Company';
                    $website = $validated['website'] ?? $compData['website'] ?? parse_url($validated['source_url'], PHP_URL_HOST) ?? $validated['source_url'];
                    $cleanWebsite = preg_replace('/^www\./i', '', strtolower((string) $website));

                    $company = Company::firstOrCreate(
                        ['website' => $cleanWebsite],
                        [
                            'name' => $companyName,
                            'industry' => $validated['industry'] ?? $compData['industry'] ?? null,
                            'description' => $compData['description'] ?? null,
                            'location' => $validated['location'] ?? $compData['location'] ?? null,
                            'company_size' => $validated['company_size'] ?? $compData['company_size'] ?? null,
                        ]
                    );
                    $companyId = $company->id;
                }

                $rawIcp = is_array($validated['icp_score'] ?? null)
                    ? ($validated['icp_score']['overall'] ?? 70)
                    : ($validated['icp_score'] ?? 70);

                $icpScore = max(0, min(100, (int) $rawIcp));
                $buyingIntent = max(0, min(100, (int) ($validated['buying_intent_score'] ?? 70)));
                $painFit = max(0, min(100, (int) ($validated['pain_fit_score'] ?? 70)));
                $overall = max(0, min(100, (int) ($validated['overall_score'] ?? $icpScore)));
                $priority = $validated['priority'] ?? $this->scoringService->calculatePriority($overall);

                $lead = Lead::create([
                    'user_id' => $user->id,
                    'company_id' => $companyId,
                    'source_url' => $validated['source_url'],
                    'icp_score' => $icpScore,
                    'buying_intent_score' => $buyingIntent,
                    'pain_fit_score' => $painFit,
                    'overall_score' => $overall,
                    'priority' => $priority,
                    'status' => $validated['status'] ?? 'new',
                    'notes' => $validated['notes'] ?? null,
                    'ai_summary' => $validated['ai_summary'] ?? null,
                ]);

                $signals = $validated['signals'] ?? $validated['buying_signals'] ?? [];
                foreach ($signals as $sig) {
                    $lead->signals()->create([
                        'description' => $sig['description'] ?? '',
                        'confidence' => $sig['confidence'] ?? 'medium',
                        'source_url' => $sig['source_url'] ?? $lead->source_url,
                        'observed_or_inferred' => $sig['observed_or_inferred'] ?? 'observed',
                    ]);
                }

                foreach ($validated['pain_points'] ?? [] as $pp) {
                    $lead->painPoints()->create([
                        'title' => $pp['title'] ?? '',
                        'description' => $pp['description'] ?? '',
                        'confidence' => $pp['confidence'] ?? 'medium',
                        'explanation' => $pp['explanation'] ?? null,
                    ]);
                }

                foreach ($validated['opportunities'] ?? [] as $opp) {
                    $lead->opportunities()->create([
                        'title' => $opp['title'] ?? '',
                        'description' => $opp['description'] ?? '',
                        'why' => $opp['why'] ?? null,
                        'potential_solution' => $opp['potential_solution'] ?? null,
                        'priority' => $opp['priority'] ?? 'medium',
                    ]);
                }

                return $lead;
            });
        });

        if (! $lead) {
            return $this->errorResponse(
                'Lead storage limit reached for your plan. Please upgrade to save more leads.',
                Response::HTTP_PAYMENT_REQUIRED,
                ['upgrade_required' => true]
            );
        }

        return $this->successResponse(
            $lead->load(['company', 'signals', 'painPoints', 'opportunities']),
            'Lead created successfully',
            Response::HTTP_CREATED
        );
    }

    /**
     * Display the specified lead with all associated intelligence.
     */
    public function show(Request $request, Lead $lead): JsonResponse
    {
        if ($lead->user_id !== $request->user()->id) {
            return $this->errorResponse('Unauthorized access to lead', Response::HTTP_FORBIDDEN);
        }

        $lead->load([
            'company',
            'signals',
            'painPoints',
            'opportunities',
            'outreachMessages',
            'aiAnalysis',
        ]);

        return $this->successResponse($lead, 'Lead details retrieved successfully');
    }

    /**
     * Update the specified lead.
     */
    public function update(UpdateLeadRequest $request, Lead $lead): JsonResponse
    {
        if ($lead->user_id !== $request->user()->id) {
            return $this->errorResponse('Unauthorized access to lead', Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validated();
        $lead->update($validated);

        return $this->successResponse(
            $lead->load(['company', 'signals', 'painPoints', 'opportunities']),
            'Lead updated successfully'
        );
    }

    /**
     * Remove the specified lead from storage.
     */
    public function destroy(Request $request, Lead $lead): JsonResponse
    {
        if ($lead->user_id !== $request->user()->id) {
            return $this->errorResponse('Unauthorized access to lead', Response::HTTP_FORBIDDEN);
        }

        $lead->delete();

        return $this->successResponse([], 'Lead deleted successfully');
    }

    /**
     * Generate an AI outreach message for this lead.
     */
    public function outreach(GenerateOutreachRequest $request, Lead $lead): JsonResponse
    {
        $user = $request->user();

        if ($lead->user_id !== $user->id) {
            return $this->errorResponse('Unauthorized access to lead', Response::HTTP_FORBIDDEN);
        }

        $validated = $request->validated();
        $channel = $validated['channel'];
        $tone = $validated['tone'] ?? 'professional';
        $regenerate = (bool) ($validated['regenerate'] ?? false);

        // Reuse existing outreach for the same lead/channel/tone unless regeneration was requested
        if (! $regenerate) {
            $existing = OutreachMessage::where('lead_id', $lead->id)
                ->where('user_id', $user->id)
                ->where('channel', $channel)
                ->where('tone', $tone)
                ->latest()
                ->first();

            if ($existing) {
                return $this->successResponse($existing, 'Outreach message retrieved from cache');
            }
        }

        $reservedUsage = $this->usageService->reserveQuota($user, 'outreach_generation', [
            'lead_id' => $lead->id,
            'channel' => $channel,
        ]);

        if (! $reservedUsage) {
            return $this->errorResponse(
                'Outreach generation limit reached for current billing period. Please upgrade your plan.',
                Response::HTTP_PAYMENT_REQUIRED,
                ['upgrade_required' => true]
            );
        }

        $lead->load(['company', 'painPoints', 'opportunities']);

        $analysisData = [
            'company' => $this->compactCompanyData($lead->company),
            'pain_points' => $lead->painPoints->map(fn ($p) => [
                'title' => $p->title,
                'description' => $p->description,
            ])->values()->toArray(),
            'opportunities' => $lead->opportunities->map(fn ($o) => [
                'title' => $o->title,
                'potential_solution' => $o->potential_solution,
                'priority' => $o->priority,
            ])->values()->toArray(),
            'recommended_pitch' => [
                'angle' => 'Operational efficiency and growth',
                'lead_with' => $lead->ai_summary,
            ],
        ];

        try {
            $generated = $this->aiManager->generateOutreach($analysisData, $channel, $tone);

            $outreach = OutreachMessage::create([
                'lead_id' => $lead->id,
                'user_id' => $user->id,
                'channel' => $channel,
                'subject' => $generated['subject'] ?? null,
                'body' => $generated['body'] ?? '',
                'tone' => $tone,
                'ai_provider' => config('ai.default', 'openai'),
            ]);

            return $this->successResponse($outreach, 'Outreach message generated successfully');
        } catch (AIProviderException $e) {
            $this->usageService->refundQuota($reservedUsage);

            return $this->errorResponse(
                $e->getMessage(),
                $e->getStatusCode(),
                array_filter(['error_code' => $e->getErrorCode()])
            );
        } catch (Exception $e) {
            $this->usageService->refundQuota($reservedUsage);
            Log::error('LeadController outreach error', ['lead_id' => $lead->id, 'error' => $e->getMessage()]);

            return $this->errorResponse(
                config('app.debug') ? 'Failed to generate outreach message: '.$e->getMessage() : 'Failed to generate outreach message. Please try again later.',
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Re-score a lead using AI intelligence engine.
     */
    public function rescore(Request $request, Lead $lead): JsonResponse
    {
        $user = $request->user();

        if ($lead->user_id !== $user->id) {
            return $this->errorResponse('Unauthorized access to lead', Response::HTTP_FORBIDDEN);
        }

        $lead->load(['company', 'signals', 'painPoints', 'opportunities']);

        $compactLead = [
            'company' => $this->compactCompanyData($lead->company),
            'status' => $lead->status,
            'notes' => $lead->notes,
            'icp_score' => $lead->icp_score,
            'buying_intent_score' => $lead->buying_intent_score,
            'pain_fit_score' => $lead->pain_fit_score,
            'signals' => $lead->signals->map(fn ($s) => [
                'description' => $s->description,
                'confidence' => $s->confidence,
                'observed_or_inferred' => $s->observed_or_inferred,
            ])->values()->toArray(),
            'pain_points' => $lead->painPoints->map(fn ($p) => [
                'title' => $p->title,
                'confidence' => $p->confidence,
            ])->values()->toArray(),
            'opportunities' => $lead->opportunities->map(fn ($o) => [
                'title' => $o->title,
                'priority' => $o->priority,
            ])->values()->toArray(),
        ];

        try {
            $rescored = $this->aiManager->rescoreLead($compactLead);

            $this->scoringService->updateLeadScores($lead, $rescored);

            return $this->successResponse(
                $lead->fresh(['company', 'signals', 'painPoints', 'opportunities']),
                'Lead re-scored successfully'
            );
        } catch (AIProviderException $e) {
            return $this->errorResponse(
                $e->getMessage(),
                $e->getStatusCode(),
                array_filter(['error_code' => $e->getErrorCode()])
            );
        } catch (Exception $e) {
            Log::error('LeadController rescore error', ['lead_id' => $lead->id, 'error' => $e->getMessage()]);

            return $this->errorResponse(
                config('app.debug') ? 'Failed to rescore lead: '.$e->getMessage() : 'Failed to rescore lead. Please try again later.',
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Extract compact company fields (excluding raw_data and DB metadata) for AI prompts.
     */
    protected function compactCompanyData(?Company $company): array
    {
        if (! $company) {
            return [];
        }

        return [
            'name' => $company->name,
            'industry' => $company->industry,
            'description' => $company->description,
            'company_size' => $company->company_size,
            'business_model' => $company->business_model,
            'products_services' => $company->products_services ?? [],
            'target_customers' => $company->target_customers,
        ];
    }

    /**
     * Export leads as a streamed CSV file using lazy cursor iteration (O(1) memory).
     */
    public function export(Request $request): StreamedResponse
    {
        $query = $this->buildFilteredLeadsQuery($request->user(), $request)
            ->with('company:id,name,website,industry');

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="leadping_leads_'.date('Y-m-d').'.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($query) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'ID',
                'Company Name',
                'Website',
                'Industry',
                'Overall Score',
                'ICP Score',
                'Buying Intent',
                'Pain Fit',
                'Priority',
                'Status',
                'Source URL',
                'Notes',
                'AI Summary',
                'Created At',
            ]);

            foreach ($query->lazy(200) as $lead) {
                fputcsv($handle, [
                    $lead->id,
                    $this->sanitizeCsvCell($lead->company?->name ?? 'N/A'),
                    $this->sanitizeCsvCell($lead->company?->website ?? 'N/A'),
                    $this->sanitizeCsvCell($lead->company?->industry ?? 'N/A'),
                    $lead->overall_score,
                    $lead->icp_score,
                    $lead->buying_intent_score,
                    $lead->pain_fit_score,
                    $lead->priority,
                    $lead->status,
                    $this->sanitizeCsvCell($lead->source_url),
                    $this->sanitizeCsvCell($lead->notes),
                    $this->sanitizeCsvCell($lead->ai_summary),
                    $lead->created_at?->toIso8601String(),
                ]);
            }

            fclose($handle);
        }, Response::HTTP_OK, $headers);
    }

    /**
     * Prevent CSV/Spreadsheet formula injection on exported string fields.
     */
    protected function sanitizeCsvCell(mixed $value): string
    {
        $str = (string) ($value ?? '');
        if ($str !== '' && preg_match('/^[\t\r ]*[=+\-@]/', $str)) {
            return "'".$str;
        }

        return $str;
    }
}
