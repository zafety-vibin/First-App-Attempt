/**
 * ViewMode type and utilities
 * Feature: 004-create-a-tagging
 * Based on: specs/004-create-a-tagging/data-model.md
 */

/**
 * View mode for content visibility filtering
 * - 'dm': DM View - shows all content including hierarchical levels (with visual indicators)
 * - 'player': Player/General View - hides hierarchical content (DM Secret, custom hierarchical levels)
 */
export type ViewMode = 'dm' | 'player';

/**
 * LocalStorage key for view mode persistence
 */
export const VIEW_MODE_STORAGE_KEY = 'vvd-mimic:view-mode';

/**
 * Default view mode (safer - shows all content)
 */
export const DEFAULT_VIEW_MODE: ViewMode = 'dm';

/**
 * HTTP header name for server-side view mode filtering
 */
export const VIEW_MODE_HEADER = 'X-View-Mode';

/**
 * View mode display labels
 */
export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  dm: 'DM View',
  player: 'Player View',
};

/**
 * View mode filtering utilities
 */
export const ViewModeUtils = {
  /**
   * Toggle between DM and Player view modes
   */
  toggle: (currentMode: ViewMode): ViewMode => {
    return currentMode === 'dm' ? 'player' : 'dm';
  },

  /**
   * Check if current view mode should show hierarchical content
   */
  showsHierarchical: (viewMode: ViewMode): boolean => {
    return viewMode === 'dm';
  },

  /**
   * Load view mode from localStorage
   */
  loadFromStorage: (): ViewMode => {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return (stored === 'dm' || stored === 'player') ? stored : DEFAULT_VIEW_MODE;
  },

  /**
   * Save view mode to localStorage
   */
  saveToStorage: (viewMode: ViewMode): void => {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  },
};
