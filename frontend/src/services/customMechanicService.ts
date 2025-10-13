import { apiClient } from './apiClient';
import { CustomMechanic } from '../utils/validationSchemas';

export interface CustomMechanicFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  mechanic_type?: string;
  source?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface CustomMechanicListResponse {
  data: CustomMechanic[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface CustomMechanicStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
}

export async function listCustomMechanics(
  campaignId: string,
  filters?: CustomMechanicFilters,
  pagination?: PaginationParams
): Promise<CustomMechanicListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.mechanic_type) params.mechanic_type = filters.mechanic_type;
    if (filters.source) params.source = filters.source;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/custom-mechanics', { params });
  return response.data;
}

export async function getCustomMechanicById(id: string): Promise<CustomMechanic> {
  const response = await apiClient.get(`/custom-mechanics/${id}`);
  return response.data;
}

export async function createCustomMechanic(data: Partial<CustomMechanic>): Promise<CustomMechanic> {
  const response = await apiClient.post('/custom-mechanics', data);
  return response.data;
}

export async function updateCustomMechanic(id: string, data: Partial<CustomMechanic>): Promise<CustomMechanic> {
  const response = await apiClient.put(`/custom-mechanics/${id}`, data);
  return response.data;
}

export async function deleteCustomMechanic(id: string): Promise<void> {
  await apiClient.delete(`/custom-mechanics/${id}`);
}

export async function getCustomMechanicStats(campaignId: string): Promise<CustomMechanicStats> {
  const response = await apiClient.get('/custom-mechanics/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
