import React from 'react';
import type { LeadStatus } from '../../types';

interface LeadStatusBadgeProps {
  status: LeadStatus | string;
  size?: 'sm' | 'md';
}

export const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({ status, size = 'md' }) => {
  const normStatus = (status || 'new').toLowerCase() as LeadStatus;

  const styleMap: Record<LeadStatus, { bg: string; text: string; border: string }> = {
    new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    qualified: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    contacted: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    replied: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    meeting: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    won: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    lost: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };

  const currentStyle = styleMap[normStatus] || {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium capitalize rounded-full border ${sizeClass} ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          normStatus === 'won'
            ? 'bg-emerald-500'
            : normStatus === 'qualified'
            ? 'bg-green-500'
            : normStatus === 'contacted'
            ? 'bg-yellow-500'
            : normStatus === 'replied'
            ? 'bg-purple-500'
            : normStatus === 'meeting'
            ? 'bg-orange-500'
            : normStatus === 'lost'
            ? 'bg-red-500'
            : 'bg-blue-500'
        }`}
      />
      {normStatus}
    </span>
  );
};
