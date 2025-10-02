/**
 * Unit tests for ViewModeService - Custom Level Filtering
 * Feature: 004-create-a-tagging
 *
 * Tests custom hierarchical information level filtering in Player View.
 * Custom levels with hierarchical=true should behave like DM Secret.
 *
 * These tests MUST fail before implementation (TDD).
 * Task: T013
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ViewModeService } from '../../../src/services/ViewModeService';
import { db } from '../../../src/services/DatabaseService';
import { Card } from '../../../../shared/types/Card';

describe('ViewModeService - Custom Level Filtering (T013)', () => {
  let viewModeService: ViewModeService;
  const testCampaignId = 'test-custom-campaign';
  let customHierarchicalLevelId: string;
  let customNonHierarchicalLevelId: string;

  beforeEach(() => {
    // ViewModeService will be implemented in Phase 3.4
    viewModeService = new ViewModeService();

    // Create test custom information levels
    customHierarchicalLevelId = 'custom-level-1';
    db.prepare(`
      INSERT INTO information_levels (id, name, color, hierarchical, type, campaign_id, created_at, updated_at)
      VALUES (?, 'Major Spoilers', '#FF5733', 1, 'custom', ?, strftime('%s', 'now'), strftime('%s', 'now'))
    `).run(customHierarchicalLevelId, testCampaignId);

    customNonHierarchicalLevelId = 'custom-level-2';
    db.prepare(`
      INSERT INTO information_levels (id, name, color, hierarchical, type, campaign_id, created_at, updated_at)
      VALUES (?, 'Public Info', '#00FF00', 0, 'custom', ?, strftime('%s', 'now'), strftime('%s', 'now'))
    `).run(customNonHierarchicalLevelId, testCampaignId);
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM cards WHERE campaign_id = ?').run(testCampaignId);
    db.prepare('DELETE FROM information_levels WHERE campaign_id = ?').run(testCampaignId);
  });

  describe('filterCards - Custom hierarchical level filtering', () => {
    it('should hide cards with custom hierarchical level in Player view', () => {
      const cards: Card[] = [
        createTestCard({ id: 'card-1', informationLevelId: 'system' }),
        createTestCard({ id: 'card-2', informationLevelId: customHierarchicalLevelId }),
        createTestCard({ id: 'card-3', informationLevelId: customHierarchicalLevelId }),
      ];

      const filtered = viewModeService.filterCards(cards, 'player');

      expect(filtered.visibleCards).toHaveLength(1);
      expect(filtered.filteredCount).toBe(2);

      // Verify no custom hierarchical cards in visible list
      const hasCustomHierarchical = filtered.visibleCards.some(
        c => c.information_level_id === customHierarchicalLevelId
      );
      expect(hasCustomHierarchical).toBe(false);
    });

    it('should show cards with custom non-hierarchical level in Player view', () => {
      const cards: Card[] = [
        createTestCard({ id: 'card-1', informationLevelId: 'system' }),
        createTestCard({ id: 'card-2', informationLevelId: customNonHierarchicalLevelId }),
      ];

      const filtered = viewModeService.filterCards(cards, 'player');

      expect(filtered.visibleCards).toHaveLength(2);
      expect(filtered.filteredCount).toBe(0);
    });

    it('should show all cards with custom levels in DM view', () => {
      const cards: Card[] = [
        createTestCard({ id: 'card-1', informationLevelId: customHierarchicalLevelId }),
        createTestCard({ id: 'card-2', informationLevelId: customNonHierarchicalLevelId }),
      ];

      const filtered = viewModeService.filterCards(cards, 'dm');

      expect(filtered.visibleCards).toHaveLength(2);
      expect(filtered.filteredCount).toBe(0);
    });
  });

  describe('isCardVisible - Custom level visibility check', () => {
    it('should return false for custom hierarchical level in Player view', () => {
      expect(viewModeService.isCardVisible(customHierarchicalLevelId, 'player')).toBe(false);
    });

    it('should return true for custom non-hierarchical level in Player view', () => {
      expect(viewModeService.isCardVisible(customNonHierarchicalLevelId, 'player')).toBe(true);
    });

    it('should return true for all custom levels in DM view', () => {
      expect(viewModeService.isCardVisible(customHierarchicalLevelId, 'dm')).toBe(true);
      expect(viewModeService.isCardVisible(customNonHierarchicalLevelId, 'dm')).toBe(true);
    });
  });

  describe('getHierarchicalLevelIds - Custom level inclusion', () => {
    it('should include custom hierarchical levels', () => {
      const hierarchicalIds = viewModeService.getHierarchicalLevelIds();

      expect(hierarchicalIds).toContain('dm-secret');
      expect(hierarchicalIds).toContain(customHierarchicalLevelId);
    });

    it('should not include custom non-hierarchical levels', () => {
      const hierarchicalIds = viewModeService.getHierarchicalLevelIds();

      expect(hierarchicalIds).not.toContain(customNonHierarchicalLevelId);
    });
  });

  describe('Hierarchical level change scenarios', () => {
    it('should update filtering when custom level hierarchical flag changes', () => {
      const cards: Card[] = [
        createTestCard({ id: 'card-1', informationLevelId: customNonHierarchicalLevelId }),
      ];

      // Initially non-hierarchical, visible in Player view
      let filtered = viewModeService.filterCards(cards, 'player');
      expect(filtered.visibleCards).toHaveLength(1);

      // Change custom level to hierarchical
      db.prepare(`
        UPDATE information_levels SET hierarchical = 1, updated_at = strftime('%s', 'now')
        WHERE id = ?
      `).run(customNonHierarchicalLevelId);

      // Refresh cache (ViewModeService should reload hierarchical IDs)
      viewModeService.refreshHierarchicalCache();

      // Now hidden in Player view
      filtered = viewModeService.filterCards(cards, 'player');
      expect(filtered.visibleCards).toHaveLength(0);
      expect(filtered.filteredCount).toBe(1);
    });
  });
});

// Helper function to create test cards
function createTestCard(overrides: Partial<Card>): Card {
  return {
    id: overrides.id || 'test-card',
    type: 'page',
    parentId: null,
    campaignId: 'test-custom-campaign',
    path: `/test-custom-campaign/${overrides.id || 'test-card'}`,
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
