import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lead } from '../../types';
import { Card } from '../ui/Card';
import { LeadStatusBadge } from '../leads/LeadStatusBadge';
import { Button } from '../ui/Button';

interface RecentLeadsProps {
  leads: Lead[];
  isLoading: boolean;
}

export const RecentLeads: React.FC<RecentLeadsProps> = ({ leads, isLoading }) => {
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  return (
    <Card
      title="Recent Leads"
      subtitle="Latest leads extracted & scored by AI"
      action={
        <Button variant="ghost" size="sm" onClick={() => navigate('/leads')}>
          View all
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      }
    >
      {isLoading ? (
        <div className="py-8 text-center text-slate-400 text-sm">Loading recent leads...</div>
      ) : leads.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-sm">
          No recent leads found.
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 -mb-6">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Company</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Score</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
                      {lead.company?.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[180px]">
                      {lead.company?.industry || lead.company?.website || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(
                        lead.icp_score
                      )}`}
                    >
                      {lead.icp_score}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <LeadStatusBadge status={lead.status} size="sm" />
                  </td>
                  <td className="px-6 py-3.5 text-xs text-slate-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
