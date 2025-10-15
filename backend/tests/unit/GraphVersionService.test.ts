/**
 * GraphVersionService Unit Tests
 * Feature: 006-create-the-knowledge
 * Task: T024
 *
 * Unit tests for 1-deep versioning logic.
 * Tests version snapshot creation, backup management, and restore functionality.
 *
 * IMPORTANT: This test MUST FAIL until GraphVersionService is implemented (TDD)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphVersionService } from '../../src/services/GraphVersionService';
import { KnowledgeGraph, GraphNode, GraphEdge } from '../../src/models/KnowledgeGraph';

describe('GraphVersionService', () => {
  let service: GraphVersionService;

  const createMockGraph = (): KnowledgeGraph => ({
    id: 'graph-1',
    campaign_id: 'campaign-123',
    graph_type: 'Political-Web',
    graph_name: 'Test Political Web',
    toggle_state: true,
    decay_rate: 0.1,
    maintenance_rules: null,
    created_at: 1735689600, // 2025-01-01
    updated_at: 1735689600,
    current_version_id: null,
    backup_version_id: null,
  });

  const createMockNodes = (): GraphNode[] => [
    {
      id: 'node-1',
      graph_id: 'graph-1',
      node_type: 'NPC',
      name: 'Lord Eddard',
      attributes: { role: 'Hand of the King' },
      observations: [
        {
          text: 'Currently investigating Jon Arryn\'s death',
          created_at: 1735689600,
          last_accessed: 1735689600,
        },
      ],
      information_level_id: null,
      created_at: 1735689600,
      last_accessed: 1735689600,
      pinned: false,
    },
    {
      id: 'node-2',
      graph_id: 'graph-1',
      node_type: 'NPC',
      name: 'Lord Varys',
      attributes: { role: 'Master of Whisperers' },
      observations: null,
      information_level_id: null,
      created_at: 1735689600,
      last_accessed: 1735689600,
      pinned: true,
    },
  ];

  const createMockEdges = (): GraphEdge[] => [
    {
      id: 'edge-1',
      graph_id: 'graph-1',
      edge_type: 'distrusts',
      source_node_id: 'node-1',
      target_node_id: 'node-2',
      directed: true,
      metadata: { strength: 0.7 },
      created_at: 1735689600,
    },
  ];

  beforeEach(() => {
    service = new GraphVersionService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createVersion() - Snapshot Creation', () => {
    it('should create version snapshot with all nodes and edges', async () => {
      const graph = createMockGraph();
      const nodes = createMockNodes();
      const edges = createMockEdges();

      const version = await service.createVersion(graph, nodes, edges);

      expect(version).toBeDefined();
      expect(version.graph_id).toBe(graph.id);
      expect(version.snapshot_content).toBeDefined();
      expect(version.snapshot_content.nodes).toHaveLength(2);
      expect(version.snapshot_content.edges).toHaveLength(1);
      expect(version.created_at).toBe(Math.floor(Date.now() / 1000));
    });

    it('should include all node metadata in snapshot', async () => {
      const graph = createMockGraph();
      const nodes = createMockNodes();
      const edges = createMockEdges();

      const version = await service.createVersion(graph, nodes, edges);

      const snapshotNode = version.snapshot_content.nodes[0];
      expect(snapshotNode.id).toBe('node-1');
      expect(snapshotNode.name).toBe('Lord Eddard');
      expect(snapshotNode.attributes).toEqual({ role: 'Hand of the King' });
      expect(snapshotNode.observations).toHaveLength(1);
      expect(snapshotNode.created_at).toBe(1735689600);
      expect(snapshotNode.last_accessed).toBe(1735689600);
      expect(snapshotNode.pinned).toBe(false);
    });

    it('should include all edge metadata in snapshot', async () => {
      const graph = createMockGraph();
      const nodes = createMockNodes();
      const edges = createMockEdges();

      const version = await service.createVersion(graph, nodes, edges);

      const snapshotEdge = version.snapshot_content.edges[0];
      expect(snapshotEdge.id).toBe('edge-1');
      expect(snapshotEdge.edge_type).toBe('distrusts');
      expect(snapshotEdge.source_node_id).toBe('node-1');
      expect(snapshotEdge.target_node_id).toBe('node-2');
      expect(snapshotEdge.directed).toBe(true);
      expect(snapshotEdge.metadata).toEqual({ strength: 0.7 });
    });

    it('should handle graphs with no nodes or edges', async () => {
      const graph = createMockGraph();
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      const version = await service.createVersion(graph, nodes, edges);

      expect(version.snapshot_content.nodes).toHaveLength(0);
      expect(version.snapshot_content.edges).toHaveLength(0);
    });

    it('should include version metadata (timestamp, node/edge counts)', async () => {
      const graph = createMockGraph();
      const nodes = createMockNodes();
      const edges = createMockEdges();

      const version = await service.createVersion(graph, nodes, edges);

      expect(version.version_metadata).toBeDefined();
      expect(version.version_metadata.node_count).toBe(2);
      expect(version.version_metadata.edge_count).toBe(1);
      expect(version.version_metadata.created_at).toBe(Math.floor(Date.now() / 1000));
    });
  });

  describe('1-Deep Versioning Enforcement', () => {
    it('should promote current version to backup when creating new version', async () => {
      const graph = createMockGraph();
      graph.current_version_id = 'version-1';
      graph.backup_version_id = null;

      const nodes = createMockNodes();
      const edges = createMockEdges();

      const result = await service.createVersionAndRotate(graph, nodes, edges);

      // Old current becomes backup
      expect(result.graph.backup_version_id).toBe('version-1');
      // New version becomes current
      expect(result.graph.current_version_id).toBe(result.newVersion.id);
      expect(result.graph.current_version_id).not.toBe('version-1');
    });

    it('should delete oldest backup when creating new version (1-deep limit)', async () => {
      const graph = createMockGraph();
      graph.current_version_id = 'version-2';
      graph.backup_version_id = 'version-1'; // This should be deleted

      const nodes = createMockNodes();
      const edges = createMockEdges();

      const result = await service.createVersionAndRotate(graph, nodes, edges);

      // Old backup (version-1) should be deleted
      expect(result.deletedVersionId).toBe('version-1');
      // Old current (version-2) becomes new backup
      expect(result.graph.backup_version_id).toBe('version-2');
      // New version becomes current
      expect(result.graph.current_version_id).toBe(result.newVersion.id);
    });

    it('should maintain exactly 1 current + 1 backup version', async () => {
      const graph = createMockGraph();
      const nodes = createMockNodes();
      const edges = createMockEdges();

      // Create first version
      let result = await service.createVersionAndRotate(graph, nodes, edges);
      expect(result.graph.current_version_id).toBeDefined();
      expect(result.graph.backup_version_id).toBeNull();

      // Create second version
      result = await service.createVersionAndRotate(result.graph, nodes, edges);
      expect(result.graph.current_version_id).toBeDefined();
      expect(result.graph.backup_version_id).toBeDefined();

      // Create third version (should delete oldest)
      result = await service.createVersionAndRotate(result.graph, nodes, edges);
      expect(result.graph.current_version_id).toBeDefined();
      expect(result.graph.backup_version_id).toBeDefined();
      expect(result.deletedVersionId).toBeDefined();
    });

    it('should handle first version creation (no previous versions)', async () => {
      const graph = createMockGraph();
      const nodes = createMockNodes();
      const edges = createMockEdges();

      const result = await service.createVersionAndRotate(graph, nodes, edges);

      expect(result.graph.current_version_id).toBe(result.newVersion.id);
      expect(result.graph.backup_version_id).toBeNull();
      expect(result.deletedVersionId).toBeNull();
    });
  });

  describe('restoreFromBackup() - Version Restore', () => {
    it('should restore graph from backup version', async () => {
      const graph = createMockGraph();
      graph.current_version_id = 'version-2';
      graph.backup_version_id = 'version-1';

      const backupNodes: GraphNode[] = [
        {
          id: 'node-old',
          graph_id: 'graph-1',
          node_type: 'NPC',
          name: 'Old NPC',
          attributes: { status: 'backup' },
          observations: null,
          information_level_id: null,
          created_at: 1735689600,
          last_accessed: 1735689600,
          pinned: false,
        },
      ];
      const backupEdges: GraphEdge[] = [];

      const result = await service.restoreFromBackup(graph, backupNodes, backupEdges);

      expect(result).toBeDefined();
      expect(result.restoredNodes).toHaveLength(1);
      expect(result.restoredNodes[0].name).toBe('Old NPC');
      expect(result.restoredEdges).toHaveLength(0);
    });

    it('should swap backup to current after restore', async () => {
      const graph = createMockGraph();
      graph.current_version_id = 'version-2';
      graph.backup_version_id = 'version-1';

      const backupNodes = createMockNodes();
      const backupEdges = createMockEdges();

      const result = await service.restoreFromBackup(graph, backupNodes, backupEdges);

      // Backup becomes current
      expect(result.graph.current_version_id).toBe('version-1');
      // Old current is deleted (not kept as backup)
      expect(result.deletedVersionId).toBe('version-2');
    });

    it('should restore all node timestamps (created_at, last_accessed, pinned)', async () => {
      const graph = createMockGraph();
      graph.current_version_id = 'version-2';
      graph.backup_version_id = 'version-1';

      const backupNodes: GraphNode[] = [
        {
          id: 'node-1',
          graph_id: 'graph-1',
          node_type: 'NPC',
          name: 'Test NPC',
          attributes: {},
          observations: [
            {
              text: 'Old observation',
              created_at: 1735689600,
              last_accessed: 1735689600,
            },
          ],
          information_level_id: null,
          created_at: 1735689600,
          last_accessed: 1735689600,
          pinned: true,
        },
      ];
      const backupEdges: GraphEdge[] = [];

      const result = await service.restoreFromBackup(graph, backupNodes, backupEdges);

      const restoredNode = result.restoredNodes[0];
      expect(restoredNode.created_at).toBe(1735689600);
      expect(restoredNode.last_accessed).toBe(1735689600);
      expect(restoredNode.pinned).toBe(true);
      expect(restoredNode.observations?.[0].created_at).toBe(1735689600);
      expect(restoredNode.observations?.[0].last_accessed).toBe(1735689600);
    });

    it('should throw error if no backup exists', async () => {
      const graph = createMockGraph();
      graph.current_version_id = 'version-1';
      graph.backup_version_id = null; // No backup

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      await expect(service.restoreFromBackup(graph, nodes, edges)).rejects.toThrow(
        'No backup version available'
      );
    });

    it('should restore observation timestamps independently', async () => {
      const graph = createMockGraph();
      graph.current_version_id = 'version-2';
      graph.backup_version_id = 'version-1';

      const backupNodes: GraphNode[] = [
        {
          id: 'node-1',
          graph_id: 'graph-1',
          node_type: 'NPC',
          name: 'Test NPC',
          attributes: {},
          observations: [
            {
              text: 'First observation',
              created_at: 1735689600,
              last_accessed: 1735689600,
            },
            {
              text: 'Second observation',
              created_at: 1735776000,
              last_accessed: 1735776000,
            },
          ],
          information_level_id: null,
          created_at: 1735689600,
          last_accessed: 1735776000,
          pinned: false,
        },
      ];
      const backupEdges: GraphEdge[] = [];

      const result = await service.restoreFromBackup(graph, backupNodes, backupEdges);

      const restoredNode = result.restoredNodes[0];
      expect(restoredNode.observations).toHaveLength(2);
      expect(restoredNode.observations?.[0].created_at).toBe(1735689600);
      expect(restoredNode.observations?.[1].created_at).toBe(1735776000);
    });
  });

  describe('Version Snapshot Content', () => {
    it('should include all node attributes in snapshot', async () => {
      const graph = createMockGraph();
      const nodes: GraphNode[] = [
        {
          id: 'node-1',
          graph_id: 'graph-1',
          node_type: 'Location',
          name: 'Waterdeep',
          attributes: {
            population: 130000,
            ruler: 'Open Lord Laeral Silverhand',
            districts: ['Castle Ward', 'Sea Ward', 'Dock Ward'],
          },
          observations: null,
          information_level_id: null,
          created_at: 1735689600,
          last_accessed: 1735689600,
          pinned: false,
        },
      ];
      const edges: GraphEdge[] = [];

      const version = await service.createVersion(graph, nodes, edges);

      const snapshotNode = version.snapshot_content.nodes[0];
      expect(snapshotNode.attributes.population).toBe(130000);
      expect(snapshotNode.attributes.ruler).toBe('Open Lord Laeral Silverhand');
      expect(snapshotNode.attributes.districts).toEqual(['Castle Ward', 'Sea Ward', 'Dock Ward']);
    });

    it('should include edge metadata in snapshot', async () => {
      const graph = createMockGraph();
      const nodes = createMockNodes();
      const edges: GraphEdge[] = [
        {
          id: 'edge-1',
          graph_id: 'graph-1',
          edge_type: 'allied with',
          source_node_id: 'node-1',
          target_node_id: 'node-2',
          directed: false,
          metadata: {
            alliance_type: 'military',
            strength: 0.9,
            since: '998 DR',
          },
          created_at: 1735689600,
        },
      ];

      const version = await service.createVersion(graph, nodes, edges);

      const snapshotEdge = version.snapshot_content.edges[0];
      expect(snapshotEdge.metadata?.alliance_type).toBe('military');
      expect(snapshotEdge.metadata?.strength).toBe(0.9);
      expect(snapshotEdge.metadata?.since).toBe('998 DR');
    });

    it('should NOT store calculated confidence values in snapshot', async () => {
      const graph = createMockGraph();
      const nodes: GraphNode[] = [
        {
          id: 'node-1',
          graph_id: 'graph-1',
          node_type: 'NPC',
          name: 'Test NPC',
          attributes: {},
          observations: null,
          information_level_id: null,
          created_at: 1735689600,
          last_accessed: 1735689600,
          pinned: false,
          confidence: 0.8, // This should NOT be stored
        },
      ];
      const edges: GraphEdge[] = [];

      const version = await service.createVersion(graph, nodes, edges);

      const snapshotNode = version.snapshot_content.nodes[0];
      expect(snapshotNode.confidence).toBeUndefined();
      // Only timestamps should be stored, confidence recalculated on-demand
      expect(snapshotNode.created_at).toBeDefined();
      expect(snapshotNode.last_accessed).toBeDefined();
    });
  });

  describe('Confidence Metadata Restoration', () => {
    it('should restore all confidence-related timestamps', async () => {
      const graph = createMockGraph();
      graph.current_version_id = 'version-2';
      graph.backup_version_id = 'version-1';

      const backupNodes: GraphNode[] = [
        {
          id: 'node-1',
          graph_id: 'graph-1',
          node_type: 'NPC',
          name: 'Test NPC',
          attributes: {},
          observations: null,
          information_level_id: null,
          created_at: 1735689600,
          last_accessed: 1735689600,
          pinned: false,
        },
      ];
      const backupEdges: GraphEdge[] = [];

      const result = await service.restoreFromBackup(graph, backupNodes, backupEdges);

      const restoredNode = result.restoredNodes[0];
      expect(restoredNode.created_at).toBe(1735689600);
      expect(restoredNode.last_accessed).toBe(1735689600);
      expect(restoredNode.pinned).toBe(false);
    });

    it('should restore pinned flag from backup', async () => {
      const graph = createMockGraph();
      graph.current_version_id = 'version-2';
      graph.backup_version_id = 'version-1';

      const backupNodes: GraphNode[] = [
        {
          id: 'node-1',
          graph_id: 'graph-1',
          node_type: 'NPC',
          name: 'Pinned BBEG',
          attributes: {},
          observations: null,
          information_level_id: null,
          created_at: 1735689600,
          last_accessed: 1735689600,
          pinned: true, // Was pinned in backup
        },
      ];
      const backupEdges: GraphEdge[] = [];

      const result = await service.restoreFromBackup(graph, backupNodes, backupEdges);

      const restoredNode = result.restoredNodes[0];
      expect(restoredNode.pinned).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty observations array', async () => {
      const graph = createMockGraph();
      const nodes: GraphNode[] = [
        {
          id: 'node-1',
          graph_id: 'graph-1',
          node_type: 'NPC',
          name: 'Test NPC',
          attributes: {},
          observations: [], // Empty array
          information_level_id: null,
          created_at: 1735689600,
          last_accessed: 1735689600,
          pinned: false,
        },
      ];
      const edges: GraphEdge[] = [];

      const version = await service.createVersion(graph, nodes, edges);

      expect(version.snapshot_content.nodes[0].observations).toEqual([]);
    });

    it('should handle null observations', async () => {
      const graph = createMockGraph();
      const nodes: GraphNode[] = [
        {
          id: 'node-1',
          graph_id: 'graph-1',
          node_type: 'NPC',
          name: 'Test NPC',
          attributes: {},
          observations: null, // Null
          information_level_id: null,
          created_at: 1735689600,
          last_accessed: 1735689600,
          pinned: false,
        },
      ];
      const edges: GraphEdge[] = [];

      const version = await service.createVersion(graph, nodes, edges);

      expect(version.snapshot_content.nodes[0].observations).toBeNull();
    });

    it('should handle edges with null metadata', async () => {
      const graph = createMockGraph();
      const nodes = createMockNodes();
      const edges: GraphEdge[] = [
        {
          id: 'edge-1',
          graph_id: 'graph-1',
          edge_type: 'knows',
          source_node_id: 'node-1',
          target_node_id: 'node-2',
          directed: true,
          metadata: null, // Null metadata
          created_at: 1735689600,
        },
      ];

      const version = await service.createVersion(graph, nodes, edges);

      expect(version.snapshot_content.edges[0].metadata).toBeNull();
    });

    it('should handle large graphs efficiently', async () => {
      const graph = createMockGraph();
      const nodes: GraphNode[] = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        graph_id: 'graph-1',
        node_type: 'NPC',
        name: `NPC ${i}`,
        attributes: { index: i },
        observations: null,
        information_level_id: null,
        created_at: 1735689600,
        last_accessed: 1735689600,
        pinned: false,
      }));
      const edges: GraphEdge[] = Array.from({ length: 200 }, (_, i) => ({
        id: `edge-${i}`,
        graph_id: 'graph-1',
        edge_type: 'knows',
        source_node_id: `node-${i % 100}`,
        target_node_id: `node-${(i + 1) % 100}`,
        directed: true,
        metadata: null,
        created_at: 1735689600,
      }));

      const version = await service.createVersion(graph, nodes, edges);

      expect(version.snapshot_content.nodes).toHaveLength(100);
      expect(version.snapshot_content.edges).toHaveLength(200);
      expect(version.version_metadata.node_count).toBe(100);
      expect(version.version_metadata.edge_count).toBe(200);
    });
  });
});
