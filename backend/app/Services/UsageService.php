<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\UsageRecord;
use App\Models\User;
use Carbon\Carbon;

class UsageService
{
    /**
     * Get the start date for the current billing period based on subscription starts_at.
     */
    public function getCurrentPeriodStart(User $user): Carbon
    {
        $subscription = $user->subscription;
        if (!$subscription || !$subscription->starts_at) {
            return Carbon::now()->startOfMonth();
        }

        $startsAt = Carbon::parse($subscription->starts_at);
        $now = Carbon::now();

        // Calculate the anchor day of month
        $day = $startsAt->day;

        // Current month candidate
        $currentMonthCandidate = Carbon::create($now->year, $now->month, min($day, $now->daysInMonth), $startsAt->hour, $startsAt->minute, $startsAt->second);

        if ($now->greaterThanOrEqualTo($currentMonthCandidate)) {
            return $currentMonthCandidate;
        }

        $prevMonth = $now->copy()->subMonth();
        return Carbon::create($prevMonth->year, $prevMonth->month, min($day, $prevMonth->daysInMonth), $startsAt->hour, $startsAt->minute, $startsAt->second);
    }

    /**
     * Get user plan limits.
     */
    public function getUserLimits(User $user): array
    {
        $subscription = $user->subscription;
        $plan = $subscription?->plan;

        if (!$plan) {
            // Default to free plan limits if no active subscription
            $freePlan = Plan::where('name', 'free')->first();
            return [
                'analyses_limit' => $freePlan->analyses_limit ?? 10,
                'outreach_limit' => $freePlan->outreach_limit ?? 5,
                'leads_limit' => $freePlan->leads_limit ?? 25,
            ];
        }

        return [
            'analyses_limit' => $plan->analyses_limit,
            'outreach_limit' => $plan->outreach_limit,
            'leads_limit' => $plan->leads_limit,
        ];
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
            'lead_score' => true, // Lead scoring usually free or bundled
            'leads' => $this->isWithinLimit(
                $limits['leads_limit'],
                $user->leads()->count()
            ),
            default => true,
        };
    }

    /**
     * Check if count is within limit (-1 = unlimited).
     */
    protected function isWithinLimit(int $limit, int $current): bool
    {
        if ($limit === -1) {
            return true;
        }

        return $current < $limit;
    }

    /**
     * Get total credits used for given feature(s) since period start.
     */
    protected function getFeatureUsageCount(User $user, array $features, Carbon $periodStart): int
    {
        return (int) UsageRecord::where('user_id', $user->id)
            ->whereIn('feature', $features)
            ->where('created_at', '>=', $periodStart)
            ->sum('credits_used');
    }

    /**
     * Record usage for a feature.
     */
    public function recordUsage(User $user, string $feature, int $credits = 1, ?string $requestId = null, ?array $metadata = null): void
    {
        UsageRecord::create([
            'user_id' => $user->id,
            'feature' => $feature,
            'credits_used' => $credits,
            'request_id' => $requestId,
            'metadata' => $metadata,
            'created_at' => Carbon::now(),
        ]);
    }

    /**
     * Return current period usage vs limits.
     */
    public function getUsage(User $user): array
    {
        $limits = $this->getUserLimits($user);
        $periodStart = $this->getCurrentPeriodStart($user);
        $periodEnd = $periodStart->copy()->addMonth();

        $analysesUsed = $this->getFeatureUsageCount($user, ['company_analysis', 'ai_research'], $periodStart);
        $outreachUsed = $this->getFeatureUsageCount($user, ['outreach_generation'], $periodStart);
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
