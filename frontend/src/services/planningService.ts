/**
 * Planning Service - API client for planning sessions
 * References:
 * - specs/005-create-the-ai/contracts/planning.yaml
 * - specs/005-create-the-ai/plan.md T060
 */

import { apiClient } from './apiClient';
import type { ChatMessage } from '../components/ImportChatMessage';

export interface PlanningSession {
  id: string;
  campaign_id: string;
  user_id: string;
  status: 'active' | 'completed';
  graph_updates_count: number;
  created_at: number;
  updated_at: number;
}

export interface GraphUpdateSummary {
  graph_type: string;
  nodes_added: number;
  edges_added: number;
}

class PlanningService {
  /**
   * Create a new planning session
   */
  async createSession(campaignId: string): Promise<PlanningSession> {
    const response = await apiClient.post(`/api/campaigns/${campaignId}/planning/sessions`);
    return response.data;
  }

  /**
   * Get planning session by ID
   */
  async getSession(campaignId: string, sessionId: string): Promise<PlanningSession> {
    const response = await apiClient.get(`/api/campaigns/${campaignId}/planning/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * List all planning sessions for a campaign
   */
  async listSessions(campaignId: string): Promise<PlanningSession[]> {
    const response = await apiClient.get(`/api/campaigns/${campaignId}/planning/sessions`);
    return response.data;
  }

  /**
   * Send a chat message with SSE streaming
   */
  async sendMessage(
    campaignId: string,
    sessionId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onGraphUpdate?: (updates: GraphUpdateSummary[]) => void
  ): Promise<void> {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns/${campaignId}/planning/sessions/${sessionId}/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);

              // Handle chat content
              if (parsed.content) {
                onChunk(parsed.content);
              }

              // Handle graph updates
              if (parsed.graph_updates && onGraphUpdate) {
                onGraphUpdate(parsed.graph_updates);
              }
            } catch (e) {
              // Not JSON, treat as plain text
              if (data) {
                onChunk(data);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Complete a planning session
   */
  async completeSession(campaignId: string, sessionId: string): Promise<{ message: string }> {
    const response = await apiClient.post(
      `/api/campaigns/${campaignId}/planning/sessions/${sessionId}/complete`
    );
    return response.data;
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(campaignId: string, sessionId: string): Promise<ChatMessage[]> {
    const response = await apiClient.get(
      `/api/campaigns/${campaignId}/planning/sessions/${sessionId}/chat`
    );
    return response.data;
  }

  /**
   * Get graph updates for a session
   */
  async getGraphUpdates(campaignId: string, sessionId: string): Promise<GraphUpdateSummary[]> {
    const response = await apiClient.get(
      `/api/campaigns/${campaignId}/planning/sessions/${sessionId}/graph-updates`
    );
    return response.data;
  }
}

export const planningService = new PlanningService();