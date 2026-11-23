import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lead } from '../../types';
import { LeadStatusBadge } from './LeadStatusBadge';
import { Card } from '../ui/Card';

interface LeadCardProps {
  lead: Lead;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead }) => {
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div
      onClick={() => navigate(`/leads/${lead.id}`)}
      className="cursor-pointer transition-all hover:-translate-y-0.5"
    >
      <Card className="hover:border-indigo-300 hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600">
              {lead.company?.name || 'Untitled Company'}
            </h4>
            <a
              href={lead.company?.website || lead.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-indigo-600 hover:underline mt-0.5 block truncate max-w-[200px]"
            >
              {lead.company?.website || lead.url}
            </a>
          </div>
          <div
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${getScoreColor(
              lead.icp_score
            )}`}
          >
            {lead.icp_score}/100
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
          {lead.summary || lead.company?.description || 'No description available'}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <LeadStatusBadge status={lead.status} size="sm" />
          <span>{new Date(lead.created_at).toLocaleDateString()}</span>
        </div>
      </Card>
    </div>
  );
};
