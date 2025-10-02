/**
 * Settings routes
 * Based on: specs/003-create-a-notion/contracts/settings.yaml
 * Feature: 003-create-a-notion
 */

import express, { Request, Response } from 'express';
import { SettingService } from '../services/SettingService';
import { protect } from '../middleware/auth';

const router = express.Router();
const settingService = new SettingService();

// All routes require authentication
router.use(protect);

/**
 * GET /api/settings
 * List user's settings
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const settings = await settingService.listSettings(userId);

    res.status(200).json({ settings });
  } catch (error: any) {
    console.error('List settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * POST /api/settings
 * Create new setting
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Setting name is required and must not be empty' });
      return;
    }

    if (name.length > 255) {
      res.status(400).json({ error: 'Setting name must not exceed 255 characters' });
      return;
    }

    const setting = await settingService.createSetting(
      {
        name: name.trim(),
        description: description || null,
      },
      req.user!.id
    );

    res.status(201).json(setting);
  } catch (error: any) {
    console.error('Create setting error:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
});

/**
 * GET /api/settings/:id
 * Get setting by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const setting = await settingService.getSetting(id, userId);

    res.status(200).json(setting);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(error.message.includes('access denied') ? 403 : 404).json({ error: error.message });
      return;
    }

    console.error('Get setting error:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

/**
 * PUT /api/settings/:id
 * Update setting
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user!.id;

    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({ error: 'Setting name must not be empty' });
      return;
    }

    if (name && name.length > 255) {
      res.status(400).json({ error: 'Setting name must not exceed 255 characters' });
      return;
    }

    const setting = await settingService.updateSetting(
      id,
      {
        name: name?.trim(),
        description,
      },
      userId
    );

    res.status(200).json(setting);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(error.message.includes('access denied') ? 403 : 404).json({ error: error.message });
      return;
    }

    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

/**
 * DELETE /api/settings/:id
 * Delete setting and all campaigns + cards within it
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { confirm } = req.query;
    const userId = req.user!.id;

    if (confirm !== 'true') {
      res.status(400).json({ error: 'Confirmation required: add ?confirm=true to delete setting' });
      return;
    }

    const result = await settingService.deleteSetting(id, userId);

    res.status(200).json(result);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(error.message.includes('access denied') ? 403 : 404).json({ error: error.message });
      return;
    }

    console.error('Delete setting error:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

/**
 * GET /api/settings/:id/campaigns
 * List campaigns in setting
 */
router.get('/:id/campaigns', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const campaigns = await settingService.listSettingCampaigns(id, userId);

    res.status(200).json({ campaigns });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(error.message.includes('access denied') ? 403 : 404).json({ error: error.message });
      return;
    }

    console.error('List setting campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

export default router;
