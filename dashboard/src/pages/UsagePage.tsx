import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsage } from '../hooks/useUsage';
import { useAuth } from '../hooks/useAuth';
import { UsageStats } from '../components/usage/UsageStats';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const UsagePage: React.FC = () => {
  const { usage, loading, fetchUsage } = useUsage();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const defaultUsage = usage || {
    analyses_used: 3,
    analyses_limit: 10,
    outreach_used: 1,
    outreach_limit: 5,
    leads_used: 6,
    leads_limit: 25,
  };

  const isFreePlan = (user?.plan || 'free').toLowerCase() === 'free';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Usage & Quotas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor your monthly intelligence analysis and outreach limits
          </p>
        </div>

        <Button variant="primary" onClick={() => navigate('/subscription')}>
          Manage Subscription
        </Button>
      </div>

      {/* Plan status card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              Current Plan
            </span>
            <Badge variant="purple" size="sm">
              Active
            </Badge>
          </div>
          <div className="text-2xl font-bold text-slate-900 capitalize">
            {user?.plan || 'Free Tier'}
          </div>
          <p className="text-xs text-slate-500">
            Monthly quota resets automatically at the start of your billing cycle.
          </p>
        </div>

        {isFreePlan && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-center space-x-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span>You are on the Free Plan. Upgrade to Pro for 10x higher capacity!</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/subscription')}
              className="ml-auto flex-shrink-0"
            >
              Upgrade
            </Button>
          </div>
        )}
      </div>

      {/* Usage statistics grid */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Resource Utilization</h2>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Loading usage quotas...</div>
        ) : (
          <UsageStats usage={defaultUsage} />
        )}
      </div>

      {/* Usage History */}
      <Card title="Activity & Usage History" subtitle="Recent analysis activities logged">
        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800">Company Intelligence Scan</span>
              <p className="text-slate-400">Extracted ICP, pain points & tech stack</p>
            </div>
            <span className="text-slate-500 font-medium">-1 Analysis</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800">Generated Cold Email Outreach</span>
              <p className="text-slate-400">Targeted pitch draft generated</p>
            </div>
            <span className="text-slate-500 font-medium">-1 Outreach</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800">Saved Lead to Pipeline</span>
              <p className="text-slate-400">Saved to company leads database</p>
            </div>
            <span className="text-slate-500 font-medium">-1 Lead slot</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
