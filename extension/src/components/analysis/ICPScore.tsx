import React from 'react';
import { Card } from '../ui/Card';
import { ScoreRing } from '../ui/ScoreRing';
import type { ICPScore as ICPScoreType } from '../../types';

interface ICPScoreProps {
  score: ICPScoreType;
}

export const ICPScore: React.FC<ICPScoreProps> = ({ score }) => {
  const metrics = [
    { label: 'Industry Fit', value: score.industry_fit },
    { label: 'Company Size Fit', value: score.company_size_fit },
    { label: 'Technology Fit', value: score.technology_fit },
    { label: 'Problem / Pain Fit', value: score.problem_fit },
    { label: 'Buying Signal Score', value: score.buying_signal_score },
  ];

  const getBarColor = (val: number) => {
    if (val >= 80) return 'bg-emerald-500';
    if (val >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          ICP Fit Analysis
        </h3>
        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
          AI Calculated
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Big circular score */}
        <div className="flex-shrink-0">
          <ScoreRing score={score.overall} size={105} strokeWidth={8} label="Overall Match" />
        </div>

        {/* Breakdown bars */}
        <div className="flex-1 w-full space-y-2">
          {metrics.map((item) => (
            <div key={item.label} className="space-y-0.5">
              <div className="flex justify-between text-[11px] font-medium text-slate-600">
                <span>{item.label}</span>
                <span className="font-semibold text-slate-800">{item.value}%</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(item.value)}`}
                  style={{ width: `${Math.min(Math.max(item.value, 0), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
