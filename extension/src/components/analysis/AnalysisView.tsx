import React, { useState, useEffect, useRef } from 'react';
import { useAnalysis } from '../../hooks/useAnalysis';
import { normalizeTargetUrl } from '../../utils/url';
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
  const [extractError, setExtractError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const lastNormalizedUrlRef = useRef<string>('');

  const {
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
  } = useAnalysis();

  // Load current tab URL on mount and listen to tab switches/navigation
  useEffect(() => {
    const syncUrlChange = (url: string, title: string) => {
      setCurrentUrl(url);
      setCurrentTitle(title);
      const normalized = normalizeTargetUrl(url);
      if (normalized !== lastNormalizedUrlRef.current) {
        lastNormalizedUrlRef.current = normalized;
        setSaveSuccess(false);
        setExtractError(null);
        void loadCachedForUrl(url);
      }
    };

    const updateActiveTab = () => {
      chrome.tabs?.query?.({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs?.[0];
        const tabUrl = activeTab?.url || activeTab?.pendingUrl || '';
        const tabTitle = activeTab?.title || '';

        if (tabUrl) {
          syncUrlChange(tabUrl, tabTitle);
          return;
        }

        if (activeTab?.id) {
          chrome.tabs.sendMessage(
            activeTab.id,
            { type: 'GET_PAGE_INFO' },
            (res) => {
              if (!chrome.runtime.lastError && res?.success && res.url) {
                syncUrlChange(res.url, res.title || '');
              } else {
                syncUrlChange('', '');
              }
            }
          );
        } else {
          syncUrlChange('', '');
        }
      });
    };

    updateActiveTab();

    const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.url || changeInfo.title || changeInfo.status === 'complete') {
        updateActiveTab();
      }
    };

    const handleTabActivated = () => {
      updateActiveTab();
    };

    chrome.tabs?.onUpdated?.addListener(handleTabUpdated);
    chrome.tabs?.onActivated?.addListener(handleTabActivated);

    return () => {
      chrome.tabs?.onUpdated?.removeListener(handleTabUpdated);
      chrome.tabs?.onActivated?.removeListener(handleTabActivated);
    };
  }, [loadCachedForUrl]);

  const applyExtractedData = async (extracted: PageData, forceRefresh = false) => {
    if (extracted.url) {
      setCurrentUrl(extracted.url);
      lastNormalizedUrlRef.current = normalizeTargetUrl(extracted.url);
    }
    if (extracted.title) setCurrentTitle(extracted.title);
    setPageData(extracted);
    setExtracting(false);
    await runAnalysis(extracted, forceRefresh);
  };

  // Handler to extract page data from content script and trigger analysis
  const handleAnalyze = async (forceRefresh = false) => {
    setExtracting(true);
    setExtractError(null);
    setSaveSuccess(false);

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        setExtracting(false);
        return;
      }

      const tabUrl = activeTab.url || activeTab.pendingUrl || '';
      const isSystemPage =
        tabUrl.startsWith('chrome://') ||
        tabUrl.startsWith('chrome-extension://') ||
        tabUrl.startsWith('edge://') ||
        tabUrl.startsWith('about:') ||
        tabUrl.startsWith('devtools://');

      if (isSystemPage) {
        setExtracting(false);
        setExtractError('Cannot analyze browser system pages. Please navigate to a company website.');
        return;
      }

      try {
        // Send message to content script (also supplies url/title if tab.url is omitted)
        chrome.tabs.sendMessage(
          activeTab.id,
          { type: 'EXTRACT_PAGE_DATA' },
          async (response) => {
            if (!chrome.runtime.lastError && response?.success && response.data) {
              await applyExtractedData(response.data, forceRefresh);
              return;
            }

            // Content script might not be injected yet, attempt programmatic injection
            try {
              await chrome.scripting.executeScript({
                target: { tabId: activeTab.id! },
                files: ['content.js'],
              });

              setTimeout(() => {
                chrome.tabs.sendMessage(
                  activeTab.id!,
                  { type: 'EXTRACT_PAGE_DATA' },
                  async (retryRes) => {
                    if (!chrome.runtime.lastError && retryRes?.success && retryRes.data) {
                      await applyExtractedData(retryRes.data, forceRefresh);
                      return;
                    }

                    if (tabUrl) {
                      await applyExtractedData({
                        url: tabUrl,
                        title: activeTab.title || '',
                        meta_description: '',
                        headings: [],
                        content: '',
                        links: [],
                        opengraph: {},
                        json_ld: [],
                        contact_info: { emails: [], phones: [] },
                        technologies: [],
                      }, forceRefresh);
                    } else {
                      setExtracting(false);
                      setExtractError('Cannot access this page. Please refresh the website and try again.');
                    }
                  }
                );
              }, 300);
            } catch (injectErr) {
              setExtracting(false);
              console.error('Failed to inject content script:', injectErr);
              setExtractError('Cannot analyze browser system pages or restricted tabs. Please navigate to a company website and refresh the page.');
            }
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
    <div className="space-y-4 pb-4">
      {/* Current page bar */}
      <Card className="!p-3 bg-slate-900 text-white border-0 shadow-md">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
            {currentUrl.includes('linkedin.com/in/') ? '👤 LinkedIn Executive Prospect' : 'Active Target'}
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
            onClick={() => handleAnalyze(false)}
            isLoading={extracting}
          >
            {extracting
              ? 'Extracting Profile...'
              : currentUrl.includes('linkedin.com/in/')
              ? '⚡ Qualify Prospect & Company with AI'
              : '⚡ Analyze Company with AI'}
          </Button>
        )}
      </Card>

      {/* Loading state */}
      {analyzing && <LoadingState currentStep={analysisStep} steps={steps} />}

      {/* Error state */}
      {(extractError || error) && !analyzing && (
        <ErrorState message={(extractError || error)!} onRetry={() => handleAnalyze(false)} />
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
              onClick={() => {
                if (fromLocalCache) {
                  handleAnalyze(true);
                } else {
                  resetAnalysis();
                }
              }}
              title={fromLocalCache ? 'Refresh live AI analysis' : 'Re-analyze'}
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
