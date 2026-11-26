<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIAnalysis extends Model
{
    use HasFactory;

    protected $table = 'ai_analyses';

    protected $fillable = [
        'user_id',
        'company_id',
        'lead_id',
        'source_url',
        'analysis_type',
        'raw_response',
        'structured_response',
        'ai_provider',
        'model_used',
        'tokens_used',
    ];

    protected $hidden = [
        'raw_response',
    ];

    protected function casts(): array
    {
        return [
            'raw_response' => 'array',
            'structured_response' => 'array',
            'tokens_used' => 'integer',
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

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
