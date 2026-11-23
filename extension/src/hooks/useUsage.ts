import { useState, useEffect, useCallback } from 'react';
import { fetchUsage, fetchSubscription } from '../services/api';
import type { UsageInfo, SubscriptionInfo } from '../types';

export function useUsage() {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usageRes, subRes] = await Promise.allSettled([
        fetchUsage(),
        fetchSubscription(),
      ]);

      if (usageRes.status === 'fulfilled') {
        setUsage(usageRes.value.data);
      }
      if (subRes.status === 'fulfilled') {
        setSubscription(subRes.value.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load usage details';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    usage,
    subscription,
    loading,
    error,
    refresh: loadData,
  };
}
