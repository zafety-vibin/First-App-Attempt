import { useContext } from 'react';
import { useSidebar, CategoryType, CategoryName } from '../contexts/SidebarContext';

export interface UseSidebarStateReturn {
  collapseState: Record<CategoryType, boolean>;
  toggleSection: (type: CategoryType) => void;
  activeCategory: CategoryName | null;
  setActiveCategory: (category: CategoryName | null) => void;
  enabledCategories: CategoryName[];
  setEnabledCategories: (categories: CategoryName[]) => void;
  thematicLabels: Record<CategoryName, string>;
  setThematicLabels: (labels: Record<CategoryName, string>) => void;
}

/**
 * Sidebar collapse state management hook with localStorage persistence
 * Wrapper around SidebarContext for easier consumption
 * @returns Sidebar state and controls
 */
export function useSidebarState(): UseSidebarStateReturn {
  const context = useSidebar();

  // Context already handles localStorage persistence and cross-tab sync
  return {
    collapseState: context.collapseState,
    toggleSection: context.toggleSection,
    activeCategory: context.activeCategory,
    setActiveCategory: context.setActiveCategory,
    enabledCategories: context.enabledCategories,
    setEnabledCategories: context.setEnabledCategories,
    thematicLabels: context.thematicLabels,
    setThematicLabels: context.setThematicLabels,
  };
}
