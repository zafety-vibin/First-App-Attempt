/**
 * ViewMode Types and Utilities
 * Feature: 004-create-a-tagging
 */

export type ViewMode = 'dm' | 'player';

export const DEFAULT_VIEW_MODE: ViewMode = 'dm';
export const VIEW_MODE_STORAGE_KEY = 'viewMode';

export const ViewModeUtils = {
  toggle: (current: ViewMode): ViewMode => {
    return current === 'dm' ? 'player' : 'dm';
  },

  showsHierarchical: (mode: ViewMode): boolean => {
    return mode === 'dm';
  },

  isValidViewMode: (value: unknown): value is ViewMode => {
    return value === 'dm' || value === 'player';
  },
};
