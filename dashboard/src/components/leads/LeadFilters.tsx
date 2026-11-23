import React from 'react';
import type { LeadFilters as FiltersType, LeadStatus } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface LeadFiltersProps {
  filters: FiltersType;
  onChange: (filters: FiltersType) => void;
  onReset: () => void;
}

export const LeadFilters: React.FC<LeadFiltersProps> = ({ filters, onChange, onReset }) => {
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'replied', label: 'Replied' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' },
  ];

  const sortOptions = [
    { value: 'icp_score_desc', label: 'Score: High to Low' },
    { value: 'icp_score_asc', label: 'Score: Low to High' },
    { value: 'created_at_desc', label: 'Newest First' },
    { value: 'created_at_asc', label: 'Oldest First' },
    { value: 'company_name_asc', label: 'Company (A-Z)' },
  ];

  const handleSortChange = (val: string) => {
    if (val === 'icp_score_desc') onChange({ ...filters, sort_by: 'icp_score', sort_dir: 'desc', page: 1 });
    else if (val === 'icp_score_asc') onChange({ ...filters, sort_by: 'icp_score', sort_dir: 'asc', page: 1 });
    else if (val === 'created_at_desc') onChange({ ...filters, sort_by: 'created_at', sort_dir: 'desc', page: 1 });
    else if (val === 'created_at_asc') onChange({ ...filters, sort_by: 'created_at', sort_dir: 'asc', page: 1 });
    else if (val === 'company_name_asc') onChange({ ...filters, sort_by: 'company_name', sort_dir: 'asc', page: 1 });
  };

  const currentSortVal = filters.sort_by
    ? `${filters.sort_by}_${filters.sort_dir || 'desc'}`
    : 'created_at_desc';

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="md:col-span-2">
          <Input
            placeholder="Search by company or industry..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>

        {/* Status Filter */}
        <div>
          <Select
            options={statusOptions}
            value={filters.status || ''}
            onChange={(e) =>
              onChange({ ...filters, status: (e.target.value as LeadStatus) || '', page: 1 })
            }
          />
        </div>

        {/* Sort Filter */}
        <div>
          <Select
            options={sortOptions}
            value={currentSortVal}
            onChange={(e) => handleSortChange(e.target.value)}
          />
        </div>
      </div>

      {/* Advanced Filters: Min score, Max score, Date range, Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-500">Score:</span>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="Min"
            value={filters.score_min ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                score_min: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
            className="w-16 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-slate-400">to</span>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="Max"
            value={filters.score_max ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                score_max: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
            className="w-16 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <span className="ml-2 font-medium text-slate-500">Date from:</span>
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => onChange({ ...filters, date_from: e.target.value, page: 1 })}
            className="rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-slate-400">to:</span>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => onChange({ ...filters, date_to: e.target.value, page: 1 })}
            className="rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs text-slate-500 hover:text-slate-800">
          Reset Filters
        </Button>
      </div>
    </div>
  );
};
