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
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->text('source_url');
            $table->integer('icp_score')->default(0);
            $table->integer('buying_intent_score')->default(0);
            $table->integer('pain_fit_score')->default(0);
            $table->integer('overall_score')->default(0);
            $table->enum('priority', ['high', 'medium', 'low'])->default('medium');
            $table->enum('status', ['new', 'qualified', 'contacted', 'replied', 'meeting', 'won', 'lost'])->default('new');
            $table->text('notes')->nullable();
            $table->text('ai_summary')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('user_id');
            $table->index('company_id');
            $table->index('status');
            $table->index('overall_score');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
