import React from 'react';
import { Button } from '../components/ui/Button';

export const Popup: React.FC = () => {
  const handleOpenSidePanel = async () => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.id) {
          chrome.sidePanel.open({ tabId: activeTab.id }).catch((err) => {
            console.error(err);
          });
          window.close();
        }
      });
    } catch (err) {
      console.error('Failed to open side panel', err);
    }
  };

  return (
    <div className="w-[300px] p-4 bg-white text-slate-800 font-sans">
      <div className="flex items-center space-x-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
          L
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-none">LeadPing AI</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Sales &amp; Lead Intelligence</p>
        </div>
      </div>

      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
        Analyze any company website, reveal deep buying signals, and generate hyper-personalized sales outreach in seconds.
      </p>

      <Button
        variant="primary"
        size="md"
        className="w-full font-medium"
        onClick={handleOpenSidePanel}
      >
        Open Side Panel
      </Button>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>Manifest V3</span>
        <span>LeadPing AI v1.0.0</span>
      </div>
    </div>
  );
};

export default Popup;
