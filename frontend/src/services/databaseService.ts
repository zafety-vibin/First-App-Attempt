/**
 * Database Service - API client for database card operations
 * Feature: 003-create-a-notion
 */

import { apiClient } from './apiClient';
import type {
  DatabaseCardMetadata,
  DatabaseEntry,
  CreateDatabaseEntryRequest,
  UpdateDatabaseEntryRequest,
} from '../../../shared/types/DatabaseSchema';

export const databaseService = {
  /**
   * Get database schema (columns, views)
   */
  async getSchema(databaseId: string): Promise<DatabaseCardMetadata> {
    const response = await apiClient.get(`/api/cards/${databaseId}/schema`);
    return response.data;
  },

  /**
   * Update database schema
   */
  async updateSchema(
    databaseId: string,
    schema: DatabaseCardMetadata
  ): Promise<DatabaseCardMetadata> {
    const response = await apiClient.post(`/api/cards/${databaseId}/schema`, schema);
    return response.data;
  },

  /**
   * Get database entries with optional filters
   */
  async getEntries(
    databaseId: string,
    viewId?: string
  ): Promise<DatabaseEntry[]> {
    const params = viewId ? `?view_id=${viewId}` : '';
    const response = await apiClient.get(`/api/cards/${databaseId}/entries${params}`);
    return response.data.entries;
  },

  /**
   * Create database entry
   */
  async createEntry(
    databaseId: string,
    data: CreateDatabaseEntryRequest
  ): Promise<DatabaseEntry> {
    const response = await apiClient.post(`/api/cards/${databaseId}/entries`, data);
    return response.data;
  },

  /**
   * Update database entry
   */
  async updateEntry(
    databaseId: string,
    entryId: string,
    data: UpdateDatabaseEntryRequest
  ): Promise<DatabaseEntry> {
    const response = await apiClient.put(
      `/api/cards/${databaseId}/entries/${entryId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete database entry
   */
  async deleteEntry(databaseId: string, entryId: string): Promise<void> {
    await apiClient.delete(`/api/cards/${databaseId}/entries/${entryId}`);
  },
};
