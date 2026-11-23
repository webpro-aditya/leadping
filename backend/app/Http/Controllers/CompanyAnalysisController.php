<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnalyzeCompanyRequest;
use App\Services\CompanyAnalysisService;
use App\Services\UsageService;
use App\Traits\ApiResponse;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class CompanyAnalysisController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CompanyAnalysisService $analysisService,
        protected UsageService $usageService
    ) {}

    /**
     * Analyze company page data for the authenticated user.
     */
    public function analyze(AnalyzeCompanyRequest $request): JsonResponse
    {
        $user = $request->user();

        // Check if user has sufficient analysis credits
        if (!$this->usageService->checkUsage($user, 'company_analysis')) {
            return $this->errorResponse(
                'Analysis limit reached for current billing period. Please upgrade your plan.',
                Response::HTTP_PAYMENT_REQUIRED,
                ['upgrade_required' => true]
            );
        }

        $pageData = $request->validated()['page_data'];
        $pageData['url'] = $request->validated()['url'];

        try {
            $analysis = $this->analysisService->analyze($user, $pageData);

            // Only deduct credits if fresh analysis was performed (not cached)
            if (empty($analysis['cached'])) {
                $requestId = 'req_' . Str::random(16);
                $this->usageService->recordUsage(
                    $user,
                    'company_analysis',
                    1,
                    $requestId,
                    ['url' => $pageData['url'], 'analysis_id' => $analysis['analysis_id'] ?? null]
                );
            }

            return $this->successResponse($analysis, 'Company analysis completed successfully');
        } catch (Exception $e) {
            return $this->errorResponse(
                'Failed to analyze company webpage: ' . $e->getMessage(),
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }
}
