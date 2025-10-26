import React from 'react';
import { SortDirection } from '../../hooks/useSorting';
import './SortableTableHeader.css';

export interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSortColumn: string | null;
  currentSortDirection: SortDirection;
  onSort: (column: string) => void;
  width?: number;
  resizeHandle?: React.ReactNode;
  className?: string;
}

/**
 * Sortable table column header with direction indicator
 * Cycles through: null → asc → desc → asc on click
 */
export const SortableTableHeader: React.FC<SortableTableHeaderProps> = ({
  label,
  sortKey,
  currentSortColumn,
  currentSortDirection,
  onSort,
  width,
  resizeHandle,
  className = '',
}) => {
  const isSorted = currentSortColumn === sortKey;
  const sortDirection = isSorted ? currentSortDirection : null;

  const getSortIcon = () => {
    if (!isSorted || sortDirection === null) {
      return (
        <svg className="sort-icon sort-icon-neutral" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 3L9 6H3L6 3Z" fill="currentColor" opacity="0.3" />
          <path d="M6 9L3 6H9L6 9Z" fill="currentColor" opacity="0.3" />
        </svg>
      );
    }

    if (sortDirection === 'asc') {
      return (
        <svg className="sort-icon sort-icon-asc" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 3L9 6H3L6 3Z" fill="currentColor" />
        </svg>
      );
    }

    // desc
    return (
      <svg className="sort-icon sort-icon-desc" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 9L3 6H9L6 9Z" fill="currentColor" />
      </svg>
    );
  };

  const ariaSort = isSorted && sortDirection ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

  const handleHeaderClick = (e: React.MouseEvent) => {
    // Don't sort if clicking on resize handle
    const target = e.target as HTMLElement;
    if (target.closest('.column-resizer')) {
      return;
    }
    onSort(sortKey);
  };

  return (
    <th
      className={`sortable-header ${isSorted ? 'sortable-header-sorted' : ''} ${className}`}
      onClick={handleHeaderClick}
      aria-sort={ariaSort}
      role="columnheader"
      style={{ width: width ? `${width}px` : undefined, position: 'relative' }}
    >
      <button
        type="button"
        className="sortable-header-button"
        aria-label={`Sort by ${label} ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
      >
        <span className="sortable-header-label">{label}</span>
        {getSortIcon()}
      </button>
      {resizeHandle}
    </th>
  );
};
