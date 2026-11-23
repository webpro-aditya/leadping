import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface RecommendedPitchProps {
  pitch: string;
}

export const RecommendedPitch: React.FC<RecommendedPitchProps> = ({ pitch }) => {
  const [copied, setCopied] = useState(false);

  if (!pitch) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="space-y-2.5 bg-gradient-to-br from-indigo-50/50 to-white border-indigo-100">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Recommended Value Pitch
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="text-[11px] py-1 px-2 h-7"
        >
          {copied ? (
            <span className="text-emerald-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </span>
          )}
        </Button>
      </div>

      <div className="bg-white p-3 rounded-lg border border-indigo-100/80 shadow-xs">
        <p className="text-xs text-slate-700 italic leading-relaxed whitespace-pre-wrap">
          &ldquo;{pitch}&rdquo;
        </p>
      </div>
    </Card>
  );
};
