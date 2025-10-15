/**
 * Information Level Filtering Integration Test (Knowledge Graphs)
 * Feature: 006-create-the-knowledge
 * Task: T030
 *
 * Tests Feature 004 integration with knowledge graphs.
 * Verifies graph nodes respect information level tagging and view mode filtering.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseService } from '../../src/services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

let db: DatabaseService;
const testCampaignId = 'campaign-info-filter-001';
const testUserId = 'user-info-filter-001';

// Information level IDs
let commonKnowledgeId: string | null = null;
let playerKnowledgeId: string;
let dmSecretId: string;

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

// Helper to create test node with information level
async function createTestNode(
  graphId: string,
  nodeName: string,
  informationLevelId: string | null
): Promise<string> {
  const nodeId = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  await db.run(
    `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, information_level_id, last_accessed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nodeId, graphId, 'NPC', nodeName, JSON.stringify({ role: 'test' }), informationLevelId, now]
  );
  return nodeId;
}

// Helper to simulate view mode filtering (simplified)
async function getNodesWithViewMode(
  graphId: string,
  viewMode: 'dm_view' | 'player_view'
): Promise<any[]> {
  if (viewMode === 'dm_view') {
    // DM View: return all nodes
    return await db.all(
      'SELECT * FROM graph_nodes WHERE graph_id = ?',
      [graphId]
    ) as any[];
  } else {
    // Player View: filter out dm_only nodes
    // For Feature 004 integration, we need to check information_levels.hierarchical flag
    // Nodes with information_level_id pointing to hierarchical=true are filtered out
    return await db.all(
      `SELECT gn.* FROM graph_nodes gn
       LEFT JOIN information_levels il ON gn.information_level_id = il.id
       WHERE gn.graph_id = ?
       AND (gn.information_level_id IS NULL OR il.hierarchical = 0)`,
      [graphId]
    ) as any[];
  }
}

describe('Information Level Filtering Integration Test (Knowledge Graphs)', () => {
  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.init();

    // Create test user
    await db.run('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [
      testUserId,
      'infofiltertest',
      'infofiltertest@example.com',
    ]);

    // Create test campaign
    await db.run('INSERT INTO campaigns (id, name, user_id) VALUES (?, ?, ?)', [
      testCampaignId,
      'Info Filter Test Campaign',
      testUserId,
    ]);

    // Create information levels (Feature 004)
    playerKnowledgeId = uuidv4();
    dmSecretId = uuidv4();

    await db.run(
      `INSERT INTO information_levels (id, campaign_id, level_name, level_order, hierarchical, custom)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [playerKnowledgeId, testCampaignId, 'Player Knowledge', 2, 0, 0]
    );

    await db.run(
      `INSERT INTO information_levels (id, campaign_id, level_name, level_order, hierarchical, custom)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dmSecretId, testCampaignId, 'DM Secret', 3, 1, 0]
    );
  });

  afterAll(async () => {
    // Cleanup
    await db.run('DELETE FROM graph_edges WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM graph_nodes WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM knowledge_graphs WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM information_levels WHERE campaign_id = ?', [testCampaignId]);
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

  describe('DM View Mode', () => {
    it('should return all nodes regardless of information_level_id', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      // Create 3 nodes with different information levels
      const nodeAId = await createTestNode(graphId, 'Node A (Common)', commonKnowledgeId);
      const nodeBId = await createTestNode(graphId, 'Node B (Player)', playerKnowledgeId);
      const nodeCId = await createTestNode(graphId, 'Node C (DM Secret)', dmSecretId);

      // Query with DM View
      const nodes = await getNodesWithViewMode(graphId, 'dm_view');

      expect(nodes).toHaveLength(3);
      const nodeNames = nodes.map(n => n.name);
      expect(nodeNames).toContain('Node A (Common)');
      expect(nodeNames).toContain('Node B (Player)');
      expect(nodeNames).toContain('Node C (DM Secret)');
    });

    it('should include nodes with NULL information_level_id in DM view', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      const nodeId = await createTestNode(graphId, 'Null Info Level Node', null);

      const nodes = await getNodesWithViewMode(graphId, 'dm_view');

      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Null Info Level Node');
      expect(nodes[0].information_level_id).toBeNull();
    });
  });

  describe('Player View Mode', () => {
    it('should filter out DM Secret nodes (hierarchical=true)', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      // Create nodes
      await createTestNode(graphId, 'Node A (Common)', commonKnowledgeId);
      await createTestNode(graphId, 'Node B (Player)', playerKnowledgeId);
      await createTestNode(graphId, 'Node C (DM Secret)', dmSecretId);

      // Query with Player View
      const nodes = await getNodesWithViewMode(graphId, 'player_view');

      expect(nodes).toHaveLength(2); // Only Common and Player nodes
      const nodeNames = nodes.map(n => n.name);
      expect(nodeNames).toContain('Node A (Common)');
      expect(nodeNames).toContain('Node B (Player)');
      expect(nodeNames).not.toContain('Node C (DM Secret)');
    });

    it('should include nodes with NULL information_level_id in Player view', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      await createTestNode(graphId, 'Null Node', null);
      await createTestNode(graphId, 'DM Secret Node', dmSecretId);

      const nodes = await getNodesWithViewMode(graphId, 'player_view');

      expect(nodes).toHaveLength(1);
      expect(nodes[0].name).toBe('Null Node');
    });

    it('should not reveal existence of DM Secret nodes in queries', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      const dmNodeId = await createTestNode(graphId, 'Secret BBEG', dmSecretId);

      // Player View should not see this node at all
      const playerNodes = await getNodesWithViewMode(graphId, 'player_view');
      const dmNodeIds = playerNodes.map(n => n.id);

      expect(dmNodeIds).not.toContain(dmNodeId);
    });
  });

  describe('Cross-Graph Query with View Mode Filtering', () => {
    it('should filter DM Secret nodes across multiple graphs', async () => {
      // Create 2 graphs
      const graphId1 = await createTestGraph('Political-Web', 'Political Graph', 0.1);
      const graphId2 = await createTestGraph('Geographical', 'Geo Graph', 0.05);

      // Add nodes to both graphs
      await createTestNode(graphId1, 'NPC Common', commonKnowledgeId);
      await createTestNode(graphId1, 'NPC Secret', dmSecretId);
      await createTestNode(graphId2, 'Location Common', commonKnowledgeId);
      await createTestNode(graphId2, 'Location Secret', dmSecretId);

      // Query all nodes from both graphs with Player View
      const playerNodes = await db.all(
        `SELECT gn.* FROM graph_nodes gn
         LEFT JOIN information_levels il ON gn.information_level_id = il.id
         WHERE gn.graph_id IN (?, ?)
         AND (gn.information_level_id IS NULL OR il.hierarchical = 0)`,
        [graphId1, graphId2]
      ) as any[];

      expect(playerNodes).toHaveLength(2); // Only Common nodes from both graphs
      const nodeNames = playerNodes.map(n => n.name);
      expect(nodeNames).toContain('NPC Common');
      expect(nodeNames).toContain('Location Common');
      expect(nodeNames).not.toContain('NPC Secret');
      expect(nodeNames).not.toContain('Location Secret');
    });

    it('should support cross-graph observations with view mode filtering', async () => {
      // Create 2 graphs
      const graphId1 = await createTestGraph('Political-Web', 'NPC Graph', 0.1);
      const graphId2 = await createTestGraph('Geographical', 'Location Graph', 0.05);

      // Create NPC with observation referencing location
      const npcNodeId = await createTestNode(graphId1, 'Lord Neverember', playerKnowledgeId);
      const secretLocationId = await createTestNode(graphId2, 'Secret Hideout', dmSecretId);
      const publicLocationId = await createTestNode(graphId2, 'Waterdeep', commonKnowledgeId);

      // Add observations to NPC (JSONB array)
      const observations = [
        { text: 'current location: Waterdeep', created_at: Math.floor(Date.now() / 1000), last_accessed: Math.floor(Date.now() / 1000) },
        { text: 'secret hideout: Secret Hideout', created_at: Math.floor(Date.now() / 1000), last_accessed: Math.floor(Date.now() / 1000) }
      ];

      await db.run(
        'UPDATE graph_nodes SET observations = ? WHERE id = ?',
        [JSON.stringify(observations), npcNodeId]
      );

      // In Player View, DM would need to filter out observations referencing DM Secret entities
      // This is a more complex use case requiring observation-level filtering
      // For now, verify the NPC node is accessible
      const npcNode = await db.get(
        `SELECT gn.* FROM graph_nodes gn
         LEFT JOIN information_levels il ON gn.information_level_id = il.id
         WHERE gn.id = ?
         AND (gn.information_level_id IS NULL OR il.hierarchical = 0)`,
        [npcNodeId]
      ) as any;

      expect(npcNode).toBeDefined();
      expect(npcNode.name).toBe('Lord Neverember');

      // Full implementation would require observation-level filtering based on referenced entities
      // This is noted as a future enhancement (Phase 4 of Feature 006)
    });
  });

  describe('Information Level Changes', () => {
    it('should update node visibility when information_level_id changed', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      // Create node as Player Knowledge
      const nodeId = await createTestNode(graphId, 'Evolving Secret', playerKnowledgeId);

      // Verify visible in Player View
      let playerNodes = await getNodesWithViewMode(graphId, 'player_view');
      expect(playerNodes).toHaveLength(1);
      expect(playerNodes[0].name).toBe('Evolving Secret');

      // Change to DM Secret
      await db.run(
        'UPDATE graph_nodes SET information_level_id = ? WHERE id = ?',
        [dmSecretId, nodeId]
      );

      // Verify no longer visible in Player View
      playerNodes = await getNodesWithViewMode(graphId, 'player_view');
      expect(playerNodes).toHaveLength(0);

      // But still visible in DM View
      const dmNodes = await getNodesWithViewMode(graphId, 'dm_view');
      expect(dmNodes).toHaveLength(1);
      expect(dmNodes[0].name).toBe('Evolving Secret');
    });

    it('should handle information level deletion (SET NULL)', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      // Create custom information level
      const customLevelId = uuidv4();
      await db.run(
        `INSERT INTO information_levels (id, campaign_id, level_name, level_order, hierarchical, custom)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [customLevelId, testCampaignId, 'Custom Level', 4, 0, 1]
      );

      // Create node with custom level
      const nodeId = await createTestNode(graphId, 'Custom Node', customLevelId);

      // Verify node exists
      let node = await db.get('SELECT * FROM graph_nodes WHERE id = ?', [nodeId]) as any;
      expect(node.information_level_id).toBe(customLevelId);

      // Delete custom level (should SET NULL on node)
      await db.run('DELETE FROM information_levels WHERE id = ?', [customLevelId]);

      // Verify node information_level_id is now NULL
      node = await db.get('SELECT * FROM graph_nodes WHERE id = ?', [nodeId]) as any;
      expect(node.information_level_id).toBeNull();

      // Node should still be visible in Player View (NULL = Common Knowledge)
      const playerNodes = await getNodesWithViewMode(graphId, 'player_view');
      expect(playerNodes).toHaveLength(1);
      expect(playerNodes[0].name).toBe('Custom Node');
    });
  });

  describe('Edge Filtering with Information Levels', () => {
    it('should include edges where both nodes are visible in Player View', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      // Create 2 visible nodes
      const node1Id = await createTestNode(graphId, 'Public NPC 1', playerKnowledgeId);
      const node2Id = await createTestNode(graphId, 'Public NPC 2', playerKnowledgeId);

      // Create edge
      const edgeId = uuidv4();
      await db.run(
        `INSERT INTO graph_edges (id, graph_id, edge_type, source_node_id, target_node_id, directed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [edgeId, graphId, 'allied with', node1Id, node2Id, 0]
      );

      // Query edges with visible nodes (Player View)
      const edges = await db.all(
        `SELECT ge.* FROM graph_edges ge
         JOIN graph_nodes gn1 ON ge.source_node_id = gn1.id
         JOIN graph_nodes gn2 ON ge.target_node_id = gn2.id
         LEFT JOIN information_levels il1 ON gn1.information_level_id = il1.id
         LEFT JOIN information_levels il2 ON gn2.information_level_id = il2.id
         WHERE ge.graph_id = ?
         AND (gn1.information_level_id IS NULL OR il1.hierarchical = 0)
         AND (gn2.information_level_id IS NULL OR il2.hierarchical = 0)`,
        [graphId]
      ) as any[];

      expect(edges).toHaveLength(1);
      expect(edges[0].edge_type).toBe('allied with');
    });

    it('should hide edges where one node is DM Secret in Player View', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      // Create 1 visible node and 1 DM Secret node
      const publicNodeId = await createTestNode(graphId, 'Public NPC', playerKnowledgeId);
      const secretNodeId = await createTestNode(graphId, 'Secret NPC', dmSecretId);

      // Create edge between them
      const edgeId = uuidv4();
      await db.run(
        `INSERT INTO graph_edges (id, graph_id, edge_type, source_node_id, target_node_id, directed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [edgeId, graphId, 'secretly allied with', publicNodeId, secretNodeId, 1]
      );

      // Query edges with visible nodes (Player View)
      const playerEdges = await db.all(
        `SELECT ge.* FROM graph_edges ge
         JOIN graph_nodes gn1 ON ge.source_node_id = gn1.id
         JOIN graph_nodes gn2 ON ge.target_node_id = gn2.id
         LEFT JOIN information_levels il1 ON gn1.information_level_id = il1.id
         LEFT JOIN information_levels il2 ON gn2.information_level_id = il2.id
         WHERE ge.graph_id = ?
         AND (gn1.information_level_id IS NULL OR il1.hierarchical = 0)
         AND (gn2.information_level_id IS NULL OR il2.hierarchical = 0)`,
        [graphId]
      ) as any[];

      expect(playerEdges).toHaveLength(0); // Edge hidden because one node is DM Secret

      // DM View should see the edge
      const dmEdges = await db.all(
        'SELECT * FROM graph_edges WHERE graph_id = ?',
        [graphId]
      ) as any[];

      expect(dmEdges).toHaveLength(1);
    });
  });
});
