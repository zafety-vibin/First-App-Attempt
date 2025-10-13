import { apiClient } from './apiClient';
import { Quest } from '../utils/validationSchemas';

export interface QuestFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  status?: string[];
  quest_giver_id?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface QuestListResponse {
  data: Quest[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface QuestStats {
  totalCount: number;
  statusBreakdown: Record<string, number>;
  activeCount: number;
  completedCount: number;
}

export async function listQuests(
  campaignId: string,
  filters?: QuestFilters,
  pagination?: PaginationParams
): Promise<QuestListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.status) params.status = filters.status.join(',');
    if (filters.quest_giver_id) params.quest_giver_id = filters.quest_giver_id;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/quests', { params });
  return response.data;
}

export async function getQuestById(id: string): Promise<Quest> {
  const response = await apiClient.get(`/quests/${id}`);
  return response.data;
}

export async function createQuest(data: Partial<Quest>): Promise<Quest> {
  const response = await apiClient.post('/quests', data);
  return response.data;
}

export async function updateQuest(id: string, data: Partial<Quest>): Promise<Quest> {
  const response = await apiClient.put(`/quests/${id}`, data);
  return response.data;
}

export async function deleteQuest(id: string): Promise<void> {
  await apiClient.delete(`/quests/${id}`);
}

export async function getQuestStats(campaignId: string): Promise<QuestStats> {
  const response = await apiClient.get('/quests/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
