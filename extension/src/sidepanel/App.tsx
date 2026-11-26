import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/ui/Header';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { AnalysisView } from '../components/analysis/AnalysisView';
import { SavedLeads } from '../components/leads/SavedLeads';
import { UsageDisplay } from '../components/usage/UsageDisplay';
import { OutreachGenerator } from '../components/outreach/OutreachGenerator';

export const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentTab, setCurrentTab] = useState<'analysis' | 'leads' | 'usage'>('analysis');
  const [activeLeadForOutreach, setActiveLeadForOutreach] = useState<number | null>(null);
  const ownerTabIdRef = useRef<number | null>(null);
  const ownerWindowIdRef = useRef<number | null>(null);
  const latestActiveTabRef = useRef<number | null>(null);

  // Enforce single-tab side panel ownership: close immediately if superseded by another tab
  // or if the browser leaves the panel visible while switching to another tab in the same window.
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    let mounted = true;
    let bleedCheckTimer: ReturnType<typeof setTimeout> | null = null;
    const port = chrome.runtime.connect({ name: 'leadping-sidepanel' });

    chrome.runtime
      .sendMessage({ type: 'REGISTER_SIDE_PANEL' })
      .then((res?: { ownerTabId?: number | null; ownerWindowId?: number | null }) => {
        if (!mounted) return;
        const ownerTabId = typeof res?.ownerTabId === 'number' ? res.ownerTabId : null;
        const ownerWindowId = typeof res?.ownerWindowId === 'number' ? res.ownerWindowId : null;
        ownerTabIdRef.current = ownerTabId;
        ownerWindowIdRef.current = ownerWindowId;
        latestActiveTabRef.current = ownerTabId;
        if (ownerTabId !== null) {
          port.postMessage({ type: 'PORT_REGISTER', ownerTabId });
        }
      })
      .catch(() => {});

    const handleRuntimeMessage = (message: { type?: string; keepTabId?: number | null }) => {
      if (message?.type === 'FORCE_CLOSE_SIDE_PANEL') {
        window.close();
        return;
      }

      if (message?.type === 'CLOSE_SIDE_PANEL') {
        const ownerTabId = ownerTabIdRef.current;
        if (ownerTabId !== null && message.keepTabId !== ownerTabId) {
          window.close();
        }
      }
    };

    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      const ownerTabId = ownerTabIdRef.current;
      const ownerWindowId = ownerWindowIdRef.current;
      if (ownerTabId === null) return;
      if (ownerWindowId !== null && activeInfo.windowId !== ownerWindowId) return;

      latestActiveTabRef.current = activeInfo.tabId;

      if (bleedCheckTimer) {
        clearTimeout(bleedCheckTimer);
        bleedCheckTimer = null;
      }

      if (activeInfo.tabId === ownerTabId) return;

      // Give Chrome a moment to hide tab-scoped panels natively; if it stays visible, force-close it.
      bleedCheckTimer = setTimeout(() => {
        if (!mounted || latestActiveTabRef.current === ownerTabId || document.hidden) {
          return;
        }

        chrome.tabs.query({ active: true, windowId: activeInfo.windowId }, (tabs) => {
          if (!mounted) return;
          const currentActiveId = tabs[0]?.id ?? null;
          if (currentActiveId !== ownerTabId && !document.hidden) {
            chrome.runtime
              .sendMessage({ type: 'CLEAR_SIDE_PANEL_OWNER', tabId: ownerTabId })
              .catch(() => {});
            window.close();
          }
        });
      }, 150);
    };

    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    chrome.tabs?.onActivated?.addListener(handleTabActivated);

    return () => {
      mounted = false;
      if (bleedCheckTimer) clearTimeout(bleedCheckTimer);
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      chrome.tabs?.onActivated?.removeListener(handleTabActivated);
      port.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-3 shadow-md animate-pulse">
            L
          </div>
          <p className="text-xs text-slate-500 font-medium">Loading LeadPing AI...</p>
        </div>
      </div>
    );
  }

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
        {authView === 'login' ? (
          <LoginForm onSwitchToRegister={() => setAuthView('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header currentTab={currentTab} onTabChange={(tab) => {
        setCurrentTab(tab);
        setActiveLeadForOutreach(null);
      }} />

      <main className="flex-1 p-3.5 max-w-lg mx-auto w-full">
        {/* If outreach generator is active */}
        {activeLeadForOutreach !== null ? (
          <OutreachGenerator
            leadId={activeLeadForOutreach}
            onBack={() => setActiveLeadForOutreach(null)}
          />
        ) : (
          <>
            {currentTab === 'analysis' && (
              <AnalysisView
                onOpenOutreach={(leadId) => setActiveLeadForOutreach(leadId)}
                onOpenSavedLeads={() => setCurrentTab('leads')}
              />
            )}

            {currentTab === 'leads' && (
              <SavedLeads
                onSelectLead={(leadId) => setActiveLeadForOutreach(leadId)}
              />
            )}

            {currentTab === 'usage' && <UsageDisplay />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
