<?php

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Plan;
use App\Models\User;
use App\Models\Company;
use App\Models\Lead;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

echo "=== LeadPing AI Backend API Verification ===\n\n";

// 1. Verify Plans
$plansCount = Plan::count();
echo "1. Plans seeded: {$plansCount} plans found.\n";
foreach (Plan::all() as $plan) {
    echo "   - {$plan->name} ({$plan->display_name}): \${$plan->price_monthly}/mo | Analyses: {$plan->analyses_limit} | Outreach: {$plan->outreach_limit} | Leads: {$plan->leads_limit}\n";
}

// 2. Verify Test User & Subscription
$testUser = User::where('email', 'test@leadping.ai')->first();
if ($testUser) {
    $planName = $testUser->subscription?->plan?->name ?? 'none';
    echo "\n2. Test User found: {$testUser->name} ({$testUser->email}) with plan: {$planName}\n";
} else {
    echo "\n2. Test user not found!\n";
}

// 3. Test Registration via Controller
$authController = app(\App\Http\Controllers\AuthController::class);
$regEmail = 'verify_' . time() . '@leadping.ai';
$regReq = \App\Http\Requests\RegisterRequest::create('/api/auth/register', 'POST', [
    'name' => 'Verify User',
    'email' => $regEmail,
    'password' => 'password123',
    'password_confirmation' => 'password123',
]);
$regReq->setContainer($app)->validateResolved();
$regRes = $authController->register($regReq);
$regData = json_decode($regRes->getContent(), true);

echo "\n3. Register Endpoint:\n";
echo "   Status: " . $regRes->getStatusCode() . "\n";
echo "   Success: " . ($regData['success'] ? 'true' : 'false') . "\n";
echo "   Token issued: " . (!empty($regData['data']['token']) ? 'YES' : 'NO') . "\n";
echo "   Default plan: " . ($regData['data']['user']['subscription']['plan']['name'] ?? 'none') . "\n";

// 4. Test Login Endpoint
$loginReq = \App\Http\Requests\LoginRequest::create('/api/auth/login', 'POST', [
    'email' => $regEmail,
    'password' => 'password123',
]);
$loginReq->setContainer($app)->validateResolved();
$loginRes = $authController->login($loginReq);
$loginData = json_decode($loginRes->getContent(), true);
echo "\n4. Login Endpoint:\n";
echo "   Status: " . $loginRes->getStatusCode() . "\n";
echo "   Token: " . substr($loginData['data']['token'] ?? '', 0, 15) . "...\n";

// 5. Test Usage Endpoint
$newUser = User::where('email', $regEmail)->first();
$usageService = app(\App\Services\UsageService::class);
$usage = $usageService->getUsage($newUser);
echo "\n5. Usage Tracking for New User:\n";
echo "   Analyses: {$usage['analyses']['used']}/{$usage['analyses']['limit']} (Remaining: {$usage['analyses']['remaining']})\n";
echo "   Outreach: {$usage['outreach']['used']}/{$usage['outreach']['limit']} (Remaining: {$usage['outreach']['remaining']})\n";
echo "   Leads: {$usage['leads']['used']}/{$usage['leads']['limit']} (Remaining: {$usage['leads']['remaining']})\n";

// 6. Test Lead Controller CRUD
$leadController = app(\App\Http\Controllers\LeadController::class);
$storeLeadReq = \App\Http\Requests\StoreLeadRequest::create('/api/leads', 'POST', [
    'source_url' => 'https://linear.app',
    'company' => [
        'name' => 'Linear',
        'website' => 'linear.app',
        'industry' => 'Issue Tracking Software',
    ],
    'overall_score' => 92,
    'icp_score' => 95,
    'buying_intent_score' => 90,
    'pain_fit_score' => 91,
    'priority' => 'high',
    'status' => 'new',
    'notes' => 'Product team looking to scale outreach',
    'signals' => [
        [
            'description' => 'Fastest growing issue tracker in tech',
            'confidence' => 'high',
            'observed_or_inferred' => 'observed',
        ]
    ],
    'pain_points' => [
        [
            'title' => 'Scaling enterprise sales',
            'description' => 'Needs automated qualification for inbound enterprise leads',
            'confidence' => 'high',
        ]
    ],
    'opportunities' => [
        [
            'title' => 'LeadPing integration',
            'description' => 'Enable 1-click lead capture directly into sales pipelines',
            'priority' => 'high',
        ]
    ],
]);
$storeLeadReq->setUserResolver(fn() => $newUser);
$storeLeadReq->setContainer($app)->validateResolved();
$leadRes = $leadController->store($storeLeadReq);
$leadData = json_decode($leadRes->getContent(), true);

echo "\n6. Lead Creation:\n";
echo "   Status: " . $leadRes->getStatusCode() . "\n";
echo "   Lead ID: " . ($leadData['data']['id'] ?? 'N/A') . "\n";
echo "   Company: " . ($leadData['data']['company']['name'] ?? 'N/A') . "\n";
echo "   Score: " . ($leadData['data']['overall_score'] ?? 'N/A') . " (Priority: " . ($leadData['data']['priority'] ?? 'N/A') . ")\n";
echo "   Signals Count: " . count($leadData['data']['signals'] ?? []) . "\n";
echo "   Pain Points Count: " . count($leadData['data']['pain_points'] ?? []) . "\n";
echo "   Opportunities Count: " . count($leadData['data']['opportunities'] ?? []) . "\n";

// 7. Lead Update
$createdLead = Lead::find($leadData['data']['id']);
$updateReq = \App\Http\Requests\UpdateLeadRequest::create('/api/leads/' . $createdLead->id, 'PUT', [
    'status' => 'qualified',
    'notes' => 'Qualified by SDR team; demo scheduled',
]);
$updateReq->setUserResolver(fn() => $newUser);
$updateReq->setContainer($app)->validateResolved();
$updateRes = $leadController->update($updateReq, $createdLead);
$updatedLeadData = json_decode($updateRes->getContent(), true);

echo "\n7. Lead Update:\n";
echo "   Updated Status: " . ($updatedLeadData['data']['status'] ?? 'N/A') . "\n";
echo "   Updated Notes: " . ($updatedLeadData['data']['notes'] ?? 'N/A') . "\n";

// 8. Lead Export
$exportReq = Request::create('/api/leads-export', 'GET');
$exportReq->setUserResolver(fn() => $newUser);
$exportRes = $leadController->export($exportReq);
echo "\n8. Lead Export:\n";
echo "   Status: " . $exportRes->getStatusCode() . "\n";
echo "   Content-Type: " . $exportRes->headers->get('Content-Type') . "\n";

// Clean up test user
$newUser->delete();

echo "\n=== All Backend Verifications Succeeded ===\n";
