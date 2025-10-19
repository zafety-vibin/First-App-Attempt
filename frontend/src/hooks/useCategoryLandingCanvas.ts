/**
 * useCategoryLandingCanvas - Category landing page canvas state management hook
 * Feature: 015-create-the-dashboard (T021)
 *
 * Implements:
 * - Category landing config fetching on mount
 * - Layout state management with category-filtered widgets
 * - Widget instance management
 * - Debounced auto-save (500ms)
 * - Add/remove widget operations
 * - Default layout creation (empty by default)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { WidgetRegistry, type CategoryName, type WidgetSize } from '../components/dashboard/WidgetRegistry';
import {
  getCategoryLandingConfig,
  createCategoryLandingConfig,
  updateCategoryLandingConfig,
  deleteCategoryLandingConfig,
  DEFAULT_CATEGORY_LANDING_LAYOUT,
  type CategoryLandingConfig,
} from '../services/categoryLandingConfigService';
import type { LayoutConfig, GridLayoutItem } from '../services/dashboardConfigService';

// Widget instance interface
export interface WidgetInstance {
  instanceId: string; // Unique instance: 'npc-summary-1'
  widgetId: string; // Widget type: 'npc-summary'
  gridData: GridLayoutItem; // Layout positioning
}

interface UseCategoryLandingCanvasResult {
  // State
  layout: GridLayoutItem[];
  widgets: WidgetInstance[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  pickerOpen: boolean;
  description: any | null; // TipTap JSON
  configId: string | null;

  // Actions
  addWidget: (widgetId: string) => void;
  removeWidget: (instanceId: string) => void;
  onLayoutChange: (newLayout: GridLayoutItem[]) => void;
  setPickerOpen: (open: boolean) => void;
  updateDescription: (content: any) => void;
  refresh: () => Promise<void>;
  resetLayout: () => Promise<void>;
}

/**
 * Category landing canvas hook
 * Manages layout state, widgets, and auto-saves to backend
 * Filters available widgets by category
 */
