import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-700 focus:outline-none p-1.5 -ml-1.5 mr-2 rounded-lg hover:bg-slate-100"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline-block">
          Lead Intelligence Platform
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 leading-none">{user.name}</div>
              <div className="text-xs text-slate-400 mt-1 capitalize">
                Plan: <span className="font-medium text-indigo-600">{user.plan || 'Free'}</span>
              </div>
            </div>
            <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200 uppercase">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:text-red-600">
          <svg
            className="w-4 h-4 mr-1.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};
