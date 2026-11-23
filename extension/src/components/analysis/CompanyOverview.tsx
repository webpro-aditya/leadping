import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { CompanyAnalysis } from '../../types';

interface CompanyOverviewProps {
  analysis: CompanyAnalysis;
}

export const CompanyOverview: React.FC<CompanyOverviewProps> = ({ analysis }) => {
  return (
    <Card className="space-y-3">
      {/* Title & Industry */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-tight">
            {analysis.company_name}
          </h2>
          <a
            href={analysis.website}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline break-all inline-flex items-center gap-1 mt-0.5"
          >
            {analysis.website}
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        <Badge variant="primary" size="sm">
          {analysis.industry || 'B2B'}
        </Badge>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 leading-relaxed">
        {analysis.description}
      </p>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Location</span>
          <span className="text-slate-700 font-medium">{analysis.location || 'Not specified'}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Company Size</span>
          <span className="text-slate-700 font-medium">{analysis.company_size || 'Unknown'}</span>
        </div>
      </div>

      {/* Products & Services pills */}
      {analysis.products_services && analysis.products_services.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5">
            Key Offerings
          </span>
          <div className="flex flex-wrap gap-1.5">
            {analysis.products_services.map((item, idx) => (
              <span
                key={idx}
                className="bg-slate-100 text-slate-700 text-[11px] px-2 py-0.5 rounded font-normal"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
