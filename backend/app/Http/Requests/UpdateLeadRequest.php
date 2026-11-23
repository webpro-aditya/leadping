<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['nullable', 'in:new,qualified,contacted,replied,meeting,won,lost'],
            'priority' => ['nullable', 'in:high,medium,low'],
            'notes' => ['nullable', 'string'],
            'overall_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'icp_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'buying_intent_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'pain_fit_score' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }
}
