import React from 'react';
import { Card } from '../ui/Card';

interface StatsCardsProps {
  totalLeads: number;
  highPotential: number;
  mediumPotential: number;
  lowPotential: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  totalLeads,
  highPotential,
  mediumPotential,
  lowPotential,
}) => {
  const stats = [
    {
      title: 'Total Leads',
      value: totalLeads,
      description: 'Saved from websites',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      icon: (
        <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      title: 'High Potential',
      value: highPotential,
      description: 'ICP Score ≥ 80',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      icon: (
        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Medium Potential',
      value: mediumPotential,
      description: 'ICP Score 50 - 79',
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      icon: (
        <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      title: 'Low Potential',
      value: lowPotential,
      description: 'ICP Score < 50',
      color: 'text-slate-600 bg-slate-50 border-slate-200',
      icon: (
        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, idx) => (
        <Card key={idx} className="p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {s.title}
            </span>
            <div className={`p-2 rounded-lg border ${s.color}`}>{s.icon}</div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{s.value}</div>
            <p className="text-xs text-slate-400 mt-1">{s.description}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};
