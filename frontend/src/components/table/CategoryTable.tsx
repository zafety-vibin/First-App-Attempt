import React from 'react';
import { useReactTable, getCoreRowModel, ColumnDef } from '@tanstack/react-table';
import { SortableTableHeader } from './SortableTableHeader';
import { TableRow } from './TableRow';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { SortDirection } from '../../hooks/useSorting';
import './CategoryTable.css';

export interface CategoryTableProps<T = any> {
  data: T[];
  columns: ColumnDef<T, any>[];
  loading?: boolean;
  error?: string | null;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSort?: (column: string) => void;
  onRowClick?: (entity: T) => void;
  onCellUpdate?: (entityId: string, fieldKey: string, newValue: any) => Promise<void>;
  emptyMessage?: string;
  className?: string;
}

/**
 * Complete table component using TanStack Table v8
 * Integrates sortable headers, loading/empty/error states
 */
export function CategoryTable<T = any>({
  data,
  columns,
  loading = false,
  error = null,
  sortColumn = null,
  sortDirection = null,
  onSort,
  onRowClick,
  onCellUpdate,
  emptyMessage = 'No items found',
  className = '',
}: CategoryTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Sorting handled via API
  });

  // Error state
  if (error) {
    return (
      <div className={`category-table-container ${className}`}>
        <EmptyState
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
          message="Error loading data"
          description={error}
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`category-table-container ${className}`}>
        <div className="category-table-loading">
          <LoadingSpinner size="lg" />
          <p className="category-table-loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`category-table-container ${className}`}>
        <EmptyState
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
              <line x1="9" y1="9" x2="15" y2="9" strokeWidth="2" strokeLinecap="round" />
              <line x1="9" y1="15" x2="15" y2="15" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
          message={emptyMessage}
        />
      </div>
    );
  }

  return (
    <div className={`category-table-container ${className}`}>
      <div className="category-table-wrapper">
        <table className="category-table" role="table">
          <thead className="category-table-header">
            <tr>
              {table.getHeaderGroups()[0]?.headers.map((header) => {
                const columnDef = header.column.columnDef;
                const headerContent = header.isPlaceholder
                  ? null
                  : typeof columnDef.header === 'function'
                  ? columnDef.header(header.getContext())
                  : columnDef.header;

                const headerLabel = typeof headerContent === 'string' ? headerContent : String(header.id);
                const sortKey = columnDef.id || String(header.id);

                // Check if column is sortable (has enableSorting !== false)
                const isSortable = columnDef.enableSorting !== false && onSort;

                if (isSortable) {
                  return (
                    <SortableTableHeader
                      key={header.id}
                      label={headerLabel}
                      sortKey={sortKey}
                      currentSortColumn={sortColumn}
                      currentSortDirection={sortDirection}
                      onSort={onSort!}
                    />
                  );
                }

                return (
                  <th key={header.id} className="category-table-header-cell">
                    {headerLabel}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="category-table-body">
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                entity={row.original}
                columns={columns}
                onClick={onRowClick}
                onCellUpdate={onCellUpdate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
