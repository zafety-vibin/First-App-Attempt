import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryName } from '../../contexts/SidebarContext';
import { useCategory } from '../../hooks/useCategory';
import { usePagination } from '../../hooks/usePagination';
import { useSorting } from '../../hooks/useSorting';
import { useSearchFilter } from '../../hooks/useSearchFilter';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import { getViewMode, setViewMode as setViewModeStorage } from '../../services/apiClient';
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

  // Database view mode system (Feature 015) - separate from wiki's ViewModeContext
  const [viewMode, setViewMode] = useState<'dm_view' | 'player_view'>(() => getViewMode(campaignId));
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const toggleViewMode = () => {
    const newMode = viewMode === 'dm_view' ? 'player_view' : 'dm_view';
    setViewMode(newMode);
    setViewModeStorage(campaignId, newMode);
    // Trigger re-fetch to get filtered data from backend
    setRefreshTrigger(prev => prev + 1);
  };

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
  // Add refreshTrigger as dependency to re-fetch when view mode changes
  const {
    entities,
    totalCount,
    loading,
    error,
    refresh,
    update,
  } = useCategory(category, campaignId, {
    pagination: paginationOptions,
    filters: filterOptions,
  });

  // Re-fetch data when view mode changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

  // Filter columns based on view mode - hide dm_* columns in player_view
  const filteredColumns = useMemo(() => {
    if (viewMode === 'player_view') {
      return columns.filter(col => !col.accessorKey?.startsWith('dm_'));
    }
    return columns;
  }, [columns, viewMode]);

  const categoryLabel = getCategoryLabel(category);
  const totalPages = Math.ceil(totalCount / limit);

  const handleRowClick = (entity: any): void => {
    navigate(`/campaigns/${campaignId}/${category}/${entity.id}`);
  };

  const handleNewEntity = (): void => {
    navigate(`/campaigns/${campaignId}/${category}/new`);
  };

  const handleCellUpdate = async (entityId: string, fieldKey: string, newValue: any): Promise<void> => {
    await update(entityId, { [fieldKey]: newValue });
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
            {viewMode === 'dm_view' ? 'DM View' : 'Player View'}
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
        columns={filteredColumns}
        onRowClick={handleRowClick}
        onCellUpdate={handleCellUpdate}
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