export function useCategoryLandingCanvas(
  campaignId: string,
  category: CategoryName
): UseCategoryLandingCanvasResult {
  const [config, setConfig] = useState<CategoryLandingConfig | null>(null);
  const [layout, setLayout] = useState<GridLayoutItem[]>([]);
  const [description, setDescription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Debounce timer refs
  const saveLayoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveDescriptionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch config on mount
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedConfig = await getCategoryLandingConfig(campaignId, category);

      if (fetchedConfig) {
        // Config exists, use it
        setConfig(fetchedConfig);
        setLayout(fetchedConfig.layout.layouts.lg || []);
        setDescription(
          fetchedConfig.description ? JSON.parse(fetchedConfig.description) : null
        );
      } else {
        // No config exists, create default (empty layout)
        try {
          const newConfig = await createCategoryLandingConfig(
            campaignId,
            category,
            DEFAULT_CATEGORY_LANDING_LAYOUT
          );
          setConfig(newConfig);
          setLayout(newConfig.layout.layouts.lg || []);
          setDescription(null);
        } catch (createErr: any) {
          // Handle race condition: another component may have created it
          if (createErr.response?.status === 400 || createErr.message?.includes('already exists')) {
            console.log('Category landing config already exists (race condition), refetching...');
            const refetchedConfig = await getCategoryLandingConfig(campaignId, category);
            if (refetchedConfig) {
              setConfig(refetchedConfig);
              setLayout(refetchedConfig.layout.layouts.lg || []);
              setDescription(refetchedConfig.description ? JSON.parse(refetchedConfig.description) : null);
            } else {
              setLayout(DEFAULT_CATEGORY_LANDING_LAYOUT.layouts.lg);
            }
          } else {
            throw createErr;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load category landing configuration');
      console.error('Failed to fetch category landing config:', err);
      // Use default layout on error
      setLayout(DEFAULT_CATEGORY_LANDING_LAYOUT.layouts.lg);
      setDescription(null);
    } finally {
      setLoading(false);
    }
  }, [campaignId, category]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Debounced save function for layout
  const debouncedSaveLayout = useCallback(
    async (newLayout: GridLayoutItem[]) => {
      // Clear existing timer
      if (saveLayoutTimerRef.current) {
        clearTimeout(saveLayoutTimerRef.current);
      }

      // Set new timer
      saveLayoutTimerRef.current = setTimeout(async () => {
        if (!config) return;

        setSaving(true);
        try {
          const updatedLayout: LayoutConfig = {
            layouts: {
              lg: newLayout,
            },
            breakpoint: 'lg',
          };

          const updatedConfig = await updateCategoryLandingConfig(
            config.id,
            updatedLayout
          );
          setConfig(updatedConfig);
        } catch (err: any) {
          console.error('Failed to save category landing config:', err);
          setError(err.message || 'Failed to save category landing configuration');
        } finally {
          setSaving(false);
        }
      }, 500); // 500ms debounce delay
    },
    [config]
  );

  // Debounced save function for description
  const debouncedSaveDescription = useCallback(
    async (newDescription: any) => {
      // Clear existing timer
      if (saveDescriptionTimerRef.current) {
        clearTimeout(saveDescriptionTimerRef.current);
      }

      // Set new timer
      saveDescriptionTimerRef.current = setTimeout(async () => {
        if (!config) return;

        setSaving(true);
        try {
          const updatedConfig = await updateCategoryLandingConfig(
            config.id,
            undefined,
            undefined,
            newDescription
          );
          setConfig(updatedConfig);
        } catch (err: any) {
          console.error('Failed to save category landing description:', err);
          setError(err.message || 'Failed to save category landing description');
        } finally {
          setSaving(false);
        }
      }, 500); // 500ms debounce delay
    },
    [config]
  );

  // Handle layout change from react-grid-layout
  const onLayoutChange = useCallback(
    (newLayout: GridLayoutItem[]) => {
      setLayout(newLayout);
      debouncedSaveLayout(newLayout);
    },
    [debouncedSaveLayout]
  );

  // Handle description change from TipTap editor
  const updateDescription = useCallback(
    (content: any) => {
      setDescription(content);
      debouncedSaveDescription(content);
    },
    [debouncedSaveDescription]
  );

  // Add widget to canvas
  const addWidget = useCallback(
    (widgetId: string) => {
      const definition = WidgetRegistry.get(widgetId);
      if (!definition) {
        console.error(`Widget definition not found: ${widgetId}`);
        return;
      }

      // Generate unique instance ID
      const instanceId = `${widgetId}-${Date.now()}`;

      // Find empty position for new widget (bottom of canvas)
      const maxY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

      // Use default height of 10 (user preference: 8-12 range)
      // Width uses minimum size to start compact
      const defaultHeight = 10;

      // Create grid layout item
      const newItem: GridLayoutItem = {
        i: instanceId,
        x: 0,
        y: maxY,
        w: definition.minSize.w,
        h: defaultHeight,
        minW: definition.minSize.w,
        minH: definition.minSize.h,
        maxW: definition.maxSize?.w,
        maxH: definition.maxSize?.h,
        widgetId,
      };

      // Add to layout
      const newLayout = [...layout, newItem];
      setLayout(newLayout);
      debouncedSaveLayout(newLayout);

      // Close picker
      setPickerOpen(false);
    },
    [layout, debouncedSaveLayout]
  );

  // Remove widget from canvas
  const removeWidget = useCallback(
    (instanceId: string) => {
      const newLayout = layout.filter((item) => item.i !== instanceId);
      setLayout(newLayout);
      debouncedSaveLayout(newLayout);
    },
    [layout, debouncedSaveLayout]
  );

  // Convert layout to widget instances
  const widgets = useMemo<WidgetInstance[]>(() => {
    return layout.map((item) => ({
      instanceId: item.i,
      widgetId: item.widgetId,
      gridData: item,
    }));
  }, [layout]);

  // Refresh config
  const refresh = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  // Reset layout to default (delete config and reload)
  const resetLayout = useCallback(async () => {
    if (!config) return;

    try {
      await deleteCategoryLandingConfig(config.id);
      // Reload page to fetch/create default layout
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to reset layout:', err);
      setError(err.message || 'Failed to reset layout');
    }
  }, [config]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (saveLayoutTimerRef.current) {
        clearTimeout(saveLayoutTimerRef.current);
      }
      if (saveDescriptionTimerRef.current) {
        clearTimeout(saveDescriptionTimerRef.current);
      }
    };
  }, []);

  return {
    layout,
    widgets,
    loading,
    saving,
    error,
    pickerOpen,
    description,
    configId: config?.id || null,
    addWidget,
    removeWidget,
    onLayoutChange,
    setPickerOpen,
    updateDescription,
    refresh,
    resetLayout,
  };
}

export default useCategoryLandingCanvas;
