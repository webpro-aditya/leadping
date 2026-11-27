<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\UsageRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class UsageService
{
    /**
     * Get the start date for the current billing period based on subscription starts_at.
     */
    public function getCurrentPeriodStart(User $user): Carbon
    {
        $user->loadMissing('subscription');
        $subscription = $user->subscription;
        if (! $subscription || ! $subscription->starts_at) {
            return Carbon::now()->startOfMonth();
        }

        $startsAt = Carbon::parse($subscription->starts_at);
        $now = Carbon::now();
        $day = $startsAt->day;

        $currentMonthCandidate = Carbon::create(
            $now->year,
            $now->month,
            min($day, $now->daysInMonth),
            $startsAt->hour,
            $startsAt->minute,
            $startsAt->second
        );

        if ($now->greaterThanOrEqualTo($currentMonthCandidate)) {
            return $currentMonthCandidate;
        }

        $prevMonth = $now->copy()->subMonth();

        return Carbon::create(
            $prevMonth->year,
            $prevMonth->month,
            min($day, $prevMonth->daysInMonth),
            $startsAt->hour,
            $startsAt->minute,
            $startsAt->second
        );
    }

    /**
     * Get user plan limits with cached Free-tier fallback.
     */
    public function getUserLimits(User $user): array
    {
        $user->loadMissing('subscription.plan');
        $plan = $user->subscription?->plan;

        if (! $plan) {
            return Cache::remember('leadping_free_plan_limits', 3600, function () {
                $freePlan = Plan::where('name', 'free')->first();

                return [
                    'analyses_limit' => $freePlan->analyses_limit ?? 10,
                    'outreach_limit' => $freePlan->outreach_limit ?? 5,
                    'leads_limit' => $freePlan->leads_limit ?? 25,
                ];
            });
        }

        return [
            'analyses_limit' => $plan->analyses_limit,
            'outreach_limit' => $plan->outreach_limit,
            'leads_limit' => $plan->leads_limit,
        ];
    }

    /**
     * Resolve the user's effective active plan slug.
     */
    public function getUserPlanName(User $user): string
    {
        $user->loadMissing('subscription.plan');
        $subscription = $user->subscription;

        if (! $subscription || $subscription->status !== 'active' || ($subscription->ends_at && $subscription->ends_at->isPast())) {
            return 'free';
        }

        return strtolower((string) ($subscription->plan?->name ?: 'free'));
    }

    /**
     * Check whether the user's active tier unlocks a gated capability.
     */
    public function supportsFeature(User $user, string $feature): bool
    {
        $planName = $this->getUserPlanName($user);

        return match ($feature) {
            'custom_icp', 'csv_export' => in_array($planName, ['pro', 'business', 'agency'], true),
            'crm_webhook' => in_array($planName, ['business', 'agency'], true),
            default => true,
        };
    }

    /**
     * Check if user has credits remaining for a feature.
     */
    public function checkUsage(User $user, string $feature): bool
    {
        $limits = $this->getUserLimits($user);
        $periodStart = $this->getCurrentPeriodStart($user);

        return match ($feature) {
            'company_analysis', 'ai_research' => $this->isWithinLimit(
                $limits['analyses_limit'],
                $this->getFeatureUsageCount($user, ['company_analysis', 'ai_research'], $periodStart)
            ),
            'outreach_generation' => $this->isWithinLimit(
                $limits['outreach_limit'],
                $this->getFeatureUsageCount($user, ['outreach_generation'], $periodStart)
            ),
            'lead_score' => true,
            'leads' => $this->isWithinLimit(
                $limits['leads_limit'],
                $user->leads()->count()
            ),
            default => true,
        };
    }

    protected function isWithinLimit(int $limit, int $current): bool
    {
        if ($limit === -1) {
            return true;
        }

        return $current < $limit;
    }

    protected function getFeatureUsageCount(User $user, array $features, Carbon $periodStart): int
    {
        return (int) UsageRecord::where('user_id', $user->id)
            ->whereIn('feature', $features)
            ->where('created_at', '>=', $periodStart)
            ->sum('credits_used');
    }

    public function recordUsage(User $user, string $feature, int $credits = 1, ?string $requestId = null, ?array $metadata = null): UsageRecord
    {
        return UsageRecord::create([
            'user_id' => $user->id,
            'feature' => $feature,
            'credits_used' => $credits,
            'request_id' => $requestId,
            'metadata' => $metadata,
            'created_at' => Carbon::now(),
        ]);
    }

    /**
     * Atomically check and reserve 1 credit for a feature using a per-user cache lock (prevents TOCTOU race).
     */
    public function reserveQuota(User $user, string $feature, ?array $metadata = null): ?UsageRecord
    {
        $lock = Cache::lock("quota_lock_{$user->id}_{$feature}", 10);

        return $lock->block(5, function () use ($user, $feature, $metadata) {
            if (! $this->checkUsage($user, $feature)) {
                return null;
            }

            return $this->recordUsage(
                $user,
                $feature,
                1,
                'req_'.Str::random(16),
                $metadata
            );
        });
    }

    /**
     * Refund a previously reserved usage record (e.g. when served from cache or AI call failed).
     */
    public function refundQuota(?UsageRecord $record): void
    {
        $record?->delete();
    }

    /**
     * Return current period usage vs limits using a single grouped query for usage records.
     */
    public function getUsage(User $user): array
    {
        $limits = $this->getUserLimits($user);
        $periodStart = $this->getCurrentPeriodStart($user);
        $periodEnd = $periodStart->copy()->addMonth();

        $totalsByFeature = UsageRecord::where('user_id', $user->id)
            ->whereIn('feature', ['company_analysis', 'ai_research', 'outreach_generation'])
            ->where('created_at', '>=', $periodStart)
            ->selectRaw('feature, COALESCE(SUM(credits_used), 0) as total')
            ->groupBy('feature')
            ->pluck('total', 'feature');

        $analysesUsed = (int) ($totalsByFeature['company_analysis'] ?? 0) + (int) ($totalsByFeature['ai_research'] ?? 0);
        $outreachUsed = (int) ($totalsByFeature['outreach_generation'] ?? 0);
        $totalLeads = $user->leads()->count();

        return [
            'period_start' => $periodStart->toIso8601String(),
            'period_end' => $periodEnd->toIso8601String(),
            'analyses' => [
                'used' => $analysesUsed,
                'limit' => $limits['analyses_limit'],
                'unlimited' => $limits['analyses_limit'] === -1,
                'remaining' => $limits['analyses_limit'] === -1 ? -1 : max(0, $limits['analyses_limit'] - $analysesUsed),
            ],
            'outreach' => [
                'used' => $outreachUsed,
                'limit' => $limits['outreach_limit'],
                'unlimited' => $limits['outreach_limit'] === -1,
                'remaining' => $limits['outreach_limit'] === -1 ? -1 : max(0, $limits['outreach_limit'] - $outreachUsed),
            ],
            'leads' => [
                'used' => $totalLeads,
                'limit' => $limits['leads_limit'],
                'unlimited' => $limits['leads_limit'] === -1,
                'remaining' => $limits['leads_limit'] === -1 ? -1 : max(0, $limits['leads_limit'] - $totalLeads),
            ],
        ];
    }
}
