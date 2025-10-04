import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeGraphService } from '../../src/services/KnowledgeGraphService';
import { ActiveFilteringService } from '../../src/services/ActiveFilteringService';
import Database from 'better-sqlite3';

describe('KnowledgeGraphService', () => {
  let graphService: KnowledgeGraphService;
  let activeFilteringService: ActiveFilteringService;
  let db: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Create necessary tables
    db.exec(`
      CREATE TABLE knowledge_graphs (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE graph_nodes (
        id TEXT PRIMARY KEY,
        graph_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        attributes TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id)
      );

      CREATE TABLE graph_edges (
        id TEXT PRIMARY KEY,
        graph_id TEXT NOT NULL,
        source_node_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        type TEXT NOT NULL,
        attributes TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id),
        FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id),
        FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id)
      );
    `);

    activeFilteringService = new ActiveFilteringService(db);
    graphService = new KnowledgeGraphService(db, activeFilteringService);
  });

  describe('initializeGraphsForCampaign', () => {
    it('should create 4 default knowledge graphs for a campaign', async () => {
      const campaignId = 'campaign-123';

      await graphService.initializeGraphsForCampaign(campaignId);

      const graphs = db.prepare(
        'SELECT * FROM knowledge_graphs WHERE campaign_id = ?'
      ).all(campaignId);

      expect(graphs).toHaveLength(4);

      const graphTypes = graphs.map(g => g.type);
      expect(graphTypes).toContain('geographical');
      expect(graphTypes).toContain('political-web');
      expect(graphTypes).toContain('world-foundations');
      expect(graphTypes).toContain('campaign-story');
    });

    it('should not create duplicate graphs', async () => {
      const campaignId = 'campaign-123';

      await graphService.initializeGraphsForCampaign(campaignId);
      await graphService.initializeGraphsForCampaign(campaignId); // Second call

      const graphs = db.prepare(
        'SELECT * FROM knowledge_graphs WHERE campaign_id = ?'
      ).all(campaignId);

      expect(graphs).toHaveLength(4); // Still only 4, not 8
    });
  });

  describe('addNode', () => {
    let graphId: string;

    beforeEach(async () => {
      await graphService.initializeGraphsForCampaign('campaign-123');
      const graph = db.prepare(
        'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND type = ?'
      ).get('campaign-123', 'political-web');
      graphId = graph.id;
    });

    it('should add a node to the graph', async () => {
      const node = await graphService.addNode(graphId, {
        type: 'npc',
        name: 'Lord Blackwood',
        attributes: {
          title: 'Duke',
          alignment: 'Lawful Evil',
          tags: ['nobility', 'antagonist']
        }
      });

      expect(node).toMatchObject({
        id: expect.any(String),
        graph_id: graphId,
        type: 'npc',
        name: 'Lord Blackwood'
      });

      // Verify it was saved to database
      const savedNode = db.prepare('SELECT * FROM graph_nodes WHERE id = ?').get(node.id);
      expect(savedNode).toBeTruthy();
      expect(JSON.parse(savedNode.attributes)).toMatchObject({
        title: 'Duke',
        alignment: 'Lawful Evil'
      });
    });

    it('should generate unique node IDs', async () => {
      const node1 = await graphService.addNode(graphId, {
        type: 'npc',
        name: 'NPC 1'
      });

      const node2 = await graphService.addNode(graphId, {
        type: 'npc',
        name: 'NPC 2'
      });

      expect(node1.id).not.toEqual(node2.id);
    });
  });

  describe('addEdge', () => {
    let graphId: string;
    let node1Id: string;
    let node2Id: string;

    beforeEach(async () => {
      await graphService.initializeGraphsForCampaign('campaign-123');
      const graph = db.prepare(
        'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND type = ?'
      ).get('campaign-123', 'political-web');
      graphId = graph.id;

      // Create two nodes to connect
      const node1 = await graphService.addNode(graphId, {
        type: 'npc',
        name: 'Queen Elysia'
      });
      node1Id = node1.id;

      const node2 = await graphService.addNode(graphId, {
        type: 'npc',
        name: 'Prince Aldric'
      });
      node2Id = node2.id;
    });

    it('should add an edge between nodes', async () => {
      const edge = await graphService.addEdge(graphId, {
        source_node_id: node1Id,
        target_node_id: node2Id,
        type: 'family',
        attributes: {
          relationship: 'mother-son'
        }
      });

      expect(edge).toMatchObject({
        id: expect.any(String),
        graph_id: graphId,
        source_node_id: node1Id,
        target_node_id: node2Id,
        type: 'family'
      });

      // Verify it was saved to database
      const savedEdge = db.prepare('SELECT * FROM graph_edges WHERE id = ?').get(edge.id);
      expect(savedEdge).toBeTruthy();
      expect(JSON.parse(savedEdge.attributes)).toMatchObject({
        relationship: 'mother-son'
      });
    });

    it('should validate that nodes exist before creating edge', async () => {
      await expect(
        graphService.addEdge(graphId, {
          source_node_id: 'non-existent-1',
          target_node_id: 'non-existent-2',
          type: 'alliance'
        })
      ).rejects.toThrow('Source node not found');
    });

    it('should validate that nodes are in the same graph', async () => {
      // Create a node in a different graph
      const otherGraph = db.prepare(
        'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND type = ?'
      ).get('campaign-123', 'geographical');

      const otherNode = await graphService.addNode(otherGraph.id, {
        type: 'location',
        name: 'Castle'
      });

      await expect(
        graphService.addEdge(graphId, {
          source_node_id: node1Id,
          target_node_id: otherNode.id,
          type: 'resides'
        })
      ).rejects.toThrow('Nodes must be in the same graph');
    });
  });

  describe('updateNode', () => {
    let nodeId: string;

    beforeEach(async () => {
      await graphService.initializeGraphsForCampaign('campaign-123');
      const graph = db.prepare(
        'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND type = ?'
      ).get('campaign-123', 'world-foundations');

      const node = await graphService.addNode(graph.id, {
        type: 'concept',
        name: 'Magic System',
        attributes: {
          description: 'Initial description',
          power_level: 'high'
        }
      });
      nodeId = node.id;
    });

    it('should update node attributes by merging', async () => {
      const updated = await graphService.updateNode(nodeId, {
        attributes: {
          description: 'Updated description',
          limitations: ['Cannot resurrect', 'Requires components']
        }
      });

      expect(updated.attributes).toMatchObject({
        description: 'Updated description',
        power_level: 'high', // Original attribute retained
        limitations: expect.arrayContaining(['Cannot resurrect'])
      });
    });

    it('should update node name if provided', async () => {
      const updated = await graphService.updateNode(nodeId, {
        name: 'Arcane Magic System'
      });

      expect(updated.name).toBe('Arcane Magic System');
    });

    it('should throw error if node not found', async () => {
      await expect(
        graphService.updateNode('non-existent', { attributes: {} })
      ).rejects.toThrow('Node not found');
    });
  });

  describe('deleteNode', () => {
    let graphId: string;
    let nodeId: string;

    beforeEach(async () => {
      await graphService.initializeGraphsForCampaign('campaign-123');
      const graph = db.prepare(
        'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND type = ?'
      ).get('campaign-123', 'campaign-story');
      graphId = graph.id;

      const node = await graphService.addNode(graphId, {
        type: 'plot-point',
        name: 'The Betrayal'
      });
      nodeId = node.id;
    });

    it('should delete node and cascade delete edges', async () => {
      // Add another node and create an edge
      const node2 = await graphService.addNode(graphId, {
        type: 'plot-point',
        name: 'The Revelation'
      });

      await graphService.addEdge(graphId, {
        source_node_id: nodeId,
        target_node_id: node2.id,
        type: 'leads-to'
      });

      // Delete the first node
      const result = await graphService.deleteNode(nodeId);

      expect(result.deleted).toBe(true);
      expect(result.edges_deleted).toBe(1);

      // Verify node is deleted
      const deletedNode = db.prepare('SELECT * FROM graph_nodes WHERE id = ?').get(nodeId);
      expect(deletedNode).toBeUndefined();

      // Verify edge is deleted
      const edges = db.prepare('SELECT * FROM graph_edges WHERE source_node_id = ? OR target_node_id = ?')
        .all(nodeId, nodeId);
      expect(edges).toHaveLength(0);
    });
  });

  describe('getGraphWithNodes', () => {
    let graphId: string;
    let campaignId = 'campaign-123';

    beforeEach(async () => {
      await graphService.initializeGraphsForCampaign(campaignId);
      const graph = db.prepare(
        'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND type = ?'
      ).get(campaignId, 'political-web');
      graphId = graph.id;

      // Add some nodes and edges
      const node1 = await graphService.addNode(graphId, {
        type: 'npc',
        name: 'Active NPC',
        attributes: { tags: ['active', 'party-relevant'] }
      });

      const node2 = await graphService.addNode(graphId, {
        type: 'npc',
        name: 'Inactive NPC',
        attributes: { tags: ['inactive'] }
      });

      const node3 = await graphService.addNode(graphId, {
        type: 'npc',
        name: 'Recent NPC',
        attributes: { last_mentioned_session: -3 }
      });

      await graphService.addEdge(graphId, {
        source_node_id: node1.id,
        target_node_id: node2.id,
        type: 'knows'
      });
    });

    it('should get full graph without filtering', async () => {
      const graph = await graphService.getGraphWithNodes(campaignId, 'political-web');

      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(1);
    });

    it('should apply active filtering to political-web graph', async () => {
      const graph = await graphService.getGraphWithNodes(
        campaignId,
        'political-web',
        { filter: 'active' }
      );

      // Should only include nodes with active tags or recent mentions
      expect(graph.nodes.length).toBeLessThan(3);

      const nodeNames = graph.nodes.map(n => n.name);
      expect(nodeNames).toContain('Active NPC');
      expect(nodeNames).toContain('Recent NPC');
      expect(nodeNames).not.toContain('Inactive NPC');
    });

    it('should not filter geographical graph even with active filter', async () => {
      const geoGraph = db.prepare(
        'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND type = ?'
      ).get(campaignId, 'geographical');

      // Add nodes to geographical graph
      await graphService.addNode(geoGraph.id, {
        type: 'location',
        name: 'City 1',
        attributes: { tags: ['inactive'] }
      });

      await graphService.addNode(geoGraph.id, {
        type: 'location',
        name: 'City 2',
        attributes: { tags: ['active'] }
      });

      const graph = await graphService.getGraphWithNodes(
        campaignId,
        'geographical',
        { filter: 'active' }
      );

      // Geographical graphs don't support active filtering
      expect(graph.nodes).toHaveLength(2);
    });
  });

  describe('atomicBatchUpdate', () => {
    let graphId: string;

    beforeEach(async () => {
      await graphService.initializeGraphsForCampaign('campaign-123');
      const graph = db.prepare(
        'SELECT id FROM knowledge_graphs WHERE campaign_id = ? AND type = ?'
      ).get('campaign-123', 'campaign-story');
      graphId = graph.id;
    });

    it('should execute multiple operations atomically', async () => {
      const operations = [
        {
          type: 'add_node',
          data: {
            type: 'plot-point',
            name: 'The Quest Begins'
          }
        },
        {
          type: 'add_node',
          data: {
            type: 'plot-point',
            name: 'The First Challenge'
          }
        },
        {
          type: 'add_edge',
          data: {
            source_name: 'The Quest Begins',
            target_name: 'The First Challenge',
            type: 'leads-to'
          }
        }
      ];

      const result = await graphService.atomicBatchUpdate(graphId, operations);

      expect(result.nodes_added).toBe(2);
      expect(result.edges_added).toBe(1);
      expect(result.success).toBe(true);

      // Verify all operations completed
      const nodes = db.prepare('SELECT * FROM graph_nodes WHERE graph_id = ?').all(graphId);
      expect(nodes).toHaveLength(2);

      const edges = db.prepare('SELECT * FROM graph_edges WHERE graph_id = ?').all(graphId);
      expect(edges).toHaveLength(1);
    });

    it('should rollback all operations on failure', async () => {
      const operations = [
        {
          type: 'add_node',
          data: {
            type: 'plot-point',
            name: 'Valid Node'
          }
        },
        {
          type: 'add_edge',
          data: {
            source_name: 'Non-existent Node',
            target_name: 'Another Non-existent',
            type: 'invalid'
          }
        }
      ];

      await expect(
        graphService.atomicBatchUpdate(graphId, operations)
      ).rejects.toThrow();

      // Verify rollback - no nodes should be added
      const nodes = db.prepare('SELECT * FROM graph_nodes WHERE graph_id = ?').all(graphId);
      expect(nodes).toHaveLength(0);
    });
  });
});