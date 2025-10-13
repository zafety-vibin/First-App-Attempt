import React, { ReactNode } from 'react';
import { SearchBar } from './SearchBar';
import { FilterPanel } from './FilterPanel';
import { FilterState } from '../../hooks/useSearchFilter';
import './TableToolbar.css';

export interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  availableTags?: string[];
  actions?: ReactNode;
  showFilters?: boolean;
  className?: string;
}

/**
 * Table toolbar combining search, filters, and action buttons
 * Sticky at top of table view with responsive layout
 */
export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  filters,
  onFilterChange,
  availableTags = [],
  actions,
  showFilters = true,
  className = '',
}) => {
  return (
    <div className={`table-toolbar ${className}`}>
      <div className="table-toolbar-left">
        <SearchBar
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search..."
        />

        {showFilters && (
          <FilterPanel
            filters={filters}
            onChange={onFilterChange}
            availableTags={availableTags}
          />
        )}
      </div>

      {actions && <div className="table-toolbar-actions">{actions}</div>}
    </div>
  );
};
