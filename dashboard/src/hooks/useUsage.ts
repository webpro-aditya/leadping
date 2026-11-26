import { useState, useCallback } from 'react';
import { usageApi, subscriptionApi } from '../services/api';
import type { UsageInfo, SubscriptionInfo } from '../types';

export function useUsage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usageApi.get();
      const raw = (data.data as unknown as Record<string, unknown>) ?? {};
      const analyses = (raw.analyses as { used?: number; limit?: number } | undefined) ?? {};
      const outreach = (raw.outreach as { used?: number; limit?: number } | undefined) ?? {};
      const leads = (raw.leads as { used?: number; limit?: number } | undefined) ?? {};

      setUsage({
        analyses_used: Number(raw.analyses_used ?? analyses.used ?? 0),
        analyses_limit: Number(raw.analyses_limit ?? analyses.limit ?? 10),
        outreach_used: Number(raw.outreach_used ?? outreach.used ?? 0),
        outreach_limit: Number(raw.outreach_limit ?? outreach.limit ?? 5),
        leads_used: Number(raw.leads_used ?? leads.used ?? 0),
        leads_limit: Number(raw.leads_limit ?? leads.limit ?? 25),
      });
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await subscriptionApi.get();
      setSubscription(data.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  return { usage, subscription, loading, fetchUsage, fetchSubscription };
}
