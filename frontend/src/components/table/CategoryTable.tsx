import React, { useState } from 'react';
import { useReactTable, getCoreRowModel, ColumnDef, ColumnResizeMode } from '@tanstack/react-table';
import { SortableTableHeader } from './SortableTableHeader';
import { TableRow } from './TableRow';
import { EditableCell, EditableCellType } from './EditableCell';
import { QuickAddRow } from './QuickAddRow';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { SortDirection } from '../../hooks/useSorting';
import './CategoryTable.css';

export interface QuickAddColumn {
  fieldKey: string;
  label: string;
  type: 'text' | 'number' | 'dropdown' | 'player_knowledge';
  required?: boolean;
  dropdownOptions?: Array<{ value: string; label: string }>;
}

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
  onQuickAdd?: (data: Record<string, any>) => Promise<void>;
  quickAddColumns?: QuickAddColumn[];
  emptyMessage?: string;
  className?: string;
  campaignId?: string; // For loading information levels in EditableCell
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
  onQuickAdd,
  quickAddColumns,
  emptyMessage = 'No items found',
  className = '',
  campaignId,
}: CategoryTableProps<T>) {
  const [columnSizing, setColumnSizing] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true, // Sorting handled via API
    columnResizeMode: 'onChange' as ColumnResizeMode,
    state: {
      columnSizing,
    },
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
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

                const resizeHandle = header.column.getCanResize() ? (
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    onClick={(e) => e.stopPropagation()}
                    className={`column-resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
                  />
                ) : null;

                const headerCell = isSortable ? (
                  <SortableTableHeader
                    key={header.id}
                    label={headerLabel}
                    sortKey={sortKey}
                    currentSortColumn={sortColumn}
                    currentSortDirection={sortDirection}
                    onSort={onSort!}
                    width={header.getSize()}
                    resizeHandle={resizeHandle}
                  />
                ) : (
                  <th
                    key={header.id}
                    className="category-table-header-cell"
                    style={{ width: header.getSize() }}
                  >
                    {headerLabel}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                        className={`column-resizer ${header.column.getIsResizing() ? 'isResizing' : ''}`}
                      />
                    )}
                  </th>
                );

                return headerCell;
              })}
            </tr>
          </thead>

          <tbody className="category-table-body">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="table-row">
                {row.getVisibleCells().map((cell) => {
                  const columnDef = cell.column.columnDef;
                  const fieldKey = columnDef.accessorKey as string;
                  const isEditable = columnDef.meta?.editable === true;
                  const editableType = columnDef.meta?.editableType as EditableCellType | undefined;
                  const dropdownOptions = columnDef.meta?.dropdownOptions as Array<{ value: string; label: string }> | undefined;

                  // Apply dynamic width from column state
                  const cellStyle = {
                    width: `${cell.column.getSize()}px`,
                    minWidth: `${cell.column.getSize()}px`,
                    maxWidth: `${cell.column.getSize()}px`,
                  };

                  if (isEditable && onCellUpdate && fieldKey) {
                    const entityId = (row.original as any).id;
                    return (
                      <td key={cell.id} className="table-cell table-cell-editable" style={cellStyle}>
                        <EditableCell
                          value={cell.getValue()}
                          type={editableType || 'text'}
                          fieldKey={fieldKey}
                          entityId={entityId}
                          onUpdate={onCellUpdate}
                          dropdownOptions={dropdownOptions}
                          campaignId={campaignId}
                        />
                      </td>
                    );
                  }

                  // Render using column's cell function
                  let cellContent: React.ReactNode;
                  if (columnDef.cell && typeof columnDef.cell === 'function') {
                    cellContent = columnDef.cell(cell.getContext());
                  } else {
                    cellContent = cell.getValue() != null ? String(cell.getValue()) : '—';
                  }

                  return (
                    <td key={cell.id} className="table-cell" style={cellStyle}>
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {onQuickAdd && quickAddColumns && (
            <tfoot className="category-table-footer">
              <QuickAddRow
                onAdd={onQuickAdd}
                columns={quickAddColumns}
              />
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
