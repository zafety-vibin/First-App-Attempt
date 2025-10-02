/**
 * Setting Service - API client for setting/world operations
 * Feature: 003-create-a-notion
 */

import { apiClient } from './apiClient';
import type {
  Setting,
  CreateSettingRequest,
  UpdateSettingRequest,
} from '../../../shared/types/Setting';

export const settingService = {
  /**
   * Get all settings for current user
   */
  async getSettings(): Promise<Setting[]> {
    const response = await apiClient.get('/api/settings');
    return response.data.settings;
  },

  /**
   * Get a single setting by ID
   */
  async getSetting(settingId: string): Promise<Setting> {
    const response = await apiClient.get(`/api/settings/${settingId}`);
    return response.data;
  },

  /**
   * Create a new setting
   */
  async createSetting(data: CreateSettingRequest): Promise<Setting> {
    const response = await apiClient.post('/api/settings', data);
    return response.data;
  },

  /**
   * Update a setting
   */
  async updateSetting(settingId: string, data: UpdateSettingRequest): Promise<Setting> {
    const response = await apiClient.put(`/api/settings/${settingId}`, data);
    return response.data;
  },

  /**
   * Delete a setting
   */
  async deleteSetting(settingId: string): Promise<void> {
    await apiClient.delete(`/api/settings/${settingId}`);
  },
};
