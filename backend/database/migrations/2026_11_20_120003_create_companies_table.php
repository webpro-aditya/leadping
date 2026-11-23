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
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('website')->unique();
            $table->string('industry')->nullable();
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->string('company_size')->nullable();
            $table->string('business_model')->nullable();
            $table->json('products_services')->nullable();
            $table->text('target_customers')->nullable();
            $table->json('raw_data')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
