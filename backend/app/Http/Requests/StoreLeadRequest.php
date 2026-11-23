<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_id' => ['nullable', 'exists:companies,id'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'string'],
            'industry' => ['nullable', 'string'],
            'location' => ['nullable', 'string'],
            'company_size' => ['nullable', 'string'],
            'company' => ['nullable', 'array'],
            'company.name' => ['nullable', 'string', 'max:255'],
            'company.website' => ['nullable', 'string'],
            'source_url' => ['required', 'string'],
            'icp_score' => ['nullable'],
            'buying_intent_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'pain_fit_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'overall_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'priority' => ['nullable', 'in:high,medium,low'],
            'status' => ['nullable', 'in:new,qualified,contacted,replied,meeting,won,lost'],
            'notes' => ['nullable', 'string'],
            'ai_summary' => ['nullable', 'string'],
            'signals' => ['nullable', 'array'],
            'buying_signals' => ['nullable', 'array'],
            'pain_points' => ['nullable', 'array'],
            'opportunities' => ['nullable', 'array'],
            'outreach' => ['nullable', 'array'],
        ];
    }
}
