import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-6 px-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
          L
        </div>
        <h2 className="text-lg font-bold text-slate-900">Welcome to LeadPing AI</h2>
        <p className="text-xs text-slate-500 mt-1">
          Sign in to your account to analyze prospects and generate outreach
        </p>
      </div>

      <Card className="shadow-md border-slate-200/80">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full font-semibold"
            isLoading={loading}
          >
            Sign In
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
            >
              Don&apos;t have an account? Sign up
            </button>
          </div>
        </form>
      </Card>

      <p className="text-[11px] text-slate-400 text-center mt-6">
        Protected with enterprise encryption &amp; strict CSP.
      </p>
    </div>
  );
};
