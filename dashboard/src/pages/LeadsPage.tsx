import React, { useEffect, useState, useCallback } from 'react';
import type { LeadFilters as FiltersType } from '../types';
import { useLeads } from '../hooks/useLeads';
import { LeadTable } from '../components/leads/LeadTable';
import { LeadFilters } from '../components/leads/LeadFilters';
import { Pagination } from '../components/ui/Pagination';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export const LeadsPage: React.FC = () => {
  const [filters, setFilters] = useState<FiltersType>({
    page: 1,
    per_page: 20,
    sort_by: 'created_at',
    sort_dir: 'desc',
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    leads,
    pagination,
    loading,
    error,
    fetchLeads,
    bulkDelete,
    exportCsv,
  } = useLeads();

  const loadData = useCallback(() => {
    fetchLeads(filters);
  }, [fetchLeads, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (newFilters: FiltersType) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      per_page: 20,
      sort_by: 'created_at',
      sort_dir: 'desc',
    });
  };

  const handleSelectLead = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (leads.length === 0) return;
    const allSelected = leads.every((l) => selectedIds.includes(l.id));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      await bulkDelete(selectedIds);
      setSelectedIds([]);
      setDeleteModalOpen(false);
      loadData();
    } catch {
      alert('Failed to delete leads');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      await exportCsv(filters);
    } catch {
      alert('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, and organize all captured sales leads
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Selected ({selectedIds.length})
            </Button>
          )}

          <Button variant="secondary" size="sm" onClick={handleExportCsv}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <LeadFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <LeadTable
          leads={leads}
          isLoading={loading}
          selectedIds={selectedIds}
          onSelectLead={handleSelectLead}
          onSelectAll={handleSelectAll}
        />

        <Pagination
          currentPage={pagination.current_page}
          lastPage={pagination.last_page}
          total={pagination.total}
          perPage={pagination.per_page}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      </div>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Selected Leads"
        confirmLabel={`Delete ${selectedIds.length} lead${selectedIds.length > 1 ? 's' : ''}`}
        confirmVariant="danger"
        onConfirm={handleBulkDelete}
        isLoading={isDeleting}
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold text-slate-900">{selectedIds.length}</span> lead{selectedIds.length > 1 ? 's' : ''}? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};
