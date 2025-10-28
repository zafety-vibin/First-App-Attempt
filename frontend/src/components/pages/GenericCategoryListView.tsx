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
import { ActionsCell } from '../table/ActionsCell';
import { BulkActionsToolbar } from '../table/BulkActionsToolbar';
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

// Helper to properly singularize category labels
const singularize = (plural: string): string => {
  // Special cases
  if (plural.endsWith('ies')) {
    return plural.slice(0, -3) + 'y'; // "Entries" → "Entry"
  }
  if (plural.endsWith('s')) {
    return plural.slice(0, -1); // "NPCs" → "NPC"
  }
  return plural;
};

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

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
    create,
    delete: deleteEntity,
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

  // Bulk operation handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entities.map((e: any) => e.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const deletePromises = Array.from(selectedIds).map(id => deleteEntity(id));
    await Promise.all(deletePromises);
    setSelectedIds(new Set());
  };

  const handleBulkSetVisibility = async (level: string) => {
    const updatePromises = Array.from(selectedIds).map(id =>
      update(id, { player_knowledge: level })
    );
    await Promise.all(updatePromises);
    setSelectedIds(new Set());
  };

  const handleBulkAddTags = async (newTags: string[]) => {
    // Get current entities to merge tags
    const updatePromises = Array.from(selectedIds).map(id => {
      const entity = entities.find((e: any) => e.id === id);
      if (!entity) return Promise.resolve();
      const currentTags = (entity as any).tags || [];
      const mergedTags = Array.from(new Set([...currentTags, ...newTags]));
      return update(id, { tags: mergedTags });
    });
    await Promise.all(updatePromises);
    setSelectedIds(new Set());
  };

  // Add Selection and Actions columns at the beginning
  const columnsWithActionsAndSelection = useMemo(() => {
    const selectionColumn = {
      id: 'selection',
      header: () => (
        <input
          type="checkbox"
          checked={selectedIds.size === entities.length && entities.length > 0}
          onChange={toggleSelectAll}
          title="Select all"
          style={{ cursor: 'pointer' }}
        />
      ),
      cell: (info: any) => (
        <input
          type="checkbox"
          checked={selectedIds.has(info.row.original.id)}
          onChange={() => toggleSelection(info.row.original.id)}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: 'pointer' }}
        />
      ),
      size: 50,
      enableSorting: false,
    };

    const actionsColumn = {
      id: 'actions',
      header: '',
      cell: (info: any) => (
        <ActionsCell
          entityId={info.row.original.id}
          category={category}
          campaignId={campaignId}
        />
      ),
      size: 60,
      enableSorting: false,
    };

    return [selectionColumn, actionsColumn, ...columns];
  }, [columns, category, campaignId, selectedIds, entities]);

  // Filter columns based on view mode - hide dm_* columns in player_view
  const filteredColumns = useMemo(() => {
    if (viewMode === 'player_view') {
      return columnsWithActionsAndSelection.filter(col => !col.accessorKey?.startsWith('dm_'));
    }
    return columnsWithActionsAndSelection;
  }, [columnsWithActionsAndSelection, viewMode]);

  const categoryLabel = getCategoryLabel(category);
  const totalPages = Math.ceil(totalCount / limit);

  const handleNewEntity = (): void => {
    navigate(`/campaigns/${campaignId}/${category}/new`);
  };

  const handleCellUpdate = async (entityId: string, fieldKey: string, newValue: any): Promise<void> => {
    await update(entityId, { [fieldKey]: newValue });
  };

  const handleQuickAdd = async (data: Record<string, any>): Promise<void> => {
    // Ensure campaign_id is included
    await create({ ...data, campaign_id: campaignId });
    // Refresh is automatic after create in useCategory hook
  };

  // Quick-add configuration: minimal fields for rapid entity creation
  const quickAddColumns = [
    {
      fieldKey: 'name',
      label: 'Name',
      type: 'text' as const,
      required: true,
    },
    {
      fieldKey: 'player_knowledge',
      label: 'Visibility',
      type: 'player_knowledge' as const,
      required: false,
    },
  ];

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
            aria-label={`Create new ${singularize(categoryLabel)}`}
          >
            New {singularize(categoryLabel)}
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

      {selectedIds.size > 0 && (
        <BulkActionsToolbar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkSetVisibility={handleBulkSetVisibility}
          onBulkAddTags={handleBulkAddTags}
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
        onCellUpdate={handleCellUpdate}
        onQuickAdd={handleQuickAdd}
        quickAddColumns={quickAddColumns}
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
