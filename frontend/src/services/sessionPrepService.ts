import { apiClient } from './apiClient';
import { SessionPrep } from '../utils/validationSchemas';

export interface SessionPrepFilters {
  search?: string;
  core_status?: string[];
  tags?: string[];
  status?: string[];
  planned_date_start?: number;
  planned_date_end?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface SessionPrepListResponse {
  data: SessionPrep[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface SessionPrepStats {
  totalCount: number;
  statusBreakdown: Record<string, number>;
  upcomingCount: number;
}

export async function listSessionPreps(
  campaignId: string,
  filters?: SessionPrepFilters,
  pagination?: PaginationParams
): Promise<SessionPrepListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.status) params.status = filters.status.join(',');
    if (filters.planned_date_start) params.planned_date_start = filters.planned_date_start;
    if (filters.planned_date_end) params.planned_date_end = filters.planned_date_end;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/session-prep', { params });
  return response.data;
}

export async function getSessionPrepById(id: string): Promise<SessionPrep> {
  const response = await apiClient.get(`/session-prep/${id}`);
  return response.data;
}

export async function createSessionPrep(data: Partial<SessionPrep>): Promise<SessionPrep> {
  const response = await apiClient.post('/session-prep', data);
  return response.data;
}

export async function updateSessionPrep(id: string, data: Partial<SessionPrep>): Promise<SessionPrep> {
  const response = await apiClient.put(`/session-prep/${id}`, data);
  return response.data;
}

export async function deleteSessionPrep(id: string): Promise<void> {
  await apiClient.delete(`/session-prep/${id}`);
}

export async function getSessionPrepStats(campaignId: string): Promise<SessionPrepStats> {
  const response = await apiClient.get('/session-prep/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
