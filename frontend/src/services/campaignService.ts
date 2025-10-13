/**
 * Campaign Service - API calls for campaign operations
 */

import { apiClient } from './apiClient';
import { Campaign } from '../../../shared/types/Campaign';

export const campaignService = {
  /**
   * Get all campaigns for current user
   */
  async getCampaigns(): Promise<{ campaigns: Campaign[]; total: number }> {
    const response = await apiClient.get('/campaigns');
    return response.data;
  },

  /**
   * Get campaign by ID
   */
  async getCampaign(id: string): Promise<Campaign> {
    const response = await apiClient.get(`/campaigns/${id}`);
    return response.data;
  },

  /**
   * Create new campaign
   */
  async createCampaign(name: string): Promise<Campaign> {
    const response = await apiClient.post('/campaigns', { name });
    return response.data;
  },

  /**
   * Update campaign
   */
  async updateCampaign(
    id: string,
    updates: { name?: string; publicAccessEnabled?: boolean; publicPassword?: string | null }
  ): Promise<Campaign> {
    const response = await apiClient.put(`/campaigns/${id}`, updates);
    return response.data;
  },

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    await apiClient.delete(`/campaigns/${id}`);
  },
};
