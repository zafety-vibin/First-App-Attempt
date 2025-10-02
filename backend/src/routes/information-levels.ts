/**
 * Information Levels routes
 * Based on: specs/004-create-a-tagging/contracts/information-levels.yaml
 * Feature: 004-create-a-tagging
 * Task: T023
 */

import express, { Request, Response } from 'express';
import { InformationLevelService } from '../services/InformationLevelService';
import { protect } from '../middleware/auth';

const router = express.Router();
const informationLevelService = new InformationLevelService();

// All routes require authentication
router.use(protect);

/**
 * GET /api/information-levels
 * List information levels for campaign (4 defaults + custom levels)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id } = req.query;
    const userId = req.user!.id;

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    const levels = await informationLevelService.listInformationLevels(campaign_id, userId);

    res.status(200).json({ levels });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('List information levels error:', error);
    res.status(500).json({ error: 'Failed to fetch information levels' });
  }
});

/**
 * POST /api/information-levels
 * Create custom information level
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color, hierarchical, campaign_id } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!name || color === undefined || hierarchical === undefined || !campaign_id) {
      res.status(400).json({ error: 'Missing required fields: name, color, hierarchical, campaign_id' });
      return;
    }

    const level = await informationLevelService.createInformationLevel(
      {
        name,
        color,
        hierarchical,
        campaignId: campaign_id,
      },
      userId
    );

    res.status(201).json(level);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    if (error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
      return;
    }

    if (error.message.includes('Invalid') || error.message.includes('must be')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create information level error:', error);
    res.status(500).json({ error: 'Failed to create information level' });
  }
});

/**
 * GET /api/information-levels/:id
 * Get information level by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const level = await informationLevelService.getInformationLevel(id);

    res.status(200).json(level);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'Information level not found' });
      return;
    }

    console.error('Get information level error:', error);
    res.status(500).json({ error: 'Failed to fetch information level' });
  }
});

/**
 * PUT /api/information-levels/:id
 * Update custom information level
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, hierarchical } = req.body;
    const userId = req.user!.id;

    const level = await informationLevelService.updateInformationLevel(
      id,
      { name, color, hierarchical },
      userId
    );

    res.status(200).json(level);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Cannot modify default')) {
      res.status(422).json({ error: error.message });
      return;
    }

    if (error.message.includes('Invalid') || error.message.includes('must be') || error.message.includes('already exists')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update information level error:', error);
    res.status(500).json({ error: 'Failed to update information level' });
  }
});

/**
 * DELETE /api/information-levels/:id
 * Delete custom information level and revert cards to System
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { confirm } = req.query;
    const userId = req.user!.id;

    if (confirm !== 'true') {
      res.status(400).json({ error: 'Must confirm deletion with confirm=true query parameter' });
      return;
    }

    const result = await informationLevelService.deleteInformationLevel(id, userId);

    res.status(200).json(result);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Cannot delete default')) {
      res.status(422).json({ error: error.message });
      return;
    }

    console.error('Delete information level error:', error);
    res.status(500).json({ error: 'Failed to delete information level' });
  }
});

export default router;
