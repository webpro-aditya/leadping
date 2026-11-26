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
            'website' => ['nullable', 'string', 'max:255', 'regex:/^(https?:\/\/)?[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(\/.*)?$/i'],
            'industry' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'company_size' => ['nullable', 'string', 'max:100'],
            'company' => ['nullable', 'array'],
            'company.name' => ['nullable', 'string', 'max:255'],
            'company.website' => ['nullable', 'string', 'max:255', 'regex:/^(https?:\/\/)?[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}(\/.*)?$/i'],
            'company.industry' => ['nullable', 'string', 'max:255'],
            'company.description' => ['nullable', 'string', 'max:2000'],
            'company.location' => ['nullable', 'string', 'max:255'],
            'company.company_size' => ['nullable', 'string', 'max:100'],
            'source_url' => ['required', 'url:http,https', 'max:2048'],
            'icp_score' => ['nullable'],
            'buying_intent_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'pain_fit_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'overall_score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'priority' => ['nullable', 'in:high,medium,low'],
            'status' => ['nullable', 'in:new,qualified,contacted,replied,meeting,won,lost'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'ai_summary' => ['nullable', 'string', 'max:5000'],
            'signals' => ['nullable', 'array', 'max:20'],
            'signals.*.description' => ['nullable', 'string', 'max:1000'],
            'signals.*.confidence' => ['nullable', 'in:high,medium,low'],
            'signals.*.source_url' => ['nullable', 'url:http,https', 'max:2048'],
            'signals.*.observed_or_inferred' => ['nullable', 'in:observed,inferred'],
            'buying_signals' => ['nullable', 'array', 'max:20'],
            'buying_signals.*.description' => ['nullable', 'string', 'max:1000'],
            'buying_signals.*.confidence' => ['nullable', 'in:high,medium,low'],
            'buying_signals.*.source_url' => ['nullable', 'url:http,https', 'max:2048'],
            'buying_signals.*.source' => ['nullable', 'string', 'max:2048'],
            'buying_signals.*.observed_or_inferred' => ['nullable', 'in:observed,inferred'],
            'pain_points' => ['nullable', 'array', 'max:20'],
            'pain_points.*.title' => ['nullable', 'string', 'max:255'],
            'pain_points.*.description' => ['nullable', 'string', 'max:1000'],
            'pain_points.*.confidence' => ['nullable', 'in:high,medium,low'],
            'pain_points.*.explanation' => ['nullable', 'string', 'max:1000'],
            'opportunities' => ['nullable', 'array', 'max:20'],
            'opportunities.*.title' => ['nullable', 'string', 'max:255'],
            'opportunities.*.description' => ['nullable', 'string', 'max:1000'],
            'opportunities.*.why' => ['nullable', 'string', 'max:1000'],
            'opportunities.*.potential_solution' => ['nullable', 'string', 'max:1000'],
            'opportunities.*.priority' => ['nullable', 'in:high,medium,low'],
            'outreach' => ['nullable', 'array', 'max:20'],
        ];
    }
}
