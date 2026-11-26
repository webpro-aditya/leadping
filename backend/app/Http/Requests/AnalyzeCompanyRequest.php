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
        if (! $this->has('url') && $this->input('page_data.url')) {
            $this->merge(['url' => $this->input('page_data.url')]);
        }

        if (! $this->has('page_data')) {
            $this->merge([
                'page_data' => [
                    'url' => $this->input('url'),
                    'title' => $this->input('title', ''),
                    'content' => $this->input('content', ''),
                    'headings' => $this->input('headings', []),
                    'technologies' => $this->input('technologies', []),
                    'meta_description' => $this->input('meta_description', ''),
                ],
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'url' => ['required', 'url:http,https', 'max:2048'],
            'async' => ['nullable', 'boolean'],
            'page_data' => ['required', 'array'],
            'page_data.title' => ['nullable', 'string', 'max:500'],
            'page_data.content' => ['nullable', 'string', 'max:25000'],
            'page_data.headings' => ['nullable', 'array', 'max:50'],
            'page_data.headings.*' => ['string', 'max:300'],
            'page_data.technologies' => ['nullable', 'array', 'max:30'],
            'page_data.technologies.*' => ['string', 'max:100'],
            'page_data.meta_description' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
