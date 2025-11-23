/**
 * Portal Public Service (Player API Client)
 * Feature 009: Player Question Portal
 * T043: Player endpoints (public, no auth)
 */

import axios from 'axios';

export interface PortalStatus {
  enabled: boolean;
  requiresPassword: boolean;
}

export interface PlayerIdentity {
  id: string;
  characterName: string;
}

export interface Citation {
  number: number;
  cardId: string;
  cardTitle: string;
  url: string;
}

export interface PortalMessage {
  id: string;
  conversationId: string;
  playerId: string;
  question: string;
  response: string;
  citations: Citation[];
  tokenCount: number;
  createdAt: number;
}

export interface ConversationHistory {
  player: PlayerIdentity;
  messages: PortalMessage[];
}

export const portalPublicService = {
  /**
   * Get portal status (enabled, password required)
   */
  async getStatus(campaignId: string): Promise<PortalStatus> {
    const response = await axios.get(`/api/portal/${campaignId}/status`);
    return response.data;
  },

  /**
   * Verify portal password
   */
  async verifyPassword(campaignId: string, password: string): Promise<boolean> {
    try {
      await axios.post(`/api/portal/${campaignId}/verify-password`, { password });
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Identify player (creates session)
   */
  async identify(campaignId: string, characterName: string): Promise<PlayerIdentity> {
    const response = await axios.post(`/api/portal/${campaignId}/identify`, { characterName });
    return response.data.player;
  },

  /**
   * Ask a question
   */
  async ask(campaignId: string, question: string): Promise<PortalMessage> {
    const response = await axios.post(`/api/portal/${campaignId}/ask`, { question });
    return response.data;
  },

  /**
   * Get conversation history
   */
  async getHistory(campaignId: string, limit: number = 100): Promise<ConversationHistory> {
    const response = await axios.get(`/api/portal/${campaignId}/history`, {
      params: { limit },
    });
    return response.data;
  },
};
