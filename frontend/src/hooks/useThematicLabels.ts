import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { CategoryName } from '../contexts/SidebarContext';
import { ThemeName, getAllCategoryLabels, getCategoryLabel as getThematicLabel } from '../utils/thematicNames';

export interface UseThematicLabelsReturn {
  theme: ThemeName | null;
  categoryLabels: Record<CategoryName, string>;
  getCategoryLabel: (category: CategoryName) => string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Thematic naming lookup hook
 * Fetches campaign settings (theme, category_labels) and provides themed labels
 * @param campaignId - Campaign ID
 * @returns Themed labels and loading state
 */
export function useThematicLabels(campaignId: string): UseThematicLabelsReturn {
  const [theme, setTheme] = useState<ThemeName | null>(null);
  const [categoryLabels, setCategoryLabels] = useState<Record<CategoryName, string>>(
    getAllCategoryLabels() // Default labels
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch campaign settings (theme)
  const fetchCampaignSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch campaign settings to get theme
      const response = await apiClient.get(`/campaigns/${campaignId}/settings`);
      const campaignTheme: ThemeName | undefined = response.data?.theme;

      if (campaignTheme) {
        setTheme(campaignTheme);
        setCategoryLabels(getAllCategoryLabels(campaignTheme));
      } else {
        // No theme set, use defaults
        setTheme(null);
        setCategoryLabels(getAllCategoryLabels());
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch campaign settings';
      setError(errorMessage);
      console.error('Error fetching campaign theme:', err);
      // Fallback to default labels on error
      setTheme(null);
      setCategoryLabels(getAllCategoryLabels());
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // Fetch on mount and when campaignId changes
  useEffect(() => {
    if (campaignId) {
      fetchCampaignSettings();
    }
  }, [campaignId, fetchCampaignSettings]);

  // Get single category label
  const getCategoryLabel = useCallback(
    (category: CategoryName): string => {
      return categoryLabels[category] || getThematicLabel(category, theme || undefined);
    },
    [categoryLabels, theme]
  );

  return {
    theme,
    categoryLabels,
    getCategoryLabel,
    loading,
    error,
    refresh: fetchCampaignSettings,
  };
}
