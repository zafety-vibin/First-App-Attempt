/**
 * useCards Hook - Card CRUD operations
 * Feature: 003-create-a-notion
 */

import { useCallback } from 'react';
import { useCardContext } from '../contexts/CardContext';
import { cardService } from '../services/cardService';
import type {
  CreateCardRequest,
  UpdateCardRequest,
  MoveCardRequest,
  ReorderCardRequest,
  Card,
} from '../../../shared/types/Card';

export function useCards() {
  const {
    cards,
    currentCard,
    loading,
    addCard,
    updateCardInTree,
    removeCard,
    refreshCards,
  } = useCardContext();

  const createCard = useCallback(
    async (data: CreateCardRequest): Promise<Card> => {
      try {
        const newCard = await cardService.createCard(data);
        addCard(newCard);
        return newCard;
      } catch (error) {
        console.error('Failed to create card:', error);
        throw error;
      }
    },
    [addCard]
  );

  const updateCard = useCallback(
    async (cardId: string, data: UpdateCardRequest): Promise<Card> => {
      try {
        const updated = await cardService.updateCard(cardId, data);
        updateCardInTree(cardId, updated);
        return updated;
      } catch (error) {
        console.error('Failed to update card:', error);
        throw error;
      }
    },
    [updateCardInTree]
  );

  const deleteCard = useCallback(
    async (cardId: string): Promise<void> => {
      try {
        await cardService.deleteCard(cardId);
        removeCard(cardId);
      } catch (error) {
        console.error('Failed to delete card:', error);
        throw error;
      }
    },
    [removeCard]
  );

  const moveCard = useCallback(
    async (cardId: string, data: MoveCardRequest): Promise<Card> => {
      try {
        const moved = await cardService.moveCard(cardId, data);
        updateCardInTree(cardId, moved);
        await refreshCards(); // Refresh to update tree structure
        return moved;
      } catch (error) {
        console.error('Failed to move card:', error);
        throw error;
      }
    },
    [updateCardInTree, refreshCards]
  );

  const reorderCard = useCallback(
    async (cardId: string, data: ReorderCardRequest): Promise<Card> => {
      try {
        const reordered = await cardService.reorderCard(cardId, data);
        updateCardInTree(cardId, reordered);
        await refreshCards(); // Refresh to update positions
        return reordered;
      } catch (error) {
        console.error('Failed to reorder card:', error);
        throw error;
      }
    },
    [updateCardInTree, refreshCards]
  );

  const getChildren = useCallback(
    async (parentId: string): Promise<Card[]> => {
      try {
        return await cardService.getChildren(parentId);
      } catch (error) {
        console.error('Failed to get children:', error);
        throw error;
      }
    },
    []
  );

  return {
    cards,
    currentCard,
    loading,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    reorderCard,
    getChildren,
    refreshCards,
  };
}
