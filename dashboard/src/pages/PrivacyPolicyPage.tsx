import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-500 mt-1">LeadPing AI • Effective November 26, 2026</p>
          </div>
          <Link to="/login" className="text-xs font-semibold text-indigo-600 hover:underline">
            Back to App
          </Link>
        </div>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="font-bold text-slate-900">1. Information We Collect</h2>
          <p>
            When you create a LeadPing AI account, we collect your name, work email address, and encrypted password.
            When you explicitly click <strong>Analyze Company with AI</strong> inside the Chrome extension, the extension
            reads visible metadata, headings, and text content from the currently active browser tab solely to perform
            your requested analysis.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="font-bold text-slate-900">2. Chrome Extension Permissions</h2>
          <p>
            LeadPing AI uses Chrome permissions (<code>activeTab</code>, <code>tabs</code>, <code>storage</code>,
            <code>scripting</code>, and host access) only when opened by the user to read the active tab URL and extract
            publicly visible page content. We never silently track browsing history or collect data from background tabs.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="font-bold text-slate-900">3. Third-Party Processors</h2>
          <p>
            Sanitized webpage extracts and optional custom ICP settings are transmitted securely to our AI inference
            provider (OpenAI) to produce structured lead intelligence and outreach drafts. Payment processing is handled
            via configured payment providers (such as Razorpay); LeadPing AI does not store raw card numbers.
          </p>
        </section>

        <section className="space-y-2 text-sm text-slate-700 leading-relaxed">
          <h2 className="font-bold text-slate-900">4. Data Retention &amp; Account Deletion</h2>
          <p>
            You can export, edit, or delete saved leads at any time, and permanently delete your entire account and all
            associated lead/usage records directly from <strong>Settings → Account Security</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};
