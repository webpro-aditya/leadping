<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Plans
        $this->call(PlanSeeder::class);

        // 2. Create Test User with Free Plan
        $freePlan = Plan::where('name', 'free')->first();

        $testUser = User::firstOrCreate(
            ['email' => 'test@leadping.ai'],
            [
                'name' => 'LeadPing Demo User',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        if ($freePlan && ! $testUser->subscriptions()->exists()) {
            $testUser->subscriptions()->create([
                'plan_id' => $freePlan->id,
                'status' => 'active',
                'starts_at' => now(),
            ]);
        }
    }
}
