import { apiClient } from './apiClient';
import { PlanarForce } from '../utils/validationSchemas';

export interface PlanarForceFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  entity_type?: string;
  alignment?: string;
  plane_of_origin?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PlanarForceListResponse {
  data: PlanarForce[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface PlanarForceStats {
  totalCount: number;
  entityTypeBreakdown: Record<string, number>;
  alignmentBreakdown: Record<string, number>;
}

export async function listPlanarForces(
  campaignId: string,
  filters?: PlanarForceFilters,
  pagination?: PaginationParams
): Promise<PlanarForceListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.entity_type) params.entity_type = filters.entity_type;
    if (filters.alignment) params.alignment = filters.alignment;
    if (filters.plane_of_origin) params.plane_of_origin = filters.plane_of_origin;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/planar-forces', { params });
  return response.data;
}

export async function getPlanarForceById(id: string): Promise<PlanarForce> {
  const response = await apiClient.get(`/planar-forces/${id}`);
  return response.data;
}

export async function createPlanarForce(data: Partial<PlanarForce>): Promise<PlanarForce> {
  const response = await apiClient.post('/planar-forces', data);
  return response.data;
}

export async function updatePlanarForce(id: string, data: Partial<PlanarForce>): Promise<PlanarForce> {
  const response = await apiClient.put(`/planar-forces/${id}`, data);
  return response.data;
}

export async function deletePlanarForce(id: string): Promise<void> {
  await apiClient.delete(`/planar-forces/${id}`);
}

export async function getPlanarForceStats(campaignId: string): Promise<PlanarForceStats> {
  const response = await apiClient.get('/planar-forces/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
