import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryName } from '../../contexts/SidebarContext';
import { useCategory } from '../../hooks/useCategory';
import { usePagination } from '../../hooks/usePagination';
import { useSorting } from '../../hooks/useSorting';
import { useSearchFilter } from '../../hooks/useSearchFilter';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import { useViewMode } from '../../contexts/ViewModeContext';
import { useCategoryStats, CategoryStatsConfig } from '../../hooks/useCategoryStats';
import { CategoryTable } from '../table/CategoryTable';
import { TableToolbar } from '../table/TableToolbar';
import { PaginationControls } from '../table/PaginationControls';
import { CategoryStatsSection } from './CategoryStatsSection';
import { LoadingSpinner } from '../common/LoadingSpinner';
import './GenericCategoryListView.css';

export interface GenericCategoryListViewProps {
  category: CategoryName;
  campaignId: string;
  columns: any[]; // ColumnDef[] from TanStack Table
  additionalFilters?: Record<string, any>;
  statsConfig?: CategoryStatsConfig;
}

// Constant empty object to prevent recreating on every render
const EMPTY_FILTERS = {};

/**
 * T059: Generic Category List View
 * Reusable list view with table, search, filters, pagination
 */
export const GenericCategoryListView: React.FC<GenericCategoryListViewProps> = ({
  category,
  campaignId,
  columns,
  additionalFilters = EMPTY_FILTERS,
  statsConfig,
}) => {
  const navigate = useNavigate();
  const { getCategoryLabel } = useThematicLabels(campaignId);
  const { page, limit, setPage, setLimit } = usePagination();
  const { sortField, sortDirection, handleSort } = useSorting();
  const { searchText, setSearchText, debouncedSearchText, filters, setFilters } = useSearchFilter();
  const { viewMode, toggleViewMode } = useViewMode();

  // Fetch stats if config provided
  const categoryStats = useCategoryStats(category, campaignId, statsConfig || {});

  // Memoize pagination and filters to prevent infinite re-renders
  const paginationOptions = useMemo(() => ({
    page,
    limit,
    sort: sortField && sortDirection ? `${sortField}:${sortDirection}` : undefined,
  }), [page, limit, sortField, sortDirection]);

  const filterOptions = useMemo(() => ({
    search: debouncedSearchText || undefined,
    ...additionalFilters,
  }), [debouncedSearchText, additionalFilters]);

  // Fetch entities with pagination, sorting, and filters
  const {
    entities,
    totalCount,
    loading,
    error,
  } = useCategory(category, campaignId, {
    pagination: paginationOptions,
    filters: filterOptions,
  });

  const categoryLabel = getCategoryLabel(category);
  const totalPages = Math.ceil(totalCount / limit);

  const handleRowClick = (entityId: string): void => {
    navigate(`/campaigns/${campaignId}/${category}/${entityId}`);
  };

  const handleNewEntity = (): void => {
    navigate(`/campaigns/${campaignId}/${category}/new`);
  };

  if (loading && entities.length === 0) {
    return (
      <div className="generic-list-view">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="generic-list-view">
        <div className="list-error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="generic-list-view">
      <header className="list-header">
        <h1 className="list-title">{categoryLabel}</h1>
        <div className="list-header-actions">
          <button
            type="button"
            className="view-mode-toggle"
            onClick={toggleViewMode}
            aria-label="Toggle View Mode"
          >
            View Mode: {viewMode === 'dm' ? 'DM View' : 'Player View'}
          </button>
          <button
            type="button"
            className="list-new-button"
            onClick={handleNewEntity}
            aria-label={`Create new ${categoryLabel.slice(0, -1)}`}
          >
            New {categoryLabel.slice(0, -1)}
          </button>
        </div>
      </header>

      {statsConfig && (
        <CategoryStatsSection
          stats={categoryStats.stats}
          breakdown={categoryStats.breakdown}
          loading={categoryStats.loading}
        />
      )}

      <TableToolbar
        searchValue={searchText}
        onSearchChange={setSearchText}
        filters={filters}
        onFilterChange={setFilters}
      />

      <CategoryTable
        data={entities}
        columns={columns}
        onRowClick={handleRowClick}
        onSort={handleSort}
        sortField={sortField}
        sortDirection={sortDirection}
        loading={loading}
      />

      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={limit}
        onPageChange={setPage}
        onPageSizeChange={setLimit}
      />
    </div>
  );
};
