/**
 * Graph Toggle Routes
 * Feature 006: Knowledge Graphs with Confidence Decay
 */

import { Router, Request, Response } from 'express';
import { GraphToggleService } from '../services/GraphToggleService';
import { CampaignService } from '../services/CampaignService';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Get all toggles
router.get('/api/campaigns/:campaignId/graphs/toggles', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const toggles = GraphToggleService.getAllToggles(campaignId);
    return res.json({ toggles });
  } catch (error: any) {
    console.error('Error getting toggles:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle graph
router.post('/api/campaigns/:campaignId/graphs/:graphId/toggle', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const userId = req.user!.id;
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const state = req.body.state !== undefined ? req.body.state : true;
    GraphToggleService.toggleGraph(graphId, state);

    return res.json({ graph_id: graphId, toggle_state: state });
  } catch (error: any) {
    console.error('Error toggling graph:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
