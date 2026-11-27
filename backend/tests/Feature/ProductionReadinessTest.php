<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Lead;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Resources\Chat;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\TestCase;

class ProductionReadinessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
        config(['openai.api_key' => 'sk-test-key-for-phpunit']);
    }

    public function test_health_endpoint_reports_ok_without_sensitive_metadata(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.database', 'up')
            ->assertJsonPath('checks.cache', 'up');

        $raw = $response->getContent();
        $this->assertStringNotContainsString('mysql', $raw);
        $this->assertStringNotContainsString('OPENAI_API_KEY', $raw);
    }

    public function test_forgot_and_reset_password_updates_password_and_revokes_existing_tokens(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'founder@acme.com',
            'password' => Hash::make('OldPassword123!'),
        ]);
        $user->createToken('old_device');

        // Forgot password returns generic message even for unknown email (no enumeration)
        $this->postJson('/api/auth/forgot-password', ['email' => 'missing@acme.com'])
            ->assertStatus(200);

        $this->postJson('/api/auth/forgot-password', ['email' => 'founder@acme.com'])
            ->assertStatus(200);

        $capturedToken = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$capturedToken) {
            $capturedToken = $notification->token;

            return true;
        });

        $this->assertNotNull($capturedToken);

        $this->postJson('/api/auth/reset-password', [
            'token' => $capturedToken,
            'email' => 'founder@acme.com',
            'password' => 'NewPassword456!',
            'password_confirmation' => 'NewPassword456!',
        ])->assertStatus(200);

        $user->refresh();
        $this->assertTrue(Hash::check('NewPassword456!', $user->password));
        $this->assertCount(0, $user->tokens()->get());
    }

    public function test_email_verification_signed_link_marks_user_verified_and_supports_resend(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();
        $this->assertNull($user->email_verified_at);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/auth/email/resend')
            ->assertStatus(200)
            ->assertJsonPath('data.verified', false);

        Notification::assertSentTo($user, VerifyEmail::class);

        $signedUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(30),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );

        $this->getJson($signedUrl)->assertStatus(200);
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_change_password_and_delete_account_revoke_tokens_and_purge_user(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('Secret1234!'),
        ]);
        $token1 = $user->createToken('device1')->plainTextToken;
        $user->createToken('device2');

        $this->withHeader('Authorization', 'Bearer '.$token1)
            ->postJson('/api/auth/change-password', [
                'current_password' => 'WrongPassword',
                'password' => 'Updated1234!',
                'password_confirmation' => 'Updated1234!',
            ])->assertStatus(422);

        $this->withHeader('Authorization', 'Bearer '.$token1)
            ->postJson('/api/auth/change-password', [
                'current_password' => 'Secret1234!',
                'password' => 'Updated1234!',
                'password_confirmation' => 'Updated1234!',
            ])->assertStatus(200);

        // Only current token stays active after password change
        $this->assertCount(1, $user->fresh()->tokens()->get());

        $this->withHeader('Authorization', 'Bearer '.$token1)
            ->deleteJson('/api/auth/account', [
                'current_password' => 'Updated1234!',
            ])->assertStatus(200);

        $this->assertNull(User::find($user->id));
    }

    public function test_custom_icp_requires_pro_plan_and_injects_criteria_into_openai_prompt(): void
    {
        $freePlan = Plan::where('name', 'free')->firstOrFail();
        $proPlan = Plan::where('name', 'pro')->firstOrFail();

        $user = User::factory()->create();
        $subscription = $user->subscriptions()->create([
            'plan_id' => $freePlan->id,
            'status' => 'active',
            'starts_at' => now(),
        ]);

        // Free tier cannot save custom ICP
        $this->actingAs($user, 'sanctum')
            ->putJson('/api/settings/icp', ['target_industries' => 'FinTech'])
            ->assertStatus(403);

        // Upgrade user to Pro
        $subscription->update(['plan_id' => $proPlan->id]);

        $this->actingAs($user->fresh(), 'sanctum')
            ->putJson('/api/settings/icp', [
                'product_description' => 'Automated SOC2 compliance platform',
                'target_industries' => 'B2B SaaS, FinTech',
                'target_company_sizes' => '51-200',
                'disqualifiers' => 'Non-profit agencies',
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.icp_profile.target_industries', 'B2B SaaS, FinTech');

        $capturedUserPrompt = null;
        $fakePayload = json_encode([
            'company' => [
                'name' => 'FinCloud',
                'industry' => 'FinTech',
                'description' => 'Cloud banking infrastructure.',
                'location' => 'New York, US',
                'company_size' => '51-200',
                'business_model' => 'B2B SaaS',
                'products_services' => ['Ledger API'],
                'target_customers' => 'Fintech startups',
            ],
            'icp_score' => [
                'overall' => 94,
                'industry_fit' => 96,
                'company_size_fit' => 95,
                'technology_fit' => 90,
                'problem_fit' => 95,
                'buying_signal_score' => 92,
            ],
            'buying_signals' => [],
            'pain_points' => [],
            'opportunities' => [],
            'lead_qualification' => [
                'icp_fit' => 94,
                'buying_intent' => 92,
                'pain_fit' => 95,
                'overall' => 94,
                'priority' => 'HIGH',
                'recommended_action' => 'Pitch SOC2 automation',
            ],
            'recommended_pitch' => ['angle' => 'Speed up FinTech compliance', 'lead_with' => 'SOC2 readiness'],
            'summary' => 'Strong ICP fit for FinTech compliance.',
        ]);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [['message' => ['content' => $fakePayload]]],
                'usage' => ['total_tokens' => 250],
            ]),
        ]);

        $this->actingAs($user->fresh(), 'sanctum')
            ->postJson('/api/analyze/company', [
                'url' => 'https://fincloud.example.com',
                'page_data' => [
                    'title' => 'FinCloud',
                    'content' => 'Modern fintech infrastructure for teams.',
                ],
            ])
            ->assertStatus(200)
            ->assertJsonPath('data.icp_score.overall', 94);

        OpenAI::assertSent(Chat::class, function (string $method, array $parameters) use (&$capturedUserPrompt) {
            $capturedUserPrompt = $parameters['messages'][1]['content'] ?? '';

            return str_contains($capturedUserPrompt, '<custom_icp_criteria>')
                && str_contains($capturedUserPrompt, 'Automated SOC2 compliance platform');
        });
    }

    public function test_crm_webhook_requires_business_plan_blocks_ssrf_and_delivers_signed_lead(): void
    {
        $proPlan = Plan::where('name', 'pro')->firstOrFail();
        $businessPlan = Plan::where('name', 'business')->firstOrFail();

        $user = User::factory()->create();
        $subscription = $user->subscriptions()->create([
            'plan_id' => $proPlan->id,
            'status' => 'active',
            'starts_at' => now(),
        ]);

        // Pro tier blocked from CRM webhook config
        $this->actingAs($user, 'sanctum')
            ->putJson('/api/integrations/webhook', [
                'webhook_url' => 'https://hooks.example.com/crm',
                'webhook_enabled' => true,
            ])->assertStatus(403);

        // Upgrade to Business
        $subscription->update(['plan_id' => $businessPlan->id]);

        // SSRF attempts rejected
        foreach (['http://127.0.0.1:8080/hook', 'http://169.254.169.254/latest/meta-data', 'http://localhost/hook'] as $ssrfUrl) {
            $this->actingAs($user->fresh(), 'sanctum')
                ->putJson('/api/integrations/webhook', [
                    'webhook_url' => $ssrfUrl,
                    'webhook_enabled' => true,
                ])->assertStatus(422);
        }

        // Valid URL saved with generated secret
        $saveRes = $this->actingAs($user->fresh(), 'sanctum')
            ->putJson('/api/integrations/webhook', [
                'webhook_url' => 'https://hooks.example.com/crm',
                'webhook_enabled' => true,
            ])->assertStatus(200);

        $secret = $saveRes->json('data.new_secret');
        $this->assertNotEmpty($secret);

        Http::fake([
            'https://hooks.example.com/crm' => Http::response(['ok' => true], 200),
        ]);

        // Test webhook event
        $this->actingAs($user->fresh(), 'sanctum')
            ->postJson('/api/integrations/webhook/test')
            ->assertStatus(200)
            ->assertJsonPath('data.delivered', true);

        // Push lead
        $company = Company::create(['name' => 'Acme Corp', 'website' => 'acme.com']);
        $lead = Lead::create([
            'user_id' => $user->id,
            'company_id' => $company->id,
            'source_url' => 'https://acme.com',
            'icp_score' => 88,
            'buying_intent_score' => 82,
            'pain_fit_score' => 85,
            'overall_score' => 85,
            'priority' => 'high',
            'status' => 'qualified',
        ]);

        $this->actingAs($user->fresh(), 'sanctum')
            ->postJson("/api/leads/{$lead->id}/push-webhook")
            ->assertStatus(200)
            ->assertJsonPath('data.delivered', true);

        Http::assertSent(function (Request $request) use ($secret) {
            $expectedSig = hash_hmac('sha256', $request->body(), $secret);

            return $request->url() === 'https://hooks.example.com/crm'
                && $request->hasHeader('X-LeadPing-Signature', $expectedSig)
                && str_contains($request->body(), 'Acme Corp');
        });
    }
}
