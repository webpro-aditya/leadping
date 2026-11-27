<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('icp_profile')->nullable()->after('password');
            $table->string('webhook_url', 500)->nullable()->after('icp_profile');
            $table->text('webhook_secret')->nullable()->after('webhook_url');
            $table->boolean('webhook_enabled')->default(false)->after('webhook_secret');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'icp_profile',
                'webhook_url',
                'webhook_secret',
                'webhook_enabled',
            ]);
        });
    }
};
