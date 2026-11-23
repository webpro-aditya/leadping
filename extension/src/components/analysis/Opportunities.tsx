import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Opportunity } from '../../types';

interface OpportunitiesProps {
  opportunities: Opportunity[];
}

export const Opportunities: React.FC<OpportunitiesProps> = ({ opportunities }) => {
  if (!opportunities || opportunities.length === 0) {
    return null;
  }

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <Badge variant="primary" size="sm">High Priority</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="slate" size="sm">Low</Badge>;
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          Sales Opportunities
        </h3>
        <span className="text-[10px] text-slate-400 font-medium">{opportunities.length} Openings</span>
      </div>

      <div className="space-y-2.5">
        {opportunities.map((opp, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-indigo-50/40 border border-indigo-100/70 space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                {opp.title}
              </h4>
              {getPriorityBadge(opp.priority)}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {opp.description}
            </p>

            <div className="space-y-1 pt-1.5 border-t border-indigo-100/60 text-[11px]">
              <div>
                <span className="font-semibold text-indigo-900">Why Now: </span>
                <span className="text-slate-600">{opp.why}</span>
              </div>
              <div>
                <span className="font-semibold text-indigo-900">Recommended Angle: </span>
                <span className="text-slate-600">{opp.potential_solution}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
