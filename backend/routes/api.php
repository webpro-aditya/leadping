<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanyAnalysisController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\UsageController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Authentication Routes (Rate limited to 10 req/min per IP+email)
Route::middleware('throttle:auth')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login'])->name('login');
});

// Signed Payment Webhooks (verified via provider HMAC signature)
Route::post('/payments/webhook/{gateway}', [PaymentController::class, 'webhook'])
    ->middleware('throttle:api');

// Protected Routes (Sanctum Authentication + API Rate Limit)
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    // Auth Management
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/auth/me', [AuthController::class, 'user']);

    // AI Company Analysis (Rate limited to 30 req/min)
    Route::post('/analyze/company', [CompanyAnalysisController::class, 'analyze'])
        ->middleware('throttle:ai');
    Route::get('/analyze/jobs/{jobId}', [CompanyAnalysisController::class, 'jobStatus']);

    // Lead Operations with AI (Rate limited to 30 req/min)
    Route::post('/leads/{lead}/outreach', [LeadController::class, 'outreach'])
        ->middleware('throttle:ai');
    Route::post('/leads/{lead}/rescore', [LeadController::class, 'rescore'])
        ->middleware('throttle:ai');

    // Leads Stats, Export & Bulk Actions (registered before apiResource to prevent {lead} collision)
    Route::get('/leads-stats', [LeadController::class, 'stats']);
    Route::get('/leads/stats', [LeadController::class, 'stats']);
    Route::get('/leads-export', [LeadController::class, 'export']);
    Route::get('/leads/export', [LeadController::class, 'export']);
    Route::post('/leads/bulk-delete', [LeadController::class, 'bulkDelete']);

    // Lead CRUD
    Route::apiResource('leads', LeadController::class);

    // Usage & Quotas
    Route::get('/usage', [UsageController::class, 'index']);

    // Subscription & Plans
    Route::get('/subscription', [SubscriptionController::class, 'show']);
    Route::get('/plans', [SubscriptionController::class, 'plans']);

    // Payment Gateways & Upgrades
    Route::get('/payments/gateways', [PaymentController::class, 'gateways']);
    Route::post('/payments/checkout', [PaymentController::class, 'createCheckout']);
    Route::post('/payments/verify', [PaymentController::class, 'verifyPayment']);
    Route::get('/payments/transactions', [PaymentController::class, 'transactions']);
});
