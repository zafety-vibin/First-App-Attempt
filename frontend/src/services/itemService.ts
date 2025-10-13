import { apiClient } from './apiClient';
import { Item } from '../utils/validationSchemas';

export interface ItemFilters {
  search?: string;
  core_status?: string[];
  player_knowledge?: string[];
  tags?: string[];
  item_type?: string;
  rarity?: string;
  owner_npc_id?: string;
  owner_pc_id?: string;
  location_id?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ItemListResponse {
  data: Item[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
}

export interface ItemStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
  rarityBreakdown: Record<string, number>;
}

export async function listItems(
  campaignId: string,
  filters?: ItemFilters,
  pagination?: PaginationParams
): Promise<ItemListResponse> {
  const params: any = { campaign_id: campaignId };

  if (filters) {
    if (filters.search) params.search = filters.search;
    if (filters.core_status) params.core_status = filters.core_status.join(',');
    if (filters.player_knowledge) params.player_knowledge = filters.player_knowledge.join(',');
    if (filters.tags) params.tags = filters.tags.join(',');
    if (filters.item_type) params.item_type = filters.item_type;
    if (filters.rarity) params.rarity = filters.rarity;
    if (filters.owner_npc_id) params.owner_npc_id = filters.owner_npc_id;
    if (filters.owner_pc_id) params.owner_pc_id = filters.owner_pc_id;
    if (filters.location_id) params.location_id = filters.location_id;
  }

  if (pagination) {
    if (pagination.page) params.page = pagination.page;
    if (pagination.limit) params.limit = pagination.limit;
    if (pagination.sort) params.sort = pagination.sort;
  }

  const response = await apiClient.get('/items', { params });
  return response.data;
}

export async function getItemById(id: string): Promise<Item> {
  const response = await apiClient.get(`/items/${id}`);
  return response.data;
}

export async function createItem(data: Partial<Item>): Promise<Item> {
  const response = await apiClient.post('/items', data);
  return response.data;
}

export async function updateItem(id: string, data: Partial<Item>): Promise<Item> {
  const response = await apiClient.put(`/items/${id}`, data);
  return response.data;
}

export async function deleteItem(id: string): Promise<void> {
  await apiClient.delete(`/items/${id}`);
}

export async function getItemStats(campaignId: string): Promise<ItemStats> {
  const response = await apiClient.get('/items/stats', {
    params: { campaign_id: campaignId },
  });
  return response.data;
}
