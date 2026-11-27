<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;

class CrmWebhookService
{
    /**
     * Validate webhook URL and guard against SSRF targets.
     */
    public function validateWebhookUrl(string $url): string
    {
        $trimmed = trim($url);
        $parts = parse_url($trimmed);

        if (! $parts || empty($parts['scheme']) || empty($parts['host'])) {
            throw new InvalidArgumentException('Invalid webhook URL.');
        }

        $scheme = strtolower($parts['scheme']);
        if (! in_array($scheme, ['https', 'http'], true)) {
            throw new InvalidArgumentException('Webhook URL must use HTTP or HTTPS.');
        }

        if (app()->environment('production') && $scheme !== 'https') {
            throw new InvalidArgumentException('Webhook URL must use HTTPS in production.');
        }

        $host = strtolower(trim($parts['host'], '[]'));
        if ($host === 'localhost'
            || str_ends_with($host, '.localhost')
            || str_ends_with($host, '.local')
            || str_ends_with($host, '.internal')
        ) {
            throw new InvalidArgumentException('Webhook URL cannot target internal or local hosts.');
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (! filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                throw new InvalidArgumentException('Webhook URL cannot target private or reserved IP ranges.');
            }
        } else {
            $resolvedIps = @gethostbynamel($host);
            if (is_array($resolvedIps)) {
                foreach ($resolvedIps as $ip) {
                    if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                        throw new InvalidArgumentException('Webhook destination resolves to a private or reserved IP range.');
                    }
                }
            }
        }

        return $trimmed;
    }

    /**
     * Generate a cryptographically secure signing secret.
     */
    public function generateSecret(): string
    {
        return 'whsec_'.bin2hex(random_bytes(24));
    }

    /**
     * Deliver a signed lead payload to the user's configured webhook URL.
     *
     * @return array{delivered: bool, status_code: int, event: string, latency_ms: int}
     */
    public function sendLead(User $user, Lead $lead, string $event = 'lead.pushed'): array
    {
        if (! $user->webhook_url) {
            throw new InvalidArgumentException('No CRM webhook URL is configured.');
        }

        $url = $this->validateWebhookUrl($user->webhook_url);
        $lead->loadMissing(['company', 'signals', 'painPoints', 'opportunities']);

        $payload = [
            'event' => $event,
            'sent_at' => now()->toIso8601String(),
            'lead' => [
                'id' => $lead->id,
                'company_name' => $lead->company?->name,
                'website' => $lead->company?->website,
                'industry' => $lead->company?->industry,
                'location' => $lead->company?->location,
                'company_size' => $lead->company?->company_size,
                'source_url' => $lead->source_url,
                'status' => $lead->status,
                'priority' => $lead->priority,
                'overall_score' => $lead->overall_score,
                'icp_score' => $lead->icp_score,
                'buying_intent_score' => $lead->buying_intent_score,
                'pain_fit_score' => $lead->pain_fit_score,
                'ai_summary' => $lead->ai_summary,
                'signals' => $lead->signals->map(fn ($s) => [
                    'description' => $s->description,
                    'confidence' => $s->confidence,
                    'observed_or_inferred' => $s->observed_or_inferred,
                ])->values()->all(),
                'pain_points' => $lead->painPoints->map(fn ($p) => [
                    'title' => $p->title,
                    'description' => $p->description,
                    'confidence' => $p->confidence,
                ])->values()->all(),
                'opportunities' => $lead->opportunities->map(fn ($o) => [
                    'title' => $o->title,
                    'description' => $o->description,
                    'potential_solution' => $o->potential_solution,
                    'priority' => $o->priority,
                ])->values()->all(),
            ],
        ];

        return $this->dispatch($user, $url, $event, $payload);
    }

    /**
     * Send a lightweight signed test event to verify webhook connectivity.
     *
     * @return array{delivered: bool, status_code: int, event: string, latency_ms: int}
     */
    public function sendTest(User $user): array
    {
        if (! $user->webhook_url) {
            throw new InvalidArgumentException('No CRM webhook URL is configured.');
        }

        $url = $this->validateWebhookUrl($user->webhook_url);
        $payload = [
            'event' => 'lead.test',
            'sent_at' => now()->toIso8601String(),
            'account' => [
                'id' => $user->id,
                'email' => $user->email,
            ],
            'message' => 'LeadPing AI CRM webhook verification test.',
        ];

        return $this->dispatch($user, $url, 'lead.test', $payload);
    }

    /**
     * Sign JSON body with HMAC-SHA256 and execute HTTP POST without redirects.
     *
     * @return array{delivered: bool, status_code: int, event: string, latency_ms: int}
     */
    protected function dispatch(User $user, string $url, string $event, array $payload): array
    {
        $jsonBody = (string) json_encode($payload, JSON_UNESCAPED_SLASHES);
        $secret = (string) ($user->webhook_secret ?: '');
        $signature = $secret !== '' ? hash_hmac('sha256', $jsonBody, $secret) : '';

        $start = microtime(true);

        try {
            $response = Http::timeout(10)
                ->withOptions(['allow_redirects' => false])
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-LeadPing-Event' => $event,
                    'X-LeadPing-Signature' => $signature,
                ])
                ->withBody($jsonBody, 'application/json')
                ->post($url);
        } catch (ConnectionException $e) {
            throw new InvalidArgumentException('Could not connect to webhook destination: '.$e->getMessage());
        }

        $latencyMs = (int) round((microtime(true) - $start) * 1000);
        $status = $response->status();

        return [
            'delivered' => $status >= 200 && $status < 300,
            'status_code' => $status,
            'event' => $event,
            'latency_ms' => $latencyMs,
        ];
    }
}
