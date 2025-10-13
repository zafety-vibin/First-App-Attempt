import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type CategoryType = 'SETTING' | 'LIVING_WORLD' | 'CAMPAIGN' | 'EXTENDED';
export type CategoryName =
  | 'factions'
  | 'npcs'
  | 'locations'
  | 'session_recaps'
  | 'quests'
  | 'player_characters'
  | 'lore_entries'
  | 'world_rules'
  | 'planar_forces'
  | 'session_prep'
  | 'custom_mechanics'
  | 'items'
  | 'creatures';

export interface SidebarState {
  collapseState: Record<CategoryType, boolean>;
  activeCategory: CategoryName | null;
  enabledCategories: CategoryName[];
  thematicLabels: Record<CategoryName, string>;
}

interface SidebarContextValue extends SidebarState {
  toggleSection: (type: CategoryType) => void;
  setActiveCategory: (category: CategoryName | null) => void;
  setEnabledCategories: (categories: CategoryName[]) => void;
  setThematicLabels: (labels: Record<CategoryName, string>) => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export interface SidebarProviderProps {
  campaignId: string;
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ campaignId, children }) => {
  const storageKey = `sidebarCollapse_${campaignId}`;

  // Load collapse state from localStorage
  const loadCollapseState = (): Record<CategoryType, boolean> => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sidebar collapse state:', error);
    }
    // Default: all sections expanded
    return {
      SETTING: false,
      LIVING_WORLD: false,
      CAMPAIGN: false,
      EXTENDED: false,
    };
  };

  const [collapseState, setCollapseState] = useState<Record<CategoryType, boolean>>(loadCollapseState);
  const [activeCategory, setActiveCategory] = useState<CategoryName | null>(null);
  const [enabledCategories, setEnabledCategories] = useState<CategoryName[]>([]);
  const [thematicLabels, setThematicLabels] = useState<Record<CategoryName, string>>({} as Record<CategoryName, string>);

  // Persist collapse state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(collapseState));
    } catch (error) {
      console.error('Failed to persist sidebar collapse state:', error);
    }
  }, [collapseState, storageKey]);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const newCollapseState = JSON.parse(e.newValue);
          setCollapseState(newCollapseState);
        } catch (error) {
          console.error('Failed to parse storage event data:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  const toggleSection = useCallback((type: CategoryType) => {
    setCollapseState((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  }, []);

  const value: SidebarContextValue = {
    collapseState,
    activeCategory,
    enabledCategories,
    thematicLabels,
    toggleSection,
    setActiveCategory,
    setEnabledCategories,
    setThematicLabels,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

export const useSidebar = (): SidebarContextValue => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
