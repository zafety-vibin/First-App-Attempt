import { useState, useCallback, useEffect, useMemo } from 'react';

export interface FilterState {
  coreStatus: string[]; // ['active', 'archived', 'draft']
  playerKnowledge: string[]; // ['freely_accessible', 'common_knowledge', 'player_knowledge', 'dm_only']
  tags: string[];
  customFilters: Record<string, any>; // Category-specific filters (e.g., race, faction_id)
}

export interface UseSearchFilterReturn {
  searchText: string;
  debouncedSearchText: string;
  setSearchText: (text: string) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  activeFilterCount: number;
}

const DEFAULT_FILTERS: FilterState = {
  coreStatus: [],
  playerKnowledge: [],
  tags: [],
  customFilters: {},
};

/**
 * Search and filter state hook with 300ms debouncing
 * @returns Search and filter state with controls
 */
export function useSearchFilter(): UseSearchFilterReturn {
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Debounce search text (300ms delay)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // Set individual filter
  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchText('');
  }, []);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.coreStatus.length > 0) count += filters.coreStatus.length;
    if (filters.playerKnowledge.length > 0) count += filters.playerKnowledge.length;
    if (filters.tags.length > 0) count += filters.tags.length;
    count += Object.keys(filters.customFilters).filter(
      (key) => filters.customFilters[key] !== null && filters.customFilters[key] !== undefined && filters.customFilters[key] !== ''
    ).length;
    if (debouncedSearchText.trim().length > 0) count += 1;
    return count;
  }, [filters, debouncedSearchText]);

  return {
    searchText,
    debouncedSearchText,
    setSearchText,
    filters,
    setFilters,
    setFilter,
    clearFilters,
    activeFilterCount,
  };
}
