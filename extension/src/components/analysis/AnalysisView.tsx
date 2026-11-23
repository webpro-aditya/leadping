import React, { useState, useEffect } from 'react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { CompanyOverview } from './CompanyOverview';
import { ICPScore } from './ICPScore';
import { BuyingSignals } from './BuyingSignals';
import { PainPoints } from './PainPoints';
import { Opportunities } from './Opportunities';
import { RecommendedPitch } from './RecommendedPitch';
import { LeadQualification } from './LeadQualification';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { PageData, Lead } from '../../types';

interface AnalysisViewProps {
  onOpenOutreach: (leadId: number) => void;
  onOpenSavedLeads: () => void;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({
  onOpenOutreach,
  onOpenSavedLeads,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [extracting, setExtracting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const {
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
  } = useAnalysis();

  // Load current tab URL on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.url) {
        setCurrentUrl(activeTab.url);
        setCurrentTitle(activeTab.title || '');
      }
    });
  }, []);

  // Handler to extract page data from content script and trigger analysis
  const handleAnalyze = async () => {
    setExtracting(true);
    setSaveSuccess(false);

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        setExtracting(false);
        return;
      }

      // Check if URL is analyzable
      if (
        !activeTab.url ||
        activeTab.url.startsWith('chrome://') ||
        activeTab.url.startsWith('chrome-extension://') ||
        activeTab.url.startsWith('edge://')
      ) {
        setExtracting(false);
        alert('Cannot analyze browser system pages. Please navigate to a company website.');
        return;
      }

      try {
        // Send message to content script
        chrome.tabs.sendMessage(
          activeTab.id,
          { type: 'EXTRACT_PAGE_DATA' },
          async (response) => {
            setExtracting(false);
            if (chrome.runtime.lastError || !response?.success) {
              // Content script might not be injected yet, attempt programmatic injection
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: activeTab.id! },
                  files: ['content.js'],
                });

                // Retry extraction after injection
                setTimeout(() => {
                  chrome.tabs.sendMessage(
                    activeTab.id!,
                    { type: 'EXTRACT_PAGE_DATA' },
                    async (retryRes) => {
                      if (retryRes?.success) {
                        setPageData(retryRes.data);
                        await runAnalysis(retryRes.data);
                      } else {
                        // Fallback: minimal page data
                        const fallbackData: PageData = {
                          url: activeTab.url!,
                          title: activeTab.title || '',
                          meta_description: '',
                          headings: [],
                          content: '',
                          links: [],
                          opengraph: {},
                          json_ld: [],
                          contact_info: { emails: [], phones: [] },
                          technologies: [],
                        };
                        setPageData(fallbackData);
                        await runAnalysis(fallbackData);
                      }
                    }
                  );
                }, 300);
              } catch (injectErr) {
                console.error('Failed to inject content script:', injectErr);
              }
              return;
            }

            setPageData(response.data);
            await runAnalysis(response.data);
          }
        );
      } catch (err) {
        setExtracting(false);
        console.error('Extraction error:', err);
      }
    });
  };

  const handleSaveLead = async (): Promise<Lead | null> => {
    if (!analysis) return null;
    try {
      const saved = await saveCurrentLead(analysis, currentUrl);
      if (saved) {
        setSaveSuccess(true);
        return saved;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Current page bar */}
      <Card className="!p-3 bg-slate-900 text-white border-0 shadow-md">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            Active Target
          </span>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Tab
          </span>
        </div>
        <p className="font-semibold text-xs text-white truncate" title={currentTitle}>
          {currentTitle || 'Current Webpage'}
        </p>
        <p className="text-[11px] text-slate-400 truncate mt-0.5" title={currentUrl}>
          {currentUrl || 'https://...'}
        </p>

        {!analysis && !analyzing && (
          <Button
            variant="primary"
            size="md"
            className="w-full mt-3 bg-indigo-500 hover:bg-indigo-600 font-semibold"
            onClick={handleAnalyze}
            isLoading={extracting}
          >
            {extracting ? 'Inspecting Page...' : '⚡ Analyze Company with AI'}
          </Button>
        )}
      </Card>

      {/* Loading state */}
      {analyzing && <LoadingState currentStep={analysisStep} steps={steps} />}

      {/* Error state */}
      {error && !analyzing && (
        <ErrorState message={error} onRetry={handleAnalyze} />
      )}

      {/* Analysis Results */}
      {analysis && !analyzing && (
        <div className="space-y-3.5 animate-fadeIn">
          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleSaveLead}
              isLoading={savingLead}
              disabled={saveSuccess || !!savedLead}
            >
              {saveSuccess || savedLead ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Lead Saved
                </span>
              ) : (
                '💾 Save Lead'
              )}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                if (savedLead) {
                  onOpenOutreach(savedLead.id);
                } else {
                  handleSaveLead().then((lead) => {
                    if (lead) onOpenOutreach(lead.id);
                  });
                }
              }}
            >
              ✉️ Generate Outreach
            </Button>

            <button
              onClick={resetAnalysis}
              title="Re-analyze"
              className="p-2 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {/* AI Summary Highlight */}
          {analysis.ai_summary && (
            <Card className="bg-indigo-50/50 border-indigo-100/80 !p-3">
              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block mb-1">
                Executive AI Summary
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {analysis.ai_summary}
              </p>
            </Card>
          )}

          {/* Company Overview */}
          <CompanyOverview analysis={analysis} />

          {/* ICP Score */}
          <ICPScore score={analysis.icp_score} />

          {/* Lead Qualification */}
          <LeadQualification qualification={analysis.lead_qualification} />

          {/* Recommended Pitch */}
          <RecommendedPitch pitch={analysis.recommended_pitch} />

          {/* Buying Signals */}
          <BuyingSignals signals={analysis.buying_signals} />

          {/* Pain Points */}
          <PainPoints painPoints={analysis.pain_points} />

          {/* Opportunities */}
          <Opportunities opportunities={analysis.opportunities} />
        </div>
      )}
    </div>
  );
};
