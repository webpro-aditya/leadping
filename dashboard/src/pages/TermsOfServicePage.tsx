import React from 'react';
import { Link } from 'react-router-dom';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Terms of Service</h1>
            <p className="text-xs text-slate-500 mt-1">LeadPing AI • Effective November 26, 2026</p>
          </div>
          <Link to="/login" className="text-xs font-semibold text-indigo-600 hover:underline">
            Back to App
          </Link>
        </div>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="font-bold text-slate-900">1. Acceptable Use</h2>
          <p>
            LeadPing AI provides AI-assisted B2B research and sales outreach drafting. You are responsible for ensuring
            your outreach complies with applicable anti-spam and data-protection regulations (including CAN-SPAM, GDPR,
            and platform terms of websites you visit).
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="font-bold text-slate-900">2. Subscriptions &amp; Quotas</h2>
          <p>
            Usage limits apply per billing cycle according to your active plan (Free, Pro, Business, or Agency). Cached
            re-analyses of the same URL within 24 hours with unchanged ICP criteria do not consume additional credits.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="font-bold text-slate-900">3. AI Output Disclaimer</h2>
          <p>
            AI-generated company summaries, scores, and outreach drafts are probabilistic estimates derived from visible
            page content and user-supplied ICP settings. Verify important facts before sending customer communications.
          </p>
        </section>
      </div>
    </div>
  );
};
