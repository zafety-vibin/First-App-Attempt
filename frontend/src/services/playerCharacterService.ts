import { apiClient } from './apiClient';
import { PlayerCharacter } from '../utils/validationSchemas';

export interface PlayerCharacterFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  player_name?: string;
  race?: string;
  level_min?: number;
  level_max?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PlayerCharacterListResponse {
  data: PlayerCharacter[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface PlayerCharacterStats {
  totalCount: number;
  activeCount: number;
  levelRange: { min: number; max: number } | null;
  raceBreakdown: Record<string, number>;
}

export async function listPlayerCharacters(
  campaignId: string,
  filters?: PlayerCharacterFilters,
  pagination?: PaginationParams
): Promise<PlayerCharacterListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.player_name) params.player_name = filters.player_name;
    if (filters.race) params.race = filters.race;
    if (filters.level_min) params.level_min = filters.level_min;
    if (filters.level_max) params.level_max = filters.level_max;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/player-characters', { params });
  return response.data;
}

export async function getPlayerCharacterById(id: string): Promise<PlayerCharacter> {
  const response = await apiClient.get(`/player-characters/${id}`);
  return response.data;
}

export async function createPlayerCharacter(data: Partial<PlayerCharacter>): Promise<PlayerCharacter> {
  const response = await apiClient.post('/player-characters', data);
  return response.data;
}

export async function updatePlayerCharacter(id: string, data: Partial<PlayerCharacter>): Promise<PlayerCharacter> {
  const response = await apiClient.put(`/player-characters/${id}`, data);
  return response.data;
}

export async function deletePlayerCharacter(id: string): Promise<void> {
  await apiClient.delete(`/player-characters/${id}`);
}

export async function getPlayerCharacterStats(campaignId: string): Promise<PlayerCharacterStats> {
  const response = await apiClient.get('/player-characters/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
