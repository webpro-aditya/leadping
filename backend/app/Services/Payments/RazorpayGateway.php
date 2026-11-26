<?php

namespace App\Services\Payments;

use App\Exceptions\PaymentGatewayException;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class RazorpayGateway implements PaymentGatewayInterface
{
    protected string $keyId;

    protected string $keySecret;

    protected string $webhookSecret;

    protected string $currency;

    protected float $usdToInrRate;

    protected string $baseUrl;

    public function __construct(?array $config = null)
    {
        $cfg = $config ?? config('payments.gateways.razorpay', []);
        $this->keyId = (string) ($cfg['key_id'] ?? '');
        $this->keySecret = (string) ($cfg['key_secret'] ?? '');
        $this->webhookSecret = (string) ($cfg['webhook_secret'] ?? '');
        $this->currency = strtoupper((string) ($cfg['currency'] ?? 'INR'));
        $this->usdToInrRate = max(1.0, (float) ($cfg['usd_to_inr_rate'] ?? 85.0));
        $this->baseUrl = rtrim((string) ($cfg['base_url'] ?? 'https://api.razorpay.com/v1'), '/');
    }

    public function getName(): string
    {
        return 'razorpay';
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function convertUsdToSmallestUnit(float $usdAmount): int
    {
        $multiplier = $this->currency === 'INR' ? $this->usdToInrRate : 1.0;

        return max(100, (int) round($usdAmount * $multiplier * 100));
    }

    public function createCheckoutOrder(
        User $user,
        Plan $plan,
        int $amountInSmallestUnit,
        string $currency,
        array $metadata = []
    ): array {
        $this->ensureCredentialsConfigured();

        $receipt = 'lp_'.$user->id.'_'.$plan->id.'_'.Str::lower(Str::random(8));

        try {
            $response = Http::withBasicAuth($this->keyId, $this->keySecret)
                ->acceptJson()
                ->timeout(15)
                ->post("{$this->baseUrl}/orders", [
                    'amount' => $amountInSmallestUnit,
                    'currency' => $currency,
                    'receipt' => Str::limit($receipt, 40, ''),
                    'notes' => array_merge([
                        'user_id' => (string) $user->id,
                        'plan_id' => (string) $plan->id,
                        'plan_name' => $plan->name,
                    ], array_map('strval', $metadata)),
                ]);
        } catch (Throwable $e) {
            Log::error('Razorpay order creation connection failed', ['error' => $e->getMessage()]);
            throw new PaymentGatewayException(
                'Unable to reach Razorpay API. Please try again.',
                502,
                'gateway_connection_error',
                $e
            );
        }

        if ($response->failed()) {
            $errMsg = $response->json('error.description') ?? 'Failed to initialize Razorpay checkout order.';
            Log::warning('Razorpay order creation rejected', [
                'status' => $response->status(),
                'error' => $response->json('error'),
            ]);
            throw new PaymentGatewayException($errMsg, 502, 'gateway_order_failed');
        }

        $order = $response->json();
        $orderId = (string) ($order['id'] ?? '');
        if ($orderId === '') {
            throw new PaymentGatewayException('Razorpay returned an invalid order response.', 502, 'invalid_gateway_response');
        }

        return [
            'gateway' => $this->getName(),
            'order_id' => $orderId,
            'amount' => (int) ($order['amount'] ?? $amountInSmallestUnit),
            'currency' => (string) ($order['currency'] ?? $currency),
            'public_key' => $this->keyId,
            'checkout_payload' => [
                'key' => $this->keyId,
                'amount' => (int) ($order['amount'] ?? $amountInSmallestUnit),
                'currency' => (string) ($order['currency'] ?? $currency),
                'order_id' => $orderId,
                'name' => config('app.name', 'LeadPing AI'),
                'description' => "{$plan->display_name} Subscription Upgrade",
                'prefill' => [
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'notes' => $order['notes'] ?? [],
            ],
        ];
    }

    public function verifyPayment(array $payload): array
    {
        $this->ensureCredentialsConfigured();

        $orderId = (string) ($payload['gateway_order_id'] ?? $payload['razorpay_order_id'] ?? '');
        $paymentId = (string) ($payload['gateway_payment_id'] ?? $payload['razorpay_payment_id'] ?? '');
        $signature = (string) ($payload['gateway_signature'] ?? $payload['razorpay_signature'] ?? '');

        if ($orderId === '' || $paymentId === '' || $signature === '') {
            throw new PaymentGatewayException(
                'Missing Razorpay order_id, payment_id, or signature.',
                422,
                'invalid_verification_payload'
            );
        }

        $expectedSignature = hash_hmac('sha256', "{$orderId}|{$paymentId}", $this->keySecret);
        if (! hash_equals($expectedSignature, $signature)) {
            throw new PaymentGatewayException(
                'Payment signature verification failed.',
                400,
                'invalid_payment_signature'
            );
        }

        return [
            'verified' => true,
            'order_id' => $orderId,
            'payment_id' => $paymentId,
            'signature' => $signature,
            'metadata' => [
                'verified_via' => 'checkout_hmac',
            ],
        ];
    }

    public function verifyWebhook(string $rawPayload, array $headers): array
    {
        if ($this->webhookSecret === '') {
            throw new PaymentGatewayException(
                'Razorpay webhook secret is not configured.',
                503,
                'missing_webhook_secret'
            );
        }

        $normalizedHeaders = array_change_key_case($headers, CASE_LOWER);
        $rawSig = $normalizedHeaders['x-razorpay-signature'] ?? '';
        $signature = is_array($rawSig) ? (string) ($rawSig[0] ?? '') : (string) $rawSig;

        if ($signature === '') {
            throw new PaymentGatewayException('Missing X-Razorpay-Signature header.', 400, 'missing_webhook_signature');
        }

        $expectedSignature = hash_hmac('sha256', $rawPayload, $this->webhookSecret);
        if (! hash_equals($expectedSignature, $signature)) {
            throw new PaymentGatewayException('Invalid Razorpay webhook signature.', 401, 'invalid_webhook_signature');
        }

        $decoded = json_decode($rawPayload, true);
        if (! is_array($decoded)) {
            throw new PaymentGatewayException('Malformed webhook JSON payload.', 400, 'invalid_webhook_payload');
        }

        $event = (string) ($decoded['event'] ?? '');
        $paymentEntity = $decoded['payload']['payment']['entity'] ?? [];
        $orderEntity = $decoded['payload']['order']['entity'] ?? [];

        return [
            'event' => $event,
            'order_id' => (string) ($paymentEntity['order_id'] ?? $orderEntity['id'] ?? ''),
            'payment_id' => (string) ($paymentEntity['id'] ?? ''),
            'status' => (string) ($paymentEntity['status'] ?? $orderEntity['status'] ?? ''),
            'payload' => $decoded,
        ];
    }

    protected function ensureCredentialsConfigured(): void
    {
        if ($this->keyId === '' || $this->keySecret === '') {
            throw new PaymentGatewayException(
                'Razorpay API credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.',
                422,
                'missing_gateway_credentials'
            );
        }
    }
}
