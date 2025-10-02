/**
 * Campaign routes
 * Based on: specs/002-create-the-authentication/contracts/campaigns.yaml
 */

import express, { Request, Response } from 'express';
import { CampaignService } from '../services/CampaignService';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * GET /api/campaigns
 * List user's campaigns
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = CampaignService.getCampaignsByOwner(userId, limit, offset);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

/**
 * POST /api/campaigns
 * Create new campaign
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Campaign name is required and must not be empty' });
      return;
    }

    if (name.length > 255) {
      res.status(400).json({ error: 'Campaign name must not exceed 255 characters' });
      return;
    }

    const campaign = CampaignService.createCampaign({
      name: name.trim(),
      ownerId: req.user!.id,
    });

    res.status(201).json(campaign);
  } catch (error: any) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

/**
 * GET /api/campaigns/:id
 * Get campaign by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = CampaignService.getCampaignById(id);

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to access this campaign' });
      return;
    }

    res.status(200).json(campaign);
  } catch (error: any) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

/**
 * PUT /api/campaigns/:id
 * Update campaign
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = CampaignService.getCampaignById(id);

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to update this campaign' });
      return;
    }

    // Validate inputs
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || req.body.name.trim().length === 0) {
        res.status(400).json({ error: 'Campaign name must not be empty' });
        return;
      }
      if (req.body.name.length > 255) {
        res.status(400).json({ error: 'Campaign name must not exceed 255 characters' });
        return;
      }
    }

    const updated = CampaignService.updateCampaign(id, req.body);

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const campaign = CampaignService.getCampaignById(id);

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to delete this campaign' });
      return;
    }

    CampaignService.deleteCampaign(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
