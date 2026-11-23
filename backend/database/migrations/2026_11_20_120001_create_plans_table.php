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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // free, pro, business, agency
            $table->string('display_name');
            $table->decimal('price_monthly', 8, 2)->default(0.00);
            $table->integer('analyses_limit')->default(10);
            $table->integer('outreach_limit')->default(5);
            $table->integer('leads_limit')->default(25); // -1 for unlimited
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
