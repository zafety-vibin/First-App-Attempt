import { apiClient } from './apiClient';
import { SessionRecap } from '../utils/validationSchemas';

export interface SessionRecapFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  session_date_start?: number;
  session_date_end?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface SessionRecapListResponse {
  data: SessionRecap[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface SessionRecapStats {
  totalCount: number;
  dateRange: { earliest: number | null; latest: number | null };
  inGameDateRange: { start: string | null; end: string | null };
}

export async function listSessionRecaps(
  campaignId: string,
  filters?: SessionRecapFilters,
  pagination?: PaginationParams
): Promise<SessionRecapListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.session_date_start) params.session_date_start = filters.session_date_start;
    if (filters.session_date_end) params.session_date_end = filters.session_date_end;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/session-recaps', { params });
  return response.data;
}

export async function getSessionRecapById(id: string): Promise<SessionRecap> {
  const response = await apiClient.get(`/session-recaps/${id}`);
  return response.data;
}

export async function createSessionRecap(data: Partial<SessionRecap>): Promise<SessionRecap> {
  const response = await apiClient.post('/session-recaps', data);
  return response.data;
}

export async function updateSessionRecap(id: string, data: Partial<SessionRecap>): Promise<SessionRecap> {
  const response = await apiClient.put(`/session-recaps/${id}`, data);
  return response.data;
}

export async function deleteSessionRecap(id: string): Promise<void> {
  await apiClient.delete(`/session-recaps/${id}`);
}

export async function getSessionRecapStats(campaignId: string): Promise<SessionRecapStats> {
  const response = await apiClient.get('/session-recaps/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
