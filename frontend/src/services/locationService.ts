import { apiClient } from './apiClient';
import { Location } from '../utils/validationSchemas';

export interface LocationFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  location_type?: string;
  parent_location_id?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface LocationListResponse {
  data: Location[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface LocationStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  populationRange: { min: number; max: number } | null;
}

export async function listLocations(
  campaignId: string,
  filters?: LocationFilters,
  pagination?: PaginationParams
): Promise<LocationListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.location_type) params.location_type = filters.location_type;
    if (filters.parent_location_id) params.parent_location_id = filters.parent_location_id;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/locations', { params });
  return response.data;
}

export async function getLocationById(id: string): Promise<Location> {
  const response = await apiClient.get(`/locations/${id}`);
  return response.data;
}

export async function createLocation(data: Partial<Location>): Promise<Location> {
  const response = await apiClient.post('/locations', data);
  return response.data;
}

export async function updateLocation(id: string, data: Partial<Location>): Promise<Location> {
  const response = await apiClient.put(`/locations/${id}`, data);
  return response.data;
}

export async function deleteLocation(id: string): Promise<void> {
  await apiClient.delete(`/locations/${id}`);
}

export async function getLocationStats(campaignId: string): Promise<LocationStats> {
  const response = await apiClient.get('/locations/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}

// ============================================================================
// Map Management Functions (Feature 021)
// ============================================================================

export interface MapImage {
  id: string;
  name: string;
  data: string;
  width: number;
  height: number;
  uploaded_at: number;
}

export interface MapPin {
  id: string;
  map_id: string;
  x: number;
  y: number;
  linked_entity_type: 'location' | 'npc';
  linked_entity_id: string;
  icon: string | null;
  color: string | null;
  label: string | null;
  created_at: number;
}

export interface FactionRegion {
  id: string;
  map_id: string;
  vertices: Array<{ x: number; y: number }>;
  faction_id: string;
  color: string;
  label: string | null;
  z_order: number;
  created_at: number;
}

export interface LocationMapsResponse {
  maps: MapImage[];
  pins: MapPin[];
  regions: FactionRegion[];
}

/**
 * Upload map image to location
 */
export async function uploadMap(
  locationId: string,
  mapData: { name: string; data: string; width: number; height: number }
): Promise<MapImage> {
  const response = await apiClient.post(`/locations/${locationId}/maps`, mapData);
  return response.data.map;
}

/**
 * Get all maps, pins, and regions for a location
 */
export async function getLocationMaps(locationId: string): Promise<LocationMapsResponse> {
  const response = await apiClient.get(`/locations/${locationId}/maps`);
  return response.data;
}

/**
 * Delete a map (also deletes associated pins and regions)
 */
export async function deleteMap(locationId: string, mapId: string): Promise<void> {
  await apiClient.delete(`/locations/${locationId}/maps/${mapId}`);
}

/**
 * Create a pin on a map
 */
export async function createPin(
  locationId: string,
  pinData: {
    map_id: string;
    x: number;
    y: number;
    linked_entity_type: 'location' | 'npc';
    linked_entity_id: string;
    icon?: string | null;
    color?: string | null;
    label?: string | null;
  }
): Promise<MapPin> {
  const response = await apiClient.post(`/locations/${locationId}/pins`, pinData);
  return response.data.pin;
}

/**
 * Update a pin
 */
export async function updatePin(
  locationId: string,
  pinId: string,
  updates: Partial<Omit<MapPin, 'id' | 'map_id' | 'created_at'>>
): Promise<MapPin> {
  const response = await apiClient.put(`/locations/${locationId}/pins/${pinId}`, updates);
  return response.data.pin;
}

/**
 * Delete a pin
 */
export async function deletePin(locationId: string, pinId: string): Promise<void> {
  await apiClient.delete(`/locations/${locationId}/pins/${pinId}`);
}

/**
 * Get all pins for a location (optionally filtered by map_id)
 */
export async function getPins(locationId: string, mapId?: string): Promise<MapPin[]> {
  const params = mapId ? { map_id: mapId } : {};
  const response = await apiClient.get(`/locations/${locationId}/pins`, { params });
  return response.data.pins;
}

/**
 * Create a faction region on a map
 */
export async function createRegion(
  locationId: string,
  regionData: {
    map_id: string;
    vertices: Array<{ x: number; y: number }>;
    faction_id: string;
    color: string;
    label?: string | null;
    z_order?: number;
  }
): Promise<FactionRegion> {
  const response = await apiClient.post(`/locations/${locationId}/regions`, regionData);
  return response.data.region;
}

/**
 * Update a faction region
 */
export async function updateRegion(
  locationId: string,
  regionId: string,
  updates: Partial<Omit<FactionRegion, 'id' | 'map_id' | 'created_at'>>
): Promise<FactionRegion> {
  const response = await apiClient.put(`/locations/${locationId}/regions/${regionId}`, updates);
  return response.data.region;
}

/**
 * Delete a faction region
 */
export async function deleteRegion(locationId: string, regionId: string): Promise<void> {
  await apiClient.delete(`/locations/${locationId}/regions/${regionId}`);
}

/**
 * Get all regions for a location (optionally filtered by map_id)
 */
export async function getRegions(locationId: string, mapId?: string): Promise<FactionRegion[]> {
  const params = mapId ? { map_id: mapId } : {};
  const response = await apiClient.get(`/locations/${locationId}/regions`, { params });
  return response.data.regions;
}
