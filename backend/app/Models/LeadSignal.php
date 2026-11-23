<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadSignal extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'description',
        'confidence',
        'source_url',
        'observed_or_inferred',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
