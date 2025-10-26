/**
 * Campaign Wizard Routes
 * Feature: 016-create-a-campaign
 * T008-T010: Wizard endpoints
 */

import { Router, Request, Response } from 'express';
import { CampaignSettingsService } from '../services/CampaignSettingsService';
import { CampaignService } from '../services/CampaignService';
import { wizardCompleteRequestSchema } from '../validation/wizard';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// T008: GET /wizard/status
router.get('/api/campaigns/:campaignId/wizard/status', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    const status = CampaignSettingsService.getWizardStatus(campaignId, userId);
    return res.json(status);
  } catch (error: any) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    console.error('Error getting wizard status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// T009: GET /wizard/themes
router.get('/api/campaigns/:campaignId/wizard/themes', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    // Verify campaign ownership
    const campaign = await CampaignService.getCampaignById(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    if (campaign.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const themes = CampaignSettingsService.getThemes();
    return res.json({ themes });
  } catch (error: any) {
    console.error('Error getting wizard themes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// T010: POST /wizard/complete
router.post('/api/campaigns/:campaignId/wizard/complete', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    // Validate request body
    const validation = wizardCompleteRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.format()
      });
    }

    // Complete wizard (atomic transaction)
    const result = CampaignSettingsService.completeWizard(campaignId, userId, validation.data);
    return res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'Campaign not found') {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (error.message === 'Wizard already completed') {
      return res.status(409).json({ error: 'Wizard already completed for this campaign' });
    }
    if (error.message.includes('Transaction failed')) {
      return res.status(500).json({ error: 'Transaction failed', details: error.message });
    }
    console.error('Error completing wizard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
