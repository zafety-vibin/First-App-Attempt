/**
 * Confidence Decay Routes
 * Feature 006: Knowledge Graphs with Confidence Decay
 */

import { Router, Request, Response } from 'express';
import { ConfidenceDecayService } from '../services/ConfidenceDecayService';
import { KnowledgeGraphService } from '../services/KnowledgeGraphService';
import { CampaignService } from '../services/CampaignService';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Pin entity
router.post('/api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId/pin', async (req: Request, res: Response) => {
  try {
    const { campaignId, nodeId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const node = ConfidenceDecayService.pinEntity(nodeId);
    return res.json(node);
  } catch (error: any) {
    console.error('Error pinning entity:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Unpin entity
router.post('/api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId/unpin', async (req: Request, res: Response) => {
  try {
    const { campaignId, nodeId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const node = ConfidenceDecayService.unpinEntity(nodeId);
    return res.json(node);
  } catch (error: any) {
    console.error('Error unpinning entity:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reinforce entity
router.post('/api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId/reinforce', async (req: Request, res: Response) => {
  try {
    const { campaignId, nodeId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const node = ConfidenceDecayService.reinforceEntity(nodeId);
    return res.json(node);
  } catch (error: any) {
    console.error('Error reinforcing entity:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Find stale entities
router.get('/api/campaigns/:campaignId/graphs/:graphId/stale', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 0.3;
    const staleEntities = ConfidenceDecayService.findStaleEntities(graphId, threshold);

    return res.json({ stale_entities: staleEntities });
  } catch (error: any) {
    console.error('Error finding stale entities:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate confidence
router.post('/api/campaigns/:campaignId/graphs/:graphId/calculate-confidence', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const graph = KnowledgeGraphService.getGraph(graphId, { include_nodes: false, include_edges: false });
    if (!graph) return res.status(404).json({ error: 'Graph not found' });

    const distribution = ConfidenceDecayService.getConfidenceDistribution(graphId);
    return res.json(distribution);
  } catch (error: any) {
    console.error('Error calculating confidence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
