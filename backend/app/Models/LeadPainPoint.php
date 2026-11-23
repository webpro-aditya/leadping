<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadPainPoint extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'title',
        'description',
        'confidence',
        'explanation',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
