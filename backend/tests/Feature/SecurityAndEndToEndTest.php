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

class SecurityAndEndToEndTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
        config(['openai.api_key' => 'sk-test-key-for-phpunit']);
    }

    public function test_unsafe_url_schemes_are_rejected(): void
    {
        $user = User::factory()->create();

        foreach (['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd'] as $unsafeUrl) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/analyze/company', [
                    'url' => $unsafeUrl,
                    'page_data' => ['title' => 'Test', 'content' => 'Test content'],
                ])
                ->assertStatus(422);

            $this->actingAs($user, 'sanctum')
                ->postJson('/api/leads', [
                    'source_url' => $unsafeUrl,
                    'website' => $unsafeUrl,
                    'company_name' => 'Bad Corp',
                ])
                ->assertStatus(422);
        }
    }

    public function test_csv_export_neutralizes_formula_injection_and_respects_filters(): void
    {
        $user = User::factory()->create();
        $company = Company::create([
            'name' => '=cmd|" /C calc"!A0',
            'website' => 'formula.example.com',
            'industry' => '+SUM(A1:A2)',
        ]);

        Lead::create([
            'user_id' => $user->id,
            'company_id' => $company->id,
            'source_url' => 'https://formula.example.com',
            'overall_score' => 90,
            'icp_score' => 90,
            'buying_intent_score' => 90,
            'pain_fit_score' => 90,
            'priority' => 'high',
            'status' => 'qualified',
            'notes' => '@HYPERLINK("http://evil.test","click")',
            'ai_summary' => '-1+1',
        ]);

        $response = $this->actingAs($user, 'sanctum')->get('/api/leads/export?status=qualified');
        $response->assertStatus(200);

        $csv = $response->streamedContent();
        $this->assertStringContainsString("'=cmd|", $csv);
        $this->assertStringContainsString("'+SUM(A1:A2)", $csv);
        $this->assertStringContainsString("'@HYPERLINK", $csv);
        $this->assertStringContainsString("'-1+1", $csv);
    }

    public function test_like_wildcards_are_escaped_in_lead_search(): void
    {
        $user = User::factory()->create();
        $alpha = Company::create(['name' => 'Alpha Corp', 'website' => 'alpha.com', 'industry' => 'SaaS']);
        $percent = Company::create(['name' => '100% Growth Inc', 'website' => 'percent.com', 'industry' => 'SaaS']);

        Lead::create([
            'user_id' => $user->id,
            'company_id' => $alpha->id,
            'source_url' => 'https://alpha.com',
            'overall_score' => 80,
            'icp_score' => 80,
            'buying_intent_score' => 80,
            'pain_fit_score' => 80,
            'priority' => 'high',
            'status' => 'new',
        ]);

        Lead::create([
            'user_id' => $user->id,
            'company_id' => $percent->id,
            'source_url' => 'https://percent.com',
            'overall_score' => 85,
            'icp_score' => 85,
            'buying_intent_score' => 85,
            'pain_fit_score' => 85,
            'priority' => 'high',
            'status' => 'new',
        ]);

        // Searching literal "%" should only match "100% Growth Inc", not "Alpha Corp"
        $res = $this->actingAs($user, 'sanctum')->getJson('/api/leads?search='.urlencode('%'));
        $res->assertStatus(200)->assertJsonCount(1, 'data.data');
        $this->assertSame('100% Growth Inc', $res->json('data.data.0.company.name'));
    }

    public function test_cross_user_idor_is_blocked_across_all_lead_endpoints(): void
    {
        $freePlan = Plan::where('name', 'free')->first();
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        foreach ([$owner, $attacker] as $u) {
            $u->subscriptions()->create([
                'plan_id' => $freePlan->id,
                'status' => 'active',
                'starts_at' => now(),
            ]);
        }

        $company = Company::create([
            'name' => 'Owner Target Co',
            'website' => 'ownertarget.com',
            'raw_data' => ['content' => 'INTERNAL_RAW_DATA_MUST_Stay_HIDDEN'],
        ]);

        $lead = Lead::create([
            'user_id' => $owner->id,
            'company_id' => $company->id,
            'source_url' => 'https://ownertarget.com',
            'overall_score' => 88,
            'icp_score' => 88,
            'buying_intent_score' => 88,
            'pain_fit_score' => 88,
            'priority' => 'high',
            'status' => 'new',
        ]);

        $this->actingAs($attacker, 'sanctum')->getJson("/api/leads/{$lead->id}")->assertStatus(403);
        $this->actingAs($attacker, 'sanctum')->putJson("/api/leads/{$lead->id}", ['status' => 'won'])->assertStatus(403);
        $this->actingAs($attacker, 'sanctum')->deleteJson("/api/leads/{$lead->id}")->assertStatus(403);
        $this->actingAs($attacker, 'sanctum')->postJson("/api/leads/{$lead->id}/outreach", ['channel' => 'email'])->assertStatus(403);
        $this->actingAs($attacker, 'sanctum')->postJson("/api/leads/{$lead->id}/rescore")->assertStatus(403);

        // Bulk delete must not delete another user's lead
        $bulkRes = $this->actingAs($attacker, 'sanctum')->postJson('/api/leads/bulk-delete', ['ids' => [$lead->id]]);
        $bulkRes->assertStatus(200)->assertJsonPath('data.deleted_count', 0);
        $this->assertDatabaseHas('leads', ['id' => $lead->id]);

        // Owner show endpoint must not leak company.raw_data
        $ownerShow = $this->actingAs($owner, 'sanctum')->getJson("/api/leads/{$lead->id}");
        $ownerShow->assertStatus(200);
        $this->assertArrayNotHasKey('raw_data', $ownerShow->json('data.company'));
    }

    public function test_full_end_to_end_user_journey(): void
    {
        $analysisJson = json_encode([
            'company' => [
                'name' => 'NovaTech AI',
                'industry' => 'Enterprise AI',
                'description' => 'Enterprise AI orchestration tools.',
                'location' => 'Austin, TX',
                'company_size' => '51-200',
                'business_model' => 'B2B SaaS',
                'products_services' => ['AI Gateway', 'Audit Suite'],
                'target_customers' => 'Platform Engineering Teams',
            ],
            'icp_score' => [
                'overall' => 87,
                'industry_fit' => 90,
                'company_size_fit' => 85,
                'technology_fit' => 88,
                'problem_fit' => 86,
                'buying_signal_score' => 84,
            ],
            'buying_signals' => [[
                'description' => 'Hiring enterprise account executives',
                'confidence' => 'high',
                'source' => 'https://novatech.ai/careers',
                'observed_or_inferred' => 'observed',
            ]],
            'pain_points' => [[
                'title' => 'Lead qualification latency',
                'description' => 'Manual prospect research slows SDR ramp.',
                'confidence' => 'high',
                'explanation' => 'Rapid outbound team expansion.',
            ]],
            'opportunities' => [[
                'title' => 'Automated prospect scoring',
                'description' => 'Deploy real-time ICP scoring.',
                'why' => 'Scaling outbound team',
                'potential_solution' => 'Chrome side-panel sales intelligence',
                'priority' => 'high',
            ]],
            'lead_qualification' => [
                'icp_fit' => 87,
                'buying_intent' => 84,
                'pain_fit' => 86,
                'overall' => 87,
                'priority' => 'HIGH',
                'recommended_action' => 'Contact VP Sales with workflow ROI angle.',
            ],
            'recommended_pitch' => [
                'angle' => 'Cut SDR research time by 70%',
                'lead_with' => 'Saw NovaTech AI scaling outbound GTM.',
            ],
            'summary' => 'Strong B2B SaaS prospect actively scaling GTM.',
        ]);

        $outreachJson = json_encode([
            'subject' => 'Scaling NovaTech AI SDR research',
            'body' => 'Hi team, noticed NovaTech AI is expanding outbound GTM.',
            'tone' => 'professional',
            'channel' => 'email',
        ]);

        $rescoreJson = json_encode([
            'icp_score' => 91,
            'buying_intent_score' => 89,
            'pain_fit_score' => 90,
            'overall_score' => 90,
            'priority' => 'high',
            'explanation' => 'Demo interest confirmed in notes.',
        ]);

        OpenAI::fake([
            CreateResponse::fake(['choices' => [['message' => ['content' => $analysisJson]]]]),
            CreateResponse::fake(['choices' => [['message' => ['content' => $outreachJson]]]]),
            CreateResponse::fake(['choices' => [['message' => ['content' => $rescoreJson]]]]),
        ]);

        // 1. Register
        $reg = $this->postJson('/api/auth/register', [
            'name' => 'Aditya Test',
            'email' => 'ADITYA.E2E@EXAMPLE.COM',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
        ]);
        $reg->assertStatus(201);
        $token = $reg->json('data.token');
        $headers = ['Authorization' => "Bearer {$token}"];

        // 2. Profile & Usage
        $this->withHeaders($headers)->getJson('/api/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('data.user.email', 'aditya.e2e@example.com');

        // 3. Analyze website
        $analyze = $this->withHeaders($headers)->postJson('/api/analyze/company', [
            'url' => 'https://novatech.ai/?utm_source=test',
            'page_data' => [
                'title' => 'NovaTech AI',
                'content' => 'Enterprise AI orchestration tools.',
                'headings' => ['AI Gateway'],
            ],
        ]);
        $analyze->assertStatus(200)
            ->assertJsonPath('data.company_name', 'NovaTech AI');
        $leadId = $analyze->json('data.lead_id');
        $this->assertNotNull($leadId);

        // 4. Filter + Sort Leads
        $this->withHeaders($headers)
            ->getJson('/api/leads?score_min=80&sort_by=company_name&sort_dir=asc')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data.data');

        // 5. Update Lead
        $this->withHeaders($headers)
            ->putJson("/api/leads/{$leadId}", ['status' => 'qualified', 'notes' => 'Booked discovery call'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'qualified');

        // 6. Generate Outreach + Rescore
        $this->withHeaders($headers)
            ->postJson("/api/leads/{$leadId}/outreach", ['channel' => 'email', 'tone' => 'professional'])
            ->assertStatus(200)
            ->assertJsonPath('data.subject', 'Scaling NovaTech AI SDR research');

        $this->withHeaders($headers)
            ->postJson("/api/leads/{$leadId}/rescore")
            ->assertStatus(200)
            ->assertJsonPath('data.overall_score', 90);

        // 7. Verify Usage incremented (1 analysis + 1 outreach)
        $this->withHeaders($headers)->getJson('/api/usage')
            ->assertStatus(200)
            ->assertJsonPath('data.analyses.used', 1)
            ->assertJsonPath('data.outreach.used', 1)
            ->assertJsonPath('data.leads.used', 1);

        // 8. Export CSV & Bulk Delete
        $export = $this->withHeaders($headers)->get('/api/leads/export');
        $export->assertStatus(200);
        $this->assertStringContainsString('NovaTech AI', $export->streamedContent());

        $this->withHeaders($headers)
            ->postJson('/api/leads/bulk-delete', ['ids' => [$leadId]])
            ->assertStatus(200)
            ->assertJsonPath('data.deleted_count', 1);

        // 9. Logout revokes token
        $this->withHeaders($headers)->postJson('/api/auth/logout')->assertStatus(200);
        $this->assertDatabaseCount('personal_access_tokens', 0);

        OpenAI::assertSent(Chat::class, 3);
    }

    public function test_security_headers_and_nested_signal_validation(): void
    {
        $user = User::factory()->create();

        $res = $this->actingAs($user, 'sanctum')->getJson('/api/plans');
        $res->assertStatus(200)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer');
        $this->assertStringContainsString('no-store', (string) $res->headers->get('Cache-Control'));

        // Nested signal validation rejects invalid confidence enum and unsafe source_url
        $this->actingAs($user, 'sanctum')
            ->postJson('/api/leads', [
                'source_url' => 'https://valid.example.com',
                'signals' => [[
                    'description' => 'Signal',
                    'confidence' => 'invalid_level',
                    'source_url' => 'javascript:alert(1)',
                ]],
            ])
            ->assertStatus(422);
    }

    public function test_failed_ai_call_refunds_reserved_quota_credit(): void
    {
        $freePlan = Plan::where('name', 'free')->first();
        $user = User::factory()->create();
        $user->subscriptions()->create([
            'plan_id' => $freePlan->id,
            'status' => 'active',
            'starts_at' => now(),
        ]);

        config(['openai.api_key' => '']); // triggers AIProviderException (422)

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/analyze/company', [
                'url' => 'https://refund-test.example.com',
                'page_data' => ['title' => 'Refund Test', 'content' => 'Some content'],
            ])
            ->assertStatus(422);

        $this->assertDatabaseCount('usage_records', 0);
    }
}
