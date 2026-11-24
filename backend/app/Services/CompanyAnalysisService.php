<?php

namespace App\Services;

use App\Models\AIAnalysis;
use App\Models\Company;
use App\Models\Lead;
use App\Models\User;
use App\Services\AI\AIManager;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CompanyAnalysisService
{
    public function __construct(
        protected AIManager $aiManager,
        protected LeadScoringService $scoringService
    ) {}

    /**
     * Analyze company page data for a user.
     */
    public function analyze(User $user, array $pageData): array
    {
        $url = trim($pageData['url'] ?? '');
        $cacheKey = 'company_analysis_' . $user->id . '_' . md5($url);

        // Check 24-hour cache
        if (Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);
            $cached['cached'] = true;
            return $cached;
        }

        // Check if DB analysis exists within last 24 hours
        $existing = AIAnalysis::where('user_id', $user->id)
            ->where('source_url', $url)
            ->where('created_at', '>=', now()->subHours(24))
            ->latest()
            ->with(['company', 'lead.signals', 'lead.painPoints', 'lead.opportunities'])
            ->first();

        if ($existing && $existing->structured_response) {
            $data = $existing->structured_response;
            $data['analysis_id'] = $existing->id;
            $data['lead_id'] = $existing->lead_id;
            $data['company_id'] = $existing->company_id;
            $data['cached'] = true;
            Cache::put($cacheKey, $data, now()->addHours(24));
            return $data;
        }

        // Sanitize page data
        $sanitizedPageData = $this->sanitizePageData($pageData);

        // Call AI Provider
        $aiResult = $this->aiManager->analyzeCompany($sanitizedPageData);

        // Save company, lead, signals, and analysis in a transaction
        $analysisRecord = DB::transaction(function () use ($user, $url, $sanitizedPageData, $aiResult) {
            $isLinkedIn = str_contains($url, 'linkedin.com');
            $website = $this->extractCleanWebsite($url);

            if ($isLinkedIn && $website === 'linkedin.com') {
                $compName = $aiResult['company']['name'] ?? '';
                $slug = Str::slug($compName);
                $website = $slug ? "{$slug}.com" : "prospect-" . substr(md5($url), 0, 8) . ".com";
            }

            // Create or update company
            $company = Company::updateOrCreate(
                ['website' => $website],
                [
                    'name' => $aiResult['company']['name'] ?: ($sanitizedPageData['title'] ?? $website),
                    'industry' => $aiResult['company']['industry'] ?? null,
                    'description' => $aiResult['company']['description'] ?? null,
                    'location' => $aiResult['company']['location'] ?? null,
                    'company_size' => $aiResult['company']['company_size'] ?? null,
                    'business_model' => $aiResult['company']['business_model'] ?? null,
                    'products_services' => $aiResult['company']['products_services'] ?? [],
                    'target_customers' => $aiResult['company']['target_customers'] ?? null,
                    'raw_data' => $sanitizedPageData,
                ]
            );

            // Calculate lead score & priority
            $scores = $this->scoringService->extractScores($aiResult);

            // Create or update lead
            $lead = Lead::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'company_id' => $company->id,
                ],
                [
                    'source_url' => $url,
                    'icp_score' => $scores['icp_score'],
                    'buying_intent_score' => $scores['buying_intent_score'],
                    'pain_fit_score' => $scores['pain_fit_score'],
                    'overall_score' => $scores['overall_score'],
                    'priority' => $scores['priority'],
                    'status' => 'new',
                    'ai_summary' => $aiResult['summary'] ?? null,
                ]
            );

            // Sync buying signals
            $lead->signals()->delete();
            foreach ($aiResult['buying_signals'] as $signal) {
                $lead->signals()->create([
                    'description' => $signal['description'],
                    'confidence' => $signal['confidence'],
                    'source_url' => $signal['source'] ?: $url,
                    'observed_or_inferred' => $signal['observed_or_inferred'],
                ]);
            }

            // Sync pain points
            $lead->painPoints()->delete();
            foreach ($aiResult['pain_points'] as $painPoint) {
                $lead->painPoints()->create([
                    'title' => $painPoint['title'],
                    'description' => $painPoint['description'],
                    'confidence' => $painPoint['confidence'],
                    'explanation' => $painPoint['explanation'] ?? null,
                ]);
            }

            // Sync opportunities
            $lead->opportunities()->delete();
            foreach ($aiResult['opportunities'] as $opportunity) {
                $lead->opportunities()->create([
                    'title' => $opportunity['title'],
                    'description' => $opportunity['description'],
                    'why' => $opportunity['why'] ?? null,
                    'potential_solution' => $opportunity['potential_solution'] ?? null,
                    'priority' => $opportunity['priority'],
                ]);
            }

            // Create AI Analysis record
            $tokensUsed = $aiResult['_meta']['tokens_used'] ?? 0;
            $provider = config('ai.default', 'openai');
            $model = config('ai.providers.openai.model', 'gpt-4o-mini');

            return AIAnalysis::create([
                'user_id' => $user->id,
                'company_id' => $company->id,
                'lead_id' => $lead->id,
                'source_url' => $url,
                'analysis_type' => 'company_analysis',
                'raw_response' => $aiResult['_meta']['raw'] ?? $aiResult,
                'structured_response' => $aiResult,
                'ai_provider' => $provider,
                'model_used' => $model,
                'tokens_used' => $tokensUsed,
            ]);
        });

        $responseData = $aiResult;
        $responseData['analysis_id'] = $analysisRecord->id;
        $responseData['lead_id'] = $analysisRecord->lead_id;
        $responseData['company_id'] = $analysisRecord->company_id;
        $responseData['cached'] = false;

        Cache::put($cacheKey, $responseData, now()->addHours(24));

        return $responseData;
    }

    /**
     * Sanitize and limit page content.
     */
    protected function sanitizePageData(array $pageData): array
    {
        $content = $pageData['content'] ?? ($pageData['text'] ?? '');
        if (is_array($content)) {
            $content = implode("\n", $content);
        }

        $cleanContent = strip_tags((string) $content);
        $cleanContent = preg_replace('/\s+/', ' ', $cleanContent);
        $cleanContent = trim($cleanContent);

        if (mb_strlen($cleanContent) > 20000) {
            $cleanContent = mb_substr($cleanContent, 0, 20000);
        }

        return [
            'url' => filter_var($pageData['url'] ?? '', FILTER_SANITIZE_URL),
            'title' => Str::limit(strip_tags((string) ($pageData['title'] ?? '')), 255),
            'meta_description' => Str::limit(strip_tags((string) ($pageData['meta_description'] ?? '')), 500),
            'headings' => is_array($pageData['headings'] ?? null)
                ? array_slice(array_map(fn($h) => Str::limit(strip_tags((string)$h), 200), $pageData['headings']), 0, 30)
                : [],
            'content' => $cleanContent,
            'links' => is_array($pageData['links'] ?? null) ? array_slice($pageData['links'], 0, 20) : [],
        ];
    }

    /**
     * Extract normalized website string from URL.
     */
    protected function extractCleanWebsite(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);
        if ($host) {
            return preg_replace('/^www\./i', '', strtolower($host));
        }

        return Str::limit(preg_replace('/^https?:\/\/(www\.)?/i', '', strtolower($url)), 255);
    }
}
