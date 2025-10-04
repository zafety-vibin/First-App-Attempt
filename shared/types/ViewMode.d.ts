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
export declare const VIEW_MODE_STORAGE_KEY = "vvd-mimic:view-mode";
/**
 * Default view mode (safer - shows all content)
 */
export declare const DEFAULT_VIEW_MODE: ViewMode;
/**
 * HTTP header name for server-side view mode filtering
 */
export declare const VIEW_MODE_HEADER = "X-View-Mode";
/**
 * View mode display labels
 */
export declare const VIEW_MODE_LABELS: Record<ViewMode, string>;
/**
 * View mode filtering utilities
 */
export declare const ViewModeUtils: {
    /**
     * Toggle between DM and Player view modes
     */
    toggle: (currentMode: ViewMode) => ViewMode;
    /**
     * Check if current view mode should show hierarchical content
     */
    showsHierarchical: (viewMode: ViewMode) => boolean;
    /**
     * Load view mode from localStorage
     */
    loadFromStorage: () => ViewMode;
    /**
     * Save view mode to localStorage
     */
    saveToStorage: (viewMode: ViewMode) => void;
};
//# sourceMappingURL=ViewMode.d.ts.map