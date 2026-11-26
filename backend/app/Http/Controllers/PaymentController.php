<?php

namespace App\Http\Controllers;

use App\Exceptions\PaymentGatewayException;
use App\Http\Requests\CreateCheckoutRequest;
use App\Http\Requests\VerifyPaymentRequest;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\SubscriptionUpgradeService;
use App\Traits\ApiResponse;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected SubscriptionUpgradeService $upgradeService,
        protected PaymentGatewayManager $gatewayManager
    ) {}

    /**
     * List configured payment gateways and the default active gateway.
     */
    public function gateways(): JsonResponse
    {
        return $this->successResponse([
            'default_gateway' => $this->gatewayManager->getDefaultDriver(),
            'gateways' => $this->gatewayManager->availableGateways(),
        ], 'Payment gateways retrieved successfully');
    }

    /**
     * Create a gateway checkout order for upgrading a user's subscription plan.
     */
    public function createCheckout(CreateCheckoutRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $checkout = $this->upgradeService->initiateUpgrade(
                $request->user(),
                $validated['plan'],
                $validated['billing_cycle'] ?? 'monthly',
                $validated['gateway'] ?? null
            );

            return $this->successResponse($checkout, 'Checkout order created successfully', Response::HTTP_CREATED);
        } catch (PaymentGatewayException $e) {
            return $this->errorResponse(
                $e->getMessage(),
                $e->getStatusCode(),
                array_filter(['error_code' => $e->getErrorCode()])
            );
        } catch (Exception $e) {
            Log::error('Payment checkout initialization failed', ['error' => $e->getMessage()]);

            return $this->errorResponse(
                config('app.debug') ? 'Failed to initiate payment checkout: '.$e->getMessage() : 'Failed to initiate payment checkout. Please try again.',
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Verify payment callback signature and activate the upgraded subscription.
     */
    public function verifyPayment(VerifyPaymentRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            $result = $this->upgradeService->verifyAndCompleteUpgrade(
                $request->user(),
                $validated,
                $validated['gateway'] ?? null
            );

            return $this->successResponse([
                'transaction' => $result['transaction'],
                'subscription' => $result['subscription'],
                'plan' => $result['subscription']?->plan,
                'already_processed' => $result['already_processed'],
            ], 'Subscription upgraded successfully');
        } catch (PaymentGatewayException $e) {
            return $this->errorResponse(
                $e->getMessage(),
                $e->getStatusCode(),
                array_filter(['error_code' => $e->getErrorCode()])
            );
        } catch (Exception $e) {
            Log::error('Payment verification failed', ['error' => $e->getMessage()]);

            return $this->errorResponse(
                config('app.debug') ? 'Failed to verify payment: '.$e->getMessage() : 'Failed to verify payment. Please contact support.',
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * List authenticated user's payment transactions.
     */
    public function transactions(Request $request): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->input('per_page', 15)));
        $transactions = $this->upgradeService->getPaymentHistory($request->user(), $perPage);

        return $this->successResponse($transactions, 'Payment transactions retrieved successfully');
    }

    /**
     * Handle asynchronous payment gateway webhooks (verified via HMAC signature).
     */
    public function webhook(Request $request, string $gateway): JsonResponse
    {
        try {
            $result = $this->upgradeService->handleWebhook(
                $gateway,
                $request->getContent(),
                $request->headers->all()
            );

            return $this->successResponse($result, 'Webhook processed');
        } catch (PaymentGatewayException $e) {
            return $this->errorResponse(
                $e->getMessage(),
                $e->getStatusCode(),
                array_filter(['error_code' => $e->getErrorCode()])
            );
        } catch (Exception $e) {
            Log::error('Payment webhook handling failed', ['gateway' => $gateway, 'error' => $e->getMessage()]);

            return $this->errorResponse('Webhook processing error', Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
