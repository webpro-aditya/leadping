import React from 'react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  lastPage,
  total,
  perPage,
  onPageChange,
}) => {
  if (lastPage <= 1) return null;

  const startRecord = (currentPage - 1) * perPage + 1;
  const endRecord = Math.min(currentPage * perPage, total);

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-b-xl">
      <div className="hidden sm:block">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{startRecord}</span> to{' '}
          <span className="font-semibold text-slate-900">{endRecord}</span> of{' '}
          <span className="font-semibold text-slate-900">{total}</span> results
        </p>
      </div>
      <div className="flex flex-1 justify-between sm:justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="flex items-center px-2 text-xs font-medium text-slate-600">
          Page {currentPage} of {lastPage}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
