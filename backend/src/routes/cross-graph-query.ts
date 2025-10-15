/**
 * Cross-Graph Query Routes
 * Feature 006: Knowledge Graphs with Confidence Decay
 */

import { Router, Request, Response } from 'express';
import { CrossGraphQueryService } from '../services/CrossGraphQueryService';
import { CampaignService } from '../services/CampaignService';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Query across graphs
router.post('/api/campaigns/:campaignId/graphs/query', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const result = CrossGraphQueryService.queryGraphs(campaignId, {
      graph_types: req.body.graph_types,
      node_types: req.body.node_types,
      confidence_threshold: req.body.confidence_threshold,
      only_active_graphs: req.body.only_active_graphs !== false,
      search_query: req.body.search_query,
      limit: req.body.limit,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Error querying graphs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get serialized context for LLM
router.get('/api/campaigns/:campaignId/graphs/context', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const context = CrossGraphQueryService.getGraphContext(campaignId);
    return res.json(context);
  } catch (error: any) {
    console.error('Error getting graph context:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
