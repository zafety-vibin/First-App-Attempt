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
    console.log('[cardService.getRootCards] Called with campaignId:', campaignId, 'type:', type);
    const params = new URLSearchParams({ campaign_id: campaignId });
    if (type) params.append('type', type);

    console.log('[cardService.getRootCards] About to make API request to /cards');
    const response = await apiClient.get(`/cards?${params}`);
    console.log('[cardService.getRootCards] Got response, cards:', response.data.cards.length);
    return response.data.cards;
  },

  /**
   * Get a single card by ID
   */
  async getCard(cardId: string): Promise<Card> {
    const response = await apiClient.get(`/cards/${cardId}`);
    return response.data;
  },

  /**
   * Get child cards of a parent
   */
  async getChildren(parentId: string): Promise<Card[]> {
    console.log('[cardService.getChildren] Called with parentId:', parentId);
    console.log('[cardService.getChildren] About to make API request to /cards/:id/children');
    const response = await apiClient.get(`/cards/${parentId}/children`);
    console.log('[cardService.getChildren] Got response, cards:', response.data.cards.length);
    return response.data.cards;
  },

  /**
   * Get entire subtree of a card (recursive)
   */
  async getSubtree(cardId: string): Promise<Card[]> {
    const response = await apiClient.get(`/cards/${cardId}/subtree`);
    return response.data.cards;
  },

  /**
   * Create a new card
   */
  async createCard(data: CreateCardRequest): Promise<Card> {
    // Convert camelCase to snake_case for API
    const payload = {
      type: data.type,
      campaign_id: data.campaignId,
      parent_id: data.parentId || null,
      position: data.position,
      title: data.title || null,
      content: data.content || null,
      metadata: data.metadata || null,
      cover_image_url: data.coverImageUrl || null,
      icon_emoji: data.iconEmoji || null,
      information_level_id: data.informationLevelId || 'system', // Feature 004
    };
    const response = await apiClient.post('/cards', payload);
    return response.data;
  },

  /**
   * Update a card
   */
  async updateCard(cardId: string, data: UpdateCardRequest): Promise<Card> {
    // Convert camelCase to snake_case for API
    const payload = {
      type: data.type,
      title: data.title,
      content: data.content,
      metadata: data.metadata,
      cover_image_url: data.coverImageUrl,
      icon_emoji: data.iconEmoji,
      information_level_id: data.informationLevelId, // Feature 004
    };
    const response = await apiClient.put(`/cards/${cardId}`, payload);
    return response.data;
  },

  /**
   * Delete a card (and all children)
   */
  async deleteCard(cardId: string): Promise<void> {
    await apiClient.delete(`/cards/${cardId}`);
  },

  /**
   * Move card to new parent
   */
  async moveCard(cardId: string, data: MoveCardRequest): Promise<Card> {
    const payload = {
      new_parent_id: data.newParentId,
      position: data.position,
    };
    const response = await apiClient.patch(`/cards/${cardId}/move`, payload);
    return response.data;
  },

  /**
   * Reorder card within same parent
   */
  async reorderCard(cardId: string, data: ReorderCardRequest): Promise<Card> {
    const payload = {
      position: data.position,
    };
    const response = await apiClient.patch(`/cards/${cardId}/reorder`, payload);
    return response.data;
  },
};
