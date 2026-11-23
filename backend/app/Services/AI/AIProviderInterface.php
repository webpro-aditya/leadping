<?php

namespace App\Services\AI;

interface AIProviderInterface
{
    /**
     * Analyze company webpage data and return structured sales intelligence.
     */
    public function analyzeCompany(array $pageData): array;

    /**
     * Generate personalized outreach message for a specified channel.
     */
    public function generateOutreach(array $analysisData, string $channel, string $tone = 'professional'): array;

    /**
     * Recalculate lead scores based on updated lead data.
     */
    public function rescoreLead(array $leadData): array;
}
