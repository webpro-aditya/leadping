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
        Schema::create('ai_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source_url', 255);
            $table->string('analysis_type')->default('company_analysis');
            $table->json('raw_response')->nullable();
            $table->json('structured_response')->nullable();
            $table->string('ai_provider')->default('openai');
            $table->string('model_used')->default('gpt-4o-mini');
            $table->integer('tokens_used')->default(0);
            $table->timestamps();

            // Indexes
            $table->index(['user_id', 'company_id', 'source_url']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_analyses');
    }
};
