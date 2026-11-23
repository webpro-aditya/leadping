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
      setUsage(data.data);
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
