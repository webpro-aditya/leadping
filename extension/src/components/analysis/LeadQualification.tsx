import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { CompanyAnalysis } from '../../types';

interface LeadQualificationProps {
  qualification: CompanyAnalysis['lead_qualification'];
}

export const LeadQualification: React.FC<LeadQualificationProps> = ({ qualification }) => {
  if (!qualification) return null;

  const getScoreBadge = (score: 'hot' | 'warm' | 'cold') => {
    switch (score) {
      case 'hot':
        return <Badge variant="danger" size="md">🔥 HOT LEAD</Badge>;
      case 'warm':
        return <Badge variant="warning" size="md">⚡ WARM LEAD</Badge>;
      case 'cold':
        return <Badge variant="slate" size="md">❄️ COLD LEAD</Badge>;
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          Lead Qualification Status
        </h3>
        {getScoreBadge(qualification.score)}
      </div>

      <p className="text-xs text-slate-600 leading-relaxed">
        {qualification.reasoning}
      </p>

      {qualification.next_steps && qualification.next_steps.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5">
            Suggested Next Steps
          </span>
          <ul className="space-y-1.5">
            {qualification.next_steps.map((step, idx) => (
              <li key={idx} className="flex items-start text-xs text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 mr-2 flex-shrink-0" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};
