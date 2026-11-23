import React from 'react';

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  icon?: React.ReactNode;
}

export const UsageBar: React.FC<UsageBarProps> = ({ label, used, limit, icon }) => {
  const isUnlimited = limit === -1 || limit >= 999999;
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-indigo-600';
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon && <div className="text-indigo-600">{icon}</div>}
          <span className="text-sm font-semibold text-slate-800">{label}</span>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          <span className="text-sm font-bold text-slate-900">{used}</span>
          <span> / {isUnlimited ? 'Unlimited' : limit}</span>
        </div>
      </div>

      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          style={{ width: `${isUnlimited ? 15 : percentage}%` }}
          className={`h-full rounded-full transition-all duration-500 ${
            isUnlimited ? 'bg-indigo-400' : getBarColor(percentage)
          }`}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{isUnlimited ? 'Unlimited quota' : `${percentage}% consumed`}</span>
        <span>
          {isUnlimited ? 'No limits' : `${Math.max(0, limit - used)} remaining`}
        </span>
      </div>
    </div>
  );
};
