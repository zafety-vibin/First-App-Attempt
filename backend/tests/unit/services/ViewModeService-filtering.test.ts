/**
 * Unit tests for ViewModeService - Hierarchical Level Filtering
 * Feature: 004-create-a-tagging
 *
 * Tests DM Secret card filtering in Player View mode.
 * DM View shows all cards, Player View hides hierarchical information levels.
 *
 * These tests MUST fail before implementation (TDD).
 * Task: T012
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ViewModeService } from '../../../src/services/ViewModeService';
import { db } from '../../../src/services/DatabaseService';
import { Card } from '../../../../shared/types/Card';

describe('ViewModeService - Hierarchical Level Filtering (T012)', () => {
  let viewModeService: ViewModeService;

  beforeEach(() => {
    // ViewModeService will be implemented in Phase 3.4
    viewModeService = new ViewModeService();
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM cards WHERE campaign_id LIKE "test-filter-%"').run();
  });

  describe('filterCards - DM Secret filtering', () => {
    it('should return all cards in DM view mode', () => {
      const cards: Card[] = [
        createTestCard({ id: 'card-1', informationLevelId: 'system' }),
        createTestCard({ id: 'card-2', informationLevelId: 'common-knowledge' }),
        createTestCard({ id: 'card-3', informationLevelId: 'player-knowledge' }),
        createTestCard({ id: 'card-4', informationLevelId: 'dm-secret' }),
      ];

      const filtered = viewModeService.filterCards(cards, 'dm');

      expect(filtered.visibleCards).toHaveLength(4);
      expect(filtered.filteredCount).toBe(0);
    });

    it('should hide DM Secret cards in Player view mode', () => {
      const cards: Card[] = [
        createTestCard({ id: 'card-1', informationLevelId: 'system' }),
        createTestCard({ id: 'card-2', informationLevelId: 'common-knowledge' }),
        createTestCard({ id: 'card-3', informationLevelId: 'player-knowledge' }),
        createTestCard({ id: 'card-4', informationLevelId: 'dm-secret' }),
        createTestCard({ id: 'card-5', informationLevelId: 'dm-secret' }),
      ];

      const filtered = viewModeService.filterCards(cards, 'player');

      expect(filtered.visibleCards).toHaveLength(3);
      expect(filtered.filteredCount).toBe(2);

      // Verify no DM Secret cards in visible list
      const hasDMSecret = filtered.visibleCards.some(c => c.information_level_id === 'dm-secret');
      expect(hasDMSecret).toBe(false);
    });

    it('should show System cards in both view modes', () => {
      const cards: Card[] = [
        createTestCard({ id: 'card-1', informationLevelId: 'system' }),
      ];

      const dmFiltered = viewModeService.filterCards(cards, 'dm');
      const playerFiltered = viewModeService.filterCards(cards, 'player');

      expect(dmFiltered.visibleCards).toHaveLength(1);
      expect(playerFiltered.visibleCards).toHaveLength(1);
    });

    it('should show Common Knowledge cards in both view modes', () => {
      const cards: Card[] = [
        createTestCard({ id: 'card-1', informationLevelId: 'common-knowledge' }),
      ];

      const dmFiltered = viewModeService.filterCards(cards, 'dm');
      const playerFiltered = viewModeService.filterCards(cards, 'player');

      expect(dmFiltered.visibleCards).toHaveLength(1);
      expect(playerFiltered.visibleCards).toHaveLength(1);
    });

    it('should show Player Knowledge cards in both view modes', () => {
      const cards: Card[] = [
        createTestCard({ id: 'card-1', informationLevelId: 'player-knowledge' }),
      ];

      const dmFiltered = viewModeService.filterCards(cards, 'dm');
      const playerFiltered = viewModeService.filterCards(cards, 'player');

      expect(dmFiltered.visibleCards).toHaveLength(1);
      expect(playerFiltered.visibleCards).toHaveLength(1);
    });
  });

  describe('isCardVisible - Single card visibility check', () => {
    it('should return true for all cards in DM view', () => {
      expect(viewModeService.isCardVisible('system', 'dm')).toBe(true);
      expect(viewModeService.isCardVisible('common-knowledge', 'dm')).toBe(true);
      expect(viewModeService.isCardVisible('player-knowledge', 'dm')).toBe(true);
      expect(viewModeService.isCardVisible('dm-secret', 'dm')).toBe(true);
    });

    it('should return false for DM Secret in Player view', () => {
      expect(viewModeService.isCardVisible('dm-secret', 'player')).toBe(false);
    });

    it('should return true for non-hierarchical levels in Player view', () => {
      expect(viewModeService.isCardVisible('system', 'player')).toBe(true);
      expect(viewModeService.isCardVisible('common-knowledge', 'player')).toBe(true);
      expect(viewModeService.isCardVisible('player-knowledge', 'player')).toBe(true);
    });
  });

  describe('getHierarchicalLevelIds - Cached lookup', () => {
    it('should return DM Secret level ID', () => {
      const hierarchicalIds = viewModeService.getHierarchicalLevelIds();

      expect(hierarchicalIds).toContain('dm-secret');
    });

    it('should use Set for O(1) lookup performance', () => {
      const hierarchicalIds = viewModeService.getHierarchicalLevelIds();

      expect(hierarchicalIds).toBeInstanceOf(Set);
    });
  });
});

// Helper function to create test cards
function createTestCard(overrides: Partial<Card>): Card {
  return {
    id: overrides.id || 'test-card',
    type: 'page',
    parentId: null,
    campaignId: 'test-filter-campaign',
    path: `/test-filter-campaign/${overrides.id || 'test-card'}`,
    position: 0,
    depth: 0,
    title: 'Test Card',
    content: null,
    metadata: null,
    coverImageUrl: null,
    iconEmoji: null,
    information_level_id: overrides.informationLevelId || 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Card;
}
