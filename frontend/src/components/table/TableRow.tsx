import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { EditableCell, EditableCellType } from './EditableCell';
import './TableRow.css';

export interface TableRowProps<T = any> {
  entity: T;
  columns: ColumnDef<T, any>[];
  onClick?: (entity: T) => void;
  onCellUpdate?: (entityId: string, fieldKey: string, newValue: any) => Promise<void>;
  className?: string;
}

/**
 * Generic table row component for any category entity
 * Renders cells based on column definitions with hover effect
 * Supports editable cells via meta.editable
 */
export function TableRow<T = any>({ entity, columns, onClick, onCellUpdate, className = '' }: TableRowProps<T>) {
  const handleRowClick = (event: React.MouseEvent) => {
    // Don't trigger row click if clicking on an editable cell
    const target = event.target as HTMLElement;
    if (target.closest('.editable-cell-wrapper')) {
      return;
    }
    if (onClick) {
      onClick(entity);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(entity);
    }
  };

  return (
    <tr
      className={`table-row ${onClick ? 'table-row-clickable' : ''} ${className}`}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {columns.map((column, index) => {
        const columnId = typeof column.id === 'string' ? column.id : `column-${index}`;
        const fieldKey = column.accessorKey as string;

        // Get cell value using column accessor
        let cellValue: any;
        if (column.accessorFn) {
          cellValue = column.accessorFn(entity, index);
        } else if (column.accessorKey) {
          const key = column.accessorKey as keyof T;
          cellValue = entity[key];
        }

        // Check if column is editable via meta
        const isEditable = column.meta?.editable === true;
        const editableType = column.meta?.editableType as EditableCellType | undefined;
        const dropdownOptions = column.meta?.dropdownOptions as Array<{ value: string; label: string }> | undefined;

        // Render editable cell if enabled
        if (isEditable && onCellUpdate && fieldKey) {
          const entityId = (entity as any).id;
          return (
            <td key={columnId} className="table-cell table-cell-editable">
              <EditableCell
                value={cellValue}
                type={editableType || 'text'}
                fieldKey={fieldKey}
                entityId={entityId}
                onUpdate={onCellUpdate}
                dropdownOptions={dropdownOptions}
              />
            </td>
          );
        }

        // Render cell using custom cell renderer or default
        let cellContent: React.ReactNode;
        if (column.cell) {
          if (typeof column.cell === 'function') {
            cellContent = column.cell({ getValue: () => cellValue, row: { original: entity } } as any);
          } else {
            cellContent = column.cell;
          }
        } else {
          // Default rendering: convert to string
          cellContent = cellValue != null ? String(cellValue) : '—';
        }

        return (
          <td key={columnId} className="table-cell">
            {cellContent}
          </td>
        );
      })}
    </tr>
  );
}
