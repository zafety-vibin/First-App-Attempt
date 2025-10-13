import { apiClient } from './apiClient';
import { Faction } from '../utils/validationSchemas';

export interface FactionFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  faction_type?: string;
  power_level?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface FactionListResponse {
  data: Faction[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface FactionStats {
  totalCount: number;
  powerLevelDistribution: Record<string, number>;
  typeBreakdown: Record<string, number>;
}

export async function listFactions(
  campaignId: string,
  filters?: FactionFilters,
  pagination?: PaginationParams
): Promise<FactionListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.faction_type) params.faction_type = filters.faction_type;
    if (filters.power_level) params.power_level = filters.power_level;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/factions', { params });
  return response.data;
}

export async function getFactionById(id: string): Promise<Faction> {
  const response = await apiClient.get(`/factions/${id}`);
  return response.data;
}

export async function createFaction(data: Partial<Faction>): Promise<Faction> {
  const response = await apiClient.post('/factions', data);
  return response.data;
}

export async function updateFaction(id: string, data: Partial<Faction>): Promise<Faction> {
  const response = await apiClient.put(`/factions/${id}`, data);
  return response.data;
}

export async function deleteFaction(id: string): Promise<void> {
  await apiClient.delete(`/factions/${id}`);
}

export async function getFactionStats(campaignId: string): Promise<FactionStats> {
  const response = await apiClient.get('/factions/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
