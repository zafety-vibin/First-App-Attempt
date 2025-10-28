/**
 * Campaign Bible REST API Routes
 * Feature: Campaign Bible Enhancement
 *
 * Provides GET/PUT endpoints for campaign governance documents.
 */

import express, { Request, Response } from 'express';
import { CampaignSettingsService } from '../services/CampaignSettingsService';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

/**
 * GET /api/campaigns/:campaignId/bible
 * Get campaign bible markdown
 */
router.get('/campaigns/:campaignId/bible', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    const bible = CampaignSettingsService.getCampaignBible(campaignId, userId);

    if (!bible) {
      res.status(404).json({ error: 'Campaign bible not found. Complete the campaign wizard first.' });
      return;
    }

    res.status(200).json({ bible });
  } catch (error: any) {
    console.error('Get bible error:', error);
    if (error.message === 'Forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.status(500).json({ error: 'Failed to get campaign bible' });
  }
});

/**
 * PUT /api/campaigns/:campaignId/bible
 * Update campaign bible markdown
 */
router.put('/campaigns/:campaignId/bible', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { bible } = req.body;
    const userId = req.user!.id;

    if (!bible || typeof bible !== 'string') {
      res.status(400).json({ error: 'bible field is required and must be a string' });
      return;
    }

    if (bible.length > 100000) {
      res.status(400).json({ error: 'Bible content exceeds maximum length (100,000 characters)' });
      return;
    }

    CampaignSettingsService.updateCampaignBible(campaignId, userId, bible);

    res.status(200).json({ success: true, message: 'Bible updated successfully' });
  } catch (error: any) {
    console.error('Update bible error:', error);
    if (error.message === 'Forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.status(500).json({ error: 'Failed to update campaign bible' });
  }
});

export default router;
