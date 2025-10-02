/**
 * Card Context - Global card tree state management
 * Feature: 003-create-a-notion
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Card } from '../../../shared/types/Card';
import { cardService } from '../services/cardService';

interface CardContextValue {
  // Current campaign cards
  cards: Card[];
  setCards: (cards: Card[]) => void;

  // Current card (for full page view)
  currentCard: Card | null;
  setCurrentCard: (card: Card | null) => void;

  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Operations
  loadCampaignCards: (campaignId: string) => Promise<void>;
  loadCard: (cardId: string) => Promise<void>;
  refreshCards: () => Promise<void>;

  // Tree manipulation helpers
  addCard: (card: Card) => void;
  updateCardInTree: (cardId: string, updates: Partial<Card>) => void;
  removeCard: (cardId: string) => void;
}

const CardContext = createContext<CardContextValue | undefined>(undefined);

export function CardProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);

  const loadCampaignCards = useCallback(async (campaignId: string) => {
    try {
      setLoading(true);
      setCurrentCampaignId(campaignId);
      const rootCards = await cardService.getRootCards(campaignId);
      setCards(rootCards);
    } catch (error) {
      console.error('Failed to load campaign cards:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCard = useCallback(async (cardId: string) => {
    try {
      setLoading(true);
      const card = await cardService.getCard(cardId);
      setCurrentCard(card);
    } catch (error) {
      console.error('Failed to load card:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCards = useCallback(async () => {
    if (currentCampaignId) {
      await loadCampaignCards(currentCampaignId);
    }
  }, [currentCampaignId, loadCampaignCards]);

  const addCard = useCallback((card: Card) => {
    setCards((prev) => [...prev, card]);
  }, []);

  const updateCardInTree = useCallback((cardId: string, updates: Partial<Card>) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, ...updates } : c))
    );

    if (currentCard?.id === cardId) {
      setCurrentCard((prev) => (prev ? { ...prev, ...updates } : null));
    }
  }, [currentCard]);

  const removeCard = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));

    if (currentCard?.id === cardId) {
      setCurrentCard(null);
    }
  }, [currentCard]);

  const value: CardContextValue = {
    cards,
    setCards,
    currentCard,
    setCurrentCard,
    loading,
    setLoading,
    loadCampaignCards,
    loadCard,
    refreshCards,
    addCard,
    updateCardInTree,
    removeCard,
  };

  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
}

export function useCardContext(): CardContextValue {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('useCardContext must be used within CardProvider');
  }
  return context;
}
