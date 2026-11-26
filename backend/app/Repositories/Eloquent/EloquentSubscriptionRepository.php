<?php

namespace App\Repositories\Eloquent;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use App\Repositories\Contracts\SubscriptionRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class EloquentSubscriptionRepository implements SubscriptionRepositoryInterface
{
    public function findActivePlan(int|string $identifier): ?Plan
    {
        $query = Plan::where('is_active', true);

        if (is_numeric($identifier)) {
            return $query->where('id', (int) $identifier)->first();
        }

        return $query->where('name', strtolower(trim((string) $identifier)))->first();
    }

    public function getActivePlans(): Collection
    {
        return Plan::where('is_active', true)
            ->orderBy('price_monthly', 'asc')
            ->get();
    }

    public function activatePlanForUser(User $user, Plan $plan, string $billingCycle = 'monthly'): Subscription
    {
        // Mark previous active subscriptions as superseded/cancelled
        $user->subscriptions()
            ->where('status', 'active')
            ->update([
                'status' => 'cancelled',
                'ends_at' => now(),
            ]);

        $startsAt = now();
        $endsAt = $billingCycle === 'annual'
            ? $startsAt->copy()->addYear()
            : $startsAt->copy()->addMonth();

        return $user->subscriptions()->create([
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ])->load('plan');
    }
}
