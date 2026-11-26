<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Lead;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Resources\Chat;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\TestCase;

class ScalabilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
        config(['openai.api_key' => 'sk-test-key-for-phpunit']);
    }

    public function test_shared_ai_cache_prevents_duplicate_openai_calls_across_users(): void
    {
        $freePlan = Plan::where('name', 'free')->first();
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        foreach ([$userA, $userB] as $u) {
            $u->subscriptions()->create([
                'plan_id' => $freePlan->id,
                'status' => 'active',
                'starts_at' => now(),
            ]);
        }

        $aiPayload = json_encode([
            'company' => [
                'name' => 'ScaleCorp',
                'industry' => 'Cloud Infrastructure',
                'description' => 'Scalable cloud compute.',
                'location' => 'Seattle, WA',
                'company_size' => '201-1000',
                'business_model' => 'B2B',
                'products_services' => ['Edge Compute'],
                'target_customers' => 'DevOps teams',
            ],
            'icp_score' => [
                'overall' => 86,
                'industry_fit' => 88,
                'company_size_fit' => 85,
                'technology_fit' => 90,
                'problem_fit' => 82,
                'buying_signal_score' => 85,
            ],
            'buying_signals' => [],
            'pain_points' => [],
            'opportunities' => [],
            'lead_qualification' => [
                'icp_fit' => 86,
                'buying_intent' => 85,
                'pain_fit' => 82,
                'overall' => 86,
                'priority' => 'HIGH',
                'recommended_action' => 'Reach out to VP Infra.',
            ],
            'recommended_pitch' => [
                'angle' => 'Reduce cloud spend',
                'lead_with' => 'Observed rapid infra expansion.',
            ],
            'summary' => 'High-fit cloud infrastructure target.',
        ]);

        OpenAI::fake([
            CreateResponse::fake(['choices' => [['message' => ['content' => $aiPayload]]]]),
        ]);

        $this->actingAs($userA, 'sanctum')->postJson('/api/analyze/company', [
            'url' => 'https://scalecorp.example.com/?utm_source=ads',
            'page_data' => ['title' => 'ScaleCorp', 'content' => 'Scalable cloud compute.'],
        ])->assertStatus(200)->assertJsonPath('data.cached', false);

        // Different user analyzing the same normalized URL reuses shared 24h AI output
        $this->actingAs($userB, 'sanctum')->postJson('/api/analyze/company', [
            'url' => 'https://scalecorp.example.com/',
            'page_data' => ['title' => 'ScaleCorp', 'content' => 'Scalable cloud compute.'],
        ])->assertStatus(200)
            ->assertJsonPath('data.company_name', 'ScaleCorp')
            ->assertJsonPath('data.cached', true);

        OpenAI::assertSent(Chat::class, 1);
    }

    public function test_leads_stats_and_compact_pagination_work_accurately(): void
    {
        $user = User::factory()->create();
        $c1 = Company::create(['name' => 'High Co', 'website' => 'high.example.com']);
        $c2 = Company::create(['name' => 'Med Co', 'website' => 'med.example.com']);
        $c3 = Company::create(['name' => 'Low Co', 'website' => 'low.example.com']);

        foreach ([[$c1, 88, 'high'], [$c2, 65, 'medium'], [$c3, 35, 'low']] as [$c, $score, $prio]) {
            Lead::create([
                'user_id' => $user->id,
                'company_id' => $c->id,
                'source_url' => "https://{$c->website}",
                'icp_score' => $score,
                'buying_intent_score' => $score,
                'pain_fit_score' => $score,
                'overall_score' => $score,
                'priority' => $prio,
                'status' => 'new',
            ]);
        }

        $this->actingAs($user, 'sanctum')->getJson('/api/leads/stats')
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'total' => 3,
                    'high_potential' => 1,
                    'medium_potential' => 1,
                    'low_potential' => 1,
                ],
            ]);

        $compact = $this->actingAs($user, 'sanctum')->getJson('/api/leads?compact=1&per_page=2');
        $compact->assertStatus(200)
            ->assertJsonPath('data.total', 3)
            ->assertJsonCount(2, 'data.data');
        $this->assertArrayNotHasKey('signals', $compact->json('data.data.0'));
    }

    public function test_async_company_analysis_job_and_status_polling(): void
    {
        $freePlan = Plan::where('name', 'free')->first();
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $user->subscriptions()->create([
            'plan_id' => $freePlan->id,
            'status' => 'active',
            'starts_at' => now(),
        ]);

        $aiPayload = json_encode([
            'company' => [
                'name' => 'AsyncLabs',
                'industry' => 'SaaS',
                'description' => 'Async workflow tooling.',
                'location' => 'NYC',
                'company_size' => '11-50',
                'business_model' => 'B2B',
                'products_services' => ['QueueKit'],
                'target_customers' => 'Developers',
            ],
            'icp_score' => [
                'overall' => 81,
                'industry_fit' => 82,
                'company_size_fit' => 80,
                'technology_fit' => 85,
                'problem_fit' => 78,
                'buying_signal_score' => 80,
            ],
            'buying_signals' => [],
            'pain_points' => [],
            'opportunities' => [],
            'lead_qualification' => [
                'icp_fit' => 81,
                'buying_intent' => 80,
                'pain_fit' => 78,
                'overall' => 81,
                'priority' => 'HIGH',
                'recommended_action' => 'Send technical intro.',
            ],
            'recommended_pitch' => [
                'angle' => 'Speed up job throughput',
                'lead_with' => 'Saw QueueKit launch.',
            ],
            'summary' => 'Good fit developer tooling company.',
        ]);

        OpenAI::fake([
            CreateResponse::fake(['choices' => [['message' => ['content' => $aiPayload]]]]),
        ]);

        // In phpunit.xml QUEUE_CONNECTION=sync, so dispatch executes immediately and populates status cache
        $queued = $this->actingAs($user, 'sanctum')->postJson('/api/analyze/company', [
            'url' => 'https://asynclabs.example.com',
            'async' => true,
            'page_data' => ['title' => 'AsyncLabs', 'content' => 'Async workflow tooling.'],
        ]);

        $queued->assertStatus(202);
        $jobId = $queued->json('data.job_id');
        $this->assertNotEmpty($jobId);

        // Unauthorized user cannot read another user's job
        $this->actingAs($otherUser, 'sanctum')
            ->getJson("/api/analyze/jobs/{$jobId}")
            ->assertStatus(403);

        // Owner polls completed job
        $this->actingAs($user, 'sanctum')
            ->getJson("/api/analyze/jobs/{$jobId}")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.company_name', 'AsyncLabs');
    }
}
