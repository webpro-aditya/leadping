import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/api';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [resending, setResending] = useState(false);
  const [resentMsg, setResentMsg] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setResentMsg(null);
    try {
      const { data } = await authApi.resendVerification();
      setResentMsg(data.message || 'Verification email sent.');
    } catch {
      setResentMsg('Unable to send verification email right now.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        {user && !user.email_verified_at && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>
              Please verify your email address (<strong>{user.email}</strong>) to secure account recovery.
              {resentMsg && <span className="ml-2 font-semibold text-amber-800">{resentMsg}</span>}
            </span>
            <button
              type="button"
              disabled={resending}
              onClick={handleResend}
              className="font-semibold text-amber-900 underline hover:text-amber-700 disabled:opacity-60"
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
        )}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
