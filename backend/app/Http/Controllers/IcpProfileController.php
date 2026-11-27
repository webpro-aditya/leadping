<?php

namespace App\Http\Controllers;

use App\Services\UsageService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IcpProfileController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected UsageService $usageService
    ) {}

    /**
     * Retrieve the authenticated user's Custom ICP criteria and tier availability.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->successResponse([
            'supported' => $this->usageService->supportsFeature($user, 'custom_icp'),
            'plan' => $this->usageService->getUserPlanName($user),
            'icp_profile' => $user->icp_profile ?? [
                'product_description' => '',
                'target_industries' => '',
                'target_company_sizes' => '',
                'target_regions' => '',
                'target_personas' => '',
                'ideal_pain_points' => '',
                'disqualifiers' => '',
            ],
        ], 'ICP profile retrieved successfully');
    }

    /**
     * Save or clear custom ICP scoring criteria (Pro tier or higher).
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->usageService->supportsFeature($user, 'custom_icp')) {
            return $this->errorResponse(
                'Custom ICP criteria tuning requires the Pro plan or higher.',
                Response::HTTP_FORBIDDEN,
                ['upgrade_required' => true]
            );
        }

        $validated = $request->validate([
            'product_description' => ['nullable', 'string', 'max:600'],
            'target_industries' => ['nullable', 'string', 'max:300'],
            'target_company_sizes' => ['nullable', 'string', 'max:150'],
            'target_regions' => ['nullable', 'string', 'max:200'],
            'target_personas' => ['nullable', 'string', 'max:300'],
            'ideal_pain_points' => ['nullable', 'string', 'max:500'],
            'disqualifiers' => ['nullable', 'string', 'max:300'],
        ]);

        $cleaned = [];
        foreach ([
            'product_description',
            'target_industries',
            'target_company_sizes',
            'target_regions',
            'target_personas',
            'ideal_pain_points',
            'disqualifiers',
        ] as $field) {
            $cleaned[$field] = trim(strip_tags((string) ($validated[$field] ?? '')));
        }

        $user->update(['icp_profile' => $cleaned]);

        return $this->successResponse([
            'supported' => true,
            'plan' => $this->usageService->getUserPlanName($user),
            'icp_profile' => $cleaned,
        ], 'Custom ICP criteria updated successfully.');
    }
}
