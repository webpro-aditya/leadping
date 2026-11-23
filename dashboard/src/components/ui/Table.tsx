import React from 'react';

interface Column<T> {
  header: React.ReactNode;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  selectedIds?: (string | number)[];
  onSelectRow?: (id: string | number) => void;
  onSelectAll?: () => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No records found',
  selectedIds,
  onSelectRow,
  onSelectAll,
}: TableProps<T>) {
  const allSelected =
    data.length > 0 && selectedIds && data.every((item) => selectedIds.includes(keyExtractor(item)));

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 bg-white text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {onSelectRow && (
              <th scope="col" className="w-12 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={!!allSelected}
                  onChange={onSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
            )}
            {columns.map((col, idx) => (
              <th
                key={idx}
                scope="col"
                className={`px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                  col.className || ''
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading ? (
            <tr>
              <td
                colSpan={columns.length + (onSelectRow ? 1 : 0)}
                className="px-6 py-12 text-center text-slate-400"
              >
                <div className="flex justify-center items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-.3s]" />
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-.5s]" />
                  <span className="ml-2 text-sm text-slate-500">Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onSelectRow ? 1 : 0)}
                className="px-6 py-12 text-center text-slate-500 text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const key = keyExtractor(item);
              const isSelected = selectedIds?.includes(key);

              return (
                <tr
                  key={key}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/80 transition-colors' : ''
                  } ${isSelected ? 'bg-indigo-50/40' : ''}`}
                >
                  {onSelectRow && (
                    <td
                      className="px-4 py-3.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRow(key);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col, idx) => (
                    <td
                      key={idx}
                      className={`whitespace-nowrap px-4 py-3.5 text-sm text-slate-700 ${
                        col.className || ''
                      }`}
                    >
                      {typeof col.accessor === 'function'
                        ? col.accessor(item)
                        : col.accessor
                        ? (item[col.accessor] as unknown as React.ReactNode)
                        : null}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
