<?php

namespace App\Services;

use App\Models\AIAnalysis;
use App\Models\Company;
use App\Models\Lead;
use App\Models\User;
use App\Services\AI\AIManager;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CompanyAnalysisService
{
    private const TRACKING_QUERY_PARAMS = [
        'ncid', 'fbclid', 'gclid', 'yclid', 'dclid', 'msclkid',
        'mc_cid', 'mc_eid', 'ref', 'ref_src', '_hsenc', '_hsmi', 'igshid',
    ];

    protected UsageService $usageService;

    public function __construct(
        protected AIManager $aiManager,
        protected LeadScoringService $scoringService,
        ?UsageService $usageService = null
    ) {
        $this->usageService = $usageService ?? app(UsageService::class);
    }

    /**
     * Analyze company page data for a user.
     */
    public function analyze(User $user, array $pageData): array
    {
        $rawUrl = trim($pageData['url'] ?? '');
        $normalizedUrl = $this->normalizeUrl($rawUrl);
        $urlHash = md5($normalizedUrl);
        $icpProfile = $this->extractActiveIcpProfile($user);
        $icpHash = empty($icpProfile) ? 'default' : md5((string) json_encode($icpProfile));
        $userCacheKey = "company_analysis_{$user->id}_{$urlHash}_{$icpHash}";
        $sharedAiCacheKey = "ai_company_output_{$urlHash}_{$icpHash}";

        // 1. Check 24-hour per-user cache
        if (Cache::has($userCacheKey)) {
            $cached = Cache::get($userCacheKey);
            $cached['cached'] = true;

            return $cached;
        }

        // 2. Check if DB analysis exists for this user within last 24 hours matching active ICP profile
        $existing = AIAnalysis::where('user_id', $user->id)
            ->whereIn('source_url', array_unique([$normalizedUrl, $rawUrl]))
            ->where('created_at', '>=', now()->subHours(24))
            ->latest()
            ->with(['company', 'lead'])
            ->first();

        if ($existing && $existing->structured_response && ($existing->raw_response['_icp_hash'] ?? 'default') === $icpHash) {
            $data = $this->formatResponse(
                $existing->structured_response,
                $existing->id,
                (int) $existing->lead_id,
                (int) $existing->company_id,
                true,
                $rawUrl
            );
            Cache::put($userCacheKey, $data, now()->addHours(24));

            return $data;
        }

        // Sanitize page data
        $sanitizedPageData = $this->sanitizePageData($pageData);

        // 3. Reuse shared 24h AI result with stampede lock so concurrent requests share 1 OpenAI call
        [$aiResult, $usedSharedCache] = $this->resolveSharedOrFreshAnalysis($sharedAiCacheKey, $sanitizedPageData, $icpProfile);

        // Save company, lead, signals, and analysis in a transaction
        $analysisRecord = DB::transaction(function () use ($user, $rawUrl, $normalizedUrl, $sanitizedPageData, $aiResult, $usedSharedCache, $icpHash) {
            $isLinkedIn = str_contains($normalizedUrl, 'linkedin.com');
            $website = $this->extractCleanWebsite($normalizedUrl);

            if ($isLinkedIn && $website === 'linkedin.com') {
                $compName = $aiResult['company']['name'] ?? '';
                $slug = Str::slug($compName);
                $website = $slug ? "{$slug}.com" : 'prospect-'.substr(md5($normalizedUrl), 0, 8).'.com';
            }

            $companyAttributes = [
                'name' => $aiResult['company']['name'] ?: ($sanitizedPageData['title'] ?? $website),
                'industry' => $aiResult['company']['industry'] ?? null,
                'description' => $aiResult['company']['description'] ?? null,
                'location' => $aiResult['company']['location'] ?? null,
                'company_size' => $aiResult['company']['company_size'] ?? null,
                'business_model' => $aiResult['company']['business_model'] ?? null,
                'products_services' => $aiResult['company']['products_services'] ?? [],
                'target_customers' => $aiResult['company']['target_customers'] ?? null,
                'raw_data' => $sanitizedPageData,
            ];

            $company = $this->upsertCompanyRaceSafe($website, $companyAttributes);

            $scores = $this->scoringService->extractScores($aiResult);

            $lead = Lead::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'company_id' => $company->id,
                ],
                [
                    'source_url' => $normalizedUrl,
                    'icp_score' => $scores['icp_score'],
                    'buying_intent_score' => $scores['buying_intent_score'],
                    'pain_fit_score' => $scores['pain_fit_score'],
                    'overall_score' => $scores['overall_score'],
                    'priority' => $scores['priority'],
                    'status' => 'new',
                    'ai_summary' => $aiResult['summary'] ?? null,
                ]
            );

            $lead->signals()->delete();
            foreach ($aiResult['buying_signals'] as $signal) {
                $lead->signals()->create([
                    'description' => $signal['description'],
                    'confidence' => $signal['confidence'],
                    'source_url' => $signal['source'] ?: $rawUrl,
                    'observed_or_inferred' => $signal['observed_or_inferred'],
                ]);
            }

            $lead->painPoints()->delete();
            foreach ($aiResult['pain_points'] as $painPoint) {
                $lead->painPoints()->create([
                    'title' => $painPoint['title'],
                    'description' => $painPoint['description'],
                    'confidence' => $painPoint['confidence'],
                    'explanation' => $painPoint['explanation'] ?? null,
                ]);
            }

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

            $tokensUsed = $usedSharedCache ? 0 : ($aiResult['_meta']['tokens_used'] ?? 0);
            $provider = config('ai.default', 'openai');
            $model = config('ai.providers.openai.model', 'gpt-4o-mini');

            return AIAnalysis::create([
                'user_id' => $user->id,
                'company_id' => $company->id,
                'lead_id' => $lead->id,
                'source_url' => $normalizedUrl,
                'analysis_type' => 'company_analysis',
                'raw_response' => array_merge($aiResult['_meta']['raw'] ?? $aiResult, ['_icp_hash' => $icpHash]),
                'structured_response' => $aiResult,
                'ai_provider' => $provider,
                'model_used' => $model,
                'tokens_used' => $tokensUsed,
            ]);
        });

        $responseData = $this->formatResponse(
            $aiResult,
            $analysisRecord->id,
            (int) $analysisRecord->lead_id,
            (int) $analysisRecord->company_id,
            $usedSharedCache,
            $rawUrl
        );

        Cache::put($userCacheKey, $responseData, now()->addHours(24));

        return $responseData;
    }

    /**
     * Format response with both nested schema keys and flat UI-friendly fields.
     */
    protected function formatResponse(
        array $aiResult,
        int $analysisId,
        int $leadId,
        int $companyId,
        bool $cached,
        string $sourceUrl
    ): array {
        $company = $aiResult['company'] ?? [];

        return array_merge($aiResult, [
            'company_name' => $company['name'] ?? ($aiResult['company_name'] ?? 'Unknown Company'),
            'website' => $sourceUrl ?: ($aiResult['website'] ?? ''),
            'industry' => $company['industry'] ?? ($aiResult['industry'] ?? ''),
            'location' => $company['location'] ?? ($aiResult['location'] ?? ''),
            'company_size' => $company['company_size'] ?? ($aiResult['company_size'] ?? ''),
            'description' => $company['description'] ?? ($aiResult['description'] ?? ''),
            'products_services' => $company['products_services'] ?? ($aiResult['products_services'] ?? []),
            'ai_summary' => $aiResult['summary'] ?? ($aiResult['ai_summary'] ?? ''),
            'analysis_id' => $analysisId,
            'lead_id' => $leadId,
            'company_id' => $companyId,
            'cached' => $cached,
        ]);
    }

    /**
     * Normalize URLs by stripping fragments, tracking query parameters, and trailing slashes.
     */
    public function normalizeUrl(string $url): string
    {
        $parts = parse_url(trim($url));
        if (! $parts || empty($parts['host'])) {
            return trim($url);
        }

        $scheme = strtolower($parts['scheme'] ?? 'https');
        $host = strtolower($parts['host']);
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $path = $parts['path'] ?? '/';
        if ($path !== '/') {
            $path = rtrim($path, '/');
        }

        $queryString = '';
        if (! empty($parts['query'])) {
            parse_str($parts['query'], $params);
            foreach (array_keys($params) as $key) {
                $lowerKey = strtolower((string) $key);
                if (str_starts_with($lowerKey, 'utm_') || in_array($lowerKey, self::TRACKING_QUERY_PARAMS, true)) {
                    unset($params[$key]);
                }
            }
            if (! empty($params)) {
                ksort($params);
                $queryString = '?'.http_build_query($params);
            }
        }

        return "{$scheme}://{$host}{$port}{$path}{$queryString}";
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

        if (mb_strlen($cleanContent) > 8000) {
            $cleanContent = mb_substr($cleanContent, 0, 8000);
        }

        return [
            'url' => filter_var($pageData['url'] ?? '', FILTER_SANITIZE_URL),
            'title' => Str::limit(strip_tags((string) ($pageData['title'] ?? '')), 255),
            'meta_description' => Str::limit(strip_tags((string) ($pageData['meta_description'] ?? '')), 400),
            'headings' => is_array($pageData['headings'] ?? null)
                ? array_slice(array_map(fn ($h) => Str::limit(strip_tags((string) $h), 160), $pageData['headings']), 0, 15)
                : [],
            'technologies' => is_array($pageData['technologies'] ?? null)
                ? array_slice(array_map(fn ($t) => Str::limit(strip_tags((string) $t), 60), $pageData['technologies']), 0, 10)
                : [],
            'content' => $cleanContent,
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

    /**
     * Extract non-empty custom ICP fields when unlocked for the user's tier.
     */
    protected function extractActiveIcpProfile(User $user): array
    {
        if (! $this->usageService->supportsFeature($user, 'custom_icp')) {
            return [];
        }

        $raw = $user->icp_profile;
        if (! is_array($raw)) {
            return [];
        }

        $filtered = [];
        foreach ($raw as $key => $value) {
            $clean = trim((string) $value);
            if ($clean !== '') {
                $filtered[$key] = $clean;
            }
        }

        ksort($filtered);

        return $filtered;
    }

    /**
     * Resolve shared 24h cached AI output using a distributed cache lock to prevent stampedes.
     *
     * @return array{0: array, 1: bool}
     */
    protected function resolveSharedOrFreshAnalysis(string $sharedAiCacheKey, array $sanitizedPageData, array $icpProfile = []): array
    {
        $cached = Cache::get($sharedAiCacheKey);
        if (is_array($cached)) {
            return [$cached, true];
        }

        try {
            $lock = Cache::lock("lock_{$sharedAiCacheKey}", 35);

            return $lock->block(30, function () use ($sharedAiCacheKey, $sanitizedPageData, $icpProfile) {
                $rechecked = Cache::get($sharedAiCacheKey);
                if (is_array($rechecked)) {
                    return [$rechecked, true];
                }

                $aiResult = $this->aiManager->analyzeCompany($sanitizedPageData, $icpProfile);
                Cache::put($sharedAiCacheKey, $aiResult, now()->addHours(24));

                return [$aiResult, false];
            });
        } catch (LockTimeoutException) {
            $aiResult = $this->aiManager->analyzeCompany($sanitizedPageData, $icpProfile);
            Cache::put($sharedAiCacheKey, $aiResult, now()->addHours(24));

            return [$aiResult, false];
        }
    }

    /**
     * Upsert company safely even under concurrent inserts on the same unique website.
     */
    protected function upsertCompanyRaceSafe(string $website, array $attributes): Company
    {
        try {
            return Company::updateOrCreate(['website' => $website], $attributes);
        } catch (UniqueConstraintViolationException) {
            $company = Company::where('website', $website)->firstOrFail();
            $company->update($attributes);

            return $company;
        }
    }
}
