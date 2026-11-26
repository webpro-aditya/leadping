<?php

namespace App\Repositories\Eloquent;

use App\Models\PaymentTransaction;
use App\Repositories\Contracts\PaymentTransactionRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class EloquentPaymentTransactionRepository implements PaymentTransactionRepositoryInterface
{
    public function create(array $data): PaymentTransaction
    {
        return PaymentTransaction::create($data);
    }

    public function findByGatewayOrderId(string $gateway, string $orderId): ?PaymentTransaction
    {
        return PaymentTransaction::where('gateway', $gateway)
            ->where('gateway_order_id', $orderId)
            ->with(['plan', 'user'])
            ->first();
    }

    public function markAsPaid(
        PaymentTransaction $transaction,
        string $paymentId,
        ?string $signature = null,
        ?int $subscriptionId = null,
        array $metadata = []
    ): PaymentTransaction {
        $mergedMetadata = array_merge($transaction->metadata ?? [], $metadata);

        $transaction->update([
            'status' => 'paid',
            'gateway_payment_id' => $paymentId,
            'gateway_signature' => $signature,
            'subscription_id' => $subscriptionId ?? $transaction->subscription_id,
            'metadata' => $mergedMetadata,
            'paid_at' => $transaction->paid_at ?? now(),
        ]);

        return $transaction->fresh(['plan', 'subscription']);
    }

    public function markAsFailed(PaymentTransaction $transaction, array $metadata = []): PaymentTransaction
    {
        $mergedMetadata = array_merge($transaction->metadata ?? [], $metadata);

        $transaction->update([
            'status' => 'failed',
            'metadata' => $mergedMetadata,
        ]);

        return $transaction->fresh();
    }

    public function listForUser(int $userId, int $perPage = 15): LengthAwarePaginator
    {
        return PaymentTransaction::where('user_id', $userId)
            ->with(['plan:id,name,display_name,price_monthly'])
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }
}
