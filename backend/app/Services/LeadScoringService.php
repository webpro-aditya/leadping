<?php

namespace App\Services;

use App\Models\Lead;

class LeadScoringService
{
    /**
     * Clamp any numeric score strictly into [0, 100].
     */
    protected function clampScore(int|float|string|null $value, int $default = 70): int
    {
        $intVal = is_numeric($value) ? (int) round((float) $value) : $default;

        return max(0, min(100, $intVal));
    }

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

        $icpScore = $this->clampScore($icp['overall'] ?? $leadQual['icp_fit'] ?? null);
        $buyingIntentScore = $this->clampScore($leadQual['buying_intent'] ?? $icp['buying_signal_score'] ?? null);
        $painFitScore = $this->clampScore($leadQual['pain_fit'] ?? $icp['problem_fit'] ?? null);

        $overall = $this->clampScore(
            $leadQual['overall'] ?? round(($icpScore + $buyingIntentScore + $painFitScore) / 3)
        );

        $priorityFromAi = strtolower((string) ($leadQual['priority'] ?? ''));
        $priority = in_array($priorityFromAi, ['high', 'medium', 'low'], true)
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
        $icpScore = isset($scores['icp_score']) ? $this->clampScore($scores['icp_score']) : $lead->icp_score;
        $buyingIntentScore = isset($scores['buying_intent_score']) ? $this->clampScore($scores['buying_intent_score']) : $lead->buying_intent_score;
        $painFitScore = isset($scores['pain_fit_score']) ? $this->clampScore($scores['pain_fit_score']) : $lead->pain_fit_score;

        $overall = $this->clampScore(
            $scores['overall_score'] ?? round(($icpScore + $buyingIntentScore + $painFitScore) / 3)
        );

        $priorityFromInput = strtolower((string) ($scores['priority'] ?? ''));
        $priority = in_array($priorityFromInput, ['high', 'medium', 'low'], true)
            ? $priorityFromInput
            : $this->calculatePriority($overall);

        $lead->update([
            'icp_score' => $icpScore,
            'buying_intent_score' => $buyingIntentScore,
            'pain_fit_score' => $painFitScore,
            'overall_score' => $overall,
            'priority' => $priority,
        ]);

        return $lead;
    }
}
