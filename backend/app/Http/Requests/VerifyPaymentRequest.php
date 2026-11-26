<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VerifyPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'gateway_order_id' => $this->input('gateway_order_id') ?? $this->input('razorpay_order_id'),
            'gateway_payment_id' => $this->input('gateway_payment_id') ?? $this->input('razorpay_payment_id'),
            'gateway_signature' => $this->input('gateway_signature') ?? $this->input('razorpay_signature'),
        ]);
    }

    public function rules(): array
    {
        return [
            'gateway' => ['nullable', 'string', 'max:50'],
            'gateway_order_id' => ['required', 'string', 'max:255'],
            'gateway_payment_id' => ['required', 'string', 'max:255'],
            'gateway_signature' => ['required', 'string', 'max:512'],
        ];
    }
}
