import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { generateOutreach } from '../../services/api';
import type { OutreachMessage } from '../../types';

interface OutreachGeneratorProps {
  leadId: number;
  onBack: () => void;
}

export const OutreachGenerator: React.FC<OutreachGeneratorProps> = ({ leadId, onBack }) => {
  const [channel, setChannel] = useState<'email' | 'linkedin' | 'cold_call'>('email');
  const [tone, setTone] = useState<'professional' | 'casual' | 'concise'>('professional');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<OutreachMessage | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (selectedChannel = channel, selectedTone = tone) => {
    try {
      setLoading(true);
      setError(null);
      const res = await generateOutreach(leadId, selectedChannel, selectedTone);
      setMessage(res.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate outreach';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!message) return;
    const fullText = message.subject ? `Subject: ${message.subject}\n\n${message.body}` : message.body;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Analysis
        </button>
        <span className="text-[11px] text-slate-400">Lead #{leadId}</span>
      </div>

      <Card className="space-y-3.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">
            AI Outreach Message Generator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tailor high-converting outreach based on identified pain points and buying signals.
          </p>
        </div>

        {/* Channel Selection */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1.5 uppercase tracking-wide">
            Select Channel
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setChannel('email');
                handleGenerate('email', tone);
              }}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                channel === 'email'
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              📧 Cold Email
            </button>
            <button
              onClick={() => {
                setChannel('linkedin');
                handleGenerate('linkedin', tone);
              }}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                channel === 'linkedin'
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              💬 LinkedIn
            </button>
            <button
              onClick={() => {
                setChannel('cold_call');
                handleGenerate('cold_call', tone);
              }}
              className={`py-2 px-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                channel === 'cold_call'
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-semibold'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              📞 Call Script
            </button>
          </div>
        </div>

        {/* Tone Selection */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 block mb-1.5 uppercase tracking-wide">
            Tone Variant
          </label>
          <div className="flex gap-1.5">
            {[
              { id: 'professional', label: 'Professional' },
              { id: 'casual', label: 'More Casual' },
              { id: 'concise', label: 'Shorter & Punchy' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  const newTone = t.id as 'professional' | 'casual' | 'concise';
                  setTone(newTone);
                  handleGenerate(channel, newTone);
                }}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-medium border ${
                  tone === t.id
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Initial Generate Button if empty */}
        {!message && !loading && (
          <Button
            variant="primary"
            size="md"
            className="w-full mt-2"
            onClick={() => handleGenerate()}
          >
            Generate Message
          </Button>
        )}
      </Card>

      {/* Loading */}
      {loading && (
        <Card className="p-8 text-center flex flex-col items-center">
          <svg className="w-8 h-8 text-indigo-600 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs font-medium text-slate-700">Composing personalized outreach...</p>
          <p className="text-[11px] text-slate-400 mt-1">Optimizing hook and value props</p>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="bg-rose-50 border-rose-200 !p-3">
          <p className="text-xs text-rose-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => handleGenerate()}
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Generated Message Display */}
      {message && !loading && (
        <Card className="space-y-3 border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="primary" size="sm">
                {message.channel.toUpperCase()}
              </Badge>
              <span className="text-[10px] text-slate-400 capitalize">• {tone} tone</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 text-xs"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </Button>
          </div>

          {message.subject && (
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Subject</span>
              <p className="text-xs font-semibold text-slate-900 mt-0.5">{message.subject}</p>
            </div>
          )}

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Body</span>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
              {message.body}
            </div>
          </div>

          {/* Quick regeneration variants */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">Need adjustments?</span>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-6 px-2 text-indigo-600"
                onClick={() => handleGenerate(channel, tone)}
              >
                🔄 Regenerate
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
