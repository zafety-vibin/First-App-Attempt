/**
 * AI Tab Context - Manages Import/Planning tab visibility state
 * References:
 * - specs/005-create-the-ai/research.md lines 578-616
 * - specs/005-create-the-ai/plan.md T054
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type TabType = 'import' | 'planning' | null;

interface AITabContextValue {
  activeTab: TabType;
  openImportTab: () => void;
  openPlanningTab: () => void;
  closeTab: () => void;
}

const AITabContext = createContext<AITabContextValue | undefined>(undefined);

interface AITabProviderProps {
  children: React.ReactNode;
}

export function AITabProvider({ children }: AITabProviderProps) {
  const [activeTab, setActiveTab] = useState<TabType>(null);

  const openImportTab = useCallback(() => {
    setActiveTab('import');
  }, []);

  const openPlanningTab = useCallback(() => {
    setActiveTab('planning');
  }, []);

  const closeTab = useCallback(() => {
    setActiveTab(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+I for Import tab
      if (event.ctrlKey && event.key === 'i') {
        event.preventDefault();
        if (activeTab === 'import') {
          closeTab();
        } else {
          openImportTab();
        }
      }
      // Ctrl+P for Planning tab
      else if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        if (activeTab === 'planning') {
          closeTab();
        } else {
          openPlanningTab();
        }
      }
      // Escape to close active tab
      else if (event.key === 'Escape' && activeTab !== null) {
        closeTab();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, openImportTab, openPlanningTab, closeTab]);

  return (
    <AITabContext.Provider
      value={{
        activeTab,
        openImportTab,
        openPlanningTab,
        closeTab,
      }}
    >
      {children}
    </AITabContext.Provider>
  );
}

export function useAITab() {
  const context = useContext(AITabContext);
  if (context === undefined) {
    throw new Error('useAITab must be used within an AITabProvider');
  }
  return context;
}