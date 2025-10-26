/**
 * useDashboardCanvas - Dashboard canvas state management hook
 * Feature: 015-create-the-dashboard (T012)
 *
 * Implements:
 * - Dashboard config fetching on mount
 * - Layout state management
 * - Widget instance management
 * - Debounced auto-save (500ms)
 * - Add/remove widget operations
 * - Default layout creation
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { WidgetRegistry, type WidgetSize } from '../components/dashboard/WidgetRegistry';
import {
  getDashboardConfig,
  createDashboardConfig,
  updateDashboardConfig,
  deleteDashboardConfig,
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardConfig,
  type LayoutConfig,
  type GridLayoutItem,
} from '../services/dashboardConfigService';

// Widget instance interface
export interface WidgetInstance {
  instanceId: string; // Unique instance: 'npc-summary-1'
  widgetId: string; // Widget type: 'npc-summary'
  gridData: GridLayoutItem; // Layout positioning
}

interface UseDashboardCanvasResult {
  // State
  layout: GridLayoutItem[];
  widgets: WidgetInstance[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  pickerOpen: boolean;

  // Actions
  addWidget: (widgetId: string) => void;
  removeWidget: (instanceId: string) => void;
  onLayoutChange: (newLayout: GridLayoutItem[]) => void;
  setPickerOpen: (open: boolean) => void;
  refresh: () => Promise<void>;
  resetLayout: () => Promise<void>;
}

/**
 * Dashboard canvas hook
 * Manages layout state, widgets, and auto-saves to backend
 */
export function useDashboardCanvas(campaignId: string): UseDashboardCanvasResult {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [layout, setLayout] = useState<GridLayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Debounce timer ref
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch config on mount
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedConfig = await getDashboardConfig(campaignId);

      if (fetchedConfig) {
        // Config exists, use it
        setConfig(fetchedConfig);
        setLayout(fetchedConfig.layout.layouts.lg || []);
      } else {
        // No config exists, create default
        try {
          const newConfig = await createDashboardConfig(campaignId, DEFAULT_DASHBOARD_LAYOUT);
          setConfig(newConfig);
          setLayout(newConfig.layout.layouts.lg || []);
        } catch (createErr: any) {
          // Handle race condition: config might have been created by another component
          if (createErr.response?.status === 400 || createErr.message?.includes('already exists')) {
            console.log('Config already exists (race condition), refetching...');
            const refetchedConfig = await getDashboardConfig(campaignId);
            if (refetchedConfig) {
              setConfig(refetchedConfig);
              setLayout(refetchedConfig.layout.layouts.lg || []);
            } else {
              // Still no config? Use default layout
              setLayout(DEFAULT_DASHBOARD_LAYOUT.layouts.lg);
            }
          } else {
            throw createErr; // Re-throw if it's a different error
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard configuration');
      console.error('Failed to fetch dashboard config:', err);
      // Use default layout on error
      setLayout(DEFAULT_DASHBOARD_LAYOUT.layouts.lg);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Debounced save function
  const debouncedSave = useCallback(
    async (newLayout: GridLayoutItem[]) => {
      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set new timer
      saveTimerRef.current = setTimeout(async () => {
        if (!config) return;

        setSaving(true);
        try {
          const updatedLayout: LayoutConfig = {
            layouts: {
              lg: newLayout,
            },
            breakpoint: 'lg',
          };

          const updatedConfig = await updateDashboardConfig(config.id, updatedLayout);
          setConfig(updatedConfig);
        } catch (err: any) {
          console.error('Failed to save dashboard config:', err);
          setError(err.message || 'Failed to save dashboard configuration');
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
      debouncedSave(newLayout);
    },
    [debouncedSave]
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
      debouncedSave(newLayout);

      // Close picker
      setPickerOpen(false);
    },
    [layout, debouncedSave]
  );

  // Remove widget from canvas
  const removeWidget = useCallback(
    (instanceId: string) => {
      const newLayout = layout.filter((item) => item.i !== instanceId);
      setLayout(newLayout);
      debouncedSave(newLayout);
    },
    [layout, debouncedSave]
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
      await deleteDashboardConfig(config.id);
      // Reload page to fetch/create default layout
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to reset layout:', err);
      setError(err.message || 'Failed to reset layout');
    }
  }, [config]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
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
    addWidget,
    removeWidget,
    onLayoutChange,
    setPickerOpen,
    refresh,
    resetLayout,
  };
}

export default useDashboardCanvas;