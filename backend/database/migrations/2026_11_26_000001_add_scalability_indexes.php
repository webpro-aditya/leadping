<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ai_analyses', function (Blueprint $table) {
            $table->index(['user_id', 'source_url', 'created_at'], 'ai_analyses_user_url_created_idx');
        });

        Schema::table('outreach_messages', function (Blueprint $table) {
            $table->index(['lead_id', 'user_id', 'channel', 'tone', 'created_at'], 'outreach_dedup_idx');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->index(['user_id', 'status', 'overall_score'], 'leads_user_status_score_idx');
            $table->index(['user_id', 'created_at'], 'leads_user_created_idx');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->index(['user_id', 'status', 'id'], 'subscriptions_user_status_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_analyses', function (Blueprint $table) {
            $table->dropIndex('ai_analyses_user_url_created_idx');
        });

        Schema::table('outreach_messages', function (Blueprint $table) {
            $table->dropIndex('outreach_dedup_idx');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex('leads_user_status_score_idx');
            $table->dropIndex('leads_user_created_idx');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex('subscriptions_user_status_idx');
        });
    }
};
