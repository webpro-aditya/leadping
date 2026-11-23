<?php

namespace App\Services;

use App\Models\Lead;

class LeadScoringService
{
    /**
     * Calculate priority based on overall score.
     */
    public function calculatePriority(int $overallScore): string
    {
        if ($overallScore >= 80) {
            return 'high';
        }

        if ($overallScore >= 50) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Extract and normalize scores from AI response array.
     */
    public function extractScores(array $aiResponse): array
    {
        $icp = $aiResponse['icp_score'] ?? [];
        $leadQual = $aiResponse['lead_qualification'] ?? [];

        $icpScore = (int) ($icp['overall'] ?? $leadQual['icp_fit'] ?? 70);
        $buyingIntentScore = (int) ($leadQual['buying_intent'] ?? $icp['buying_signal_score'] ?? 70);
        $painFitScore = (int) ($leadQual['pain_fit'] ?? $icp['problem_fit'] ?? 70);

        $overall = (int) ($leadQual['overall'] ?? round(($icpScore + $buyingIntentScore + $painFitScore) / 3));

        $priorityFromAi = strtolower((string) ($leadQual['priority'] ?? ''));
        $priority = in_array($priorityFromAi, ['high', 'medium', 'low'])
            ? $priorityFromAi
            : $this->calculatePriority($overall);

        return [
            'icp_score' => $icpScore,
            'buying_intent_score' => $buyingIntentScore,
            'pain_fit_score' => $painFitScore,
            'overall_score' => $overall,
            'priority' => $priority,
        ];
    }

    /**
     * Apply updated scores to a lead and save.
     */
    public function updateLeadScores(Lead $lead, array $scores): Lead
    {
        $overall = $scores['overall_score'] ?? round(
            (($scores['icp_score'] ?? $lead->icp_score) +
             ($scores['buying_intent_score'] ?? $lead->buying_intent_score) +
             ($scores['pain_fit_score'] ?? $lead->pain_fit_score)) / 3
        );

        $priority = $scores['priority'] ?? $this->calculatePriority((int) $overall);

        $lead->update([
            'icp_score' => $scores['icp_score'] ?? $lead->icp_score,
            'buying_intent_score' => $scores['buying_intent_score'] ?? $lead->buying_intent_score,
            'pain_fit_score' => $scores['pain_fit_score'] ?? $lead->pain_fit_score,
            'overall_score' => (int) $overall,
            'priority' => $priority,
        ]);

        return $lead;
    }
}
