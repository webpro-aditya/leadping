<?php

namespace App\Http\Controllers;

use App\Exceptions\AIProviderException;
use App\Http\Requests\AnalyzeCompanyRequest;
use App\Jobs\ProcessCompanyAnalysisJob;
use App\Services\CompanyAnalysisService;
use App\Services\UsageService;
use App\Traits\ApiResponse;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
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
        $validated = $request->validated();
        $pageData = $validated['page_data'];
        $pageData['url'] = $validated['url'];

        // Atomically reserve 1 quota credit before starting work to prevent concurrent burst bypasses
        $reservedUsage = $this->usageService->reserveQuota($user, 'company_analysis', [
            'url' => $pageData['url'],
        ]);

        if (! $reservedUsage) {
            return $this->errorResponse(
                'Analysis limit reached for current billing period. Please upgrade your plan.',
                Response::HTTP_PAYMENT_REQUIRED,
                ['upgrade_required' => true]
            );
        }

        // Optional async mode for queue-worker deployments
        if ($request->boolean('async')) {
            $jobId = (string) Str::uuid();
            Cache::put("analysis_job_{$jobId}", [
                'user_id' => $user->id,
                'status' => 'pending',
            ], now()->addMinutes(30));

            ProcessCompanyAnalysisJob::dispatch($jobId, $user->id, $pageData, $reservedUsage->id);

            return $this->successResponse([
                'job_id' => $jobId,
                'status' => 'pending',
            ], 'Company analysis queued', Response::HTTP_ACCEPTED);
        }

        try {
            $analysis = $this->analysisService->analyze($user, $pageData);

            // Refund reserved credit if served from 24h cache, otherwise attach analysis_id
            if (! empty($analysis['cached'])) {
                $this->usageService->refundQuota($reservedUsage);
            } else {
                $reservedUsage->update([
                    'metadata' => ['url' => $pageData['url'], 'analysis_id' => $analysis['analysis_id'] ?? null],
                ]);
            }

            return $this->successResponse($analysis, 'Company analysis completed successfully');
        } catch (AIProviderException $e) {
            $this->usageService->refundQuota($reservedUsage);

            return $this->errorResponse(
                $e->getMessage(),
                $e->getStatusCode(),
                array_filter(['error_code' => $e->getErrorCode()])
            );
        } catch (Exception $e) {
            $this->usageService->refundQuota($reservedUsage);
            Log::error('CompanyAnalysisController unexpected error', ['error' => $e->getMessage()]);

            return $this->errorResponse(
                config('app.debug') ? 'Failed to analyze company webpage: '.$e->getMessage() : 'Failed to analyze company webpage. Please try again later.',
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Poll status of an asynchronous company analysis job.
     */
    public function jobStatus(Request $request, string $jobId): JsonResponse
    {
        $payload = Cache::get("analysis_job_{$jobId}");
        if (! is_array($payload)) {
            return $this->errorResponse('Analysis job not found or expired.', Response::HTTP_NOT_FOUND);
        }

        if ((int) ($payload['user_id'] ?? 0) !== (int) $request->user()->id) {
            return $this->errorResponse('Unauthorized access to analysis job.', Response::HTTP_FORBIDDEN);
        }

        if (($payload['status'] ?? '') === 'failed') {
            return $this->errorResponse(
                $payload['message'] ?? 'Analysis failed.',
                (int) ($payload['status_code'] ?? Response::HTTP_INTERNAL_SERVER_ERROR),
                array_filter(['error_code' => $payload['error_code'] ?? null, 'status' => 'failed'])
            );
        }

        if (($payload['status'] ?? '') === 'completed') {
            return $this->successResponse(
                array_merge($payload['result'] ?? [], ['job_id' => $jobId, 'status' => 'completed']),
                'Company analysis completed successfully'
            );
        }

        return $this->successResponse([
            'job_id' => $jobId,
            'status' => 'pending',
        ], 'Analysis in progress');
    }
}
