<?php

namespace App\Repositories\Contracts;

use App\Models\PaymentTransaction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface PaymentTransactionRepositoryInterface
{
    public function create(array $data): PaymentTransaction;

    public function findByGatewayOrderId(string $gateway, string $orderId): ?PaymentTransaction;

    public function markAsPaid(
        PaymentTransaction $transaction,
        string $paymentId,
        ?string $signature = null,
        ?int $subscriptionId = null,
        array $metadata = []
    ): PaymentTransaction;

    public function markAsFailed(PaymentTransaction $transaction, array $metadata = []): PaymentTransaction;

    public function listForUser(int $userId, int $perPage = 15): LengthAwarePaginator;
}
