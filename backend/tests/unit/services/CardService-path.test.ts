/**
 * Unit tests for CardService - Materialized Path Calculation
 * Feature: 003-create-a-notion
 *
 * Tests path generation and recalculation for card hierarchy.
 * Path format: '/campaign-id/card-id/child-id/grandchild-id'
 *
 * These tests MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CardService } from '../../../src/services/CardService';
import { db } from '../../../src/services/DatabaseService';

describe('CardService - Materialized Path Calculation', () => {
  let cardService: CardService;

  beforeEach(() => {
    // CardService will be implemented in Phase 3.4
    cardService = new CardService();
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM cards WHERE campaign_id LIKE "test-%"').run();
  });

  describe('calculatePath - Root card creation', () => {
    it('should generate path for root card: /campaign-id/card-id', async () => {
      const campaignId = 'test-campaign-1';
      const cardId = 'root-card-1';

      const path = await cardService.calculatePath(cardId, null, campaignId);

      expect(path).toBe(`/${campaignId}/${cardId}`);
    });

    it('should generate unique paths for multiple root cards', async () => {
      const campaignId = 'test-campaign-2';
      const cardId1 = 'root-card-1';
      const cardId2 = 'root-card-2';

      const path1 = await cardService.calculatePath(cardId1, null, campaignId);
      const path2 = await cardService.calculatePath(cardId2, null, campaignId);

      expect(path1).toBe(`/${campaignId}/${cardId1}`);
      expect(path2).toBe(`/${campaignId}/${cardId2}`);
      expect(path1).not.toBe(path2);
    });
  });

  describe('calculatePath - Nested card creation', () => {
    it('should generate path for child card: /campaign-id/parent-id/child-id', async () => {
      const campaignId = 'test-campaign-3';
      const parentId = 'parent-card';
      const childId = 'child-card';

      // Create parent card first
      createTestCard({
        id: parentId,
        campaignId,
        parentId: null,
        path: `/${campaignId}/${parentId}`,
        depth: 0
      });

      const path = await cardService.calculatePath(childId, parentId, campaignId);

      expect(path).toBe(`/${campaignId}/${parentId}/${childId}`);
    });

    it('should generate path for grandchild card: /campaign-id/parent-id/child-id/grandchild-id', async () => {
      const campaignId = 'test-campaign-4';
      const parentId = 'parent-card';
      const childId = 'child-card';
      const grandchildId = 'grandchild-card';

      // Create parent and child cards
      createTestCard({ id: parentId, campaignId, parentId: null, path: `/${campaignId}/${parentId}`, depth: 0 });
      createTestCard({ id: childId, campaignId, parentId: parentId, path: `/${campaignId}/${parentId}/${childId}`, depth: 1 });

      const path = await cardService.calculatePath(grandchildId, childId, campaignId);

      expect(path).toBe(`/${campaignId}/${parentId}/${childId}/${grandchildId}`);
    });

    it('should handle deep nesting (10 levels)', async () => {
      const campaignId = 'test-campaign-5';
      let parentId = null;
      let parentPath = `/${campaignId}`;

      for (let i = 0; i < 9; i++) {
        const cardId = `card-${i}`;
        const path = `${parentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId, path, depth: i });
        parentId = cardId;
        parentPath = path;
      }

      const finalCardId = 'card-9';
      const path = await cardService.calculatePath(finalCardId, parentId, campaignId);

      expect(path).toMatch(new RegExp(`^/${campaignId}(/card-\\d+){9}/card-9$`));
      expect(path.split('/').length).toBe(12); // Empty + campaign + 10 cards
    });
  });

  describe('recalculatePath - Move operations', () => {
    it('should recalculate path when moving card to new parent', async () => {
      const campaignId = 'test-campaign-6';

      // Setup:
      //   Parent A
      //   Parent B
      //   Card C (under Parent A)
      createTestCard({ id: 'parent-a', campaignId, parentId: null, path: `/${campaignId}/parent-a`, depth: 0 });
      createTestCard({ id: 'parent-b', campaignId, parentId: null, path: `/${campaignId}/parent-b`, depth: 0 });
      createTestCard({ id: 'card-c', campaignId, parentId: 'parent-a', path: `/${campaignId}/parent-a/card-c`, depth: 1 });

      // Move Card C from Parent A to Parent B
      const newPath = await cardService.recalculatePath('card-c', 'parent-b', campaignId);

      expect(newPath).toBe(`/${campaignId}/parent-b/card-c`);
    });

    it('should recalculate path when moving card to root', async () => {
      const campaignId = 'test-campaign-7';

      // Setup: Parent → Child
      createTestCard({ id: 'parent', campaignId, parentId: null, path: `/${campaignId}/parent`, depth: 0 });
      createTestCard({ id: 'child', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child`, depth: 1 });

      // Move Child to root (parent = null)
      const newPath = await cardService.recalculatePath('child', null, campaignId);

      expect(newPath).toBe(`/${campaignId}/child`);
    });

    it('should recalculate paths for entire subtree when moving parent', async () => {
      const campaignId = 'test-campaign-8';

      // Setup:
      //   Root
      //   Parent A
      //   ├─ Child A1
      //   └─ Child A2
      createTestCard({ id: 'root', campaignId, parentId: null, path: `/${campaignId}/root`, depth: 0 });
      createTestCard({ id: 'parent-a', campaignId, parentId: null, path: `/${campaignId}/parent-a`, depth: 0 });
      createTestCard({ id: 'child-a1', campaignId, parentId: 'parent-a', path: `/${campaignId}/parent-a/child-a1`, depth: 1 });
      createTestCard({ id: 'child-a2', campaignId, parentId: 'parent-a', path: `/${campaignId}/parent-a/child-a2`, depth: 1 });

      // Move Parent A under Root (affects Parent A, Child A1, Child A2)
      await cardService.moveCard('parent-a', 'root', 0);

      const parentA = db.prepare('SELECT * FROM cards WHERE id = ?').get('parent-a');
      const childA1 = db.prepare('SELECT * FROM cards WHERE id = ?').get('child-a1');
      const childA2 = db.prepare('SELECT * FROM cards WHERE id = ?').get('child-a2');

      expect(parentA.path).toBe(`/${campaignId}/root/parent-a`);
      expect(childA1.path).toBe(`/${campaignId}/root/parent-a/child-a1`);
      expect(childA2.path).toBe(`/${campaignId}/root/parent-a/child-a2`);
    });

    it('should handle moving deep subtree (recalculate 5+ levels)', async () => {
      const campaignId = 'test-campaign-9';

      // Setup:
      //   New Parent (root)
      //   Old Parent (root)
      //   └─ Card 0
      //      └─ Card 1
      //         └─ Card 2
      //            └─ Card 3
      //               └─ Card 4
      createTestCard({ id: 'new-parent', campaignId, parentId: null, path: `/${campaignId}/new-parent`, depth: 0 });

      let parentId = null;
      let parentPath = `/${campaignId}`;
      for (let i = 0; i < 5; i++) {
        const cardId = `card-${i}`;
        const path = `${parentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId, path, depth: parentId ? i : 0 });
        parentId = cardId;
        parentPath = path;
      }

      // Move Card 0 (with 4 descendants) under New Parent
      await cardService.moveCard('card-0', 'new-parent', 0);

      const card0 = db.prepare('SELECT * FROM cards WHERE id = ?').get('card-0');
      const card4 = db.prepare('SELECT * FROM cards WHERE id = ?').get('card-4');

      expect(card0.path).toBe(`/${campaignId}/new-parent/card-0`);
      expect(card4.path).toMatch(/^\/test-campaign-9\/new-parent\/card-0\/card-1\/card-2\/card-3\/card-4$/);
    });
  });

  describe('Path validation', () => {
    it('should ensure path starts with /', () => {
      const campaignId = 'test-campaign-10';
      const cardId = 'test-card';

      const path = cardService.calculatePath(cardId, null, campaignId);

      expect(path).toMatch(/^\//);
    });

    it('should ensure path includes campaign ID', () => {
      const campaignId = 'test-campaign-11';
      const cardId = 'test-card';

      const path = cardService.calculatePath(cardId, null, campaignId);

      expect(path).toContain(campaignId);
    });

    it('should ensure path ends with card ID', () => {
      const campaignId = 'test-campaign-12';
      const cardId = 'test-card';

      const path = cardService.calculatePath(cardId, null, campaignId);

      expect(path).toMatch(/test-card$/);
    });

    it('should not have trailing slash', () => {
      const campaignId = 'test-campaign-13';
      const cardId = 'test-card';

      const path = cardService.calculatePath(cardId, null, campaignId);

      expect(path).not.toMatch(/\/$/);
    });
  });

  describe('Depth calculation from path', () => {
    it('should calculate depth 0 for root card (1 level: campaign)', () => {
      const path = '/campaign-id/card-id';
      const depth = cardService.calculateDepthFromPath(path);

      expect(depth).toBe(0);
    });

    it('should calculate depth 1 for child card (2 levels: campaign + parent)', () => {
      const path = '/campaign-id/parent-id/child-id';
      const depth = cardService.calculateDepthFromPath(path);

      expect(depth).toBe(1);
    });

    it('should calculate depth 2 for grandchild card', () => {
      const path = '/campaign-id/parent-id/child-id/grandchild-id';
      const depth = cardService.calculateDepthFromPath(path);

      expect(depth).toBe(2);
    });

    it('should calculate depth 10 for deeply nested card', () => {
      const pathParts = ['campaign-id', ...Array.from({ length: 11 }, (_, i) => `card-${i}`)];
      const path = '/' + pathParts.join('/');
      const depth = cardService.calculateDepthFromPath(path);

      expect(depth).toBe(10);
    });
  });

  describe('Path-based queries', () => {
    it('should enable efficient subtree queries with LIKE pattern', () => {
      const campaignId = 'test-campaign-14';

      // Setup tree:
      //   Parent
      //   ├─ Child 1
      //   └─ Child 2
      //      └─ Grandchild
      createTestCard({ id: 'parent', campaignId, parentId: null, path: `/${campaignId}/parent`, depth: 0 });
      createTestCard({ id: 'child-1', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-1`, depth: 1 });
      createTestCard({ id: 'child-2', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-2`, depth: 1 });
      createTestCard({ id: 'grandchild', campaignId, parentId: 'child-2', path: `/${campaignId}/parent/child-2/grandchild`, depth: 2 });

      // Query all descendants of 'parent' using path LIKE pattern
      const descendants = db.prepare(`
        SELECT * FROM cards WHERE path LIKE ? AND id != ?
      `).all(`/${campaignId}/parent/%`, 'parent');

      expect(descendants).toHaveLength(3);
      expect(descendants.map(c => c.id)).toContain('child-1');
      expect(descendants.map(c => c.id)).toContain('child-2');
      expect(descendants.map(c => c.id)).toContain('grandchild');
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
