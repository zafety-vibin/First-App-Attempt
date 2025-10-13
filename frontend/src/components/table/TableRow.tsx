import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import './TableRow.css';

export interface TableRowProps<T = any> {
  entity: T;
  columns: ColumnDef<T, any>[];
  onClick?: (entity: T) => void;
  className?: string;
}

/**
 * Generic table row component for any category entity
 * Renders cells based on column definitions with hover effect
 */
export function TableRow<T = any>({ entity, columns, onClick, className = '' }: TableRowProps<T>) {
  const handleClick = () => {
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
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
    >
      {columns.map((column, index) => {
        const columnId = typeof column.id === 'string' ? column.id : `column-${index}`;

        // Get cell value using column accessor
        let cellValue: any;
        if (column.accessorFn) {
          cellValue = column.accessorFn(entity, index);
        } else if (column.accessorKey) {
          const key = column.accessorKey as keyof T;
          cellValue = entity[key];
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
