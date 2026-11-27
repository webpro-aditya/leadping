<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class HealthController extends Controller
{
    /**
     * Basic readiness probe verifying DB and cache connectivity without exposing secrets.
     */
    public function __invoke(): JsonResponse
    {
        $dbHealthy = false;
        $cacheHealthy = false;

        try {
            DB::select('SELECT 1');
            $dbHealthy = true;
        } catch (Throwable) {
            $dbHealthy = false;
        }

        try {
            $probeKey = 'health_probe_'.now()->timestamp;
            Cache::put($probeKey, 'ok', 10);
            $cacheHealthy = Cache::get($probeKey) === 'ok';
            Cache::forget($probeKey);
        } catch (Throwable) {
            $cacheHealthy = false;
        }

        $ok = $dbHealthy && $cacheHealthy;

        return response()->json([
            'status' => $ok ? 'ok' : 'degraded',
            'checks' => [
                'database' => $dbHealthy ? 'up' : 'down',
                'cache' => $cacheHealthy ? 'up' : 'down',
            ],
            'timestamp' => now()->toIso8601String(),
        ], $ok ? Response::HTTP_OK : Response::HTTP_SERVICE_UNAVAILABLE);
    }
}
