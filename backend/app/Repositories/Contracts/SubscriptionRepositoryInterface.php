<?php

namespace App\Repositories\Contracts;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

interface SubscriptionRepositoryInterface
{
    public function findActivePlan(int|string $identifier): ?Plan;

    public function getActivePlans(): Collection;

    public function activatePlanForUser(User $user, Plan $plan, string $billingCycle = 'monthly'): Subscription;
}
