/**
 * Unit tests for CardService - Depth Validation
 * Feature: 003-create-a-notion
 *
 * Tests enforcement of 50-level nesting limit for card hierarchy.
 *
 * These tests MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CardService } from '../../../src/services/CardService';
import { db } from '../../../src/services/DatabaseService';

describe('CardService - Depth Validation', () => {
  let cardService: CardService;

  beforeEach(() => {
    // CardService will be implemented in Phase 3.4
    cardService = new CardService();
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM cards WHERE campaign_id LIKE "test-%"').run();
  });

  describe('validateDepth - Creation', () => {
    it('should allow creating card at depth 0 (root)', () => {
      const campaignId = 'test-campaign-1';

      expect(() => {
        cardService.validateDepth(null, campaignId);
      }).not.toThrow();
    });

    it('should allow creating card at depth 1', () => {
      const campaignId = 'test-campaign-2';
      const parentId = 'parent-at-depth-0';

      createTestCard({ id: parentId, campaignId, parentId: null, path: `/${campaignId}/${parentId}`, depth: 0 });

      expect(() => {
        cardService.validateDepth(parentId, campaignId);
      }).not.toThrow();
    });

    it('should allow creating card at depth 49 (one below limit)', () => {
      const campaignId = 'test-campaign-3';
      const parentId = 'parent-at-depth-48';

      // Create parent at depth 48
      let currentParentId = null;
      let currentPath = `/${campaignId}`;
      for (let i = 0; i < 49; i++) {
        const cardId = i === 48 ? parentId : `card-${i}`;
        const path = `${currentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId: currentParentId, path, depth: i });
        currentParentId = cardId;
        currentPath = path;
      }

      expect(() => {
        cardService.validateDepth(parentId, campaignId);
      }).not.toThrow();
    });

    it('should reject creating card at depth 50 (at limit)', () => {
      const campaignId = 'test-campaign-4';
      const parentId = 'parent-at-depth-49';

      // Create parent at depth 49
      let currentParentId = null;
      let currentPath = `/${campaignId}`;
      for (let i = 0; i < 50; i++) {
        const cardId = i === 49 ? parentId : `card-${i}`;
        const path = `${currentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId: currentParentId, path, depth: i });
        currentParentId = cardId;
        currentPath = path;
      }

      expect(() => {
        cardService.validateDepth(parentId, campaignId);
      }).toThrow(/depth.*50/i);
    });

    it('should reject creating card beyond depth 50', () => {
      const campaignId = 'test-campaign-5';
      const parentId = 'parent-at-depth-50';

      // Create parent at depth 50 (already beyond limit)
      let currentParentId = null;
      let currentPath = `/${campaignId}`;
      for (let i = 0; i < 51; i++) {
        const cardId = i === 50 ? parentId : `card-${i}`;
        const path = `${currentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId: currentParentId, path, depth: i });
        currentParentId = cardId;
        currentPath = path;
      }

      expect(() => {
        cardService.validateDepth(parentId, campaignId);
      }).toThrow(/depth.*50/i);
    });
  });

  describe('validateDepth - Move operations', () => {
    it('should allow moving card that stays within depth limit', () => {
      const campaignId = 'test-campaign-6';

      // Setup: Card at depth 5, move to parent at depth 10 (result: depth 11)
      createTestCard({ id: 'card-to-move', campaignId, parentId: null, path: `/${campaignId}/card-to-move`, depth: 5 });
      createTestCard({ id: 'new-parent', campaignId, parentId: null, path: `/${campaignId}/new-parent`, depth: 10 });

      expect(() => {
        cardService.validateDepthAfterMove('card-to-move', 'new-parent', campaignId);
      }).not.toThrow();
    });

    it('should reject moving card that would exceed depth limit', () => {
      const campaignId = 'test-campaign-7';

      // Setup: Card with 10 children, move to parent at depth 45
      // Result: Card at depth 46, deepest child at depth 56 (exceeds limit)

      // Create card-to-move at depth 0 with 10-level subtree
      let parentId = 'card-to-move';
      let parentPath = `/${campaignId}/${parentId}`;
      createTestCard({ id: parentId, campaignId, parentId: null, path: parentPath, depth: 0 });

      for (let i = 1; i <= 10; i++) {
        const cardId = `child-${i}`;
        const path = `${parentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId, path, depth: i });
        parentId = cardId;
        parentPath = path;
      }

      // Create new parent at depth 45
      parentId = null;
      parentPath = `/${campaignId}`;
      for (let i = 0; i < 46; i++) {
        const cardId = i === 45 ? 'new-parent' : `parent-${i}`;
        const path = `${parentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId, path, depth: i });
        parentId = cardId;
        parentPath = path;
      }

      // Move card-to-move under new-parent (would put deepest child at depth 56)
      expect(() => {
        cardService.validateDepthAfterMove('card-to-move', 'new-parent', campaignId);
      }).toThrow(/depth.*50/i);
    });

    it('should calculate correct depth for moved subtree', () => {
      const campaignId = 'test-campaign-8';

      // Setup:
      //   Card A (depth 0) with child B (depth 1)
      //   Move Card A under Parent C (depth 5)
      //   Result: Card A at depth 6, Card B at depth 7

      createTestCard({ id: 'card-a', campaignId, parentId: null, path: `/${campaignId}/card-a`, depth: 0 });
      createTestCard({ id: 'card-b', campaignId, parentId: 'card-a', path: `/${campaignId}/card-a/card-b`, depth: 1 });

      let parentId = null;
      let parentPath = `/${campaignId}`;
      for (let i = 0; i < 6; i++) {
        const cardId = i === 5 ? 'parent-c' : `parent-${i}`;
        const path = `${parentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId, path, depth: i });
        parentId = cardId;
        parentPath = path;
      }

      // Move Card A under Parent C
      cardService.moveCard('card-a', 'parent-c', 0);

      const cardA = db.prepare('SELECT * FROM cards WHERE id = ?').get('card-a');
      const cardB = db.prepare('SELECT * FROM cards WHERE id = ?').get('card-b');

      expect(cardA.depth).toBe(6);
      expect(cardB.depth).toBe(7);
    });
  });

  describe('Depth calculation edge cases', () => {
    it('should handle moving to root (reduces depth)', () => {
      const campaignId = 'test-campaign-9';

      // Setup: Card at depth 10, move to root
      let parentId = null;
      let parentPath = `/${campaignId}`;
      for (let i = 0; i < 11; i++) {
        const cardId = i === 10 ? 'deep-card' : `card-${i}`;
        const path = `${parentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId, path, depth: i });
        parentId = cardId;
        parentPath = path;
      }

      // Move deep-card to root
      expect(() => {
        cardService.validateDepthAfterMove('deep-card', null, campaignId);
      }).not.toThrow();

      cardService.moveCard('deep-card', null, 0);

      const deepCard = db.prepare('SELECT * FROM cards WHERE id = ?').get('deep-card');
      expect(deepCard.depth).toBe(0);
    });

    it('should enforce limit when moving card up the tree still results in >50 depth', () => {
      const campaignId = 'test-campaign-10';

      // Setup: Card at depth 60 with no children, move to parent at depth 55
      // Result: Still exceeds limit (depth would be 56)

      // This scenario shouldn't exist in practice (can't create depth >50)
      // But tests the validation logic
      const deepCard = {
        id: 'deep-card',
        campaignId,
        parentId: 'very-deep-parent',
        path: `/${campaignId}/${'a/'.repeat(60)}deep-card`,
        depth: 60
      };
      db.prepare(`
        INSERT INTO cards (id, type, campaign_id, parent_id, path, position, depth, title, created_at, updated_at)
        VALUES (?, 'page', ?, ?, ?, 0, ?, 'Test Card', strftime('%s', 'now'), strftime('%s', 'now'))
      `).run(deepCard.id, deepCard.campaignId, deepCard.parentId, deepCard.path, deepCard.depth);

      createTestCard({ id: 'target-parent', campaignId, parentId: null, path: `/${campaignId}/target-parent`, depth: 55 });

      expect(() => {
        cardService.validateDepthAfterMove('deep-card', 'target-parent', campaignId);
      }).toThrow(/depth.*50/i);
    });
  });

  describe('Depth metadata consistency', () => {
    it('should keep depth in sync with path segments', () => {
      const campaignId = 'test-campaign-11';

      // Create 5-level hierarchy
      let parentId = null;
      let parentPath = `/${campaignId}`;
      const cards: string[] = [];

      for (let i = 0; i < 5; i++) {
        const cardId = `card-${i}`;
        cards.push(cardId);
        const path = `${parentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId, path, depth: i });

        // Verify depth matches path segment count
        const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
        const pathSegments = card.path.split('/').filter(s => s && s !== campaignId);
        expect(card.depth).toBe(pathSegments.length - 1);

        parentId = cardId;
        parentPath = path;
      }
    });
  });
});

/**
 * Helper function to create test cards
 */
function createTestCard(data: { id: string; campaignId: string; parentId: string | null; path: string; depth: number }) {
  db.prepare(`
    INSERT INTO cards (id, type, campaign_id, parent_id, path, position, depth, title, created_at, updated_at)
    VALUES (?, 'page', ?, ?, ?, 0, ?, 'Test Card', strftime('%s', 'now'), strftime('%s', 'now'))
  `).run(data.id, data.campaignId, data.parentId, data.path, data.depth);

  return db.prepare('SELECT * FROM cards WHERE id = ?').get(data.id);
}
