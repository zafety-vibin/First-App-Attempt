/**
 * ViewMode type and utilities (UNIFIED)
 * Feature: 004-create-a-tagging
 * Based on: specs/004-create-a-tagging/data-model.md
 *
 * UNIFIED: Both wiki and database systems now use same values
 * Previously: Wiki used 'dm'/'player', Categories used 'dm_view'/'player_view'
 * Now: All systems use 'dm_view'/'player_view'
 */

/**
 * View mode for content visibility filtering
 * - 'dm_view': DM View - shows all content including hierarchical levels (secrets, custom hierarchical)
 * - 'player_view': Player View - hides ALL hierarchical content (dm_only + custom hierarchical levels)
 *
 * Player view filters based on information_levels.hierarchical flag, not just dm_only
 */
export type ViewMode = 'dm_view' | 'player_view';

/**
 * LocalStorage key for view mode persistence
 */
export const VIEW_MODE_STORAGE_KEY = 'vvd-mimic:view-mode';

/**
 * Default view mode (safer - shows all content)
 */
export const DEFAULT_VIEW_MODE: ViewMode = 'dm_view';

/**
 * HTTP header name for server-side view mode filtering
 */
export const VIEW_MODE_HEADER = 'X-View-Mode';

/**
 * View mode display labels
 */
export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  dm_view: 'DM View',
  player_view: 'Player View',
};

/**
 * View mode filtering utilities
 */
export const ViewModeUtils = {
  /**
   * Toggle between DM and Player view modes
   */
  toggle: (currentMode: ViewMode): ViewMode => {
    return currentMode === 'dm_view' ? 'player_view' : 'dm_view';
  },

  /**
   * Check if current view mode should show hierarchical content
   */
  showsHierarchical: (viewMode: ViewMode): boolean => {
    return viewMode === 'dm_view';
  },

  /**
   * Load view mode from localStorage (with migration from old format)
   */
  loadFromStorage: (): ViewMode => {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    // Migrate old values
    if (stored === 'dm') return 'dm_view';
    if (stored === 'player') return 'player_view';
    // Use new values
    return (stored === 'dm_view' || stored === 'player_view') ? stored : DEFAULT_VIEW_MODE;
  },

  /**
   * Save view mode to localStorage
   */
  saveToStorage: (viewMode: ViewMode): void => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  },
};
