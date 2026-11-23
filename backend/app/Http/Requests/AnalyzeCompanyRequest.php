<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AnalyzeCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Allow url to be provided at root or within page_data
        if (!$this->has('url') && $this->input('page_data.url')) {
            $this->merge(['url' => $this->input('page_data.url')]);
        }

        if (!$this->has('page_data')) {
            $this->merge([
                'page_data' => [
                    'url' => $this->input('url'),
                    'title' => $this->input('title', ''),
                    'content' => $this->input('content', ''),
                    'headings' => $this->input('headings', []),
                    'meta_description' => $this->input('meta_description', ''),
                ]
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'url' => ['required', 'url'],
            'page_data' => ['required', 'array'],
            'page_data.title' => ['nullable', 'string'],
            'page_data.content' => ['nullable'],
            'page_data.headings' => ['nullable', 'array'],
            'page_data.meta_description' => ['nullable', 'string'],
        ];
    }
}
