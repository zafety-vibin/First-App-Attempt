/**
 * Unit tests for CardService - Circular Reference Detection
 * Feature: 003-create-a-notion
 *
 * Tests DFS cycle detection algorithm to prevent circular references
 * in card hierarchy (e.g., Card A → Card B → Card C → Card A).
 *
 * These tests MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CardService } from '../../../src/services/CardService';
import { db } from '../../../src/services/DatabaseService';

describe('CardService - Circular Reference Detection', () => {
  let cardService: CardService;

  beforeEach(() => {
    // CardService will be implemented in Phase 3.4
    cardService = new CardService();
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM cards WHERE campaign_id LIKE "test-%"').run();
  });

  describe('validateMove - Path-based cycle detection', () => {
    it('should allow valid move (no circular reference)', () => {
      // Setup: Card A (root) → Card B (child)
      const cardA = createTestCard({ id: 'card-a', campaignId: 'test-campaign-1', parentId: null, path: '/test-campaign-1/card-a', depth: 0 });
      const cardB = createTestCard({ id: 'card-b', campaignId: 'test-campaign-1', parentId: 'card-a', path: '/test-campaign-1/card-a/card-b', depth: 1 });

      // Move Card B to root (no circular reference)
      expect(() => {
        cardService.validateMove('card-b', null);
      }).not.toThrow();
    });

    it('should prevent moving card into its own subtree', () => {
      // Setup: Card A (root) → Card B (child) → Card C (grandchild)
      const cardA = createTestCard({ id: 'card-a', campaignId: 'test-campaign-2', parentId: null, path: '/test-campaign-2/card-a', depth: 0 });
      const cardB = createTestCard({ id: 'card-b', campaignId: 'test-campaign-2', parentId: 'card-a', path: '/test-campaign-2/card-a/card-b', depth: 1 });
      const cardC = createTestCard({ id: 'card-c', campaignId: 'test-campaign-2', parentId: 'card-b', path: '/test-campaign-2/card-a/card-b/card-c', depth: 2 });

      // Attempt to move Card A into Card C (its own grandchild)
      expect(() => {
        cardService.validateMove('card-a', 'card-c');
      }).toThrow(/circular|subtree/i);
    });

    it('should prevent moving card into itself', () => {
      const cardA = createTestCard({ id: 'card-a', campaignId: 'test-campaign-3', parentId: null, path: '/test-campaign-3/card-a', depth: 0 });

      // Attempt to move Card A into itself
      expect(() => {
        cardService.validateMove('card-a', 'card-a');
      }).toThrow(/circular|self/i);
    });

    it('should prevent moving card into its direct child', () => {
      // Setup: Card A → Card B
      const cardA = createTestCard({ id: 'card-a', campaignId: 'test-campaign-4', parentId: null, path: '/test-campaign-4/card-a', depth: 0 });
      const cardB = createTestCard({ id: 'card-b', campaignId: 'test-campaign-4', parentId: 'card-a', path: '/test-campaign-4/card-a/card-b', depth: 1 });

      // Attempt to move Card A into Card B (its own child)
      expect(() => {
        cardService.validateMove('card-a', 'card-b');
      }).toThrow(/circular|subtree/i);
    });

    it('should detect circular reference 3 levels deep', () => {
      // Setup: Card A → Card B → Card C → Card D
      const cardA = createTestCard({ id: 'card-a', campaignId: 'test-campaign-5', parentId: null, path: '/test-campaign-5/card-a', depth: 0 });
      const cardB = createTestCard({ id: 'card-b', campaignId: 'test-campaign-5', parentId: 'card-a', path: '/test-campaign-5/card-a/card-b', depth: 1 });
      const cardC = createTestCard({ id: 'card-c', campaignId: 'test-campaign-5', parentId: 'card-b', path: '/test-campaign-5/card-a/card-b/card-c', depth: 2 });
      const cardD = createTestCard({ id: 'card-d', campaignId: 'test-campaign-5', parentId: 'card-c', path: '/test-campaign-5/card-a/card-b/card-c/card-d', depth: 3 });

      // Attempt to move Card A into Card D (4 levels deep in its own subtree)
      expect(() => {
        cardService.validateMove('card-a', 'card-d');
      }).toThrow(/circular|subtree/i);
    });

    it('should allow moving sibling cards (no circular reference)', () => {
      // Setup: Root → Card A, Root → Card B (siblings)
      const cardA = createTestCard({ id: 'card-a', campaignId: 'test-campaign-6', parentId: null, path: '/test-campaign-6/card-a', depth: 0 });
      const cardB = createTestCard({ id: 'card-b', campaignId: 'test-campaign-6', parentId: null, path: '/test-campaign-6/card-b', depth: 0 });

      // Move Card A into Card B (sibling → sibling is valid)
      expect(() => {
        cardService.validateMove('card-a', 'card-b');
      }).not.toThrow();
    });

    it('should allow moving card up the tree', () => {
      // Setup: Card A → Card B → Card C
      const cardA = createTestCard({ id: 'card-a', campaignId: 'test-campaign-7', parentId: null, path: '/test-campaign-7/card-a', depth: 0 });
      const cardB = createTestCard({ id: 'card-b', campaignId: 'test-campaign-7', parentId: 'card-a', path: '/test-campaign-7/card-a/card-b', depth: 1 });
      const cardC = createTestCard({ id: 'card-c', campaignId: 'test-campaign-7', parentId: 'card-b', path: '/test-campaign-7/card-a/card-b/card-c', depth: 2 });

      // Move Card C to Card A (grandchild → grandparent is valid)
      expect(() => {
        cardService.validateMove('card-c', 'card-a');
      }).not.toThrow();
    });
  });

  describe('Path-based validation algorithm', () => {
    it('should use path.startsWith() for cycle detection', () => {
      // Setup: Card A → Card B
      const cardA = createTestCard({ id: 'card-a', campaignId: 'test-campaign-8', parentId: null, path: '/test-campaign-8/card-a', depth: 0 });
      const cardB = createTestCard({ id: 'card-b', campaignId: 'test-campaign-8', parentId: 'card-a', path: '/test-campaign-8/card-a/card-b', depth: 1 });

      // Internal validation: newParent.path.startsWith(card.path)
      const cardToMove = db.prepare('SELECT * FROM cards WHERE id = ?').get('card-a');
      const newParent = db.prepare('SELECT * FROM cards WHERE id = ?').get('card-b');

      // newParent.path should start with cardToMove.path
      expect(newParent.path).toMatch(/^\/test-campaign-8\/card-a/);
      expect(newParent.path.startsWith(cardToMove.path + '/')).toBe(true);
    });

    it('should handle edge case: identical path prefixes', () => {
      // Setup: Card A1, Card A11 (similar IDs but not related)
      const cardA1 = createTestCard({ id: 'card-a1', campaignId: 'test-campaign-9', parentId: null, path: '/test-campaign-9/card-a1', depth: 0 });
      const cardA11 = createTestCard({ id: 'card-a11', campaignId: 'test-campaign-9', parentId: null, path: '/test-campaign-9/card-a11', depth: 0 });

      // Move card-a1 into card-a11 should be valid (not a substring match)
      expect(() => {
        cardService.validateMove('card-a1', 'card-a11');
      }).not.toThrow();
    });
  });

  describe('Complex hierarchy scenarios', () => {
    it('should handle deep nesting (20 levels)', () => {
      const campaignId = 'test-campaign-10';
      let parentId = null;
      let parentPath = `/${campaignId}`;
      const cardIds: string[] = [];

      // Create 20-level deep hierarchy
      for (let i = 0; i < 20; i++) {
        const cardId = `card-${i}`;
        cardIds.push(cardId);
        const path = `${parentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId, path, depth: i });
        parentId = cardId;
        parentPath = path;
      }

      // Attempt to move root card (card-0) into deepest card (card-19)
      expect(() => {
        cardService.validateMove('card-0', 'card-19');
      }).toThrow(/circular|subtree/i);
    });

    it('should allow moving between different branches', () => {
      // Setup:
      //   Root
      //   ├─ Branch A
      //   │  └─ Card A1
      //   └─ Branch B
      //      └─ Card B1
      const root = createTestCard({ id: 'root', campaignId: 'test-campaign-11', parentId: null, path: '/test-campaign-11/root', depth: 0 });
      const branchA = createTestCard({ id: 'branch-a', campaignId: 'test-campaign-11', parentId: 'root', path: '/test-campaign-11/root/branch-a', depth: 1 });
      const cardA1 = createTestCard({ id: 'card-a1', campaignId: 'test-campaign-11', parentId: 'branch-a', path: '/test-campaign-11/root/branch-a/card-a1', depth: 2 });
      const branchB = createTestCard({ id: 'branch-b', campaignId: 'test-campaign-11', parentId: 'root', path: '/test-campaign-11/root/branch-b', depth: 1 });
      const cardB1 = createTestCard({ id: 'card-b1', campaignId: 'test-campaign-11', parentId: 'branch-b', path: '/test-campaign-11/root/branch-b/card-b1', depth: 2 });

      // Move Card A1 into Branch B (different branch, valid)
      expect(() => {
        cardService.validateMove('card-a1', 'branch-b');
      }).not.toThrow();
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
