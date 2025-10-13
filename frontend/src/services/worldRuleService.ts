import { apiClient } from './apiClient';
import { WorldRule } from '../utils/validationSchemas';

export interface WorldRuleFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  rule_type?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface WorldRuleListResponse {
  data: WorldRule[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface WorldRuleStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
}

export async function listWorldRules(
  campaignId: string,
  filters?: WorldRuleFilters,
  pagination?: PaginationParams
): Promise<WorldRuleListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.rule_type) params.rule_type = filters.rule_type;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/world-rules', { params });
  return response.data;
}

export async function getWorldRuleById(id: string): Promise<WorldRule> {
  const response = await apiClient.get(`/world-rules/${id}`);
  return response.data;
}

export async function createWorldRule(data: Partial<WorldRule>): Promise<WorldRule> {
  const response = await apiClient.post('/world-rules', data);
  return response.data;
}

export async function updateWorldRule(id: string, data: Partial<WorldRule>): Promise<WorldRule> {
  const response = await apiClient.put(`/world-rules/${id}`, data);
  return response.data;
}

export async function deleteWorldRule(id: string): Promise<void> {
  await apiClient.delete(`/world-rules/${id}`);
}

export async function getWorldRuleStats(campaignId: string): Promise<WorldRuleStats> {
  const response = await apiClient.get('/world-rules/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
