<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use App\Services\Payments\PaymentGatewayInterface;
use App\Services\Payments\PaymentGatewayManager;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RazorpayPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected string $keyId = 'rzp_test_leadping123';

    protected string $keySecret = 'secret_test_razorpay_key';

    protected string $webhookSecret = 'webhook_secret_razorpay';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);

        config([
            'payments.default' => 'razorpay',
            'payments.annual_discount_percent' => 20,
            'payments.gateways.razorpay' => [
                'label' => 'Razorpay',
                'key_id' => $this->keyId,
                'key_secret' => $this->keySecret,
                'webhook_secret' => $this->webhookSecret,
                'currency' => 'INR',
                'usd_to_inr_rate' => 85.0,
                'base_url' => 'https://api.razorpay.com/v1',
            ],
        ]);

        $freePlan = Plan::where('name', 'free')->first();
        $this->user = User::factory()->create();
        $this->user->subscriptions()->create([
            'plan_id' => $freePlan->id,
            'status' => 'active',
            'starts_at' => now(),
        ]);
    }

    public function test_gateways_endpoint_returns_configured_razorpay_gateway(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/payments/gateways')
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'default_gateway' => 'razorpay',
                    'gateways' => [[
                        'id' => 'razorpay',
                        'configured' => true,
                        'is_default' => true,
                    ]],
                ],
            ]);
    }

    public function test_checkout_rejects_free_plan_and_creates_annual_discounted_order(): void
    {
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/payments/checkout', ['plan' => 'free'])
            ->assertStatus(422);

        // Annual Pro ($19 * 12 * 0.80 = $182.40 -> * 85 * 100 = 1550400 paise)
        $expectedPaise = (int) round(19.00 * 12 * 0.80 * 85.0 * 100);

        Http::fake([
            'https://api.razorpay.com/v1/orders' => Http::response([
                'id' => 'order_RzpAnnual123',
                'amount' => $expectedPaise,
                'currency' => 'INR',
                'notes' => ['plan_name' => 'pro'],
            ], 200),
        ]);

        $res = $this->actingAs($this->user, 'sanctum')->postJson('/api/payments/checkout', [
            'plan' => 'pro',
            'billing_cycle' => 'annual',
        ]);

        $res->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'gateway' => 'razorpay',
                    'order_id' => 'order_RzpAnnual123',
                    'amount' => $expectedPaise,
                    'currency' => 'INR',
                    'public_key' => $this->keyId,
                    'billing_cycle' => 'annual',
                ],
            ]);

        $this->assertDatabaseHas('payment_transactions', [
            'user_id' => $this->user->id,
            'gateway' => 'razorpay',
            'gateway_order_id' => 'order_RzpAnnual123',
            'amount' => $expectedPaise,
            'status' => 'pending',
        ]);
    }

    public function test_payment_verification_enforces_hmac_idor_and_upgrades_subscription_idempotently(): void
    {
        $expectedPaise = (int) round(19.00 * 85.0 * 100);

        Http::fake([
            'https://api.razorpay.com/v1/orders' => Http::response([
                'id' => 'order_RzpVerify01',
                'amount' => $expectedPaise,
                'currency' => 'INR',
            ], 200),
        ]);

        $this->actingAs($this->user, 'sanctum')->postJson('/api/payments/checkout', [
            'plan' => 'pro',
            'billing_cycle' => 'monthly',
        ])->assertStatus(201);

        $paymentId = 'pay_RzpSuccess01';
        $validSig = hash_hmac('sha256', "order_RzpVerify01|{$paymentId}", $this->keySecret);

        // 1. Tampered signature rejected
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/payments/verify', [
                'razorpay_order_id' => 'order_RzpVerify01',
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature' => 'invalid_signature',
            ])
            ->assertStatus(400)
            ->assertJsonPath('data.error_code', 'invalid_payment_signature');

        // 2. IDOR attempt by another user blocked even with valid signature
        $otherUser = User::factory()->create();
        $this->actingAs($otherUser, 'sanctum')
            ->postJson('/api/payments/verify', [
                'razorpay_order_id' => 'order_RzpVerify01',
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature' => $validSig,
            ])
            ->assertStatus(403);

        // 3. Valid owner verification upgrades subscription and updates usage limits
        $verifyRes = $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/payments/verify', [
                'razorpay_order_id' => 'order_RzpVerify01',
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature' => $validSig,
            ]);

        $verifyRes->assertStatus(200)
            ->assertJsonPath('data.plan.name', 'pro')
            ->assertJsonPath('data.already_processed', false);

        // 4. Duplicate callback is idempotent
        $this->actingAs($this->user, 'sanctum')
            ->postJson('/api/payments/verify', [
                'razorpay_order_id' => 'order_RzpVerify01',
                'razorpay_payment_id' => $paymentId,
                'razorpay_signature' => $validSig,
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.already_processed', true);

        // 5. Usage endpoint reflects Pro plan limits (100 analyses / mo)
        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/usage')
            ->assertStatus(200)
            ->assertJsonPath('data.analyses.limit', 100);

        // 6. Transaction history lists the paid transaction without exposing signature
        $txList = $this->actingAs($this->user, 'sanctum')->getJson('/api/payments/transactions');
        $txList->assertStatus(200)->assertJsonCount(1, 'data.data');
        $this->assertArrayNotHasKey('gateway_signature', $txList->json('data.data.0'));
    }

    public function test_razorpay_webhook_verifies_signature_and_activates_plan(): void
    {
        Http::fake([
            'https://api.razorpay.com/v1/orders' => Http::response([
                'id' => 'order_RzpWebhook01',
                'amount' => 416500,
                'currency' => 'INR',
            ], 200),
        ]);

        $this->actingAs($this->user, 'sanctum')->postJson('/api/payments/checkout', [
            'plan' => 'business',
            'billing_cycle' => 'monthly',
        ])->assertStatus(201);

        $rawBody = json_encode([
            'event' => 'payment.captured',
            'payload' => [
                'payment' => [
                    'entity' => [
                        'id' => 'pay_WebhookCap01',
                        'order_id' => 'order_RzpWebhook01',
                        'status' => 'captured',
                    ],
                ],
            ],
        ]);

        // Bad webhook signature rejected
        $this->call('POST', '/api/payments/webhook/razorpay', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => 'tampered',
        ], $rawBody)->assertStatus(401);

        // Valid signed webhook completes upgrade
        $sig = hash_hmac('sha256', $rawBody, $this->webhookSecret);
        $this->call('POST', '/api/payments/webhook/razorpay', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => $sig,
        ], $rawBody)
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'paid');

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/subscription')
            ->assertStatus(200)
            ->assertJsonPath('data.plan.name', 'business');
    }

    public function test_gateway_manager_supports_plugging_and_switching_multiple_gateways(): void
    {
        $manager = app(PaymentGatewayManager::class);
        $manager->extend('custom_gw', fn () => new class implements PaymentGatewayInterface
        {
            public function getName(): string
            {
                return 'custom_gw';
            }

            public function getCurrency(): string
            {
                return 'USD';
            }

            public function convertUsdToSmallestUnit(float $usdAmount): int
            {
                return (int) round($usdAmount * 100);
            }

            public function createCheckoutOrder(User $user, Plan $plan, int $amountInSmallestUnit, string $currency, array $metadata = []): array
            {
                return [
                    'gateway' => 'custom_gw',
                    'order_id' => 'cust_ord_1',
                    'amount' => $amountInSmallestUnit,
                    'currency' => 'USD',
                    'public_key' => 'pk_custom',
                    'checkout_payload' => ['order_id' => 'cust_ord_1'],
                ];
            }

            public function verifyPayment(array $payload): array
            {
                return [
                    'verified' => true,
                    'order_id' => $payload['gateway_order_id'],
                    'payment_id' => $payload['gateway_payment_id'],
                    'signature' => $payload['gateway_signature'],
                    'metadata' => [],
                ];
            }

            public function verifyWebhook(string $rawPayload, array $headers): array
            {
                return ['event' => 'none', 'order_id' => '', 'payment_id' => '', 'status' => '', 'payload' => []];
            }
        });

        $checkout = $this->actingAs($this->user, 'sanctum')->postJson('/api/payments/checkout', [
            'plan' => 'agency',
            'billing_cycle' => 'monthly',
            'gateway' => 'custom_gw',
        ]);

        $checkout->assertStatus(201)
            ->assertJsonPath('data.gateway', 'custom_gw')
            ->assertJsonPath('data.amount', 9900)
            ->assertJsonPath('data.currency', 'USD');

        $this->actingAs($this->user, 'sanctum')->postJson('/api/payments/verify', [
            'gateway' => 'custom_gw',
            'gateway_order_id' => 'cust_ord_1',
            'gateway_payment_id' => 'cust_pay_1',
            'gateway_signature' => 'cust_sig_1',
        ])
            ->assertStatus(200)
            ->assertJsonPath('data.plan.name', 'agency');
    }
}
