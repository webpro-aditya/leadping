<?php

return [
    'default' => env('AI_PROVIDER', 'openai'),

    'providers' => [
        'openai' => [
            'api_key' => env('OPENAI_API_KEY'),
            'organization' => env('OPENAI_ORGANIZATION'),
            'model' => env('AI_MODEL', 'gpt-4o-mini'),
            'max_tokens' => (int) env('AI_MAX_TOKENS', 4096),
        ],
    ],
];
