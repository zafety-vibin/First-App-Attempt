import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface WidgetData {
  npcSummary?: {
    totalCount: number;
    relationshipBreakdown: Record<string, number>;
    recentNPCs: any[];
  };
  locationExplorer?: {
    totalCount: number;
    typeBreakdown: Record<string, number>;
    recentLocations: any[];
  };
  factionPower?: {
    totalCount: number;
    powerDistribution: Record<string, number>;
    recentFactions: any[];
  };
  questTracker?: {
    activeCount: number;
    completedCount: number;
    activeQuests: any[];
  };
  sessionTimeline?: {
    lastRecap: any | null;
    nextPrep: any | null;
    currentInGameDate: string | null;
  };
  playerCharacters?: {
    activeCount: number;
    levelRange: string;
    activePCs: any[];
  };
  recentActivity?: {
    items: any[];
  };
}

export interface DashboardState {
  widgets: WidgetData;
  loading: boolean;
  error: string | null;
}

interface DashboardContextValue extends DashboardState {
  setWidgetData: (widgetKey: keyof WidgetData, data: any) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refresh: () => void;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

export interface DashboardProviderProps {
  children: ReactNode;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const [state, setState] = useState<DashboardState>({
    widgets: {},
    loading: false,
    error: null,
  });

  const setWidgetData = useCallback((widgetKey: keyof WidgetData, data: any) => {
    setState((prev) => ({
      ...prev,
      widgets: {
        ...prev.widgets,
        [widgetKey]: data,
      },
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
  }, []);

  const value: DashboardContextValue = {
    ...state,
    setWidgetData,
    setLoading,
    setError,
    refresh,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};

export const useDashboard = (): DashboardContextValue => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
