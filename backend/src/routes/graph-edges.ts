/**
 * Graph Edges Routes
 * Feature 006: Knowledge Graphs with Confidence Decay
 */

import { Router, Request, Response } from 'express';
import { GraphEdgeService } from '../services/GraphEdgeService';
import { KnowledgeGraphService } from '../services/KnowledgeGraphService';
import { CampaignService } from '../services/CampaignService';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// List edges
router.get('/api/campaigns/:campaignId/graphs/:graphId/edges', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    if (!KnowledgeGraphService.belongsToCampaign(graphId, campaignId)) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    const edges = GraphEdgeService.listEdges(graphId, {
      edge_type: req.query.edge_type as string,
      source_node_id: req.query.source_node_id as string,
      target_node_id: req.query.target_node_id as string,
      directed: req.query.directed !== undefined ? req.query.directed === 'true' : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    });

    return res.json({ edges });
  } catch (error: any) {
    console.error('Error listing edges:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create edge
router.post('/api/campaigns/:campaignId/graphs/:graphId/edges', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    if (!KnowledgeGraphService.belongsToCampaign(graphId, campaignId)) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    if (!req.body.edge_type || !req.body.source_node_id || !req.body.target_node_id) {
      return res.status(400).json({ error: 'edge_type, source_node_id, and target_node_id are required' });
    }

    const edge = GraphEdgeService.createEdge(graphId, req.body);
    return res.status(201).json(edge);
  } catch (error: any) {
    console.error('Error creating edge:', error);
    if (error.message.includes('required') || error.message.includes('not found in graph')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get edge
router.get('/api/campaigns/:campaignId/graphs/:graphId/edges/:edgeId', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId, edgeId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const edge = GraphEdgeService.getEdge(edgeId);
    if (!edge) return res.status(404).json({ error: 'Edge not found' });

    return res.json(edge);
  } catch (error: any) {
    console.error('Error getting edge:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update edge
router.patch('/api/campaigns/:campaignId/graphs/:graphId/edges/:edgeId', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId, edgeId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const edge = GraphEdgeService.updateEdge(edgeId, req.body);
    return res.json(edge);
  } catch (error: any) {
    console.error('Error updating edge:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete edge
router.delete('/api/campaigns/:campaignId/graphs/:graphId/edges/:edgeId', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId, edgeId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    GraphEdgeService.deleteEdge(edgeId);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting edge:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
