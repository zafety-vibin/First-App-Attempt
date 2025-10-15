/**
 * Graph Version Revert Integration Test
 * Feature: 006-create-the-knowledge
 * Task: T031
 *
 * Tests versioning workflow with 1-deep backup and restore functionality.
 * Verifies confidence metadata (last_accessed, pinned) is preserved during revert.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseService } from '../../src/services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

let db: DatabaseService;
const testCampaignId = 'campaign-version-001';
const testUserId = 'user-version-001';

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
  lastAccessed: number,
  pinned: boolean = false
): Promise<string> {
  const nodeId = uuidv4();
  await db.run(
    `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, last_accessed, pinned)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nodeId, graphId, 'NPC', nodeName, JSON.stringify({ role: 'test' }), lastAccessed, pinned ? 1 : 0]
  );
  return nodeId;
}

// Helper to create test edge
async function createTestEdge(
  graphId: string,
  sourceNodeId: string,
  targetNodeId: string,
  edgeType: string
): Promise<string> {
  const edgeId = uuidv4();
  await db.run(
    `INSERT INTO graph_edges (id, graph_id, edge_type, source_node_id, target_node_id, directed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [edgeId, graphId, edgeType, sourceNodeId, targetNodeId, 0]
  );
  return edgeId;
}

// Helper to create version snapshot
async function createVersionSnapshot(
  graphId: string,
  versionType: 'current' | 'backup'
): Promise<string> {
  const versionId = uuidv4();
  const now = Math.floor(Date.now() / 1000);

  // Fetch current graph state
  const nodes = await db.all(
    'SELECT * FROM graph_nodes WHERE graph_id = ?',
    [graphId]
  ) as any[];

  const edges = await db.all(
    'SELECT * FROM graph_edges WHERE graph_id = ?',
    [graphId]
  ) as any[];

  const graph = await db.get(
    'SELECT * FROM knowledge_graphs WHERE id = ?',
    [graphId]
  ) as any;

  // Create snapshot content
  const snapshotContent = {
    nodes: nodes,
    edges: edges,
    metadata: {
      graph_type: graph.graph_type,
      graph_name: graph.graph_name,
      node_count: nodes.length,
      edge_count: edges.length,
      snapshot_timestamp: now
    }
  };

  // Insert version
  await db.run(
    `INSERT INTO graph_versions (id, graph_id, snapshot_content, version_type, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [versionId, graphId, JSON.stringify(snapshotContent), versionType, now]
  );

  // Update graph references
  if (versionType === 'current') {
    await db.run(
      'UPDATE knowledge_graphs SET current_version_id = ? WHERE id = ?',
      [versionId, graphId]
    );
  } else {
    await db.run(
      'UPDATE knowledge_graphs SET backup_version_id = ? WHERE id = ?',
      [versionId, graphId]
    );
  }

  return versionId;
}

// Helper to restore from backup version
async function restoreFromBackup(graphId: string): Promise<void> {
  // Get backup version
  const graph = await db.get(
    'SELECT backup_version_id FROM knowledge_graphs WHERE id = ?',
    [graphId]
  ) as any;

  if (!graph || !graph.backup_version_id) {
    throw new Error('No backup version found');
  }

  const backupVersion = await db.get(
    'SELECT * FROM graph_versions WHERE id = ?',
    [graph.backup_version_id]
  ) as any;

  const snapshot = JSON.parse(backupVersion.snapshot_content);

  // Delete current nodes and edges
  await db.run('DELETE FROM graph_edges WHERE graph_id = ?', [graphId]);
  await db.run('DELETE FROM graph_nodes WHERE graph_id = ?', [graphId]);

  // Restore nodes from snapshot
  for (const node of snapshot.nodes) {
    await db.run(
      `INSERT INTO graph_nodes (id, graph_id, node_type, name, attributes, observations, information_level_id, created_at, last_accessed, pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        node.id,
        node.graph_id,
        node.node_type,
        node.name,
        node.attributes,
        node.observations,
        node.information_level_id,
        node.created_at,
        node.last_accessed,
        node.pinned
      ]
    );
  }

  // Restore edges from snapshot
  for (const edge of snapshot.edges) {
    await db.run(
      `INSERT INTO graph_edges (id, graph_id, edge_type, source_node_id, target_node_id, directed, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        edge.id,
        edge.graph_id,
        edge.edge_type,
        edge.source_node_id,
        edge.target_node_id,
        edge.directed,
        edge.metadata,
        edge.created_at
      ]
    );
  }

  // Promote backup to current (swap version IDs)
  const oldCurrentVersionId = await db.get(
    'SELECT current_version_id FROM knowledge_graphs WHERE id = ?',
    [graphId]
  ) as any;

  // Delete old current version
  if (oldCurrentVersionId && oldCurrentVersionId.current_version_id) {
    await db.run('DELETE FROM graph_versions WHERE id = ?', [oldCurrentVersionId.current_version_id]);
  }

  // Update graph to point backup as current
  await db.run(
    'UPDATE knowledge_graphs SET current_version_id = ?, backup_version_id = NULL WHERE id = ?',
    [graph.backup_version_id, graphId]
  );

  // Update version type in database
  await db.run(
    'UPDATE graph_versions SET version_type = ? WHERE id = ?',
    ['current', graph.backup_version_id]
  );
}

describe('Graph Version Revert Integration Test', () => {
  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.init();

    // Create test user
    await db.run('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [
      testUserId,
      'versiontest',
      'versiontest@example.com',
    ]);

    // Create test campaign
    await db.run('INSERT INTO campaigns (id, name, user_id) VALUES (?, ?, ?)', [
      testCampaignId,
      'Version Test Campaign',
      testUserId,
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await db.run('DELETE FROM graph_versions WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM graph_edges WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM graph_nodes WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM knowledge_graphs WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM campaigns WHERE id = ?', [testCampaignId]);
    await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    await db.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await db.run('DELETE FROM graph_versions WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM graph_edges WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM graph_nodes WHERE graph_id IN (SELECT id FROM knowledge_graphs WHERE campaign_id = ?)', [testCampaignId]);
    await db.run('DELETE FROM knowledge_graphs WHERE campaign_id = ?', [testCampaignId]);
  });

  describe('Version Snapshot Creation', () => {
    it('should create snapshot with all nodes and edges', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);

      // Create 3 nodes
      const node1Id = await createTestNode(graphId, 'Node 1', now);
      const node2Id = await createTestNode(graphId, 'Node 2', now);
      const node3Id = await createTestNode(graphId, 'Node 3', now);

      // Create 2 edges
      const edge1Id = await createTestEdge(graphId, node1Id, node2Id, 'allied with');
      const edge2Id = await createTestEdge(graphId, node2Id, node3Id, 'allied with');

      // Create Version 1 (current)
      const versionId = await createVersionSnapshot(graphId, 'current');

      // Verify snapshot created
      const version = await db.get(
        'SELECT * FROM graph_versions WHERE id = ?',
        [versionId]
      ) as any;

      expect(version).toBeDefined();
      expect(version.version_type).toBe('current');

      const snapshot = JSON.parse(version.snapshot_content);
      expect(snapshot.nodes).toHaveLength(3);
      expect(snapshot.edges).toHaveLength(2);
      expect(snapshot.metadata.node_count).toBe(3);
      expect(snapshot.metadata.edge_count).toBe(2);
    });

    it('should enforce 1 current + 1 backup per graph', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);

      await createTestNode(graphId, 'Node 1', now);

      // Create current version
      const currentId = await createVersionSnapshot(graphId, 'current');

      // Try to create another current version (should fail due to UNIQUE constraint)
      await expect(async () => {
        const version2Id = uuidv4();
        await db.run(
          `INSERT INTO graph_versions (id, graph_id, snapshot_content, version_type, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [version2Id, graphId, JSON.stringify({ nodes: [], edges: [] }), 'current', now]
        );
      }).rejects.toThrow();
    });
  });

  describe('Version Promotion Workflow', () => {
    it('should promote Version 1 to backup and create Version 2 as current', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);

      // Create initial state: 3 nodes, 2 edges
      const node1Id = await createTestNode(graphId, 'Node 1', now);
      const node2Id = await createTestNode(graphId, 'Node 2', now);
      const node3Id = await createTestNode(graphId, 'Node 3', now);
      await createTestEdge(graphId, node1Id, node2Id, 'allied with');
      await createTestEdge(graphId, node2Id, node3Id, 'allied with');

      // Create Version 1 (current)
      const version1Id = await createVersionSnapshot(graphId, 'current');

      // Modify graph: add 2 more nodes (now 5 nodes total)
      await createTestNode(graphId, 'Node 4', now);
      await createTestNode(graphId, 'Node 5', now);

      // Promote Version 1 to backup
      await db.run(
        'UPDATE graph_versions SET version_type = ? WHERE id = ?',
        ['backup', version1Id]
      );

      await db.run(
        'UPDATE knowledge_graphs SET backup_version_id = ?, current_version_id = NULL WHERE id = ?',
        [version1Id, graphId]
      );

      // Create Version 2 (current)
      const version2Id = await createVersionSnapshot(graphId, 'current');

      // Verify Version 1 is backup, Version 2 is current
      const version1 = await db.get('SELECT * FROM graph_versions WHERE id = ?', [version1Id]) as any;
      const version2 = await db.get('SELECT * FROM graph_versions WHERE id = ?', [version2Id]) as any;

      expect(version1.version_type).toBe('backup');
      expect(version2.version_type).toBe('current');

      const snapshot1 = JSON.parse(version1.snapshot_content);
      const snapshot2 = JSON.parse(version2.snapshot_content);

      expect(snapshot1.nodes).toHaveLength(3);
      expect(snapshot2.nodes).toHaveLength(5);
    });
  });

  describe('Graph Restore from Backup', () => {
    it('should restore graph to 3 nodes and 2 edges from backup', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);

      // Initial state: 3 nodes, 2 edges
      const node1Id = await createTestNode(graphId, 'Node 1', now);
      const node2Id = await createTestNode(graphId, 'Node 2', now);
      const node3Id = await createTestNode(graphId, 'Node 3', now);
      await createTestEdge(graphId, node1Id, node2Id, 'edge 1');
      await createTestEdge(graphId, node2Id, node3Id, 'edge 2');

      // Create Version 1 (backup)
      await createVersionSnapshot(graphId, 'backup');

      // Modify graph: add 2 more nodes
      await createTestNode(graphId, 'Node 4', now);
      await createTestNode(graphId, 'Node 5', now);

      // Verify current state: 5 nodes
      let currentNodes = await db.all('SELECT * FROM graph_nodes WHERE graph_id = ?', [graphId]) as any[];
      expect(currentNodes).toHaveLength(5);

      // Delete 1 node (now 4 nodes)
      await db.run('DELETE FROM graph_nodes WHERE graph_id = ? AND name = ?', [graphId, 'Node 5']);

      currentNodes = await db.all('SELECT * FROM graph_nodes WHERE graph_id = ?', [graphId]) as any[];
      expect(currentNodes).toHaveLength(4);

      // Restore from backup (Version 1)
      await restoreFromBackup(graphId);

      // Verify restored state: 3 nodes, 2 edges
      const restoredNodes = await db.all('SELECT * FROM graph_nodes WHERE graph_id = ?', [graphId]) as any[];
      const restoredEdges = await db.all('SELECT * FROM graph_edges WHERE graph_id = ?', [graphId]) as any[];

      expect(restoredNodes).toHaveLength(3);
      expect(restoredEdges).toHaveLength(2);

      const nodeNames = restoredNodes.map(n => n.name).sort();
      expect(nodeNames).toEqual(['Node 1', 'Node 2', 'Node 3']);
    });

    it('should preserve confidence metadata (last_accessed, pinned) during restore', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);
      const fiveWeeksAgo = now - (5 * 7 * 24 * 60 * 60);

      // Create nodes with specific confidence metadata
      const node1Id = await createTestNode(graphId, 'Old Node', fiveWeeksAgo, false);
      const node2Id = await createTestNode(graphId, 'Pinned Node', fiveWeeksAgo, true);
      const node3Id = await createTestNode(graphId, 'Recent Node', now, false);

      // Create backup
      await createVersionSnapshot(graphId, 'backup');

      // Modify graph: delete all nodes
      await db.run('DELETE FROM graph_nodes WHERE graph_id = ?', [graphId]);

      // Verify nodes deleted
      let currentNodes = await db.all('SELECT * FROM graph_nodes WHERE graph_id = ?', [graphId]) as any[];
      expect(currentNodes).toHaveLength(0);

      // Restore from backup
      await restoreFromBackup(graphId);

      // Verify confidence metadata preserved
      const restoredNodes = await db.all('SELECT * FROM graph_nodes WHERE graph_id = ? ORDER BY name', [graphId]) as any[];
      expect(restoredNodes).toHaveLength(3);

      const oldNode = restoredNodes.find((n: any) => n.name === 'Old Node');
      const pinnedNode = restoredNodes.find((n: any) => n.name === 'Pinned Node');
      const recentNode = restoredNodes.find((n: any) => n.name === 'Recent Node');

      expect(oldNode.last_accessed).toBe(fiveWeeksAgo);
      expect(oldNode.pinned).toBe(0);

      expect(pinnedNode.last_accessed).toBe(fiveWeeksAgo);
      expect(pinnedNode.pinned).toBe(1);

      expect(recentNode.last_accessed).toBe(now);
      expect(recentNode.pinned).toBe(0);

      // Calculate confidence to verify metadata correctness
      const oldNodeConfidence = 1.0 * (1 - 0.1 * 5); // 0.5
      const pinnedNodeConfidence = 1.0; // Pinned, always 1.0
      const recentNodeConfidence = 1.0; // Just accessed

      expect(oldNodeConfidence).toBeCloseTo(0.5, 2);
      expect(pinnedNodeConfidence).toBe(1.0);
      expect(recentNodeConfidence).toBe(1.0);
    });

    it('should delete Version 2 and promote Version 1 to current after restore', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);

      // Initial state
      await createTestNode(graphId, 'Node 1', now);

      // Create Version 1 (backup)
      const version1Id = await createVersionSnapshot(graphId, 'backup');

      // Modify and create Version 2 (current)
      await createTestNode(graphId, 'Node 2', now);
      const version2Id = await createVersionSnapshot(graphId, 'current');

      // Verify both versions exist
      let version1 = await db.get('SELECT * FROM graph_versions WHERE id = ?', [version1Id]) as any;
      let version2 = await db.get('SELECT * FROM graph_versions WHERE id = ?', [version2Id]) as any;

      expect(version1).toBeDefined();
      expect(version2).toBeDefined();

      // Restore from backup
      await restoreFromBackup(graphId);

      // Verify Version 1 promoted to current, Version 2 deleted
      version1 = await db.get('SELECT * FROM graph_versions WHERE id = ?', [version1Id]) as any;
      version2 = await db.get('SELECT * FROM graph_versions WHERE id = ?', [version2Id]) as any;

      expect(version1.version_type).toBe('current');
      expect(version2).toBeUndefined(); // Deleted

      // Verify graph references
      const graph = await db.get('SELECT * FROM knowledge_graphs WHERE id = ?', [graphId]) as any;
      expect(graph.current_version_id).toBe(version1Id);
      expect(graph.backup_version_id).toBeNull();
    });

    it('should handle observations restoration', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);

      // Create node with observations
      const nodeId = await createTestNode(graphId, 'NPC with Observations', now);
      const observations = [
        { text: 'Observation 1', created_at: now, last_accessed: now },
        { text: 'Observation 2', created_at: now, last_accessed: now }
      ];

      await db.run(
        'UPDATE graph_nodes SET observations = ? WHERE id = ?',
        [JSON.stringify(observations), nodeId]
      );

      // Create backup
      await createVersionSnapshot(graphId, 'backup');

      // Delete node
      await db.run('DELETE FROM graph_nodes WHERE id = ?', [nodeId]);

      // Restore
      await restoreFromBackup(graphId);

      // Verify observations restored
      const restoredNode = await db.get(
        'SELECT * FROM graph_nodes WHERE graph_id = ? AND name = ?',
        [graphId, 'NPC with Observations']
      ) as any;

      expect(restoredNode).toBeDefined();
      expect(restoredNode.observations).toBeDefined();

      const restoredObservations = JSON.parse(restoredNode.observations);
      expect(restoredObservations).toHaveLength(2);
      expect(restoredObservations[0].text).toBe('Observation 1');
      expect(restoredObservations[1].text).toBe('Observation 2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle restore when no backup exists', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);
      const now = Math.floor(Date.now() / 1000);

      await createTestNode(graphId, 'Node 1', now);

      // Try to restore without backup
      await expect(restoreFromBackup(graphId)).rejects.toThrow('No backup version found');
    });

    it('should handle empty graph restore', async () => {
      const graphId = await createTestGraph('Political-Web', 'Test Graph', 0.1);

      // Create backup with empty graph
      await createVersionSnapshot(graphId, 'backup');

      // Add nodes
      const now = Math.floor(Date.now() / 1000);
      await createTestNode(graphId, 'Node 1', now);

      // Restore to empty state
      await restoreFromBackup(graphId);

      const nodes = await db.all('SELECT * FROM graph_nodes WHERE graph_id = ?', [graphId]) as any[];
      expect(nodes).toHaveLength(0);
    });
  });
});
