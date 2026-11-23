import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { BuyingSignal } from '../../types';

interface BuyingSignalsProps {
  signals: BuyingSignal[];
}

export const BuyingSignals: React.FC<BuyingSignalsProps> = ({ signals }) => {
  if (!signals || signals.length === 0) {
    return null;
  }

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge variant="success" size="sm">High Confidence</Badge>;
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
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Detected Buying Signals
        </h3>
        <span className="text-[10px] text-slate-400 font-medium">{signals.length} Signals</span>
      </div>

      <div className="space-y-2.5">
        {signals.map((sig, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-800 leading-snug">
                {sig.description}
              </p>
              <div className="flex-shrink-0">
                {getConfidenceBadge(sig.confidence)}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="font-semibold text-slate-600">Source:</span>
                <span className="truncate max-w-[160px]" title={sig.source}>{sig.source || 'Website Content'}</span>
              </span>
              <span
                className={`px-1.5 py-0.2 rounded font-semibold ${
                  sig.observed_or_inferred === 'observed'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-purple-50 text-purple-700'
                }`}
              >
                {sig.observed_or_inferred === 'observed' ? 'Verified' : 'AI Inference'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
