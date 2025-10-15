/**
 * Knowledge Graphs Routes
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * REST API endpoints for knowledge graph CRUD operations
 */

import { Router, Request, Response } from 'express';
import { KnowledgeGraphService } from '../services/KnowledgeGraphService';
import { CampaignService } from '../services/CampaignService';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

/**
 * GET /api/campaigns/:campaignId/graphs
 * List all knowledge graphs for a campaign
 */
router.get('/api/campaigns/:campaignId/graphs', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    // Verify campaign exists and user owns it
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Parse query parameters
    const includeNodes = req.query.include_nodes === 'true';
    const includeEdges = req.query.include_edges === 'true';

    // Get graphs with optional nodes/edges
    const graphs = KnowledgeGraphService.listGraphs(campaignId, {
      include_nodes: includeNodes,
      include_edges: includeEdges,
    });

    // Add node and edge counts for each graph
    const graphsWithCounts = graphs.map(graph => {
      const stats = KnowledgeGraphService.getGraphWithStats(graph.id);
      return {
        ...graph,
        node_count: stats?.node_count || 0,
        edge_count: stats?.edge_count || 0,
      };
    });

    return res.json({ graphs: graphsWithCounts });
  } catch (error: any) {
    console.error('Error listing graphs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/campaigns/:campaignId/graphs
 * Create a new knowledge graph
 */
router.post('/api/campaigns/:campaignId/graphs', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    // Verify campaign exists and user owns it
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate required fields
    if (!req.body.graph_type) {
      return res.status(400).json({ error: 'graph_type is required' });
    }

    if (!req.body.graph_name) {
      return res.status(400).json({ error: 'graph_name is required' });
    }

    // Create graph
    const graph = KnowledgeGraphService.createGraph(campaignId, {
      graph_type: req.body.graph_type,
      graph_name: req.body.graph_name,
      decay_rate: req.body.decay_rate,
      toggle_state: req.body.toggle_state,
      maintenance_rules: req.body.maintenance_rules,
      initial_nodes: req.body.initial_nodes,
      initial_edges: req.body.initial_edges,
    });

    return res.status(201).json(graph);
  } catch (error: any) {
    console.error('Error creating graph:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/campaigns/:campaignId/graphs/:graphId
 * Get specific knowledge graph with nodes and edges
 */
router.get('/api/campaigns/:campaignId/graphs/:graphId', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;

    // Verify campaign exists and user owns it
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Parse query parameters
    const includeNodes = req.query.include_nodes !== 'false'; // Default true
    const includeEdges = req.query.include_edges !== 'false'; // Default true

    // Get graph
    const graph = KnowledgeGraphService.getGraph(graphId, {
      include_nodes: includeNodes,
      include_edges: includeEdges,
    });

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    // Verify graph belongs to campaign
    if (graph.campaign_id !== campaignId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json(graph);
  } catch (error: any) {
    console.error('Error getting graph:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/campaigns/:campaignId/graphs/:graphId
 * Update knowledge graph
 */
router.patch('/api/campaigns/:campaignId/graphs/:graphId', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;

    // Verify campaign exists and user owns it
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Verify graph exists and belongs to campaign
    if (!KnowledgeGraphService.belongsToCampaign(graphId, campaignId)) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    // Update graph
    const graph = KnowledgeGraphService.updateGraph(graphId, {
      graph_name: req.body.graph_name,
      decay_rate: req.body.decay_rate,
      toggle_state: req.body.toggle_state,
      maintenance_rules: req.body.maintenance_rules,
      nodes_to_add: req.body.nodes_to_add,
      nodes_to_update: req.body.nodes_to_update,
      nodes_to_delete: req.body.nodes_to_delete,
      edges_to_add: req.body.edges_to_add,
      edges_to_delete: req.body.edges_to_delete,
    });

    return res.json(graph);
  } catch (error: any) {
    console.error('Error updating graph:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Invalid') || error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/campaigns/:campaignId/graphs/:graphId
 * Delete knowledge graph (CASCADE deletes nodes and edges)
 */
router.delete('/api/campaigns/:campaignId/graphs/:graphId', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;

    // Verify campaign exists and user owns it
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Verify graph belongs to campaign
    if (!KnowledgeGraphService.belongsToCampaign(graphId, campaignId)) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    // Delete graph
    KnowledgeGraphService.deleteGraph(graphId);

    return res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting graph:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
