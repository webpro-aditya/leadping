<?php

require_once __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

use App\Services\AI\AIManager;
use App\Services\AI\AIProviderInterface;
use App\Services\AI\OpenAIProvider;
use App\Services\CompanyAnalysisService;
use App\Services\UsageService;
use Illuminate\Contracts\Console\Kernel;

echo "=== Verifying AI Provider & Services Architecture ===\n";

$aiManager = app(AIManager::class);
$provider = $aiManager->provider();

if ($provider instanceof AIProviderInterface) {
    echo "1. AIManager resolves to AIProviderInterface: SUCCESS\n";
} else {
    echo "1. AIManager failed interface check!\n";
}

if ($provider instanceof OpenAIProvider) {
    echo "2. Default provider is OpenAIProvider: SUCCESS\n";
}

$analysisService = app(CompanyAnalysisService::class);
echo "3. CompanyAnalysisService instantiated cleanly with dependencies: SUCCESS\n";

$usageService = app(UsageService::class);
echo "4. UsageService instantiated cleanly: SUCCESS\n";

echo "=== AI Architecture Verification Complete ===\n";
