import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useUsage } from '../../hooks/useUsage';

export const UsageDisplay: React.FC = () => {
  const { usage, subscription, loading, error, refresh } = useUsage();

  const renderProgressBar = (used: number, limit: number) => {
    const isUnlimited = limit === -1;
    const percentage = isUnlimited || limit <= 0 ? 0 : Math.min(Math.round((used / limit) * 100), 100);
    const isClose = !isUnlimited && percentage >= 80;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-600 font-medium">Used</span>
          <span className="font-semibold text-slate-800">
            {used} / {isUnlimited ? 'Unlimited' : limit}
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isClose ? 'bg-rose-500' : 'bg-indigo-600'
            }`}
            style={{ width: isUnlimited ? '15%' : `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3.5 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">
            Account & Usage
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor credits and subscription limits
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="h-7 px-2 text-xs">
          ↻ Refresh
        </Button>
      </div>

      {loading && (
        <div className="py-8 text-center text-xs text-slate-400">
          Loading quota details...
        </div>
      )}

      {error && (
        <Card className="bg-rose-50 border-rose-200 !p-3">
          <p className="text-xs text-rose-700">{error}</p>
        </Card>
      )}

      {/* Subscription Card */}
      {subscription && (
        <Card className="space-y-3 bg-gradient-to-br from-indigo-50/40 via-white to-white border-indigo-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-indigo-700 uppercase font-bold tracking-wider">
              Current Plan
            </span>
            <Badge variant="primary" size="sm">
              {subscription.plan.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-lg font-extrabold text-slate-900 capitalize">
                {subscription.plan} Plan
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Status: <span className="text-emerald-600 font-semibold">{subscription.status}</span>
              </span>
            </div>
            {subscription.plan === 'free' && (
              <Button
                variant="primary"
                size="sm"
                className="text-xs"
                onClick={() => {
                  window.open('http://localhost:5173/subscription', '_blank');
                }}
              >
                Upgrade Plan
              </Button>
            )}
          </div>

          {/* Features list */}
          {subscription.features && (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Included Features
              </span>
              {subscription.features.map((feat, idx) => (
                <div key={idx} className="flex items-center text-[11px] text-slate-600">
                  <span className="text-emerald-500 mr-1.5 font-bold">✓</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Usage breakdown */}
      {usage && (
        <Card className="space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
            Monthly Credit Usage
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Company Analyses</span>
              </div>
              {renderProgressBar(usage.analyses_used, usage.analyses_limit)}
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Outreach Generated</span>
              </div>
              {renderProgressBar(usage.outreach_used, usage.outreach_limit)}
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Leads Saved</span>
              </div>
              {renderProgressBar(usage.leads_saved, usage.leads_limit)}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
