/**
 * Category Landing Config Service - Frontend API wrapper
 * Feature: 015-create-the-dashboard (T021)
 *
 * Wraps backend category landing config endpoints (T005) with:
 * - Type-safe API calls using apiClient
 * - Automatic auth + view mode headers
 * - Category validation
 * - 404 handling (returns null for not found)
 * - TipTap description JSON handling
 */

import { apiClient } from './apiClient';
import type { LayoutConfig } from './dashboardConfigService';
import type { CategoryName } from '../components/dashboard/WidgetRegistry';

// Category landing config entity
export interface CategoryLandingConfig {
  id: string;
  campaign_id: string;
  user_id: string;
  category: CategoryName;
  layout: LayoutConfig;
  title: string | null;
  description: string | null; // TipTap JSON string
  created_at: number;
  updated_at: number;
}

/**
 * Get category landing config by campaign ID and category
 * Returns null if not found (404)
 */
export async function getCategoryLandingConfig(
  campaignId: string,
  category: CategoryName
): Promise<CategoryLandingConfig | null> {
  try {
    const response = await apiClient.get<CategoryLandingConfig>('/category-landing-configs', {
      params: {
        campaign_id: campaignId,
        category,
      },
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
 * Create new category landing config
 */
export async function createCategoryLandingConfig(
  campaignId: string,
  category: CategoryName,
  layout: LayoutConfig,
  title?: string | null,
  description?: any | null // TipTap JSON object
): Promise<CategoryLandingConfig> {
  const response = await apiClient.post<CategoryLandingConfig>('/category-landing-configs', {
    campaign_id: campaignId,
    category,
    layout,
    title: title || null,
    description: description ? JSON.stringify(description) : null,
  });
  return response.data;
}

/**
 * Update category landing config (layout, title, and/or description)
 */
export async function updateCategoryLandingConfig(
  id: string,
  layout?: LayoutConfig,
  title?: string | null,
  description?: any | null // TipTap JSON object
): Promise<CategoryLandingConfig> {
  const requestBody: any = {};

  if (layout !== undefined) {
    requestBody.layout = layout;
  }

  if (title !== undefined) {
    requestBody.title = title;
  }

  if (description !== undefined) {
    requestBody.description = description ? JSON.stringify(description) : null;
  }

  const response = await apiClient.put<CategoryLandingConfig>(
    `/category-landing-configs/${id}`,
    requestBody
  );
  return response.data;
}

/**
 * Delete category landing config
 */
export async function deleteCategoryLandingConfig(id: string): Promise<void> {
  await apiClient.delete(`/category-landing-configs/${id}`);
}

// Default empty layout for category landing pages
export const DEFAULT_CATEGORY_LANDING_LAYOUT: LayoutConfig = {
  layouts: {
    lg: [], // Empty - users add widgets as needed
  },
  breakpoint: 'lg',
};