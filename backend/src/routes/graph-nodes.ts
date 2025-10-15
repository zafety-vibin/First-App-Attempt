/**
 * Graph Nodes Routes
 * Feature 006: Knowledge Graphs with Confidence Decay
 */

import { Router, Request, Response } from 'express';
import { GraphNodeService } from '../services/GraphNodeService';
import { KnowledgeGraphService } from '../services/KnowledgeGraphService';
import { CampaignService } from '../services/CampaignService';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// List nodes
router.get('/api/campaigns/:campaignId/graphs/:graphId/nodes', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    if (!KnowledgeGraphService.belongsToCampaign(graphId, campaignId)) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    const nodes = GraphNodeService.listNodes(graphId, {
      node_type: req.query.node_type as string,
      confidence_threshold: req.query.confidence_threshold ? parseFloat(req.query.confidence_threshold as string) : undefined,
      search_query: req.query.search_query as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    });

    return res.json({ nodes });
  } catch (error: any) {
    console.error('Error listing nodes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create node
router.post('/api/campaigns/:campaignId/graphs/:graphId/nodes', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    if (!KnowledgeGraphService.belongsToCampaign(graphId, campaignId)) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    if (!req.body.node_type || !req.body.name) {
      return res.status(400).json({ error: 'node_type and name are required' });
    }

    const node = GraphNodeService.createNode(graphId, req.body);
    return res.status(201).json(node);
  } catch (error: any) {
    console.error('Error creating node:', error);
    if (error.message.includes('required')) return res.status(400).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get node
router.get('/api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId, nodeId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const node = GraphNodeService.getNode(nodeId, true); // Auto-reinforce
    if (!node) return res.status(404).json({ error: 'Node not found' });

    return res.json(node);
  } catch (error: any) {
    console.error('Error getting node:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update node
router.patch('/api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId, nodeId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const node = GraphNodeService.updateNode(nodeId, req.body);
    return res.json(node);
  } catch (error: any) {
    console.error('Error updating node:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete node
router.delete('/api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId, nodeId } = req.params;
    const userId = req.user!.id;

    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    GraphNodeService.deleteNode(nodeId);
    return res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting node:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
