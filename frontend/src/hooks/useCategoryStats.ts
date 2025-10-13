import { useMemo } from 'react';
import { useCategory } from './useCategory';
import { CategoryName } from '../contexts/SidebarContext';
import { CategoryStatItem, CategoryBreakdownItem } from '../components/pages/CategoryStatsSection';

export interface CategoryStatsConfig {
  primaryStats?: 'total' | 'status' | 'both';
  breakdownField?: string;
  breakdownLabel?: string;
  statusField?: string;
  activeStatuses?: string[];
  completedStatuses?: string[];
}

export interface CategoryStatsResult {
  stats: CategoryStatItem[];
  breakdown?: {
    title: string;
    items: CategoryBreakdownItem[];
  };
  loading: boolean;
  error: string | null;
}

/**
 * Hook to calculate category statistics
 * Fetches all entities and computes aggregated stats
 */
export const useCategoryStats = (
  category: CategoryName,
  campaignId: string,
  config: CategoryStatsConfig = {}
): CategoryStatsResult => {
  const {
    primaryStats = 'total',
    breakdownField,
    breakdownLabel = 'Breakdown',
    statusField = 'status',
    activeStatuses = ['not_started', 'in_progress'],
    completedStatuses = ['completed'],
  } = config;

  // Fetch all entities for stats calculation (limit 1000)
  const {
    entities: allEntities,
    totalCount,
    loading,
    error,
  } = useCategory(category, campaignId, {
    pagination: { limit: 1000 },
  });

  const result = useMemo(() => {
    if (!allEntities || allEntities.length === 0) {
      return {
        stats: [],
        breakdown: undefined,
        loading,
        error,
      };
    }

    // Calculate primary stats
    const stats: CategoryStatItem[] = [];

    if (primaryStats === 'total' || primaryStats === 'both') {
      stats.push({
        label: 'Total',
        value: totalCount || allEntities.length,
        variant: 'primary',
      });
    }

    if (primaryStats === 'status' || primaryStats === 'both') {
      // Calculate active and completed counts
      let activeCount = 0;
      let completedCount = 0;

      allEntities.forEach((entity: any) => {
        const status = entity[statusField];
        if (status) {
          if (activeStatuses.includes(status)) {
            activeCount++;
          }
          if (completedStatuses.includes(status)) {
            completedCount++;
          }
        }
      });

      stats.push({
        label: 'Active',
        value: activeCount,
        variant: 'warning',
      });

      stats.push({
        label: 'Completed',
        value: completedCount,
        variant: 'success',
      });
    }

    // Calculate breakdown if field specified
    let breakdown: { title: string; items: CategoryBreakdownItem[] } | undefined;

    if (breakdownField) {
      const breakdownMap: Record<string, number> = {};

      allEntities.forEach((entity: any) => {
        const value = entity[breakdownField];
        if (value) {
          const key = String(value);
          breakdownMap[key] = (breakdownMap[key] || 0) + 1;
        }
      });

      const items = Object.entries(breakdownMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      if (items.length > 0) {
        breakdown = {
          title: breakdownLabel,
          items,
        };
      }
    }

    return {
      stats,
      breakdown,
      loading,
      error,
    };
  }, [
    allEntities,
    totalCount,
    primaryStats,
    breakdownField,
    breakdownLabel,
    statusField,
    activeStatuses,
    completedStatuses,
    loading,
    error,
  ]);

  return result;
};
