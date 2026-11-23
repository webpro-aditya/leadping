import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

interface PlanDetail {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  analyses: string;
  outreach: string;
  leads: string;
  features: string[];
  isPopular?: boolean;
}

export const SubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'annual'>('monthly');

  const currentPlanName = (user?.plan || 'free').toLowerCase();

  const plans: PlanDetail[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Ideal for testing out LeadPing AI on a few company targets.',
      analyses: '10 analyses / mo',
      outreach: '5 outreach / mo',
      leads: '25 saved leads',
      features: [
        'Chrome Side Panel intelligence',
        'ICP Fit scoring (0-100)',
        'Tech stack detection',
        'Basic lead management',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: selectedBilling === 'monthly' ? '$19' : '$15',
      period: '/ month',
      description: 'Perfect for active founders, SDRs and sales consultants.',
      analyses: '100 analyses / mo',
      outreach: '100 outreach / mo',
      leads: '500 saved leads',
      features: [
        'Everything in Free',
        'Full AI Buying Signals & Pain Points',
        'Custom ICP criteria tuning',
        'CSV Export & bulk actions',
        'Priority AI model generation',
      ],
      isPopular: true,
    },
    {
      id: 'business',
      name: 'Business',
      price: selectedBilling === 'monthly' ? '$49' : '$39',
      period: '/ month',
      description: 'For growing sales teams demanding unconstrained lead capture.',
      analyses: '500 analyses / mo',
      outreach: '500 outreach / mo',
      leads: 'Unlimited leads',
      features: [
        'Everything in Pro',
        'Unlimited lead pipeline storage',
        'CRM Webhook Integrations',
        'Dedicated API access',
        'Priority email support',
      ],
    },
    {
      id: 'agency',
      name: 'Agency',
      price: selectedBilling === 'monthly' ? '$99' : '$79',
      period: '/ month',
      description: 'High-volume lead intelligence for agencies and enterprise teams.',
      analyses: '2,000 analyses / mo',
      outreach: '2,000 outreach / mo',
      leads: 'Unlimited leads + team',
      features: [
        'Everything in Business',
        'Multi-seat team workspace',
        'White-label intelligence exports',
        'Custom AI fine-tuning',
        'Dedicated account manager',
      ],
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Flexible Plans for Modern Sales Teams
        </h1>
        <p className="text-sm text-slate-500">
          Scale your prospect intelligence and cold outreach pipeline with zero friction.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center p-1 bg-slate-200/70 rounded-xl mt-4">
          <button
            onClick={() => setSelectedBilling('monthly')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedBilling === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setSelectedBilling('annual')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedBilling === 'annual'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Annual Billing <span className="text-indigo-600 font-bold ml-1">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => {
          const isCurrent = currentPlanName === p.id;

          return (
            <div
              key={p.id}
              className={`rounded-2xl bg-white border p-6 flex flex-col justify-between transition-all ${
                p.isPopular
                  ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md relative'
                  : 'border-slate-200 shadow-sm hover:shadow-md'
              }`}
            >
              {p.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  {isCurrent && (
                    <Badge variant="purple" size="sm">
                      Current
                    </Badge>
                  )}
                </div>

                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-extrabold text-slate-900">{p.price}</span>
                  <span className="text-xs text-slate-500 font-medium">{p.period}</span>
                </div>

                <p className="text-xs text-slate-500 min-h-[36px]">{p.description}</p>

                {/* Quota Highlights */}
                <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                  <div className="flex items-center text-slate-700">
                    <svg className="w-4 h-4 text-indigo-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-semibold">{p.analyses}</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <svg className="w-4 h-4 text-indigo-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-semibold">{p.outreach}</span>
                  </div>
                  <div className="flex items-center text-slate-700">
                    <svg className="w-4 h-4 text-indigo-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-semibold">{p.leads}</span>
                  </div>
                </div>

                {/* Features list */}
                <ul className="space-y-2 text-xs text-slate-600 pt-1">
                  {p.features.map((feat, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="w-3.5 h-3.5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Button
                  variant={p.isPopular ? 'primary' : 'secondary'}
                  className="w-full"
                  disabled={isCurrent}
                  onClick={() => alert(`Upgrading to ${p.name} plan is ready for checkout!`)}
                >
                  {isCurrent ? 'Current Plan' : `Upgrade to ${p.name}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Details Table */}
      <Card title="Plan Features Comparison" subtitle="Detailed limits & capabilities">
        <div className="overflow-x-auto -mx-6 -mb-6">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Feature</th>
                <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Free</th>
                <th className="px-6 py-3 font-semibold text-indigo-600 uppercase">Pro ($19/mo)</th>
                <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Business ($49/mo)</th>
                <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Agency ($99/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">Analyses / mo</td>
                <td className="px-6 py-3.5 text-slate-600">10</td>
                <td className="px-6 py-3.5 font-semibold text-indigo-600">100</td>
                <td className="px-6 py-3.5 text-slate-600">500</td>
                <td className="px-6 py-3.5 text-slate-600">2,000</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">Outreach / mo</td>
                <td className="px-6 py-3.5 text-slate-600">5</td>
                <td className="px-6 py-3.5 font-semibold text-indigo-600">100</td>
                <td className="px-6 py-3.5 text-slate-600">500</td>
                <td className="px-6 py-3.5 text-slate-600">2,000</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">Saved Leads Capacity</td>
                <td className="px-6 py-3.5 text-slate-600">25</td>
                <td className="px-6 py-3.5 font-semibold text-indigo-600">500</td>
                <td className="px-6 py-3.5 text-slate-600">Unlimited</td>
                <td className="px-6 py-3.5 text-slate-600">Unlimited + Team</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">Chrome Side Panel</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
                <td className="px-6 py-3.5 font-semibold text-indigo-600">✓</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">CSV Lead Exports</td>
                <td className="px-6 py-3.5 text-slate-400">—</td>
                <td className="px-6 py-3.5 font-semibold text-indigo-600">✓</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">Team Collaboration</td>
                <td className="px-6 py-3.5 text-slate-400">—</td>
                <td className="px-6 py-3.5 text-slate-400">—</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
                <td className="px-6 py-3.5 text-slate-600">✓ (Multi-seats)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
