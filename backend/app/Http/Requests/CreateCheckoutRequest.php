<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('plan') && $this->filled('plan_id')) {
            $this->merge(['plan' => $this->input('plan_id')]);
        }
    }

    public function rules(): array
    {
        return [
            'plan' => ['required'],
            'billing_cycle' => ['nullable', 'string', 'in:monthly,annual'],
            'gateway' => ['nullable', 'string', 'max:50'],
        ];
    }
}
