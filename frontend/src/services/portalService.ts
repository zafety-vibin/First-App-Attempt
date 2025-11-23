/**
 * Portal Service (GM Management API Client)
 * Feature 009: Player Question Portal
 * T042: GM management endpoints
 */

import axios from 'axios';

export interface PortalConfig {
  id: string;
  campaignId: string;
  enabled: boolean;
  passwordHash: string | null;
  responseStyle: string;
  customSystemPrompt: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MonitoringData {
  totalTokens: number;
  playerStats: Array<{
    playerName: string;
    tokenCount: number;
  }>;
  totalPlayers: number;
  totalConversations: number;
  players: Array<{
    id: string;
    characterName: string;
    createdAt: number;
  }>;
}

export const portalService = {
  /**
   * Get portal configuration
   */
  async getConfig(campaignId: string): Promise<PortalConfig> {
    const response = await axios.get(`/api/campaigns/${campaignId}/portal/config`);
    return response.data;
  },

  /**
   * Enable portal
   */
  async enable(campaignId: string): Promise<void> {
    await axios.put(`/api/campaigns/${campaignId}/portal/enable`, { enabled: true });
  },

  /**
   * Disable portal
   */
  async disable(campaignId: string): Promise<void> {
    await axios.put(`/api/campaigns/${campaignId}/portal/enable`, { enabled: false });
  },

  /**
   * Set password
   */
  async setPassword(campaignId: string, password: string | null): Promise<void> {
    await axios.put(`/api/campaigns/${campaignId}/portal/password`, { password });
  },

  /**
   * Set response style
   */
  async setResponseStyle(
    campaignId: string,
    responseStyle: string,
    customSystemPrompt?: string
  ): Promise<void> {
    await axios.put(`/api/campaigns/${campaignId}/portal/response-style`, {
      responseStyle,
      customSystemPrompt,
    });
  },

  /**
   * Get monitoring data
   */
  async getMonitoring(campaignId: string): Promise<MonitoringData> {
    const response = await axios.get(`/api/campaigns/${campaignId}/portal/monitoring`);
    return response.data;
  },

  /**
   * Test portal in preview mode
   */
  async preview(campaignId: string, question: string): Promise<any> {
    const response = await axios.post(`/api/campaigns/${campaignId}/portal/preview`, {
      question,
    });
    return response.data;
  },
};
