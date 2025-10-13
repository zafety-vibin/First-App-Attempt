import { apiClient } from './apiClient';
import { NPC } from '../utils/validationSchemas';

export interface NPCFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  race?: string;
  faction_id?: string;
  relationship_to_party?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string; // Format: "column:direction" (e.g., "updated_at:desc")
}

export interface NPCListResponse {
  data: NPC[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface NPCStats {
  totalCount: number;
  relationshipBreakdown: Record<string, number>;
  raceBreakdown: Record<string, number>;
  factionBreakdown: Record<string, number>;
}

export async function listNPCs(
  campaignId: string,
  filters?: NPCFilters,
  pagination?: PaginationParams
): Promise<NPCListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.race) params.race = filters.race;
    if (filters.faction_id) params.faction_id = filters.faction_id;
    if (filters.relationship_to_party) params.relationship_to_party = filters.relationship_to_party;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/npcs', { params });
  return response.data;
}

export async function getNPCById(id: string): Promise<NPC> {
  const response = await apiClient.get(`/npcs/${id}`);
  return response.data;
}

export async function createNPC(data: Partial<NPC>): Promise<NPC> {
  const response = await apiClient.post('/npcs', data);
  return response.data;
}

export async function updateNPC(id: string, data: Partial<NPC>): Promise<NPC> {
  const response = await apiClient.put(`/npcs/${id}`, data);
  return response.data;
}

export async function deleteNPC(id: string): Promise<void> {
  await apiClient.delete(`/npcs/${id}`);
}

export async function getNPCStats(campaignId: string): Promise<NPCStats> {
  const response = await apiClient.get('/npcs/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}

export async function bulkDeleteNPCs(ids: string[]): Promise<void> {
  await apiClient.delete('/npcs/bulk', {
    params: { ids: ids.join(',') },
  });
}

export async function bulkUpdateNPCs(ids: string[], data: Partial<NPC>): Promise<void> {
  await apiClient.patch('/npcs/bulk', data, {
    params: { ids: ids.join(',') },
  });
}
