/**
 * Dashboard Config Service - Frontend API wrapper
 * Feature: 015-create-the-dashboard (T010)
 *
 * Wraps backend dashboard config endpoints (T004) with:
 * - Type-safe API calls using apiClient
 * - Automatic auth + view mode headers
 * - 404 handling (returns null for not found)
 * - Layout configuration type definitions
 */

import { apiClient } from './apiClient';

// Grid layout item interface (react-grid-layout format)
export interface GridLayoutItem {
  i: string; // Unique instance ID
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  widgetId: string; // Widget type ID
  static?: boolean;
}

// Layout configuration interface
export interface LayoutConfig {
  layouts: {
    lg: GridLayoutItem[];
    md?: GridLayoutItem[];
    sm?: GridLayoutItem[];
  };
  breakpoint: 'lg' | 'md' | 'sm';
}

// Dashboard config entity
export interface DashboardConfig {
  id: string;
  campaign_id: string;
  user_id: string;
  layout: LayoutConfig;
  created_at: number;
  updated_at: number;
}

/**
 * Get dashboard config by campaign ID
 * Returns null if not found (404)
 */
export async function getDashboardConfig(campaignId: string): Promise<DashboardConfig | null> {
  try {
    const response = await apiClient.get<DashboardConfig>('/dashboard-configs', {
      params: { campaign_id: campaignId },
    });
    return response.data;
  } catch (error: any) {
    // Return null for 404 (config not found)
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create new dashboard config
 */
export async function createDashboardConfig(
  campaignId: string,
  layout: LayoutConfig
): Promise<DashboardConfig> {
  const response = await apiClient.post<DashboardConfig>('/dashboard-configs', {
    campaign_id: campaignId,
    layout,
  });
  return response.data;
}

/**
 * Update dashboard config layout
 */
export async function updateDashboardConfig(id: string, layout: LayoutConfig): Promise<DashboardConfig> {
  const response = await apiClient.put<DashboardConfig>(`/dashboard-configs/${id}`, {
    layout,
  });
  return response.data;
}

/**
 * Delete dashboard config
 */
export async function deleteDashboardConfig(id: string): Promise<void> {
  await apiClient.delete(`/dashboard-configs/${id}`);
}

// Default layout for new users
export const DEFAULT_DASHBOARD_LAYOUT: LayoutConfig = {
  layouts: {
    lg: [
      {
        i: 'npc-summary-1',
        x: 0,
        y: 0,
        w: 3,
        h: 10,
        widgetId: 'npc-summary',
      },
      {
        i: 'quest-tracker-1',
        x: 3,
        y: 0,
        w: 3,
        h: 10,
        widgetId: 'quest-tracker',
      },
      {
        i: 'recent-activity-1',
        x: 6,
        y: 0,
        w: 6,
        h: 10,
        widgetId: 'recent-activity',
      },
    ],
  },
  breakpoint: 'lg',
};