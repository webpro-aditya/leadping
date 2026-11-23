<?php

namespace App\Http\Controllers;

use App\Services\UsageService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsageController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected UsageService $usageService
    ) {}

    /**
     * Get current usage statistics and limits for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $usage = $this->usageService->getUsage($user);

        return $this->successResponse($usage, 'Usage statistics retrieved successfully');
    }
}
