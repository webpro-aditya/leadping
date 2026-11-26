<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Lead;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BackendApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
    }

    public function test_user_can_register_and_receives_free_plan_and_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jane Founder',
            'email' => 'jane@example.com',
            'password' => 'secret1234',
            'password_confirmation' => 'secret1234',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'user' => ['id', 'name', 'email', 'subscription' => ['plan']],
                    'token',
                ],
                'message',
            ])
            ->assertJson([
                'success' => true,
                'data' => [
                    'user' => [
                        'email' => 'jane@example.com',
                        'subscription' => [
                            'plan' => [
                                'name' => 'free',
                            ],
                        ],
                    ],
                ],
            ]);

        $this->assertDatabaseHas('users', ['email' => 'jane@example.com']);
    }

    public function test_user_can_login(): void
    {
        $user = User::factory()->create([
            'email' => 'login_test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'login_test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => ['user', 'token'],
            ]);
    }

    public function test_plans_endpoint_returns_all_four_plans(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/plans');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertCount(4, $response->json('data.plans'));
    }

    public function test_subscription_and_usage_endpoints_work(): void
    {
        $freePlan = Plan::where('name', 'free')->first();
        $user = User::factory()->create();
        $user->subscriptions()->create([
            'plan_id' => $freePlan->id,
            'status' => 'active',
            'starts_at' => now(),
        ]);

        $subResponse = $this->actingAs($user, 'sanctum')->getJson('/api/subscription');
        $subResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'plan' => ['name' => 'free'],
                ],
            ]);

        $usageResponse = $this->actingAs($user, 'sanctum')->getJson('/api/usage');
        $usageResponse->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period_start',
                    'period_end',
                    'analyses' => ['used', 'limit', 'remaining'],
                    'outreach' => ['used', 'limit', 'remaining'],
                    'leads' => ['used', 'limit', 'remaining'],
                ],
            ]);
    }

    public function test_lead_crud_workflow(): void
    {
        $freePlan = Plan::where('name', 'free')->first();
        $user = User::factory()->create();
        $user->subscriptions()->create([
            'plan_id' => $freePlan->id,
            'status' => 'active',
            'starts_at' => now(),
        ]);

        $company = Company::create([
            'name' => 'Acme Corp',
            'website' => 'acmecorp.com',
            'industry' => 'SaaS',
        ]);

        // 1. Create Lead
        $storeResponse = $this->actingAs($user, 'sanctum')->postJson('/api/leads', [
            'company_id' => $company->id,
            'source_url' => 'https://acmecorp.com',
            'overall_score' => 88,
            'icp_score' => 90,
            'buying_intent_score' => 85,
            'pain_fit_score' => 89,
            'priority' => 'high',
            'status' => 'new',
            'notes' => 'Top tier prospect looking for sales automation',
            'signals' => [
                [
                    'description' => 'Hiring 5 new account executives',
                    'confidence' => 'high',
                    'source_url' => 'https://acmecorp.com/careers',
                    'observed_or_inferred' => 'observed',
                ],
            ],
            'pain_points' => [
                [
                    'title' => 'Slow lead response time',
                    'description' => 'Sales reps manually qualifying leads',
                    'confidence' => 'high',
                ],
            ],
            'opportunities' => [
                [
                    'title' => 'Automate sales intelligence pipeline',
                    'description' => 'Deploy LeadPing AI extension for instant research',
                    'priority' => 'high',
                ],
            ],
        ]);

        $storeResponse->assertStatus(201);
        $leadId = $storeResponse->json('data.id');
        $this->assertNotNull($leadId);

        // 2. Show Lead
        $showResponse = $this->actingAs($user, 'sanctum')->getJson("/api/leads/{$leadId}");
        $showResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $leadId,
                    'priority' => 'high',
                    'company' => ['name' => 'Acme Corp'],
                ],
            ]);

        // 3. Update Lead
        $updateResponse = $this->actingAs($user, 'sanctum')->putJson("/api/leads/{$leadId}", [
            'status' => 'contacted',
            'notes' => 'Sent introductory email to VP of Sales',
        ]);
        $updateResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'status' => 'contacted',
                    'notes' => 'Sent introductory email to VP of Sales',
                ],
            ]);

        // 4. Index Leads
        $indexResponse = $this->actingAs($user, 'sanctum')->getJson('/api/leads?status=contacted');
        $indexResponse->assertStatus(200)
            ->assertJsonCount(1, 'data.data');

        // 5. Export Leads
        $exportResponse = $this->actingAs($user, 'sanctum')->get('/api/leads-export');
        $exportResponse->assertStatus(200);
        $this->assertStringContainsString('Acme Corp', $exportResponse->streamedContent());

        // 6. Delete Lead
        $deleteResponse = $this->actingAs($user, 'sanctum')->deleteJson("/api/leads/{$leadId}");
        $deleteResponse->assertStatus(200);

        $this->assertDatabaseMissing('leads', ['id' => $leadId]);
    }
}
