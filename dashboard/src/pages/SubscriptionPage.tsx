import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { paymentsApi } from '../services/api';
import { loadRazorpayScript } from '../utils/razorpay';
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

interface TransactionItem {
  id: number;
  gateway: string;
  billing_cycle: 'monthly' | 'annual';
  amount: number;
  currency: string;
  gateway_payment_id?: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  plan?: { name: string; display_name: string };
}

export const SubscriptionPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [selectedBilling, setSelectedBilling] = useState<'monthly' | 'annual'>('monthly');
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const currentPlanName = (user?.plan || 'free').toLowerCase();

  const loadTransactions = useCallback(async () => {
    try {
      const { data } = await paymentsApi.transactions();
      setTransactions(data.data.data || []);
    } catch {
      /* ignore if no history yet */
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleUpgrade = async (planId: string, planName: string) => {
    if (planId === 'free' || planId === currentPlanName) return;

    setStatusMessage(null);
    setUpgradingPlan(planId);

    try {
      const [{ data }] = await Promise.all([
        paymentsApi.createCheckout({
          plan: planId,
          billing_cycle: selectedBilling,
        }),
        loadRazorpayScript(),
      ]);

      const checkout = data.data;
      if (!window.Razorpay) {
        throw new Error('Razorpay Checkout SDK could not be initialized.');
      }

      const rzp = new window.Razorpay({
        ...checkout.checkout_payload,
        theme: { color: '#4f46e5' },
        handler: async (paymentResponse) => {
          try {
            const verifyRes = await paymentsApi.verifyPayment({
              gateway: checkout.gateway,
              gateway_order_id: paymentResponse.razorpay_order_id,
              gateway_payment_id: paymentResponse.razorpay_payment_id,
              gateway_signature: paymentResponse.razorpay_signature,
            });

            await refreshUser();
            await loadTransactions();
            setStatusMessage({
              type: 'success',
              text: `Upgraded to ${verifyRes.data.data.plan?.display_name || planName} plan successfully!`,
            });
          } catch (verifyErr: unknown) {
            const errMsg =
              (verifyErr as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              (verifyErr instanceof Error ? verifyErr.message : 'Payment verification failed.');
            setStatusMessage({ type: 'error', text: errMsg });
          } finally {
            setUpgradingPlan(null);
          }
        },
        modal: {
          ondismiss: () => {
            setUpgradingPlan(null);
          },
        },
      });

      rzp.on('payment.failed', (failureResp) => {
        setUpgradingPlan(null);
        setStatusMessage({
          type: 'error',
          text: failureResp?.error?.description || 'Payment failed or was cancelled.',
        });
      });

      rzp.open();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to start checkout.');
      setStatusMessage({ type: 'error', text: msg });
      setUpgradingPlan(null);
    }
  };

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
        'Chrome Extension Toolbar Popup',
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
        'Custom ICP criteria tuning',
        'Full AI Buying Signals & Pain Points',
        'CSV Export & bulk actions',
        'Multi-channel Outreach (Email, LinkedIn, Call)',
      ],
      isPopular: true,
    },
    {
      id: 'business',
      name: 'Business',
      price: selectedBilling === 'monthly' ? '$49' : '$39',
      period: '/ month',
      description: 'For growing sales teams demanding CRM automation and volume.',
      analyses: '500 analyses / mo',
      outreach: '500 outreach / mo',
      leads: 'Unlimited leads',
      features: [
        'Everything in Pro',
        'Unlimited lead pipeline storage',
        'Signed CRM Webhook Integrations',
        '1-click CRM Lead Push',
        'Custom outreach tones & personas',
      ],
    },
    {
      id: 'agency',
      name: 'Agency',
      price: selectedBilling === 'monthly' ? '$99' : '$79',
      period: '/ month',
      description: 'High-volume lead intelligence for agencies and high-velocity SDR pods.',
      analyses: '2,000 analyses / mo',
      outreach: '2,000 outreach / mo',
      leads: 'Unlimited saved leads',
      features: [
        'Everything in Business',
        'High-volume 2,000 analyses / mo quota',
        'High-volume 2,000 outreach / mo quota',
        'Signed CRM Webhook sync at scale',
        'Priority processing throughput',
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

      {/* Inline Checkout Feedback */}
      {statusMessage && (
        <div
          className={`rounded-xl p-4 text-sm border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => {
          const isCurrent = currentPlanName === p.id;
          const isFreeCard = p.id === 'free';

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
                  disabled={isCurrent || isFreeCard || upgradingPlan !== null}
                  isLoading={upgradingPlan === p.id}
                  onClick={() => handleUpgrade(p.id, p.name)}
                >
                  {isCurrent
                    ? 'Current Plan'
                    : isFreeCard
                    ? 'Free Tier'
                    : `Upgrade to ${p.name}`}
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
                <td className="px-6 py-3.5 text-slate-600">Unlimited</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">Chrome Toolbar Popup</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
                <td className="px-6 py-3.5 font-semibold text-indigo-600">✓</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
              </tr>
              <tr>
                <td className="px-6 py-3.5 font-medium text-slate-900">Custom ICP Tuning</td>
                <td className="px-6 py-3.5 text-slate-400">—</td>
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
                <td className="px-6 py-3.5 font-medium text-slate-900">Signed CRM Webhooks</td>
                <td className="px-6 py-3.5 text-slate-400">—</td>
                <td className="px-6 py-3.5 text-slate-400">—</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
                <td className="px-6 py-3.5 text-slate-600">✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Billing & Transaction History */}
      {transactions.length > 0 && (
        <Card title="Payment History" subtitle="Recent subscription upgrade transactions">
          <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Date</th>
                  <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Plan</th>
                  <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Cycle</th>
                  <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Gateway</th>
                  <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="px-6 py-3 font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-6 py-3 text-slate-600">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900 capitalize">
                      {tx.plan?.display_name || tx.plan?.name || 'Upgrade'}
                    </td>
                    <td className="px-6 py-3 text-slate-600 capitalize">{tx.billing_cycle}</td>
                    <td className="px-6 py-3 text-slate-600 uppercase">{tx.gateway}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {(tx.amount / 100).toFixed(2)} {tx.currency}
                    </td>
                    <td className="px-6 py-3">
                      <Badge
                        variant={tx.status === 'paid' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {tx.status.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
