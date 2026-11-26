import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { fetchLeadsPaged, deleteLead } from '../../services/api';
import type { Lead } from '../../types';

interface SavedLeadsProps {
  onSelectLead: (leadId: number) => void;
}

export const SavedLeads: React.FC<SavedLeadsProps> = ({ onSelectLead }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Debounce server-side search queries so typing doesn't spam the backend
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadLeads = useCallback(async (targetPage = 1, append = false, search = debouncedSearch) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const res = await fetchLeadsPaged({ page: targetPage, per_page: 20, search });
      setLeads((prev) => (append ? [...prev, ...res.leads] : res.leads));
      setPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch saved leads';
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadLeads(1, false, debouncedSearch);
  }, [loadLeads, debouncedSearch]);

  const requestDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(null);
  };

  const confirmDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      setError(null);
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete lead';
      setError(msg);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-3.5 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">
            Saved Leads
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} qualified prospects in your pipeline
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadLeads(1, false, debouncedSearch)}
          className="h-7 px-2 text-xs"
        >
          ↻ Refresh
        </Button>
      </div>

      {/* Debounced Server-Side Search Input */}
      <div>
        <input
          type="text"
          placeholder="Search by company, domain, or industry..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-10 text-center">
          <svg className="w-6 h-6 text-indigo-600 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs text-slate-400">Loading saved leads...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="bg-rose-50 border-rose-200 !p-3">
          <p className="text-xs text-rose-700">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 text-xs"
            onClick={() => loadLeads(1, false, debouncedSearch)}
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && leads.length === 0 && (
        <Card className="py-8 text-center text-slate-500">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
            📁
          </div>
          <p className="text-xs font-semibold text-slate-700">No leads found</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
            {debouncedSearch
              ? 'No companies match your search criteria.'
              : 'Analyze any website and click "Save Lead" to collect prospects here.'}
          </p>
        </Card>
      )}

      {/* Lead Cards List */}
      <div className="space-y-2">
        {leads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => onSelectLead(lead.id)}
            className="p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer space-y-2 group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate">
                  {lead.company_name}
                </h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {lead.industry || 'B2B'} • {lead.location || 'Global'}
                </p>
              </div>

              {/* ICP score badge */}
              <div
                className={`flex-shrink-0 px-2 py-0.5 rounded-full border text-xs font-bold ${getScoreColor(
                  lead.icp_score?.overall ?? 0
                )}`}
              >
                {lead.icp_score?.overall ?? 0}%
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
              <Badge variant="slate" size="sm">
                {lead.status.toUpperCase()}
              </Badge>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  {new Date(lead.created_at).toLocaleDateString()}
                </span>
                {pendingDeleteId === lead.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => confirmDelete(e, lead.id)}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={cancelDelete}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => requestDelete(e, lead.id)}
                    title="Delete lead"
                    className="text-slate-300 hover:text-rose-500 p-0.5 rounded"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Load More */}
      {!loading && page < lastPage && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          isLoading={loadingMore}
          onClick={() => loadLeads(page + 1, true, debouncedSearch)}
        >
          Load More ({leads.length} of {total})
        </Button>
      )}
    </div>
  );
};
