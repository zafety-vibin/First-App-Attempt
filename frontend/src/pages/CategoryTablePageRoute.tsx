import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CategoryTable } from '../components/table/CategoryTable';
import { TableToolbar } from '../components/table/TableToolbar';
import { PaginationControls } from '../components/table/PaginationControls';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { CategoryName } from '../contexts/SidebarContext';

/**
 * T028: CategoryTablePageRoute component
 * Route page wrapper for category table view
 * Manages filter, sort, pagination state from URL query params
 */
export const CategoryTablePageRoute: React.FC = () => {
  const { campaignId, category } = useParams<{ campaignId: string; category: CategoryName }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract state from URL query params
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sort_order') as 'asc' | 'desc') || 'desc');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Sync URL params with state
  useEffect(() => {
    const params: Record<string, string> = {
      page: currentPage.toString(),
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    if (searchQuery) {
      params.search = searchQuery;
    }
    setSearchParams(params);
  }, [currentPage, sortBy, sortOrder, searchQuery, setSearchParams]);

  if (!campaignId || !category) {
    return <div className="error-message">Invalid route parameters</div>;
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleFilterChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter
  };

  return (
    <ErrorBoundary>
      <div className="category-table-page">
        <TableToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          category={category}
        />

        <CategoryTable
          campaignId={campaignId}
          category={category}
          currentPage={currentPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          searchQuery={searchQuery}
          filters={filters}
          onSortChange={handleSortChange}
        />

        <PaginationControls
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      </div>
    </ErrorBoundary>
  );
};
