<?php

namespace App\Services\Payments;

use App\Models\Plan;
use App\Models\User;

interface PaymentGatewayInterface
{
    /**
     * Unique gateway identifier (e.g. 'razorpay', 'stripe').
     */
    public function getName(): string;

    /**
     * Target currency configured for this gateway (e.g. 'INR', 'USD').
     */
    public function getCurrency(): string;

    /**
     * Convert a USD plan price into the gateway's smallest currency unit (e.g. paise / cents).
     */
    public function convertUsdToSmallestUnit(float $usdAmount): int;

    /**
     * Create a checkout order/session on the provider and return standardized checkout metadata.
     */
    public function createCheckoutOrder(
        User $user,
        Plan $plan,
        int $amountInSmallestUnit,
        string $currency,
        array $metadata = []
    ): array;

    /**
     * Verify a client payment callback payload and return normalized payment confirmation details.
     */
    public function verifyPayment(array $payload): array;

    /**
     * Verify a signed provider webhook payload and return normalized event info.
     */
    public function verifyWebhook(string $rawPayload, array $headers): array;
}
