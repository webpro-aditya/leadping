import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/ui/Header';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { AnalysisView } from '../components/analysis/AnalysisView';
import { SavedLeads } from '../components/leads/SavedLeads';
import { UsageDisplay } from '../components/usage/UsageDisplay';
import { OutreachGenerator } from '../components/outreach/OutreachGenerator';

export const Popup: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentTab, setCurrentTab] = useState<'analysis' | 'leads' | 'usage'>('analysis');
  const [activeLeadForOutreach, setActiveLeadForOutreach] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="w-[440px] h-[580px] flex items-center justify-center bg-slate-50 font-sans">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-3 shadow-md animate-pulse">
            L
          </div>
          <p className="text-xs text-slate-500 font-medium">Loading LeadPing AI...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-[440px] h-[580px] bg-slate-50 overflow-y-auto flex flex-col justify-center font-sans">
        {authView === 'login' ? (
          <LoginForm onSwitchToRegister={() => setAuthView('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    );
  }

  return (
    <div className="w-[440px] h-[580px] bg-slate-50 flex flex-col overflow-hidden font-sans">
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setActiveLeadForOutreach(null);
        }}
      />

      <main className="flex-1 min-h-0 overflow-y-auto p-3.5 w-full">
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

export default Popup;
