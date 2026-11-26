<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Lead;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use GuzzleHttp\Psr7\Response as GuzzleResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Exceptions\RateLimitException;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Resources\Chat;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\TestCase;

class OpenAIOptimizationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
        config(['openai.api_key' => 'sk-test-key-for-phpunit']);

        $freePlan = Plan::where('name', 'free')->first();
        $this->user = User::factory()->create();
        $this->user->subscriptions()->create([
            'plan_id' => $freePlan->id,
            'status' => 'active',
            'starts_at' => now(),
        ]);
    }

    public function test_analyze_company_normalizes_tracking_params_and_caches_within_24_hours(): void
    {
        $fakePayload = json_encode([
            'company' => [
                'name' => 'NVIDIA',
                'industry' => 'Semiconductors & AI',
                'description' => 'Accelerated computing platform company.',
                'location' => 'Santa Clara, CA',
                'company_size' => '1000+',
                'business_model' => 'B2B',
                'products_services' => ['DGX Cloud', 'CUDA'],
                'target_customers' => 'Enterprise AI teams',
            ],
            'icp_score' => [
                'overall' => 92,
                'industry_fit' => 95,
                'company_size_fit' => 90,
                'technology_fit' => 94,
                'problem_fit' => 88,
                'buying_signal_score' => 90,
            ],
            'buying_signals' => [
                [
                    'description' => 'Expanding AI cloud factory partnerships',
                    'confidence' => 'high',
                    'source' => 'https://www.nvidia.com/en-in/',
                    'observed_or_inferred' => 'observed',
                ],
            ],
            'pain_points' => [
                [
                    'title' => 'Supply chain scale coordination',
                    'description' => 'Coordinating global partner capacity.',
                    'confidence' => 'medium',
                    'explanation' => 'Rapid data-center growth requires ecosystem alignment.',
                ],
            ],
            'opportunities' => [
                [
                    'title' => 'Enterprise workflow automation',
                    'description' => 'Streamline partner onboarding.',
                    'why' => 'Expanding partner ecosystem',
                    'potential_solution' => 'Automated partner intelligence',
                    'priority' => 'high',
                ],
            ],
            'lead_qualification' => [
                'icp_fit' => 92,
                'buying_intent' => 90,
                'pain_fit' => 88,
                'overall' => 90,
                'priority' => 'HIGH',
                'recommended_action' => 'Engage enterprise partnerships team.',
            ],
            'recommended_pitch' => [
                'angle' => 'Accelerate partner pipeline',
                'lead_with' => 'Saw NVIDIA expanding global supply chain partnerships.',
            ],
            'summary' => 'Strong enterprise AI infrastructure prospect.',
        ]);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['content' => $fakePayload]],
                ],
                'usage' => [
                    'prompt_tokens' => 450,
                    'completion_tokens' => 300,
                    'total_tokens' => 750,
                ],
            ]),
        ]);

        // First call with tracking parameter ?ncid=no-ncid
        $firstResponse = $this->actingAs($this->user, 'sanctum')->postJson('/api/analyze/company', [
            'url' => 'https://www.nvidia.com/en-in/?ncid=no-ncid',
            'page_data' => [
                'title' => 'NVIDIA India',
                'content' => 'NVIDIA accelerated computing and AI factory platforms.',
                'headings' => ['NVIDIA DGX Cloud'],
                'technologies' => ['Google Tag Manager'],
            ],
        ]);

        $firstResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'company_name' => 'NVIDIA',
                    'cached' => false,
                ],
            ]);

        // Second call to normalized URL without tracking params should hit 24h cache (0 OpenAI calls)
        $secondResponse = $this->actingAs($this->user, 'sanctum')->postJson('/api/analyze/company', [
            'url' => 'https://www.nvidia.com/en-in/',
            'page_data' => [
                'title' => 'NVIDIA India',
                'content' => 'NVIDIA accelerated computing and AI factory platforms.',
            ],
        ]);

        $secondResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'company_name' => 'NVIDIA',
                    'cached' => true,
                ],
            ]);

        OpenAI::assertSent(Chat::class, function (string $method, array $parameters): bool {
            return $method === 'create'
                && ($parameters['max_tokens'] ?? 0) <= 1600
                && str_contains($parameters['messages'][1]['content'] ?? '', 'Google Tag Manager');
        });
        OpenAI::assertSent(Chat::class, 1);
    }

    public function test_outreach_strips_raw_data_and_deduplicates_until_regenerate(): void
    {
        $company = Company::create([
            'name' => 'Acme Cloud',
            'website' => 'acmecloud.io',
            'industry' => 'B2B SaaS',
            'raw_data' => [
                'content' => 'SECRET_RAW_DOM_SHOULD_NOT_BE_SENT_TO_OPENAI_'.str_repeat('X', 500),
            ],
        ]);

        $lead = Lead::create([
            'user_id' => $this->user->id,
            'company_id' => $company->id,
            'source_url' => 'https://acmecloud.io',
            'overall_score' => 85,
            'icp_score' => 85,
            'buying_intent_score' => 85,
            'pain_fit_score' => 85,
            'priority' => 'high',
            'status' => 'new',
            'ai_summary' => 'Growing cloud tooling provider.',
        ]);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'subject' => 'Scaling Acme Cloud pipeline',
                            'body' => 'Hi team, noticed Acme Cloud growth.',
                            'tone' => 'casual',
                            'channel' => 'email',
                        ]),
                    ],
                ]],
            ]),
            CreateResponse::fake([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'subject' => 'Fresh angle for Acme Cloud',
                            'body' => 'Regenerated outreach copy.',
                            'tone' => 'casual',
                            'channel' => 'email',
                        ]),
                    ],
                ]],
            ]),
        ]);

        // 1st call generates via OpenAI without raw_data
        $res1 = $this->actingAs($this->user, 'sanctum')->postJson("/api/leads/{$lead->id}/outreach", [
            'channel' => 'email',
            'tone' => 'casual',
        ]);
        $res1->assertStatus(200)
            ->assertJsonPath('data.body', 'Hi team, noticed Acme Cloud growth.');

        // 2nd identical call reuses saved OutreachMessage (0 OpenAI calls)
        $res2 = $this->actingAs($this->user, 'sanctum')->postJson("/api/leads/{$lead->id}/outreach", [
            'channel' => 'email',
            'tone' => 'casual',
        ]);
        $res2->assertStatus(200)
            ->assertJsonPath('data.id', $res1->json('data.id'));

        // Explicit regenerate=true triggers fresh OpenAI generation
        $res3 = $this->actingAs($this->user, 'sanctum')->postJson("/api/leads/{$lead->id}/outreach", [
            'channel' => 'email',
            'tone' => 'casual',
            'regenerate' => true,
        ]);
        $res3->assertStatus(200)
            ->assertJsonPath('data.body', 'Regenerated outreach copy.');

        OpenAI::assertSent(Chat::class, 2);
        OpenAI::assertSent(Chat::class, function (string $method, array $parameters): bool {
            $userMsg = $parameters['messages'][1]['content'] ?? '';

            return ! str_contains($userMsg, 'SECRET_RAW_DOM_SHOULD_NOT_BE_SENT_TO_OPENAI')
                && ($parameters['max_tokens'] ?? 0) <= 600;
        });
    }

    public function test_insufficient_quota_returns_429_instead_of_500(): void
    {
        $errorBody = json_encode([
            'error' => [
                'message' => 'You exceeded your current quota, please check your plan and billing details.',
                'type' => 'insufficient_quota',
                'code' => 'insufficient_quota',
            ],
        ]);

        OpenAI::fake([
            new RateLimitException(new GuzzleResponse(429, ['Content-Type' => 'application/json'], $errorBody)),
        ]);

        $response = $this->actingAs($this->user, 'sanctum')->postJson('/api/analyze/company', [
            'url' => 'https://example.com',
            'page_data' => [
                'title' => 'Example Corp',
                'content' => 'Example enterprise software.',
            ],
        ]);

        $response->assertStatus(429)
            ->assertJson([
                'success' => false,
                'data' => ['error_code' => 'insufficient_quota'],
            ]);
        OpenAI::assertSent(Chat::class, 1);
    }
}
