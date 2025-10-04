"use strict";
/**
 * ViewMode type and utilities
 * Feature: 004-create-a-tagging
 * Based on: specs/004-create-a-tagging/data-model.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewModeUtils = exports.VIEW_MODE_LABELS = exports.VIEW_MODE_HEADER = exports.DEFAULT_VIEW_MODE = exports.VIEW_MODE_STORAGE_KEY = void 0;
/**
 * LocalStorage key for view mode persistence
 */
exports.VIEW_MODE_STORAGE_KEY = 'vvd-mimic:view-mode';
/**
 * Default view mode (safer - shows all content)
 */
exports.DEFAULT_VIEW_MODE = 'dm';
/**
 * HTTP header name for server-side view mode filtering
 */
exports.VIEW_MODE_HEADER = 'X-View-Mode';
/**
 * View mode display labels
 */
exports.VIEW_MODE_LABELS = {
    dm: 'DM View',
    player: 'Player View',
};
/**
 * View mode filtering utilities
 */
exports.ViewModeUtils = {
    /**
     * Toggle between DM and Player view modes
     */
    toggle: (currentMode) => {
        return currentMode === 'dm' ? 'player' : 'dm';
    },
    /**
     * Check if current view mode should show hierarchical content
     */
    showsHierarchical: (viewMode) => {
        return viewMode === 'dm';
    },
    /**
     * Load view mode from localStorage
     */
    loadFromStorage: () => {
        const stored = localStorage.getItem(exports.VIEW_MODE_STORAGE_KEY);
        return (stored === 'dm' || stored === 'player') ? stored : exports.DEFAULT_VIEW_MODE;
    },
    /**
     * Save view mode to localStorage
     */
    saveToStorage: (viewMode) => {
        localStorage.setItem(exports.VIEW_MODE_STORAGE_KEY, viewMode);
    },
};
//# sourceMappingURL=ViewMode.js.map