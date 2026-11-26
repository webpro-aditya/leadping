<?php

namespace App\Services;

use App\Exceptions\PaymentGatewayException;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Repositories\Contracts\PaymentTransactionRepositoryInterface;
use App\Repositories\Contracts\SubscriptionRepositoryInterface;
use App\Services\Payments\PaymentGatewayInterface;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SubscriptionUpgradeService
{
    public function __construct(
        protected PaymentGatewayManager $gatewayManager,
        protected PaymentTransactionRepositoryInterface $transactionRepository,
        protected SubscriptionRepositoryInterface $subscriptionRepository
    ) {}

    /**
     * Initiate a checkout order for upgrading a user's subscription plan.
     */
    public function initiateUpgrade(
        User $user,
        int|string $planIdentifier,
        string $billingCycle = 'monthly',
        ?string $gatewayName = null
    ): array {
        $gateway = $this->resolveGateway($gatewayName);
        $plan = $this->subscriptionRepository->findActivePlan($planIdentifier);

        if (! $plan) {
            throw new PaymentGatewayException('Selected subscription plan was not found.', 404, 'plan_not_found');
        }

        if ((float) $plan->price_monthly <= 0) {
            throw new PaymentGatewayException('Free plan does not require payment checkout.', 422, 'free_plan_checkout_not_allowed');
        }

        $normalizedCycle = $billingCycle === 'annual' ? 'annual' : 'monthly';
        $usdTotal = $this->calculateUsdPrice((float) $plan->price_monthly, $normalizedCycle);
        $currency = $gateway->getCurrency();
        $amountSmallestUnit = $gateway->convertUsdToSmallestUnit($usdTotal);

        $order = $gateway->createCheckoutOrder($user, $plan, $amountSmallestUnit, $currency, [
            'billing_cycle' => $normalizedCycle,
            'usd_amount' => number_format($usdTotal, 2, '.', ''),
        ]);

        $transaction = $this->transactionRepository->create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'gateway' => $gateway->getName(),
            'billing_cycle' => $normalizedCycle,
            'amount' => $order['amount'],
            'currency' => $order['currency'],
            'gateway_order_id' => $order['order_id'],
            'status' => 'pending',
            'metadata' => [
                'usd_amount' => $usdTotal,
                'plan_name' => $plan->name,
            ],
        ]);

        return [
            'transaction_id' => $transaction->id,
            'gateway' => $gateway->getName(),
            'order_id' => $order['order_id'],
            'amount' => $order['amount'],
            'currency' => $order['currency'],
            'public_key' => $order['public_key'],
            'billing_cycle' => $normalizedCycle,
            'plan' => $plan,
            'checkout_payload' => $order['checkout_payload'],
        ];
    }

    /**
     * Verify payment callback and atomically activate the upgraded subscription plan.
     */
    public function verifyAndCompleteUpgrade(
        User $user,
        array $payload,
        ?string $gatewayName = null
    ): array {
        $gateway = $this->resolveGateway($gatewayName);
        $verification = $gateway->verifyPayment($payload);
        $orderId = $verification['order_id'];

        $transaction = $this->transactionRepository->findByGatewayOrderId($gateway->getName(), $orderId);
        if (! $transaction) {
            throw new PaymentGatewayException('Payment order record not found.', 404, 'transaction_not_found');
        }

        if ((int) $transaction->user_id !== (int) $user->id) {
            throw new PaymentGatewayException('Unauthorized access to payment order.', 403, 'unauthorized_transaction');
        }

        return $this->finalizeSuccessfulTransaction($transaction, $verification['payment_id'], $verification['signature'], $verification['metadata']);
    }

    /**
     * Verify and reconcile asynchronous gateway webhooks (idempotent).
     */
    public function handleWebhook(string $gatewayName, string $rawPayload, array $headers): array
    {
        $gateway = $this->resolveGateway($gatewayName);
        $event = $gateway->verifyWebhook($rawPayload, $headers);
        $orderId = $event['order_id'];

        if ($orderId === '') {
            return ['handled' => false, 'reason' => 'No order_id in webhook payload'];
        }

        $transaction = $this->transactionRepository->findByGatewayOrderId($gateway->getName(), $orderId);
        if (! $transaction) {
            return ['handled' => false, 'reason' => 'Transaction not found locally'];
        }

        if (in_array($event['event'], ['payment.captured', 'order.paid'], true)) {
            $result = $this->finalizeSuccessfulTransaction(
                $transaction,
                $event['payment_id'] ?: ($transaction->gateway_payment_id ?? 'webhook_'.$orderId),
                $transaction->gateway_signature,
                ['webhook_event' => $event['event']]
            );

            return [
                'handled' => true,
                'status' => 'paid',
                'transaction_id' => $result['transaction']->id,
            ];
        }

        if ($event['event'] === 'payment.failed' && $transaction->status === 'pending') {
            $this->transactionRepository->markAsFailed($transaction, [
                'webhook_event' => 'payment.failed',
                'gateway_payment_id' => $event['payment_id'] ?? null,
            ]);

            return [
                'handled' => true,
                'status' => 'failed',
                'transaction_id' => $transaction->id,
            ];
        }

        return ['handled' => false, 'event' => $event['event']];
    }

    public function getPaymentHistory(User $user, int $perPage = 15): LengthAwarePaginator
    {
        return $this->transactionRepository->listForUser($user->id, $perPage);
    }

    /**
     * Compute authoritative USD total server-side from plan pricing and billing cycle.
     */
    public function calculateUsdPrice(float $monthlyPrice, string $billingCycle): float
    {
        if ($billingCycle === 'annual') {
            $discount = max(0.0, min(90.0, (float) config('payments.annual_discount_percent', 20)));

            return round($monthlyPrice * 12 * ((100 - $discount) / 100), 2);
        }

        return round($monthlyPrice, 2);
    }

    protected function resolveGateway(?string $gatewayName): PaymentGatewayInterface
    {
        try {
            return $this->gatewayManager->driver($gatewayName);
        } catch (InvalidArgumentException $e) {
            throw new PaymentGatewayException($e->getMessage(), 422, 'unsupported_gateway', $e);
        }
    }

    protected function finalizeSuccessfulTransaction(
        PaymentTransaction $transaction,
        string $paymentId,
        ?string $signature,
        array $metadata
    ): array {
        $lock = Cache::lock("payment_finalize_{$transaction->id}", 15);

        return $lock->block(5, function () use ($transaction, $paymentId, $signature, $metadata) {
            $fresh = $transaction->fresh(['plan', 'user', 'subscription']);

            // Idempotent return if already completed (e.g. webhook + client verify race)
            if ($fresh->status === 'paid') {
                return [
                    'transaction' => $fresh,
                    'subscription' => $fresh->subscription?->load('plan') ?? $fresh->user->subscription?->load('plan'),
                    'already_processed' => true,
                ];
            }

            return DB::transaction(function () use ($fresh, $paymentId, $signature, $metadata) {
                $subscription = $this->subscriptionRepository->activatePlanForUser(
                    $fresh->user,
                    $fresh->plan,
                    $fresh->billing_cycle
                );

                $updatedTx = $this->transactionRepository->markAsPaid(
                    $fresh,
                    $paymentId,
                    $signature,
                    $subscription->id,
                    $metadata
                );

                return [
                    'transaction' => $updatedTx,
                    'subscription' => $subscription,
                    'already_processed' => false,
                ];
            });
        });
    }
}
