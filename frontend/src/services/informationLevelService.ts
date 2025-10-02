/**
 * Information Level Service - API calls for information level operations
 * Feature: 004-create-a-tagging
 */

import { apiClient } from './apiClient';
import {
  InformationLevel,
  CreateInformationLevelPayload,
  UpdateInformationLevelPayload,
} from '../../shared/types/InformationLevel';

export const informationLevelService = {
  /**
   * List information levels for campaign (4 defaults + custom levels)
   */
  async listInformationLevels(campaignId: string): Promise<{ levels: InformationLevel[] }> {
    const response = await apiClient.get(`/api/information-levels?campaign_id=${campaignId}`);
    return response.data;
  },

  /**
   * Get information level by ID
   */
  async getInformationLevel(levelId: string): Promise<InformationLevel> {
    const response = await apiClient.get(`/api/information-levels/${levelId}`);
    return response.data;
  },

  /**
   * Create custom information level
   */
  async createInformationLevel(data: CreateInformationLevelPayload): Promise<InformationLevel> {
    const response = await apiClient.post('/api/information-levels', {
      name: data.name,
      color: data.color,
      hierarchical: data.hierarchical,
      campaign_id: data.campaignId,
    });
    return response.data;
  },

  /**
   * Update custom information level
   */
  async updateInformationLevel(
    levelId: string,
    data: UpdateInformationLevelPayload
  ): Promise<InformationLevel> {
    const response = await apiClient.put(`/api/information-levels/${levelId}`, data);
    return response.data;
  },

  /**
   * Delete custom information level and revert cards to System
   */
  async deleteInformationLevel(
    levelId: string
  ): Promise<{ reverted_cards_count: number; warning: string }> {
    const response = await apiClient.delete(`/api/information-levels/${levelId}?confirm=true`);
    return response.data;
  },
};
