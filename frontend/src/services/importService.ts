/**
 * Import Service - API client for import sessions
 * References:
 * - specs/005-create-the-ai/contracts/import.yaml
 * - specs/005-create-the-ai/plan.md T055
 */

import { apiClient } from './apiClient';
import type { ChatMessage } from '../components/ImportChatMessage';
import type { ApprovalSummaryData } from '../components/ApprovalSummary';

export interface ImportSession {
  id: string;
  campaign_id: string;
  user_id: string;
  status: 'active' | 'pending_approval' | 'approved' | 'rejected';
  entity_count: number;
  import_batch_id?: string;
  created_at: number;
  updated_at: number;
}

export interface ImportBatch {
  id: string;
  session_id: string;
  cards_created: number;
  nodes_added: number;
  edges_added: number;
  created_at: number;
}

class ImportService {
  /**
   * Create a new import session
   */
  async createSession(campaignId: string): Promise<ImportSession> {
    console.log('[ImportService] createSession called with campaignId:', campaignId);
    const response = await apiClient.post(`/api/import/session`, { campaignId });
    console.log('[ImportService] createSession response:', response.data);
    return response.data;
  }

  /**
   * Get import session by ID
   */
  async getSession(campaignId: string, sessionId: string): Promise<ImportSession> {
    const response = await apiClient.get(`/api/campaigns/${campaignId}/import/sessions/${sessionId}`);
    return response.data;
  }

  /**
   * List all import sessions for a campaign
   */
  async listSessions(campaignId: string): Promise<ImportSession[]> {
    const response = await apiClient.get(`/api/campaigns/${campaignId}/import/sessions`);
    return response.data;
  }

  /**
   * Upload a file to an import session
   */
  async uploadFile(
    campaignId: string,
    sessionId: string,
    file: File
  ): Promise<{ message: string; entities_extracted: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);

    const response = await apiClient.post(
      `/api/import/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
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
    onCardChanged?: () => void
  ): Promise<void> {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/import/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
        body: JSON.stringify({ sessionId, campaignId, message }),
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
              // Handle card_changed events for real-time updates
              if (parsed.type === 'card_changed' && onCardChanged) {
                onCardChanged();
              }
              // Handle AI response content
              if (parsed.content) {
                onChunk(parsed.content);
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
   * Get approval summary for a session
   */
  async getApprovalSummary(campaignId: string, sessionId: string): Promise<ApprovalSummaryData> {
    const response = await apiClient.get(
      `/api/import/approval-summary?sessionId=${sessionId}`
    );
    return response.data;
  }

  /**
   * Approve an import session
   */
  async approve(campaignId: string, sessionId: string): Promise<ImportBatch> {
    const response = await apiClient.post(
      `/api/import/approve`,
      { sessionId, campaignId }
    );
    return response.data;
  }

  /**
   * Revert an import batch
   */
  async revertBatch(campaignId: string, batchId: string): Promise<{ message: string }> {
    const response = await apiClient.post(
      `/api/import/revert`,
      { batchId }
    );
    return response.data;
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(campaignId: string, sessionId: string): Promise<ChatMessage[]> {
    const response = await apiClient.get(
      `/api/campaigns/${campaignId}/import/sessions/${sessionId}/chat`
    );
    return response.data;
  }
}

export const importService = new ImportService();
