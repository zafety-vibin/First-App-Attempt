import { apiClient } from './apiClient';
import { Creature } from '../utils/validationSchemas';

export interface CreatureFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  creature_type?: string;
  challenge_rating?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface CreatureListResponse {
  data: Creature[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface CreatureStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  crBreakdown: Record<string, number>;
}

export async function listCreatures(
  campaignId: string,
  filters?: CreatureFilters,
  pagination?: PaginationParams
): Promise<CreatureListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.creature_type) params.creature_type = filters.creature_type;
    if (filters.challenge_rating) params.challenge_rating = filters.challenge_rating;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/creatures', { params });
  return response.data;
}

export async function getCreatureById(id: string): Promise<Creature> {
  const response = await apiClient.get(`/creatures/${id}`);
  return response.data;
}

export async function createCreature(data: Partial<Creature>): Promise<Creature> {
  const response = await apiClient.post('/creatures', data);
  return response.data;
}

export async function updateCreature(id: string, data: Partial<Creature>): Promise<Creature> {
  const response = await apiClient.put(`/creatures/${id}`, data);
  return response.data;
}

export async function deleteCreature(id: string): Promise<void> {
  await apiClient.delete(`/creatures/${id}`);
}

export async function getCreatureStats(campaignId: string): Promise<CreatureStats> {
  const response = await apiClient.get('/creatures/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
