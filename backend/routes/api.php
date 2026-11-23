<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanyAnalysisController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\UsageController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

// Public Authentication Routes (Rate limited to 60 req/min)
Route::middleware('throttle:auth')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login'])->name('login');
});

// Protected Routes (Sanctum Authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth Management
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/auth/me', [AuthController::class, 'user']);

    // AI Company Analysis (Rate limited to 30 req/min)
    Route::post('/analyze/company', [CompanyAnalysisController::class, 'analyze'])
        ->middleware('throttle:ai');

    // Lead Operations with AI (Rate limited to 30 req/min)
    Route::post('/leads/{lead}/outreach', [LeadController::class, 'outreach'])
        ->middleware('throttle:ai');
    Route::post('/leads/{lead}/rescore', [LeadController::class, 'rescore'])
        ->middleware('throttle:ai');

    // Leads Export
    Route::get('/leads-export', [LeadController::class, 'export']);

    // Lead CRUD
    Route::apiResource('leads', LeadController::class);

    // Usage & Quotas
    Route::get('/usage', [UsageController::class, 'index']);

    // Subscription & Plans
    Route::get('/subscription', [SubscriptionController::class, 'show']);
    Route::get('/plans', [SubscriptionController::class, 'plans']);
});
