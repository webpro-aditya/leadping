<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default Payment Gateway
    |--------------------------------------------------------------------------
    |
    | Switch active payment provider by changing PAYMENT_GATEWAY in .env.
    |
    */
    'default' => env('PAYMENT_GATEWAY', 'razorpay'),

    /*
    |--------------------------------------------------------------------------
    | Annual Discount Percentage
    |--------------------------------------------------------------------------
    */
    'annual_discount_percent' => (float) env('PAYMENT_ANNUAL_DISCOUNT', 20),

    /*
    |--------------------------------------------------------------------------
    | Configured Payment Gateways
    |--------------------------------------------------------------------------
    */
    'gateways' => [
        'razorpay' => [
            'label' => 'Razorpay',
            'key_id' => env('RAZORPAY_KEY_ID', ''),
            'key_secret' => env('RAZORPAY_KEY_SECRET', ''),
            'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET', ''),
            'currency' => strtoupper((string) env('RAZORPAY_CURRENCY', 'INR')),
            'usd_to_inr_rate' => (float) env('RAZORPAY_USD_TO_INR_RATE', 85.0),
            'base_url' => rtrim((string) env('RAZORPAY_BASE_URL', 'https://api.razorpay.com/v1'), '/'),
        ],
    ],
];
