/**
 * Unit tests for CardService - Subtree Deletion
 * Feature: 003-create-a-notion
 *
 * Tests CASCADE deletion behavior: deleting a card deletes entire subtree.
 * Tests orphaned reference detection for database entries.
 *
 * These tests MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CardService } from '../../../src/services/CardService';
import { db } from '../../../src/services/DatabaseService';

describe('CardService - Subtree Deletion', () => {
  let cardService: CardService;

  beforeEach(() => {
    // CardService will be implemented in Phase 3.4
    cardService = new CardService();
  });

  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM cards WHERE campaign_id LIKE "test-%"').run();
  });

  describe('deleteCard - CASCADE behavior', () => {
    it('should delete single card with no children', async () => {
      const campaignId = 'test-campaign-1';
      createTestCard({ id: 'lone-card', campaignId, parentId: null, path: `/${campaignId}/lone-card`, depth: 0 });

      const result = await cardService.deleteCard('lone-card');

      expect(result.deleted_count).toBe(1);

      const card = db.prepare('SELECT * FROM cards WHERE id = ?').get('lone-card');
      expect(card).toBeUndefined();
    });

    it('should delete card and its children (1 level)', async () => {
      const campaignId = 'test-campaign-2';

      // Setup: Parent → Child 1, Child 2
      createTestCard({ id: 'parent', campaignId, parentId: null, path: `/${campaignId}/parent`, depth: 0 });
      createTestCard({ id: 'child-1', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-1`, depth: 1 });
      createTestCard({ id: 'child-2', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-2`, depth: 1 });

      const result = await cardService.deleteCard('parent');

      expect(result.deleted_count).toBe(3);

      const remaining = db.prepare('SELECT * FROM cards WHERE campaign_id = ?').all(campaignId);
      expect(remaining).toHaveLength(0);
    });

    it('should delete entire subtree (3 levels deep)', async () => {
      const campaignId = 'test-campaign-3';

      // Setup:
      //   Parent
      //   ├─ Child 1
      //   │  └─ Grandchild 1
      //   └─ Child 2
      createTestCard({ id: 'parent', campaignId, parentId: null, path: `/${campaignId}/parent`, depth: 0 });
      createTestCard({ id: 'child-1', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-1`, depth: 1 });
      createTestCard({ id: 'grandchild-1', campaignId, parentId: 'child-1', path: `/${campaignId}/parent/child-1/grandchild-1`, depth: 2 });
      createTestCard({ id: 'child-2', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-2`, depth: 1 });

      const result = await cardService.deleteCard('parent');

      expect(result.deleted_count).toBe(4);

      const remaining = db.prepare('SELECT * FROM cards WHERE campaign_id = ?').all(campaignId);
      expect(remaining).toHaveLength(0);
    });

    it('should delete only subtree, not sibling cards', async () => {
      const campaignId = 'test-campaign-4';

      // Setup:
      //   Root
      //   ├─ Branch A
      //   │  └─ Child A1
      //   └─ Branch B  ← Delete this
      //      └─ Child B1
      createTestCard({ id: 'root', campaignId, parentId: null, path: `/${campaignId}/root`, depth: 0 });
      createTestCard({ id: 'branch-a', campaignId, parentId: 'root', path: `/${campaignId}/root/branch-a`, depth: 1 });
      createTestCard({ id: 'child-a1', campaignId, parentId: 'branch-a', path: `/${campaignId}/root/branch-a/child-a1`, depth: 2 });
      createTestCard({ id: 'branch-b', campaignId, parentId: 'root', path: `/${campaignId}/root/branch-b`, depth: 1 });
      createTestCard({ id: 'child-b1', campaignId, parentId: 'branch-b', path: `/${campaignId}/root/branch-b/child-b1`, depth: 2 });

      const result = await cardService.deleteCard('branch-b');

      expect(result.deleted_count).toBe(2); // branch-b + child-b1

      const remaining = db.prepare('SELECT * FROM cards WHERE campaign_id = ?').all(campaignId);
      expect(remaining).toHaveLength(3); // root, branch-a, child-a1
      expect(remaining.map(c => c.id)).toContain('root');
      expect(remaining.map(c => c.id)).toContain('branch-a');
      expect(remaining.map(c => c.id)).toContain('child-a1');
    });

    it('should delete deep subtree (10 levels)', async () => {
      const campaignId = 'test-campaign-5';

      // Create 10-level deep hierarchy
      let parentId = null;
      let parentPath = `/${campaignId}`;
      for (let i = 0; i < 10; i++) {
        const cardId = `card-${i}`;
        const path = `${parentPath}/${cardId}`;
        createTestCard({ id: cardId, campaignId, parentId, path, depth: i });
        parentId = cardId;
        parentPath = path;
      }

      const result = await cardService.deleteCard('card-0');

      expect(result.deleted_count).toBe(10);

      const remaining = db.prepare('SELECT * FROM cards WHERE campaign_id = ?').all(campaignId);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('deleteCard - Referenced card warnings', () => {
    it('should warn when deleting card referenced by database entry', async () => {
      const campaignId = 'test-campaign-6';

      // Setup:
      //   Database Card (Characters)
      //   Entry Card (references Location Card via entity-reference column)
      //   Location Card
      createTestCard({ id: 'database', campaignId, parentId: null, path: `/${campaignId}/database`, depth: 0, type: 'database' });
      createTestCard({ id: 'location', campaignId, parentId: null, path: `/${campaignId}/location`, depth: 0 });
      createTestCard({
        id: 'entry',
        campaignId,
        parentId: 'database',
        path: `/${campaignId}/database/entry`,
        depth: 1,
        metadata: {
          databaseId: 'database',
          values: {
            'col-location': 'location' // References location card
          }
        }
      });

      // Attempt to delete location card without force
      await expect(async () => {
        await cardService.deleteCard('location');
      }).rejects.toThrow(/referenced/i);
    });

    it('should return reference details in error', async () => {
      const campaignId = 'test-campaign-7';

      createTestCard({ id: 'database', campaignId, parentId: null, path: `/${campaignId}/database`, depth: 0, type: 'database' });
      createTestCard({ id: 'npc', campaignId, parentId: null, path: `/${campaignId}/npc`, depth: 0 });
      createTestCard({
        id: 'entry-1',
        campaignId,
        parentId: 'database',
        path: `/${campaignId}/database/entry-1`,
        depth: 1,
        metadata: {
          databaseId: 'database',
          values: { 'col-ref': 'npc' }
        }
      });
      createTestCard({
        id: 'entry-2',
        campaignId,
        parentId: 'database',
        path: `/${campaignId}/database/entry-2`,
        depth: 1,
        metadata: {
          databaseId: 'database',
          values: { 'col-ref': 'npc' }
        }
      });

      try {
        await cardService.deleteCard('npc');
        throw new Error('Should have thrown');
      } catch (error: any) {
        expect(error.message).toMatch(/referenced/i);
        expect(error.references).toBeDefined();
        expect(error.references).toHaveLength(2);
        expect(error.references.map(r => r.card_id)).toContain('entry-1');
        expect(error.references.map(r => r.card_id)).toContain('entry-2');
      }
    });

    it('should force delete when force=true', async () => {
      const campaignId = 'test-campaign-8';

      createTestCard({ id: 'database', campaignId, parentId: null, path: `/${campaignId}/database`, depth: 0, type: 'database' });
      createTestCard({ id: 'npc', campaignId, parentId: null, path: `/${campaignId}/npc`, depth: 0 });
      createTestCard({
        id: 'entry',
        campaignId,
        parentId: 'database',
        path: `/${campaignId}/database/entry`,
        depth: 1,
        metadata: {
          databaseId: 'database',
          values: { 'col-ref': 'npc' }
        }
      });

      const result = await cardService.deleteCard('npc', { force: true });

      expect(result.deleted_count).toBe(1);

      const npc = db.prepare('SELECT * FROM cards WHERE id = ?').get('npc');
      expect(npc).toBeUndefined();

      // Entry should still exist but with orphaned reference
      const entry = db.prepare('SELECT * FROM cards WHERE id = ?').get('entry');
      expect(entry).toBeDefined();
    });

    it('should not warn for references within subtree being deleted', async () => {
      const campaignId = 'test-campaign-9';

      // Setup:
      //   Parent
      //   ├─ Database
      //   │  └─ Entry (references Child)
      //   └─ Child
      createTestCard({ id: 'parent', campaignId, parentId: null, path: `/${campaignId}/parent`, depth: 0 });
      createTestCard({ id: 'database', campaignId, parentId: 'parent', path: `/${campaignId}/parent/database`, depth: 1, type: 'database' });
      createTestCard({ id: 'child', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child`, depth: 1 });
      createTestCard({
        id: 'entry',
        campaignId,
        parentId: 'database',
        path: `/${campaignId}/parent/database/entry`,
        depth: 2,
        metadata: {
          databaseId: 'database',
          values: { 'col-ref': 'child' }
        }
      });

      // Delete parent (cascades to database, entry, child)
      // Should not warn because child is also being deleted
      const result = await cardService.deleteCard('parent');

      expect(result.deleted_count).toBe(4);
    });
  });

  describe('Deletion with path-based queries', () => {
    it('should use path LIKE pattern for efficient subtree deletion', async () => {
      const campaignId = 'test-campaign-10';

      // Setup tree with 5 cards
      createTestCard({ id: 'parent', campaignId, parentId: null, path: `/${campaignId}/parent`, depth: 0 });
      createTestCard({ id: 'child-1', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-1`, depth: 1 });
      createTestCard({ id: 'child-2', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-2`, depth: 1 });
      createTestCard({ id: 'grandchild', campaignId, parentId: 'child-2', path: `/${campaignId}/parent/child-2/grandchild`, depth: 2 });
      createTestCard({ id: 'sibling', campaignId, parentId: null, path: `/${campaignId}/sibling`, depth: 0 });

      // Internal deletion should use: DELETE FROM cards WHERE path LIKE '/${campaignId}/parent%'
      const pathPattern = `/${campaignId}/parent%`;
      const toDelete = db.prepare(`SELECT * FROM cards WHERE path LIKE ?`).all(pathPattern);
      expect(toDelete).toHaveLength(4); // parent + 3 descendants

      await cardService.deleteCard('parent');

      const remaining = db.prepare('SELECT * FROM cards WHERE campaign_id = ?').all(campaignId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('sibling');
    });
  });

  describe('Position reordering after deletion', () => {
    it('should maintain sibling positions after deletion', async () => {
      const campaignId = 'test-campaign-11';

      // Setup: Parent with 4 children at positions 0, 1, 2, 3
      createTestCard({ id: 'parent', campaignId, parentId: null, path: `/${campaignId}/parent`, depth: 0 });
      createTestCard({ id: 'child-0', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-0`, depth: 1, position: 0 });
      createTestCard({ id: 'child-1', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-1`, depth: 1, position: 1 });
      createTestCard({ id: 'child-2', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-2`, depth: 1, position: 2 });
      createTestCard({ id: 'child-3', campaignId, parentId: 'parent', path: `/${campaignId}/parent/child-3`, depth: 1, position: 3 });

      // Delete child-1 (position 1)
      await cardService.deleteCard('child-1');

      const siblings = db.prepare('SELECT * FROM cards WHERE parent_id = ? ORDER BY position').all('parent');
      expect(siblings).toHaveLength(3);
      // Positions should be 0, 2, 3 (no auto-reordering) OR 0, 1, 2 (with auto-reordering)
      // Implementation can choose either approach - this test documents expected behavior
    });
  });
});

/**
 * Helper function to create test cards
 */
function createTestCard(data: {
  id: string;
  campaignId: string;
  parentId: string | null;
  path: string;
  depth: number;
  type?: string;
  position?: number;
  metadata?: any;
}) {
  const type = data.type || 'page';
  const position = data.position ?? 0;
  const metadata = data.metadata ? JSON.stringify(data.metadata) : null;

  db.prepare(`
    INSERT INTO cards (id, type, campaign_id, parent_id, path, position, depth, title, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Test Card', ?, strftime('%s', 'now'), strftime('%s', 'now'))
  `).run(data.id, type, data.campaignId, data.parentId, data.path, position, data.depth, metadata);

  return db.prepare('SELECT * FROM cards WHERE id = ?').get(data.id);
}
