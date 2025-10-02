/**
 * Card Service - API client for card operations
 * Feature: 003-create-a-notion
 */

import { apiClient } from './apiClient';
import type {
  Card,
  CreateCardRequest,
  UpdateCardRequest,
  MoveCardRequest,
  ReorderCardRequest,
} from '../../../shared/types/Card';

export const cardService = {
  /**
   * Get root cards for a campaign
   */
  async getRootCards(campaignId: string, type?: string): Promise<Card[]> {
    const params = new URLSearchParams({ campaign_id: campaignId });
    if (type) params.append('type', type);

    const response = await apiClient.get(`/api/cards?${params}`);
    return response.data.cards;
  },

  /**
   * Get a single card by ID
   */
  async getCard(cardId: string): Promise<Card> {
    const response = await apiClient.get(`/api/cards/${cardId}`);
    return response.data;
  },

  /**
   * Get child cards of a parent
   */
  async getChildren(parentId: string): Promise<Card[]> {
    const response = await apiClient.get(`/api/cards/${parentId}/children`);
    return response.data.cards;
  },

  /**
   * Get entire subtree of a card (recursive)
   */
  async getSubtree(cardId: string): Promise<Card[]> {
    const response = await apiClient.get(`/api/cards/${cardId}/subtree`);
    return response.data.cards;
  },

  /**
   * Create a new card
   */
  async createCard(data: CreateCardRequest): Promise<Card> {
    const response = await apiClient.post('/api/cards', data);
    return response.data;
  },

  /**
   * Update a card
   */
  async updateCard(cardId: string, data: UpdateCardRequest): Promise<Card> {
    const response = await apiClient.put(`/api/cards/${cardId}`, data);
    return response.data;
  },

  /**
   * Delete a card (and all children)
   */
  async deleteCard(cardId: string): Promise<void> {
    await apiClient.delete(`/api/cards/${cardId}`);
  },

  /**
   * Move card to new parent
   */
  async moveCard(cardId: string, data: MoveCardRequest): Promise<Card> {
    const response = await apiClient.post(`/api/cards/${cardId}/move`, data);
    return response.data;
  },

  /**
   * Reorder card within same parent
   */
  async reorderCard(cardId: string, data: ReorderCardRequest): Promise<Card> {
    const response = await apiClient.post(`/api/cards/${cardId}/reorder`, data);
    return response.data;
  },
};
