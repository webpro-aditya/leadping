<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'free',
                'display_name' => 'Free Plan',
                'price_monthly' => 0.00,
                'analyses_limit' => 10,
                'outreach_limit' => 5,
                'leads_limit' => 25,
                'features' => [
                    '10 Company Analyses / month',
                    '5 Outreach Generations / month',
                    '25 Saved Leads',
                    'ICP Fit Scoring (0-100)',
                    'Chrome Extension Toolbar Popup',
                ],
                'is_active' => true,
            ],
            [
                'name' => 'pro',
                'display_name' => 'Pro Plan',
                'price_monthly' => 19.00,
                'analyses_limit' => 100,
                'outreach_limit' => 100,
                'leads_limit' => 500,
                'features' => [
                    '100 Company Analyses / month',
                    '100 Outreach Generations / month',
                    '500 Saved Leads',
                    'Custom ICP Criteria Tuning',
                    'Full Buying Signals, Pain Points & Pitch Angles',
                    'CSV Lead Exports & Bulk Actions',
                ],
                'is_active' => true,
            ],
            [
                'name' => 'business',
                'display_name' => 'Business Plan',
                'price_monthly' => 49.00,
                'analyses_limit' => 500,
                'outreach_limit' => 500,
                'leads_limit' => -1, // Unlimited
                'features' => [
                    '500 Company Analyses / month',
                    '500 Outreach Generations / month',
                    'Unlimited Saved Leads',
                    'Custom ICP Criteria Tuning',
                    'Signed CRM Webhook Integrations',
                    'Multi-Channel Outreach & Tones',
                ],
                'is_active' => true,
            ],
            [
                'name' => 'agency',
                'display_name' => 'Agency Plan',
                'price_monthly' => 99.00,
                'analyses_limit' => 2000,
                'outreach_limit' => 2000,
                'leads_limit' => -1, // Unlimited
                'features' => [
                    '2,000 Company Analyses / month',
                    '2,000 Outreach Generations / month',
                    'Unlimited Saved Leads',
                    'Custom ICP Criteria Tuning',
                    'Signed CRM Webhook Integrations',
                    'High-Volume Agency Processing Quotas',
                ],
                'is_active' => true,
            ],
        ];

        foreach ($plans as $planData) {
            Plan::updateOrCreate(
                ['name' => $planData['name']],
                $planData
            );
        }
    }
}
