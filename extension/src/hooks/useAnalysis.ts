import { useState, useCallback } from 'react';
import { analyzeCompany, saveLeadApi } from '../services/api';
import { getCachedAnalysis, setCachedAnalysis } from '../services/storage';
import type { CompanyAnalysis, Lead, PageData } from '../types';

function normalizeQualificationScore(rawScore: unknown, priority?: string, overall?: number): 'hot' | 'warm' | 'cold' {
  if (rawScore === 'hot' || rawScore === 'warm' || rawScore === 'cold') {
    return rawScore;
  }
  const p = (priority || '').toLowerCase();
  if (p === 'high') return 'hot';
  if (p === 'low') return 'cold';
  if (typeof overall === 'number') {
    if (overall >= 80) return 'hot';
    if (overall < 50) return 'cold';
  }
  return 'warm';
}

function normalizePitch(rawPitch: unknown): string {
  if (typeof rawPitch === 'string') return rawPitch;
  if (rawPitch && typeof rawPitch === 'object') {
    const pitchObj = rawPitch as { angle?: string; lead_with?: string };
    return [pitchObj.angle, pitchObj.lead_with].filter(Boolean).join(' — ');
  }
  return '';
}

function normalizeAnalysisResponse(raw: Record<string, unknown>, fallbackUrl: string): CompanyAnalysis {
  const company = (raw.company as Record<string, unknown> | undefined) ?? {};
  const qual = (raw.lead_qualification as Record<string, unknown> | undefined) ?? {};
  const icp = (raw.icp_score as CompanyAnalysis['icp_score'] | undefined) ?? {
    overall: 70,
    industry_fit: 70,
    company_size_fit: 70,
    technology_fit: 70,
    problem_fit: 70,
    buying_signal_score: 70,
  };

  const nextSteps = Array.isArray(qual.next_steps)
    ? (qual.next_steps as string[])
    : qual.recommended_action
    ? [String(qual.recommended_action)]
    : [];

  return {
    lead_id: typeof raw.lead_id === 'number' ? raw.lead_id : undefined,
    company_name: String(raw.company_name || company.name || 'Unknown Company'),
    website: String(raw.website || fallbackUrl || ''),
    industry: String(raw.industry || company.industry || ''),
    location: String(raw.location || company.location || ''),
    company_size: String(raw.company_size || company.company_size || ''),
    description: String(raw.description || company.description || ''),
    products_services: Array.isArray(raw.products_services)
      ? (raw.products_services as string[])
      : Array.isArray(company.products_services)
      ? (company.products_services as string[])
      : [],
    icp_score: icp,
    buying_signals: Array.isArray(raw.buying_signals) ? raw.buying_signals : [],
    pain_points: Array.isArray(raw.pain_points) ? raw.pain_points : [],
    opportunities: Array.isArray(raw.opportunities) ? raw.opportunities : [],
    recommended_pitch: normalizePitch(raw.recommended_pitch),
    lead_qualification: {
      score: normalizeQualificationScore(
        qual.score,
        qual.priority as string | undefined,
        typeof qual.overall === 'number' ? qual.overall : icp.overall
      ),
      reasoning: String(qual.reasoning || raw.ai_summary || raw.summary || ''),
      next_steps: nextSteps,
    },
    ai_summary: String(raw.ai_summary || raw.summary || ''),
  };
}

function toSavedLeadStub(data: CompanyAnalysis, sourceUrl: string): Lead | null {
  if (!data.lead_id) return null;
  return {
    id: data.lead_id,
    company_name: data.company_name,
    website: data.website || sourceUrl,
    industry: data.industry,
    location: data.location,
    company_size: data.company_size,
    icp_score: data.icp_score,
    buying_signals: data.buying_signals,
    pain_points: data.pain_points,
    opportunities: data.opportunities,
    ai_summary: data.ai_summary,
    outreach: [],
    source_url: sourceUrl,
    status: 'new',
    notes: '',
    created_at: new Date().toISOString(),
  };
}

export function useAnalysis() {
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedLead, setSavedLead] = useState<Lead | null>(null);
  const [savingLead, setSavingLead] = useState<boolean>(false);
  const [fromLocalCache, setFromLocalCache] = useState<boolean>(false);

  const steps = [
    'Reading webpage content...',
    'Extracting key company info...',
    'Identifying products & value prop...',
    'Detecting buying signals...',
    'Generating sales intelligence...',
  ];

  const loadCachedForUrl = useCallback(async (url: string) => {
    if (!url) {
      setAnalysis(null);
      setSavedLead(null);
      setError(null);
      setFromLocalCache(false);
      return;
    }

    const cached = await getCachedAnalysis(url);
    if (cached) {
      setAnalysis(cached);
      setSavedLead(toSavedLeadStub(cached, url));
      setError(null);
      setFromLocalCache(true);
    } else {
      setAnalysis(null);
      setSavedLead(null);
      setError(null);
      setFromLocalCache(false);
    }
  }, []);

  const runAnalysis = useCallback(async (pageData: PageData, forceRefresh = false) => {
    if (!forceRefresh) {
      const localHit = await getCachedAnalysis(pageData.url);
      if (localHit) {
        setAnalysis(localHit);
        setSavedLead(toSavedLeadStub(localHit, pageData.url));
        setError(null);
        setFromLocalCache(true);
        return;
      }
    }

    const interval = setInterval(() => {
      setAnalysisStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      setAnalyzing(true);
      setError(null);
      setAnalysisStep(0);
      setSavedLead(null);
      setFromLocalCache(false);

      const response = await analyzeCompany(pageData);
      setAnalysisStep(steps.length - 1);

      const normalized = normalizeAnalysisResponse(
        response.data as unknown as Record<string, unknown>,
        pageData.url
      );
      setAnalysis(normalized);
      setSavedLead(toSavedLeadStub(normalized, pageData.url));
      await setCachedAnalysis(pageData.url, normalized);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during analysis.';
      setError(msg);
      setAnalysis(null);
    } finally {
      clearInterval(interval);
      setAnalyzing(false);
    }
  }, [steps.length]);

  const saveCurrentLead = useCallback(async (analysisData: CompanyAnalysis, sourceUrl: string) => {
    const stub = toSavedLeadStub(analysisData, sourceUrl);
    if (stub) {
      setSavedLead(stub);
      return stub;
    }

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
    setFromLocalCache(false);
  }, []);

  return {
    analyzing,
    analysisStep,
    steps,
    analysis,
    error,
    savedLead,
    savingLead,
    fromLocalCache,
    loadCachedForUrl,
    runAnalysis,
    saveCurrentLead,
    resetAnalysis,
  };
}
