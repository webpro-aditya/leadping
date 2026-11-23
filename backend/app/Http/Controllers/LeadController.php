<?php

namespace App\Http\Controllers;

use App\Http\Requests\GenerateOutreachRequest;
use App\Http\Requests\StoreLeadRequest;
use App\Http\Requests\UpdateLeadRequest;
use App\Models\Company;
use App\Models\Lead;
use App\Models\OutreachMessage;
use App\Services\AI\AIManager;
use App\Services\LeadScoringService;
use App\Services\UsageService;
use App\Traits\ApiResponse;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $user = $request->user();
        $query = Lead::where('user_id', $user->id)
            ->with(['company', 'signals', 'painPoints', 'opportunities']);

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by priority
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }

        // Filter by minimum score
        if ($request->filled('min_score')) {
            $query->where('overall_score', '>=', (int) $request->input('min_score'));
        }

        // Filter by maximum score
        if ($request->filled('max_score')) {
            $query->where('overall_score', '<=', (int) $request->input('max_score'));
        }

        // Search in company name, url, or notes
        if ($request->filled('search')) {
            $search = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('source_url', 'like', $search)
                  ->orWhere('notes', 'like', $search)
                  ->orWhere('ai_summary', 'like', $search)
                  ->orWhereHas('company', function ($cq) use ($search) {
                      $cq->where('name', 'like', $search)
                         ->orWhere('website', 'like', $search)
                         ->orWhere('industry', 'like', $search);
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['overall_score', 'icp_score', 'buying_intent_score', 'created_at', 'status', 'priority'])) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = min(100, max(1, (int) $request->input('per_page', 15)));
        $leads = $query->paginate($perPage);

        return $this->successResponse($leads, 'Leads retrieved successfully');
    }

    /**
     * Store a newly created lead in storage.
     */
    public function store(StoreLeadRequest $request): JsonResponse
    {
        $user = $request->user();

        // Check plan leads limit
        if (!$this->usageService->checkUsage($user, 'leads')) {
            return $this->errorResponse(
                'Lead storage limit reached for your plan. Please upgrade to save more leads.',
                Response::HTTP_PAYMENT_REQUIRED,
                ['upgrade_required' => true]
            );
        }

        $validated = $request->validated();

        $lead = DB::transaction(function () use ($user, $validated) {
            $companyId = $validated['company_id'] ?? null;

            if (!$companyId) {
                $compData = $validated['company'] ?? [];
                $companyName = $validated['company_name'] ?? $compData['name'] ?? 'Target Company';
                $website = $validated['website'] ?? $compData['website'] ?? parse_url($validated['source_url'], PHP_URL_HOST) ?? $validated['source_url'];
                $cleanWebsite = preg_replace('/^www\./i', '', strtolower($website));

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

            $icpScore = is_array($validated['icp_score'] ?? null)
                ? ($validated['icp_score']['overall'] ?? 70)
                : ($validated['icp_score'] ?? 70);

            $overall = $validated['overall_score'] ?? $icpScore;
            $priority = $validated['priority'] ?? $this->scoringService->calculatePriority($overall);

            $lead = Lead::create([
                'user_id' => $user->id,
                'company_id' => $companyId,
                'source_url' => $validated['source_url'],
                'icp_score' => $icpScore,
                'buying_intent_score' => $validated['buying_intent_score'] ?? 70,
                'pain_fit_score' => $validated['pain_fit_score'] ?? 70,
                'overall_score' => $overall,
                'priority' => $priority,
                'status' => $validated['status'] ?? 'new',
                'notes' => $validated['notes'] ?? null,
                'ai_summary' => $validated['ai_summary'] ?? null,
            ]);

            // Save nested signals
            $signals = $validated['signals'] ?? $validated['buying_signals'] ?? [];
            if (!empty($signals)) {
                foreach ($signals as $sig) {
                    $lead->signals()->create([
                        'description' => $sig['description'] ?? '',
                        'confidence' => $sig['confidence'] ?? 'medium',
                        'source_url' => $sig['source_url'] ?? $lead->source_url,
                        'observed_or_inferred' => $sig['observed_or_inferred'] ?? 'observed',
                    ]);
                }
            }

            // Save nested pain points
            if (!empty($validated['pain_points'])) {
                foreach ($validated['pain_points'] as $pp) {
                    $lead->painPoints()->create([
                        'title' => $pp['title'] ?? '',
                        'description' => $pp['description'] ?? '',
                        'confidence' => $pp['confidence'] ?? 'medium',
                        'explanation' => $pp['explanation'] ?? null,
                    ]);
                }
            }

            // Save nested opportunities
            if (!empty($validated['opportunities'])) {
                foreach ($validated['opportunities'] as $opp) {
                    $lead->opportunities()->create([
                        'title' => $opp['title'] ?? '',
                        'description' => $opp['description'] ?? '',
                        'why' => $opp['why'] ?? null,
                        'potential_solution' => $opp['potential_solution'] ?? null,
                        'priority' => $opp['priority'] ?? 'medium',
                    ]);
                }
            }

            return $lead;
        });

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

        if (!$this->usageService->checkUsage($user, 'outreach_generation')) {
            return $this->errorResponse(
                'Outreach generation limit reached for current billing period. Please upgrade your plan.',
                Response::HTTP_PAYMENT_REQUIRED,
                ['upgrade_required' => true]
            );
        }

        $validated = $request->validated();
        $channel = $validated['channel'];
        $tone = $validated['tone'] ?? 'professional';

        $lead->load(['company', 'painPoints', 'opportunities']);

        $analysisData = [
            'company' => $lead->company ? $lead->company->toArray() : [],
            'pain_points' => $lead->painPoints->toArray(),
            'opportunities' => $lead->opportunities->toArray(),
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

            $this->usageService->recordUsage(
                $user,
                'outreach_generation',
                1,
                'req_' . Str::random(16),
                ['lead_id' => $lead->id, 'channel' => $channel]
            );

            return $this->successResponse($outreach, 'Outreach message generated successfully');
        } catch (Exception $e) {
            return $this->errorResponse(
                'Failed to generate outreach message: ' . $e->getMessage(),
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

        try {
            $rescored = $this->aiManager->rescoreLead($lead->toArray());

            $this->scoringService->updateLeadScores($lead, $rescored);

            return $this->successResponse(
                $lead->fresh(['company', 'signals', 'painPoints', 'opportunities']),
                'Lead re-scored successfully'
            );
        } catch (Exception $e) {
            return $this->errorResponse(
                'Failed to rescore lead: ' . $e->getMessage(),
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Export leads as a CSV file.
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        $leads = Lead::where('user_id', $user->id)
            ->with('company')
            ->orderBy('created_at', 'desc')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="leadping_leads_' . date('Y-m-d') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($leads) {
            $handle = fopen('php://output', 'w');

            // Header row
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

            foreach ($leads as $lead) {
                fputcsv($handle, [
                    $lead->id,
                    $lead->company?->name ?? 'N/A',
                    $lead->company?->website ?? 'N/A',
                    $lead->company?->industry ?? 'N/A',
                    $lead->overall_score,
                    $lead->icp_score,
                    $lead->buying_intent_score,
                    $lead->pain_fit_score,
                    $lead->priority,
                    $lead->status,
                    $lead->source_url,
                    $lead->notes,
                    $lead->ai_summary,
                    $lead->created_at?->toIso8601String(),
                ]);
            }

            fclose($handle);
        }, Response::HTTP_OK, $headers);
    }
}
