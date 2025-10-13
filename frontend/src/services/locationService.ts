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
