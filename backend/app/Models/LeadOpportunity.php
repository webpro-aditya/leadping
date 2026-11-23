<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadOpportunity extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'title',
        'description',
        'why',
        'potential_solution',
        'priority',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
