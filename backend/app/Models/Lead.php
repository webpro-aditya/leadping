<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lead extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'company_id',
        'source_url',
        'icp_score',
        'buying_intent_score',
        'pain_fit_score',
        'overall_score',
        'priority',
        'status',
        'notes',
        'ai_summary',
    ];

    protected function casts(): array
    {
        return [
            'icp_score' => 'integer',
            'buying_intent_score' => 'integer',
            'pain_fit_score' => 'integer',
            'overall_score' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function leadSignals(): HasMany
    {
        return $this->hasMany(LeadSignal::class);
    }

    public function signals(): HasMany
    {
        return $this->hasMany(LeadSignal::class);
    }

    public function leadPainPoints(): HasMany
    {
        return $this->hasMany(LeadPainPoint::class);
    }

    public function painPoints(): HasMany
    {
        return $this->hasMany(LeadPainPoint::class);
    }

    public function leadOpportunities(): HasMany
    {
        return $this->hasMany(LeadOpportunity::class);
    }

    public function opportunities(): HasMany
    {
        return $this->hasMany(LeadOpportunity::class);
    }

    public function outreachMessages(): HasMany
    {
        return $this->hasMany(OutreachMessage::class);
    }

    public function aiAnalysis(): HasOne
    {
        return $this->hasOne(AIAnalysis::class)->latestOfMany();
    }
}
