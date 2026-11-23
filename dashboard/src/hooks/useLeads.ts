import { useState, useCallback } from 'react';
import { leadsApi } from '../services/api';
import type { Lead, LeadFilters, PaginatedResponse } from '../types';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginatedResponse<Lead>, 'data'>>({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async (filters: LeadFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await leadsApi.list({ per_page: 20, ...filters });
      const paginated = data.data;
      setLeads(paginated.data);
      setPagination({
        current_page: paginated.current_page,
        last_page: paginated.last_page,
        per_page: paginated.per_page,
        total: paginated.total,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch leads';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteLead = useCallback(async (id: number) => {
    await leadsApi.delete(id);
  }, []);

  const bulkDelete = useCallback(async (ids: number[]) => {
    await leadsApi.bulkDelete(ids);
  }, []);

  const exportCsv = useCallback(async (filters: LeadFilters = {}) => {
    const { data } = await leadsApi.exportCsv(filters);
    const url = window.URL.createObjectURL(new Blob([data as BlobPart]));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }, []);

  return { leads, pagination, loading, error, fetchLeads, deleteLead, bulkDelete, exportCsv };
}
