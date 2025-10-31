/**
 * ViewModeContext - Manages view mode state (dm/player) with localStorage persistence
 * Feature: 004-create-a-tagging
 * Task: T027
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ViewMode, ViewModeUtils, VIEW_MODE_STORAGE_KEY, DEFAULT_VIEW_MODE } from '../../shared/types/ViewMode';
import { apiClient } from '../services/apiClient';

interface ViewModeContextType {
  viewMode: ViewMode;
  toggleViewMode: () => void;
  setViewMode: (mode: ViewMode) => void;
  showsHierarchical: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    // Initialize from localStorage with migration
    return ViewModeUtils.loadFromStorage();
  });

  // Update apiClient interceptor when view mode changes
  useEffect(() => {
    // Add request interceptor to inject X-View-Mode header
    // ONLY for System 1 (Wiki/Cards) endpoints: /cards, /settings, /information-levels
    const interceptorId = apiClient.interceptors.request.use(
      (config) => {
        // Only apply to card-related endpoints (System 1)
        // System 2 (Categories/Database) uses campaign_id-based interceptor in apiClient
        if (config.url && (
          config.url.includes('/cards') ||
          config.url.includes('/settings') ||
          config.url.includes('/information-levels')
        )) {
          config.headers['X-View-Mode'] = viewMode;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Cleanup interceptor on unmount or view mode change
    return () => {
      apiClient.interceptors.request.eject(interceptorId);
    };
  }, [viewMode]);

  // Listen for cross-tab localStorage changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === VIEW_MODE_STORAGE_KEY && event.newValue) {
        if (event.newValue === 'dm_view' || event.newValue === 'player_view') {
          setViewModeState(event.newValue as ViewMode);
        } else if (event.newValue === 'dm') {
          setViewModeState('dm_view'); // Migrate old value
        } else if (event.newValue === 'player') {
          setViewModeState('player_view'); // Migrate old value
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    ViewModeUtils.saveToStorage(mode);
  };

  const toggleViewMode = () => {
    const newMode = ViewModeUtils.toggle(viewMode);
    setViewMode(newMode);
  };

  const showsHierarchical = ViewModeUtils.showsHierarchical(viewMode);

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        toggleViewMode,
        setViewMode,
        showsHierarchical,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within ViewModeProvider');
  }
  return context;
}
