import React from 'react';
import { Card } from '../ui/Card';

interface ScoreDistributionProps {
  highCount: number;
  mediumCount: number;
  lowCount: number;
  total: number;
}

export const ScoreDistribution: React.FC<ScoreDistributionProps> = ({
  highCount,
  mediumCount,
  lowCount,
  total,
}) => {
  const highPct = total > 0 ? Math.round((highCount / total) * 100) : 0;
  const medPct = total > 0 ? Math.round((mediumCount / total) * 100) : 0;
  const lowPct = total > 0 ? Math.round((lowCount / total) * 100) : 0;

  const distribution = [
    {
      label: 'High Potential (80-100)',
      count: highCount,
      percentage: highPct,
      barColor: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
    },
    {
      label: 'Medium Potential (50-79)',
      count: mediumCount,
      percentage: medPct,
      barColor: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
    },
    {
      label: 'Low Potential (0-49)',
      count: lowCount,
      percentage: lowPct,
      barColor: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
  ];

  return (
    <Card title="Score Distribution" subtitle="Breakdown of leads by ICP fit">
      <div className="space-y-5">
        {/* Visual composite progress bar */}
        <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden">
          <div
            style={{ width: `${highPct}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`High: ${highPct}%`}
          />
          <div
            style={{ width: `${medPct}%` }}
            className="bg-amber-500 transition-all duration-500"
            title={`Medium: ${medPct}%`}
          />
          <div
            style={{ width: `${lowPct}%` }}
            className="bg-red-500 transition-all duration-500"
            title={`Low: ${lowPct}%`}
          />
        </div>

        {/* Detailed bars */}
        <div className="space-y-4 pt-2">
          {distribution.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="font-semibold text-slate-900">
                  {item.count} leads ({item.percentage}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  style={{ width: `${item.percentage}%` }}
                  className={`h-full rounded-full ${item.barColor} transition-all duration-500`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick insight banner */}
        <div className="rounded-lg bg-indigo-50/70 p-3.5 border border-indigo-100 flex items-start space-x-3 text-xs text-indigo-900">
          <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="leading-relaxed">
            <span className="font-semibold">AI Insight:</span> Leads scoring ≥80 have demonstrated high buying intent or tight ICP fit. Target them first for personalized outreach.
          </div>
        </div>
      </div>
    </Card>
  );
};
