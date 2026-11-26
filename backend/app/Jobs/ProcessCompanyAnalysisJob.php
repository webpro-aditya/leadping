<?php

namespace App\Jobs;

use App\Exceptions\AIProviderException;
use App\Models\UsageRecord;
use App\Models\User;
use App\Services\CompanyAnalysisService;
use App\Services\UsageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessCompanyAnalysisJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 60;

    public function __construct(
        public string $jobId,
        public int $userId,
        public array $pageData,
        public ?int $reservedUsageId = null
    ) {}

    public function handle(CompanyAnalysisService $analysisService, UsageService $usageService): void
    {
        $cacheKey = "analysis_job_{$this->jobId}";
        $user = User::find($this->userId);
        $reservedUsage = $this->reservedUsageId ? UsageRecord::find($this->reservedUsageId) : null;

        if (! $user) {
            $usageService->refundQuota($reservedUsage);
            Cache::put($cacheKey, [
                'user_id' => $this->userId,
                'status' => 'failed',
                'status_code' => 404,
                'message' => 'User account not found.',
            ], now()->addMinutes(30));

            return;
        }

        try {
            $analysis = $analysisService->analyze($user, $this->pageData);

            if (! empty($analysis['cached'])) {
                $usageService->refundQuota($reservedUsage);
            } elseif ($reservedUsage) {
                $reservedUsage->update([
                    'metadata' => ['url' => $this->pageData['url'] ?? '', 'analysis_id' => $analysis['analysis_id'] ?? null],
                ]);
            }

            Cache::put($cacheKey, [
                'user_id' => $this->userId,
                'status' => 'completed',
                'result' => $analysis,
            ], now()->addMinutes(30));
        } catch (AIProviderException $e) {
            $usageService->refundQuota($reservedUsage);
            Cache::put($cacheKey, [
                'user_id' => $this->userId,
                'status' => 'failed',
                'status_code' => $e->getStatusCode(),
                'error_code' => $e->getErrorCode(),
                'message' => $e->getMessage(),
            ], now()->addMinutes(30));
        } catch (Throwable $e) {
            $usageService->refundQuota($reservedUsage);
            Log::error('ProcessCompanyAnalysisJob failed', ['job_id' => $this->jobId, 'error' => $e->getMessage()]);
            Cache::put($cacheKey, [
                'user_id' => $this->userId,
                'status' => 'failed',
                'status_code' => 500,
                'message' => config('app.debug') ? $e->getMessage() : 'Analysis failed. Please try again.',
            ], now()->addMinutes(30));
        }
    }
}
