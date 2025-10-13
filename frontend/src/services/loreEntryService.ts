import { apiClient } from './apiClient';
import { LoreEntry } from '../utils/validationSchemas';

export interface LoreEntryFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  category?: string;
  era_period?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface LoreEntryListResponse {
  data: LoreEntry[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface LoreEntryStats {
  totalCount: number;
  categoryBreakdown: Record<string, number>;
  eraBreakdown: Record<string, number>;
}

export async function listLoreEntries(
  campaignId: string,
  filters?: LoreEntryFilters,
  pagination?: PaginationParams
): Promise<LoreEntryListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.category) params.category = filters.category;
    if (filters.era_period) params.era_period = filters.era_period;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/lore-entries', { params });
  return response.data;
}

export async function getLoreEntryById(id: string): Promise<LoreEntry> {
  const response = await apiClient.get(`/lore-entries/${id}`);
  return response.data;
}

export async function createLoreEntry(data: Partial<LoreEntry>): Promise<LoreEntry> {
  const response = await apiClient.post('/lore-entries', data);
  return response.data;
}

export async function updateLoreEntry(id: string, data: Partial<LoreEntry>): Promise<LoreEntry> {
  const response = await apiClient.put(`/lore-entries/${id}`, data);
  return response.data;
}

export async function deleteLoreEntry(id: string): Promise<void> {
  await apiClient.delete(`/lore-entries/${id}`);
}

export async function getLoreEntryStats(campaignId: string): Promise<LoreEntryStats> {
  const response = await apiClient.get('/lore-entries/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
