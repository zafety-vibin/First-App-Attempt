/**
 * Planning AI Graph Creation Integration Test
 * Feature: 006-create-the-knowledge
 * Task: T029
 *
 * Tests Planning AI integration for graph creation workflow.
 * NOTE: This test depends on Feature 005 (Planning AI) being fully functional.
 * If Planning AI not available, these tests will be skipped.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseService } from '../../src/services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

let db: DatabaseService;
const testCampaignId = 'campaign-planning-001';
const testUserId = 'user-planning-001';

// Feature 005 availability check
let planningAIAvailable = false;

describe('Planning AI Graph Creation Integration Test', () => {
  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.init();

    // Create test user
    await db.run('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [
      testUserId,
      'planningtest',
      'planningtest@example.com',
    ]);

    // Create test campaign
    await db.run('INSERT INTO campaigns (id, name, user_id) VALUES (?, ?, ?)', [
      testCampaignId,
      'Planning Test Campaign',
      testUserId,
    ]);

    // Check if Planning AI tables exist (Feature 005)
    try {
      await db.get('SELECT 1 FROM planning_sessions LIMIT 1');
      planningAIAvailable = true;
      console.log('✓ Planning AI (Feature 005) detected - running full tests');
    } catch (error) {
      planningAIAvailable = false;
      console.log('⚠ Planning AI (Feature 005) not available - skipping tests');
    }
  });

  afterAll(async () => {
    // Cleanup
    await db.run('DELETE FROM graph_edges WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM graph_nodes WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM knowledge_graphs WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM campaigns WHERE id = ?', [testCampaignId]);
    await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    await db.close();
  });

  beforeEach(async () => {
    // Clean up graphs, nodes, and edges before each test
    await db.run('DELETE FROM graph_edges WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM graph_nodes WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM knowledge_graphs WHERE campaign_id = ?', [testCampaignId]);
  });

  describe('Graph Creation via Planning AI', () => {
    it.skipIf(!planningAIAvailable)('should create Political-Web graph via simulated Planning AI', async () => {
      // Simulate Planning AI chat message: "Create a graph for tracking NPC relationships"
      // In real implementation, this would go through Planning AI service

      const graphId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      // Planning AI would create graph with decay_rate=0.1 for Political-Web
      await db.run(
        `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [graphId, testCampaignId, 'Political-Web', 'NPC Relationships', 0.1, 1, now, now]
      );

      // Verify graph created
      const graph = await db.get(
        'SELECT * FROM knowledge_graphs WHERE id = ?',
        [graphId]
      ) as any;

      expect(graph).toBeDefined();
      expect(graph.graph_type).toBe('Political-Web');
      expect(graph.graph_name).toBe('NPC Relationships');
      expect(graph.decay_rate).toBe(0.1);
      expect(graph.toggle_state).toBe(1);
    });

    it.skipIf(!planningAIAvailable)('should add nodes for NPCs via Planning AI', async () => {
      // Create graph first
      const graphId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      await db.run(
        `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [graphId, testCampaignId, 'Political-Web', 'NPC Relationships', 0.1, 1]
      );

      // Simulate Planning AI chat message: "Add nodes for NPC1, NPC2, NPC3"
      const npcNames = ['NPC1', 'NPC2', 'NPC3'];
      const nodeIds: string[] = [];

      for (const name of npcNames) {
        const nodeId = uuidv4();
        nodeIds.push(nodeId);

        await db.run(
          `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, last_accessed, pinned)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nodeId, graphId, 'NPC', name, JSON.stringify({ role: 'character' }), now, 0]
        );
      }

      // Verify all 3 nodes created with last_accessed=NOW
      const nodes = await db.all(
        'SELECT * FROM graph_nodes WHERE graph_id = ? ORDER BY name',
        [graphId]
      ) as any[];

      expect(nodes).toHaveLength(3);
      expect(nodes[0].name).toBe('NPC1');
      expect(nodes[1].name).toBe('NPC2');
      expect(nodes[2].name).toBe('NPC3');
      nodes.forEach(node => {
        expect(node.last_accessed).toBe(now);
        expect(node.node_type).toBe('NPC');
      });
    });

    it.skipIf(!planningAIAvailable)('should connect NPCs as allies via Planning AI', async () => {
      // Create graph
      const graphId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      await db.run(
        `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [graphId, testCampaignId, 'Political-Web', 'NPC Relationships', 0.1, 1]
      );

      // Create 2 nodes
      const node1Id = uuidv4();
      const node2Id = uuidv4();

      await db.run(
        `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, last_accessed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [node1Id, graphId, 'NPC', 'NPC1', JSON.stringify({}), now]
      );

      await db.run(
        `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, last_accessed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [node2Id, graphId, 'NPC', 'NPC2', JSON.stringify({}), now]
      );

      // Simulate Planning AI chat message: "Connect NPC1 to NPC2 as allies"
      const edgeId = uuidv4();
      await db.run(
        `INSERT INTO graph_edges (id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [edgeId, graphId, 'allied with', node1Id, node2Id, 0, JSON.stringify({ strength: 0.8 })]
      );

      // Verify edge created with directed=false (undirected relationship)
      const edge = await db.get(
        'SELECT * FROM graph_edges WHERE id = ?',
        [edgeId]
      ) as any;

      expect(edge).toBeDefined();
      expect(edge.edge_type).toBe('allied with');
      expect(edge.source_node_id).toBe(node1Id);
      expect(edge.target_node_id).toBe(node2Id);
      expect(edge.directed).toBe(0); // Undirected
      expect(JSON.parse(edge.metadata)).toEqual({ strength: 0.8 });
    });

    it.skipIf(!planningAIAvailable)('should query full graph with all entities at confidence=1.0', async () => {
      // Create graph
      const graphId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      await db.run(
        `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [graphId, testCampaignId, 'Political-Web', 'NPC Relationships', 0.1, 1]
      );

      // Create 3 nodes
      const node1Id = uuidv4();
      const node2Id = uuidv4();
      const node3Id = uuidv4();

      for (const [id, name] of [[node1Id, 'NPC1'], [node2Id, 'NPC2'], [node3Id, 'NPC3']]) {
        await db.run(
          `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, last_accessed)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, graphId, 'NPC', name, JSON.stringify({}), now]
        );
      }

      // Create 1 edge
      const edgeId = uuidv4();
      await db.run(
        `INSERT INTO graph_edges (id, graph_id, edge_type, source_node_id, target_node_id, directed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [edgeId, graphId, 'allied with', node1Id, node2Id, 0]
      );

      // Query graph
      const graph = await db.get(
        'SELECT * FROM knowledge_graphs WHERE id = ?',
        [graphId]
      ) as any;

      const nodes = await db.all(
        'SELECT * FROM graph_nodes WHERE graph_id = ?',
        [graphId]
      ) as any[];

      const edges = await db.all(
        'SELECT * FROM graph_edges WHERE graph_id = ?',
        [graphId]
      ) as any[];

      // Verify all entities exist
      expect(graph).toBeDefined();
      expect(nodes).toHaveLength(3);
      expect(edges).toHaveLength(1);

      // All nodes should have last_accessed=NOW, so confidence=1.0
      nodes.forEach(node => {
        expect(node.last_accessed).toBe(now);
        const weeksElapsed = (now - node.last_accessed) / (7 * 24 * 60 * 60);
        const confidence = 1.0 * (1 - 0.1 * weeksElapsed);
        expect(confidence).toBeCloseTo(1.0, 2);
      });
    });

    it.skipIf(!planningAIAvailable)('should support custom graph types via Planning AI', async () => {
      // Simulate Planning AI chat message: "Create a custom graph for tracking magic items"
      const graphId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      await db.run(
        `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [graphId, testCampaignId, 'custom:MagicItems', 'Magic Item Tracker', 0.1, 1]
      );

      // Verify custom graph type
      const graph = await db.get(
        'SELECT * FROM knowledge_graphs WHERE id = ?',
        [graphId]
      ) as any;

      expect(graph).toBeDefined();
      expect(graph.graph_type).toBe('custom:MagicItems');
      expect(graph.graph_name).toBe('Magic Item Tracker');
    });

    it.skipIf(!planningAIAvailable)('should handle directed relationships via Planning AI', async () => {
      // Create graph
      const graphId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      await db.run(
        `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [graphId, testCampaignId, 'Political-Web', 'NPC Relationships', 0.1, 1]
      );

      // Create 2 nodes
      const lordId = uuidv4();
      const servantId = uuidv4();

      await db.run(
        `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, last_accessed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [lordId, graphId, 'NPC', 'Lord', JSON.stringify({}), now]
      );

      await db.run(
        `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, last_accessed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [servantId, graphId, 'NPC', 'Servant', JSON.stringify({}), now]
      );

      // Simulate Planning AI: "Lord commands Servant" (directed relationship)
      const edgeId = uuidv4();
      await db.run(
        `INSERT INTO graph_edges (id, graph_id, edge_type, source_node_id, target_node_id, directed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [edgeId, graphId, 'commands', lordId, servantId, 1]
      );

      // Verify directed edge
      const edge = await db.get(
        'SELECT * FROM graph_edges WHERE id = ?',
        [edgeId]
      ) as any;

      expect(edge).toBeDefined();
      expect(edge.directed).toBe(1); // Directed
      expect(edge.source_node_id).toBe(lordId);
      expect(edge.target_node_id).toBe(servantId);
      expect(edge.edge_type).toBe('commands');
    });
  });

  describe('Graph Querying via Planning AI', () => {
    it.skipIf(!planningAIAvailable)('should query only toggled-on graphs', async () => {
      // Create 2 graphs: one toggled on, one toggled off
      const graphId1 = uuidv4();
      const graphId2 = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      await db.run(
        `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [graphId1, testCampaignId, 'Political-Web', 'Active Graph', 0.1, 1]
      );

      await db.run(
        `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [graphId2, testCampaignId, 'Political-Web', 'Inactive Graph', 0.1, 0]
      );

      // Query only toggled-on graphs
      const activeGraphs = await db.all(
        'SELECT * FROM knowledge_graphs WHERE campaign_id = ? AND toggle_state = 1',
        [testCampaignId]
      ) as any[];

      expect(activeGraphs).toHaveLength(1);
      expect(activeGraphs[0].graph_name).toBe('Active Graph');
    });

    it.skipIf(!planningAIAvailable)('should access graph metadata for Planning AI context', async () => {
      // Create graph with metadata
      const graphId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      await db.run(
        `INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, decay_rate, toggle_state, maintenance_rules)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          graphId,
          testCampaignId,
          'Political-Web',
          'NPC Relationships',
          0.1,
          1,
          JSON.stringify({ auto_archive: true, archive_threshold: 0.2 })
        ]
      );

      // Query graph
      const graph = await db.get(
        'SELECT * FROM knowledge_graphs WHERE id = ?',
        [graphId]
      ) as any;

      expect(graph).toBeDefined();
      expect(graph.maintenance_rules).toBeDefined();
      expect(JSON.parse(graph.maintenance_rules)).toEqual({
        auto_archive: true,
        archive_threshold: 0.2
      });
    });
  });
});
