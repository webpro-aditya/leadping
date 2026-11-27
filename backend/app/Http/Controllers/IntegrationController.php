<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Services\CrmWebhookService;
use App\Services\UsageService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class IntegrationController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CrmWebhookService $webhookService,
        protected UsageService $usageService
    ) {}

    /**
     * Retrieve current CRM webhook integration settings.
     */
    public function showWebhook(Request $request): JsonResponse
    {
        $user = $request->user();
        $secret = (string) ($user->webhook_secret ?: '');

        return $this->successResponse([
            'supported' => $this->usageService->supportsFeature($user, 'crm_webhook'),
            'plan' => $this->usageService->getUserPlanName($user),
            'webhook_url' => $user->webhook_url ?? '',
            'webhook_enabled' => (bool) $user->webhook_enabled,
            'has_secret' => $secret !== '',
            'secret_preview' => $secret !== '' ? substr($secret, 0, 10).'••••'.substr($secret, -4) : null,
        ], 'CRM webhook configuration retrieved successfully');
    }

    /**
     * Save or update signed CRM webhook endpoint (Business or Agency tier).
     */
    public function updateWebhook(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->usageService->supportsFeature($user, 'crm_webhook')) {
            return $this->errorResponse(
                'CRM webhook integrations require the Business or Agency plan.',
                Response::HTTP_FORBIDDEN,
                ['upgrade_required' => true]
            );
        }

        $validated = $request->validate([
            'webhook_url' => ['nullable', 'string', 'max:500'],
            'webhook_enabled' => ['required', 'boolean'],
            'rotate_secret' => ['sometimes', 'boolean'],
        ]);

        $rawUrl = trim((string) ($validated['webhook_url'] ?? ''));
        $enabled = (bool) $validated['webhook_enabled'];

        if ($enabled && $rawUrl === '') {
            return $this->errorResponse('Please provide a webhook URL before enabling delivery.', Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $cleanUrl = null;
        if ($rawUrl !== '') {
            try {
                $cleanUrl = $this->webhookService->validateWebhookUrl($rawUrl);
            } catch (InvalidArgumentException $e) {
                return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $shouldRotate = (bool) ($validated['rotate_secret'] ?? false) || empty($user->webhook_secret);
        $newSecret = $shouldRotate ? $this->webhookService->generateSecret() : null;

        $updateData = [
            'webhook_url' => $cleanUrl,
            'webhook_enabled' => $enabled && $cleanUrl !== null,
        ];
        if ($newSecret !== null) {
            $updateData['webhook_secret'] = $newSecret;
        }

        $user->update($updateData);

        $activeSecret = $newSecret ?? (string) $user->webhook_secret;

        return $this->successResponse([
            'supported' => true,
            'plan' => $this->usageService->getUserPlanName($user),
            'webhook_url' => $user->webhook_url ?? '',
            'webhook_enabled' => (bool) $user->webhook_enabled,
            'has_secret' => $activeSecret !== '',
            'secret_preview' => $activeSecret !== '' ? substr($activeSecret, 0, 10).'••••'.substr($activeSecret, -4) : null,
            'new_secret' => $newSecret,
        ], 'CRM webhook settings saved successfully.');
    }

    /**
     * Send a signed test event to verify the configured CRM webhook endpoint.
     */
    public function testWebhook(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->usageService->supportsFeature($user, 'crm_webhook')) {
            return $this->errorResponse(
                'CRM webhook integrations require the Business or Agency plan.',
                Response::HTTP_FORBIDDEN,
                ['upgrade_required' => true]
            );
        }

        try {
            $result = $this->webhookService->sendTest($user);
        } catch (InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (! $result['delivered']) {
            return $this->errorResponse(
                "Webhook endpoint returned HTTP {$result['status_code']}.",
                Response::HTTP_BAD_GATEWAY,
                $result
            );
        }

        return $this->successResponse($result, "Test webhook delivered (HTTP {$result['status_code']}).");
    }

    /**
     * Push an owned lead payload to the user's configured CRM webhook.
     */
    public function pushLead(Request $request, Lead $lead): JsonResponse
    {
        $user = $request->user();

        if ((int) $lead->user_id !== (int) $user->id) {
            return $this->errorResponse('Unauthorized access to this lead.', Response::HTTP_FORBIDDEN);
        }

        if (! $this->usageService->supportsFeature($user, 'crm_webhook')) {
            return $this->errorResponse(
                'CRM webhook push requires the Business or Agency plan.',
                Response::HTTP_FORBIDDEN,
                ['upgrade_required' => true]
            );
        }

        if (! $user->webhook_enabled || empty($user->webhook_url)) {
            return $this->errorResponse(
                'Enable and configure a CRM webhook URL in Settings before pushing leads.',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        try {
            $result = $this->webhookService->sendLead($user, $lead);
        } catch (InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (! $result['delivered']) {
            return $this->errorResponse(
                "CRM webhook returned HTTP {$result['status_code']}.",
                Response::HTTP_BAD_GATEWAY,
                $result
            );
        }

        return $this->successResponse($result, "Lead pushed to CRM webhook (HTTP {$result['status_code']}).");
    }
}
