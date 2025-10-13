import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'tablePageSize';

export interface UsePaginationReturn {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Pagination state management hook with sessionStorage persistence
 * @param initialPageSize - Default page size (persisted in sessionStorage)
 * @returns Pagination state and controls
 */
export function usePagination(initialPageSize: number = 25): UsePaginationReturn {
  // Load pageSize from sessionStorage on mount
  const getStoredPageSize = (): number => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to load page size from sessionStorage:', error);
    }
    return initialPageSize;
  };

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSizeState] = useState<number>(getStoredPageSize);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Persist pageSize to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, pageSize.toString());
    } catch (error) {
      console.error('Failed to persist page size to sessionStorage:', error);
    }
  }, [pageSize]);

  // Set page (with bounds checking)
  const setPage = useCallback(
    (page: number) => {
      const boundedPage = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(boundedPage);
    },
    [totalPages]
  );

  // Set page size and reset to page 1
  const setPageSize = useCallback((size: number) => {
    if (size > 0) {
      setPageSizeState(size);
      setCurrentPage(1); // Reset to first page when page size changes
    }
  }, []);

  // Navigation helpers
  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    currentPage,
    pageSize,
    totalPages,
    totalCount,
    setPage,
    setPageSize,
    setTotalCount,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    hasNextPage,
    hasPreviousPage,
  };
}
