import { useState, useCallback } from 'react';
import { analyzeCompany, saveLeadApi } from '../services/api';
import type { CompanyAnalysis, Lead, PageData } from '../types';

export function useAnalysis() {
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedLead, setSavedLead] = useState<Lead | null>(null);
  const [savingLead, setSavingLead] = useState<boolean>(false);

  const steps = [
    'Reading webpage content...',
    'Extracting key company info...',
    'Identifying products & value prop...',
    'Detecting buying signals...',
    'Generating sales intelligence...',
  ];

  const runAnalysis = useCallback(async (pageData: PageData) => {
    try {
      setAnalyzing(true);
      setError(null);
      setAnalysisStep(0);
      setSavedLead(null);

      // Progress animation timer
      const interval = setInterval(() => {
        setAnalysisStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 1200);

      const response = await analyzeCompany(pageData);
      clearInterval(interval);
      setAnalysisStep(steps.length - 1);
      setAnalysis(response.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during analysis.';
      setError(msg);
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  }, [steps.length]);

  const saveCurrentLead = useCallback(async (analysisData: CompanyAnalysis, sourceUrl: string) => {
    try {
      setSavingLead(true);
      const leadPayload: Omit<Lead, 'id' | 'created_at'> = {
        company_name: analysisData.company_name,
        website: analysisData.website || sourceUrl,
        industry: analysisData.industry,
        location: analysisData.location,
        company_size: analysisData.company_size,
        icp_score: analysisData.icp_score,
        buying_signals: analysisData.buying_signals,
        pain_points: analysisData.pain_points,
        opportunities: analysisData.opportunities,
        ai_summary: analysisData.ai_summary,
        outreach: [],
        source_url: sourceUrl,
        status: 'new',
        notes: '',
      };

      const res = await saveLeadApi(leadPayload);
      setSavedLead(res.data);
      return res.data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save lead.';
      throw new Error(msg);
    } finally {
      setSavingLead(false);
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setAnalysisStep(0);
    setSavedLead(null);
  }, []);

  return {
    analyzing,
    analysisStep,
    steps,
    analysis,
    error,
    savedLead,
    savingLead,
    runAnalysis,
    saveCurrentLead,
    resetAnalysis,
  };
}
