import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { PainPoint } from '../../types';

interface PainPointsProps {
  painPoints: PainPoint[];
}

export const PainPoints: React.FC<PainPointsProps> = ({ painPoints }) => {
  if (!painPoints || painPoints.length === 0) {
    return null;
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          Likely Pain Points
        </h3>
        <span className="text-[10px] text-slate-400 font-medium">{painPoints.length} Identified</span>
      </div>

      <div className="space-y-2.5">
        {painPoints.map((point, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                {point.title}
              </h4>
              <Badge
                variant={
                  point.confidence === 'high'
                    ? 'danger'
                    : point.confidence === 'medium'
                    ? 'warning'
                    : 'slate'
                }
                size="sm"
              >
                {point.confidence.toUpperCase()}
              </Badge>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {point.description}
            </p>

            {point.explanation && (
              <div className="pt-1.5 border-t border-slate-200/50 text-[11px] text-slate-500 bg-white/70 p-1.5 rounded">
                <span className="font-semibold text-slate-700">Why it matters: </span>
                {point.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
