import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Lead } from '../../types';
import { Table } from '../ui/Table';
import { LeadStatusBadge } from './LeadStatusBadge';

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  selectedIds: number[];
  onSelectLead: (id: number) => void;
  onSelectAll: () => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  isLoading,
  selectedIds,
  onSelectLead,
  onSelectAll,
}) => {
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const columns = [
    {
      header: 'Company',
      accessor: (lead: Lead) => (
        <div>
          <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {lead.company?.name || 'Unknown Company'}
          </div>
          {lead.company?.size && (
            <div className="text-xs text-slate-400 mt-0.5">{lead.company.size} employees</div>
          )}
        </div>
      ),
    },
    {
      header: 'Website',
      accessor: (lead: Lead) => (
        <a
          href={lead.company?.website || lead.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center"
        >
          {lead.company?.website
            ? lead.company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
            : 'Website'}
          <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ),
    },
    {
      header: 'Industry',
      accessor: (lead: Lead) => (
        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {lead.company?.industry || 'Unknown'}
        </span>
      ),
    },
    {
      header: 'Score',
      accessor: (lead: Lead) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreColor(
            lead.icp_score
          )}`}
        >
          {lead.icp_score}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (lead: Lead) => <LeadStatusBadge status={lead.status} size="sm" />,
    },
    {
      header: 'Created',
      accessor: (lead: Lead) => (
        <span className="text-xs text-slate-500">
          {new Date(lead.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <Table<Lead>
      columns={columns}
      data={leads}
      keyExtractor={(lead) => lead.id}
      onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
      isLoading={isLoading}
      emptyMessage="No leads found. Start analyzing company websites using the LeadPing Chrome Extension!"
      selectedIds={selectedIds}
      onSelectRow={(id) => onSelectLead(Number(id))}
      onSelectAll={onSelectAll}
    />
  );
};
