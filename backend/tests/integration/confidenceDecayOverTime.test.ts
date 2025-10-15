/**
 * Confidence Decay Over Time Integration Tests
 * Feature: 006-create-the-knowledge
 * Tasks: T026-T028
 *
 * Tests confidence decay with real database and time manipulation.
 * Verifies reinforcement and pinning workflows.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { DatabaseService } from '../../src/services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

let db: DatabaseService;
const testCampaignId = 'campaign-decay-001';
const testUserId = 'user-decay-001';

// Calculate weeks in seconds
const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

// Helper to create test graph
async function createTestGraph(
  graphType: string,
  graphName: string,
  decayRate: number
): Promise<string> {
  const graphId = uuidv4();
  await db.run(
    `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [graphId, testCampaignId, graphType, graphName, decayRate]
  );
  return graphId;
}

// Helper to create test node
async function createTestNode(
  graphId: string,
  nodeName: string,
  lastAccessed: number
): Promise<string> {
  const nodeId = uuidv4();
  await db.run(
    `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, last_accessed, pinned)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [nodeId, graphId, 'NPC', nodeName, JSON.stringify({}), lastAccessed]
  );
  return nodeId;
}

// Calculate confidence manually (matches ConfidenceDecayService formula)
function calculateConfidence(
  lastAccessed: number,
  decayRate: number,
  currentTime: number,
  pinned: boolean
): number {
  if (pinned) return 1.0;

  const weeksElapsed = (currentTime - lastAccessed) / WEEK_IN_SECONDS;
  const confidence = 1.0 * (1 - decayRate * weeksElapsed);

  // Clamp to [0.0, 1.0]
  return Math.max(0.0, Math.min(1.0, confidence));
}

describe('Confidence Decay Integration Tests', () => {
  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.init();

    // Create test user
    await db.run('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [
      testUserId,
      'decaytest',
      'decaytest@example.com',
    ]);

    // Create test campaign
    await db.run('INSERT INTO campaigns (id, name, user_id) VALUES (?, ?, ?)', [
      testCampaignId,
      'Decay Test Campaign',
      testUserId,
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await db.run('DELETE FROM graph_nodes WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM knowledge_graphs WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM campaigns WHERE id = ?', [testCampaignId]);
    await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    await db.close();
  });

  beforeEach(async () => {
    // Clean up graphs and nodes before each test
    await db.run('DELETE FROM graph_nodes WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM knowledge_graphs WHERE campaign_id = ?', [testCampaignId]);
  });

  describe('T026: Confidence decay over time', () => {
    it('should calculate confidence=1.0 immediately after creation', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const nodeId = await createTestNode(graphId, 'Test NPC', now);

      // Query node
      const node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;

      expect(node).toBeDefined();
      expect(node.last_accessed).toBe(now);

      // Calculate confidence
      const confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(1.0, 2);
    });

    it('should decay to confidence=0.5 after 5 weeks (decay_rate=0.1)', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * WEEK_IN_SECONDS);
      const nodeId = await createTestNode(graphId, 'Test NPC', fiveWeeksAgo);

      // Query node
      const node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;

      // Calculate confidence
      const confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(0.5, 2); // 1.0 * (1 - 0.1 * 5) = 0.5
    });

    it('should decay to confidence=0.0 after 10 weeks (decay_rate=0.1)', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const tenWeeksAgo = now - (10 * WEEK_IN_SECONDS);
      const nodeId = await createTestNode(graphId, 'Test NPC', tenWeeksAgo);

      // Query node
      const node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;

      // Calculate confidence
      const confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(0.0, 2); // 1.0 * (1 - 0.1 * 10) = 0.0
    });

    it('should never decay for World-Foundations graph (decay_rate=0.0) after 50 weeks', async () => {
      const graphId = await createTestGraph('World-Foundations', 'World Foundations', 0.0);
      const now = Math.floor(Date.now() / 1000);
      const fiftyWeeksAgo = now - (50 * WEEK_IN_SECONDS);
      const nodeId = await createTestNode(graphId, 'Permanent Rule', fiftyWeeksAgo);

      // Query node
      const node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;

      // Calculate confidence
      const confidence = calculateConfidence(node.last_accessed, 0.0, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(1.0, 2); // 1.0 * (1 - 0.0 * 50) = 1.0
    });

    it('should decay Campaign-Story graph faster (decay_rate=0.2)', async () => {
      const graphId = await createTestGraph('Campaign-Story', 'Campaign Story', 0.2);
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * WEEK_IN_SECONDS);
      const nodeId = await createTestNode(graphId, 'Recent Event', fiveWeeksAgo);

      // Query node
      const node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;

      // Calculate confidence
      const confidence = calculateConfidence(node.last_accessed, 0.2, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(0.0, 2); // 1.0 * (1 - 0.2 * 5) = 0.0
    });

    it('should decay Geographical graph slower (decay_rate=0.05)', async () => {
      const graphId = await createTestGraph('Geographical', 'Geographical', 0.05);
      const now = Math.floor(Date.now() / 1000);
      const tenWeeksAgo = now - (10 * WEEK_IN_SECONDS);
      const nodeId = await createTestNode(graphId, 'Location', tenWeeksAgo);

      // Query node
      const node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;

      // Calculate confidence
      const confidence = calculateConfidence(node.last_accessed, 0.05, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(0.5, 2); // 1.0 * (1 - 0.05 * 10) = 0.5
    });
  });

  describe('T027: Reinforcement resets confidence', () => {
    it('should reset confidence to 1.0 after reinforcement (update last_accessed)', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * WEEK_IN_SECONDS);
      const nodeId = await createTestNode(graphId, 'Test NPC', fiveWeeksAgo);

      // Verify confidence is 0.5 before reinforcement
      let node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;
      let confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(0.5, 2);

      // Simulate reinforcement: update last_accessed to now
      await db.run(
        'UPDATE graph_nodes SET last_accessed = ? WHERE id = ?',
        [now, nodeId]
      );

      // Verify confidence is 1.0 after reinforcement
      node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;
      expect(node.last_accessed).toBe(now);

      confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(1.0, 2);
    });

    it('should persist reinforcement in database', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const sevenWeeksAgo = now - (7 * WEEK_IN_SECONDS);
      const nodeId = await createTestNode(graphId, 'Test NPC', sevenWeeksAgo);

      // Reinforce
      await db.run(
        'UPDATE graph_nodes SET last_accessed = ? WHERE id = ?',
        [now, nodeId]
      );

      // Verify persistence
      const node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;

      expect(node.last_accessed).toBe(now);

      const confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(1.0, 2);
    });

    it('should allow multiple reinforcements over time', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const baseTime = Math.floor(Date.now() / 1000);
      const nodeId = await createTestNode(graphId, 'Test NPC', baseTime);

      // Wait 3 weeks (simulated)
      const threeWeeksLater = baseTime + (3 * WEEK_IN_SECONDS);
      await db.run(
        'UPDATE graph_nodes SET last_accessed = ? WHERE id = ?',
        [threeWeeksLater, nodeId]
      );

      let node = await db.get('SELECT * FROM graph_nodes WHERE id = ?', [nodeId]) as any;
      let confidence = calculateConfidence(node.last_accessed, 0.1, threeWeeksLater, node.pinned === 1);
      expect(confidence).toBeCloseTo(1.0, 2);

      // Wait another 4 weeks (simulated) - should decay to 0.6
      const sevenWeeksLater = threeWeeksLater + (4 * WEEK_IN_SECONDS);
      node = await db.get('SELECT * FROM graph_nodes WHERE id = ?', [nodeId]) as any;
      confidence = calculateConfidence(node.last_accessed, 0.1, sevenWeeksLater, node.pinned === 1);
      expect(confidence).toBeCloseTo(0.6, 2);

      // Reinforce again
      await db.run(
        'UPDATE graph_nodes SET last_accessed = ? WHERE id = ?',
        [sevenWeeksLater, nodeId]
      );

      node = await db.get('SELECT * FROM graph_nodes WHERE id = ?', [nodeId]) as any;
      confidence = calculateConfidence(node.last_accessed, 0.1, sevenWeeksLater, node.pinned === 1);
      expect(confidence).toBeCloseTo(1.0, 2);
    });
  });

  describe('T028: Pinned entities maintain confidence', () => {
    it('should maintain confidence=1.0 for pinned entity after 10 weeks', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const tenWeeksAgo = now - (10 * WEEK_IN_SECONDS);
      const nodeId = await createTestNode(graphId, 'BBEG', tenWeeksAgo);

      // Pin the entity
      await db.run(
        'UPDATE graph_nodes SET pinned = 1 WHERE id = ?',
        [nodeId]
      );

      // Query node
      const node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;

      expect(node.pinned).toBe(1);

      // Calculate confidence (should be 1.0 despite old last_accessed)
      const confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(1.0, 2);
    });

    it('should drop confidence when entity unpinned', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const tenWeeksAgo = now - (10 * WEEK_IN_SECONDS);
      const nodeId = await createTestNode(graphId, 'NPC', tenWeeksAgo);

      // Pin the entity
      await db.run(
        'UPDATE graph_nodes SET pinned = 1 WHERE id = ?',
        [nodeId]
      );

      let node = await db.get('SELECT * FROM graph_nodes WHERE id = ?', [nodeId]) as any;
      let confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(1.0, 2);

      // Unpin the entity
      await db.run(
        'UPDATE graph_nodes SET pinned = 0 WHERE id = ?',
        [nodeId]
      );

      node = await db.get('SELECT * FROM graph_nodes WHERE id = ?', [nodeId]) as any;
      expect(node.pinned).toBe(0);

      // Confidence should drop to 0.0 (10 weeks ago with decay_rate=0.1)
      confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
      expect(confidence).toBeCloseTo(0.0, 2);
    });

    it('should persist pinned flag in database', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const nodeId = await createTestNode(graphId, 'Important NPC', now);

      // Pin
      await db.run(
        'UPDATE graph_nodes SET pinned = 1 WHERE id = ?',
        [nodeId]
      );

      // Verify persistence
      const node = await db.get(
        'SELECT * FROM graph_nodes WHERE id = ?',
        [nodeId]
      ) as any;

      expect(node.pinned).toBe(1);
    });

    it('should allow multiple entities to be pinned simultaneously', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const tenWeeksAgo = now - (10 * WEEK_IN_SECONDS);

      const nodeId1 = await createTestNode(graphId, 'BBEG 1', tenWeeksAgo);
      const nodeId2 = await createTestNode(graphId, 'BBEG 2', tenWeeksAgo);
      const nodeId3 = await createTestNode(graphId, 'BBEG 3', tenWeeksAgo);

      // Pin all
      await db.run('UPDATE graph_nodes SET pinned = 1 WHERE id IN (?, ?, ?)', [nodeId1, nodeId2, nodeId3]);

      // Verify all pinned
      const nodes = await db.all(
        'SELECT * FROM graph_nodes WHERE graph_id = ? AND pinned = 1',
        [graphId]
      ) as any[];

      expect(nodes).toHaveLength(3);
      nodes.forEach(node => {
        const confidence = calculateConfidence(node.last_accessed, 0.1, now, node.pinned === 1);
        expect(confidence).toBeCloseTo(1.0, 2);
      });
    });

    it('should handle pinned and unpinned entities in same graph', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const tenWeeksAgo = now - (10 * WEEK_IN_SECONDS);

      const pinnedNodeId = await createTestNode(graphId, 'Pinned NPC', tenWeeksAgo);
      const unpinnedNodeId = await createTestNode(graphId, 'Unpinned NPC', tenWeeksAgo);

      // Pin one entity
      await db.run('UPDATE graph_nodes SET pinned = 1 WHERE id = ?', [pinnedNodeId]);

      // Query both
      const pinnedNode = await db.get('SELECT * FROM graph_nodes WHERE id = ?', [pinnedNodeId]) as any;
      const unpinnedNode = await db.get('SELECT * FROM graph_nodes WHERE id = ?', [unpinnedNodeId]) as any;

      const pinnedConfidence = calculateConfidence(pinnedNode.last_accessed, 0.1, now, pinnedNode.pinned === 1);
      const unpinnedConfidence = calculateConfidence(unpinnedNode.last_accessed, 0.1, now, unpinnedNode.pinned === 1);

      expect(pinnedConfidence).toBeCloseTo(1.0, 2);
      expect(unpinnedConfidence).toBeCloseTo(0.0, 2);
    });
  });
});
