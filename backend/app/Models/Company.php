<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'website',
        'industry',
        'description',
        'location',
        'company_size',
        'business_model',
        'products_services',
        'target_customers',
        'raw_data',
    ];

    protected $hidden = [
        'raw_data',
    ];

    protected function casts(): array
    {
        return [
            'products_services' => 'array',
            'raw_data' => 'array',
        ];
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function aiAnalyses(): HasMany
    {
        return $this->hasMany(AIAnalysis::class);
    }
}
