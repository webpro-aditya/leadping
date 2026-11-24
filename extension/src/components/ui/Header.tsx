import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  currentTab: 'analysis' | 'leads' | 'usage';
  onTabChange: (tab: 'analysis' | 'leads' | 'usage') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onTabChange }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-3 py-2.5">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            L
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-900 leading-none flex items-center gap-1">
              LeadPing AI
              <span className="text-[9px] bg-indigo-100 text-indigo-700 font-semibold px-1 py-0.5 rounded">
                PRO
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 leading-tight">Sales Intelligence</p>
          </div>
        </div>

        {/* User menu / Logout */}
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-600 truncate max-w-[100px]" title={user.email}>
              {(user.name || user.email || 'User').split(' ')[0]}
            </span>
            <button
              onClick={logout}
              title="Logout"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Navigation tabs */}
      <nav className="flex space-x-1 mt-2.5 pt-2 border-t border-slate-100">
        <button
          onClick={() => onTabChange('analysis')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md text-center transition-colors ${
            currentTab === 'analysis'
              ? 'bg-indigo-50 text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => onTabChange('leads')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md text-center transition-colors ${
            currentTab === 'leads'
              ? 'bg-indigo-50 text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Saved Leads
        </button>
        <button
          onClick={() => onTabChange('usage')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md text-center transition-colors ${
            currentTab === 'usage'
              ? 'bg-indigo-50 text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Usage
        </button>
      </nav>
    </header>
  );
};
