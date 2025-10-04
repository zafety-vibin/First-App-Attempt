/**
 * Knowledge Graphs API Routes
 * Feature: 005-create-the-ai
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../services/DatabaseService';
import { rowToKnowledgeGraph } from '../models/KnowledgeGraph';
import { rowToGraphNode } from '../models/GraphNode';
import { rowToGraphEdge } from '../models/GraphEdge';

const router = Router();

/**
 * GET /api/graphs
 * Get all knowledge graphs for a campaign
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.query;
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }

    const graphs = db.prepare(`
      SELECT kg.*,
             (SELECT COUNT(*) FROM graph_nodes WHERE graph_id = kg.id) as node_count,
             (SELECT COUNT(*) FROM graph_edges WHERE graph_id = kg.id) as edge_count
      FROM knowledge_graphs kg
      WHERE campaign_id = ?
      ORDER BY type
    `).all(campaignId as string) as any[];

    const knowledgeGraphs = graphs.map(row => ({
      ...rowToKnowledgeGraph(row),
      nodeCount: row.node_count,
      edgeCount: row.edge_count
    }));

    res.json(knowledgeGraphs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/graphs/:type
 * Get a specific graph type with nodes and edges
 */
router.get('/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { campaignId, active_only } = req.query;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }


    // Get graph
    const graph = db.prepare(`
      SELECT * FROM knowledge_graphs
      WHERE campaign_id = ? AND type = ?
    `).get(campaignId as string, type) as any;

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    // Build node query with optional active filtering
    let nodeQuery = `
      SELECT * FROM graph_nodes
      WHERE graph_id = ?
    `;

    const nodeParams: any[] = [graph.id];

    // Apply active filtering for Political-Web and Campaign-Story
    if (active_only === 'true' &&
        (type === 'political_web' || type === 'campaign_story')) {

      // Get recent session IDs
      const recentSessions = db.prepare(`
        SELECT id FROM cards
        WHERE campaign_id = ?
        AND card_type = 'text'
        AND title LIKE '%Session%'
        ORDER BY created_at DESC
        LIMIT 5
      `).all(campaignId as string).map((r: any) => r.id);

      if (recentSessions.length > 0) {
        nodeQuery += ` AND (
          json_extract(attributes, '$.tags') LIKE '%active%'
          OR json_extract(attributes, '$.tags') LIKE '%party-relevant%'
          OR source_card_id IN (${recentSessions.map(() => '?').join(',')})
        )`;
        nodeParams.push(...recentSessions);
      }
    }

    nodeQuery += ' ORDER BY name';

    // Get nodes
    const nodes = db.prepare(nodeQuery).all(...nodeParams) as any[];

    // Get edges (filtered to active nodes if applicable)
    let edgeQuery = `
      SELECT * FROM graph_edges
      WHERE graph_id = ?
    `;

    const edgeParams: any[] = [graph.id];

    if (active_only === 'true' && nodes.length > 0) {
      const activeNodeIds = nodes.map((n: any) => n.id);
      edgeQuery += ` AND source_node_id IN (${activeNodeIds.map(() => '?').join(',')})
                      AND target_node_id IN (${activeNodeIds.map(() => '?').join(',')})`;
      edgeParams.push(...activeNodeIds, ...activeNodeIds);
    }

    const edges = db.prepare(edgeQuery).all(...edgeParams) as any[];

    res.json({
      graph: rowToKnowledgeGraph(graph),
      nodes: nodes.map(rowToGraphNode),
      edges: edges.map(rowToGraphEdge),
      activeFilter: active_only === 'true'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/graphs/:type/nodes
 * Create a new node in a graph
 */
router.post('/:type/nodes', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { campaignId, nodeType, name, attributes, sourceCardId, informationLevelId } = req.body;

    if (!campaignId || !nodeType || !name) {
      return res.status(400).json({ error: 'Campaign ID, node type, and name required' });
    }


    // Get or create graph
    let graph = db.prepare(`
      SELECT id FROM knowledge_graphs
      WHERE campaign_id = ? AND type = ?
    `).get(campaignId, type) as any;

    if (!graph) {
      // Create graph if it doesn't exist
      const graphId = crypto.randomBytes(16).toString('hex');
      const timestamp = Math.floor(Date.now() / 1000);

      db.prepare(`
        INSERT INTO knowledge_graphs (id, campaign_id, type, last_updated, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(graphId, campaignId, type, timestamp, timestamp);

      graph = { id: graphId };
    }

    // Create node
    const nodeId = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO graph_nodes (
        id, graph_id, type, name, attributes,
        source_card_id, information_level_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nodeId,
      graph.id,
      nodeType,
      name,
      JSON.stringify(attributes || { description: '', tags: [] }),
      sourceCardId || null,
      informationLevelId || null,
      timestamp,
      timestamp
    );

    // Update graph last_updated
    db.prepare(`
      UPDATE knowledge_graphs SET last_updated = ? WHERE id = ?
    `).run(timestamp, graph.id);

    const node = db.prepare(`
      SELECT * FROM graph_nodes WHERE id = ?
    `).get(nodeId) as any;

    res.json(rowToGraphNode(node));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/graphs/:type/edges
 * Create a new edge in a graph
 */
router.post('/:type/edges', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { campaignId, sourceNodeId, targetNodeId, relationshipType, attributes } = req.body;

    if (!campaignId || !sourceNodeId || !targetNodeId || !relationshipType) {
      return res.status(400).json({
        error: 'Campaign ID, source node ID, target node ID, and relationship type required'
      });
    }


    // Get graph
    const graph = db.prepare(`
      SELECT id FROM knowledge_graphs
      WHERE campaign_id = ? AND type = ?
    `).get(campaignId, type) as any;

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    // Verify nodes exist
    const sourceNode = db.prepare(`
      SELECT id FROM graph_nodes WHERE id = ? AND graph_id = ?
    `).get(sourceNodeId, graph.id);

    const targetNode = db.prepare(`
      SELECT id FROM graph_nodes WHERE id = ? AND graph_id = ?
    `).get(targetNodeId, graph.id);

    if (!sourceNode || !targetNode) {
      return res.status(400).json({ error: 'Source or target node not found' });
    }

    // Create edge
    const edgeId = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO graph_edges (
        id, graph_id, source_node_id, target_node_id,
        relationship_type, attributes, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      edgeId,
      graph.id,
      sourceNodeId,
      targetNodeId,
      relationshipType,
      JSON.stringify(attributes || { strength: 1.0, description: '' }),
      timestamp,
      timestamp
    );

    // Update graph last_updated
    db.prepare(`
      UPDATE knowledge_graphs SET last_updated = ? WHERE id = ?
    `).run(timestamp, graph.id);

    const edge = db.prepare(`
      SELECT * FROM graph_edges WHERE id = ?
    `).get(edgeId) as any;

    res.json(rowToGraphEdge(edge));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/graphs/:type/nodes/:id
 * Delete a node from a graph
 */
router.delete('/:type/nodes/:id', async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }


    // Verify node exists in the correct graph
    const node = db.prepare(`
      SELECT n.*, g.campaign_id
      FROM graph_nodes n
      JOIN knowledge_graphs g ON n.graph_id = g.id
      WHERE n.id = ? AND g.type = ? AND g.campaign_id = ?
    `).get(id, type, campaignId as string) as any;

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Delete edges connected to this node
    db.prepare(`
      DELETE FROM graph_edges
      WHERE source_node_id = ? OR target_node_id = ?
    `).run(id, id);

    // Delete node
    db.prepare(`
      DELETE FROM graph_nodes WHERE id = ?
    `).run(id);

    // Update graph last_updated
    const timestamp = Math.floor(Date.now() / 1000);
    db.prepare(`
      UPDATE knowledge_graphs SET last_updated = ? WHERE id = ?
    `).run(timestamp, node.graph_id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/graphs/:type/nodes/:id
 * Update a node in a graph
 */
router.put('/:type/nodes/:id', async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const { campaignId, name, attributes, informationLevelId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }


    // Verify node exists in the correct graph
    const node = db.prepare(`
      SELECT n.*, g.campaign_id
      FROM graph_nodes n
      JOIN knowledge_graphs g ON n.graph_id = g.id
      WHERE n.id = ? AND g.type = ? AND g.campaign_id = ?
    `).get(id, type, campaignId) as any;

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // Update node
    const timestamp = Math.floor(Date.now() / 1000);
    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [timestamp];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (attributes !== undefined) {
      updates.push('attributes = ?');
      params.push(JSON.stringify(attributes));
    }

    if (informationLevelId !== undefined) {
      updates.push('information_level_id = ?');
      params.push(informationLevelId);
    }

    params.push(id);

    db.prepare(`
      UPDATE graph_nodes
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);

    // Update graph last_updated
    db.prepare(`
      UPDATE knowledge_graphs SET last_updated = ? WHERE id = ?
    `).run(timestamp, node.graph_id);

    const updatedNode = db.prepare(`
      SELECT * FROM graph_nodes WHERE id = ?
    `).get(id) as any;

    res.json(rowToGraphNode(updatedNode));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as knowledgeGraphsRouter };