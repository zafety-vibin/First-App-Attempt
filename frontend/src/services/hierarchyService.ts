/**
 * Hierarchy Service
 * Feature: 021-create-a-geographic
 * Task: T041
 *
 * API calls for geographic hierarchy navigation.
 */

import { apiClient } from './apiClient';

export interface LocationTreeResponse {
  tree: any[];
  has_cycles: boolean;
  cycle_paths: string[][];
}

export interface BreadcrumbResponse {
  breadcrumb: Array<{
    id: string;
    name: string;
    parent_location_id: string | null;
    has_map: boolean;
  }>;
  has_cycle: boolean;
}

export interface ChildLocationsResponse {
  children: Array<{
    id: string;
    name: string;
    location_type: string | null;
    map_count: number;
    child_count: number;
  }>;
  count: number;
}

/**
 * Get complete location hierarchy tree for campaign
 */
export async function getLocationTree(campaignId: string): Promise<LocationTreeResponse> {
  const response = await apiClient.get(`/campaigns/${campaignId}/locations/hierarchy`);
  return response.data;
}

/**
 * Get breadcrumb path from root to specific location
 */
export async function getBreadcrumb(locationId: string): Promise<BreadcrumbResponse> {
  const response = await apiClient.get(`/locations/${locationId}/breadcrumb`);
  return response.data;
}

/**
 * Get immediate child locations
 */
export async function getChildLocations(locationId: string): Promise<ChildLocationsResponse> {
  const response = await apiClient.get(`/locations/${locationId}/children`);
  return response.data;
}
