<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    use ApiResponse;

    /**
     * Get the authenticated user's active subscription and plan details.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription?->load('plan');

        if (!$subscription) {
            $freePlan = Plan::where('name', 'free')->first();
            return $this->successResponse([
                'subscription' => null,
                'plan' => $freePlan,
            ], 'No active subscription found; fallback to Free plan');
        }

        return $this->successResponse([
            'subscription' => $subscription,
            'plan' => $subscription->plan,
        ], 'Subscription details retrieved successfully');
    }

    /**
     * List all available plans.
     */
    public function plans(): JsonResponse
    {
        $plans = Plan::where('is_active', true)->orderBy('price_monthly', 'asc')->get();

        return $this->successResponse([
            'plans' => $plans,
        ], 'Available plans retrieved successfully');
    }
}
