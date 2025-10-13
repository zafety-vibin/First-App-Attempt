import { useState, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface UseSortingReturn {
  sortColumn: string | null;
  sortDirection: SortDirection;
  setSorting: (column: string | null, direction: SortDirection) => void;
  toggleSort: (column: string) => void;
  clearSort: () => void;
  getSortParam: () => string | null; // Returns "column:direction" format for API
}

/**
 * Table sorting state hook with toggle cycling
 * @param defaultColumn - Initial sort column (optional)
 * @param defaultDirection - Initial sort direction (default 'asc')
 * @returns Sorting state and controls
 */
export function useSorting(
  defaultColumn: string | null = null,
  defaultDirection: SortDirection = 'asc'
): UseSortingReturn {
  const [sortColumn, setSortColumn] = useState<string | null>(defaultColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    defaultColumn ? defaultDirection : null
  );

  // Set sorting explicitly
  const setSorting = useCallback((column: string | null, direction: SortDirection) => {
    setSortColumn(column);
    setSortDirection(direction);
  }, []);

  // Toggle sort for a column (cycles: null → asc → desc → asc)
  const toggleSort = useCallback(
    (column: string) => {
      if (sortColumn === column) {
        // Same column: cycle direction
        if (sortDirection === null) {
          setSortDirection('asc');
        } else if (sortDirection === 'asc') {
          setSortDirection('desc');
        } else {
          // desc → back to asc (continuous cycling)
          setSortDirection('asc');
        }
      } else {
        // Different column: set to asc
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn, sortDirection]
  );

  // Clear sorting
  const clearSort = useCallback(() => {
    setSortColumn(null);
    setSortDirection(null);
  }, []);

  // Get sort param in API format (e.g., "name:asc", "updated_at:desc")
  const getSortParam = useCallback((): string | null => {
    if (sortColumn && sortDirection) {
      return `${sortColumn}:${sortDirection}`;
    }
    return null;
  }, [sortColumn, sortDirection]);

  return {
    sortColumn,
    sortDirection,
    setSorting,
    toggleSort,
    clearSort,
    getSortParam,
  };
}
