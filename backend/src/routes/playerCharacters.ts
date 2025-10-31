/**
 * Player Characters REST API Routes (standardized)
 * Feature: 014-create-the-database
 */

import express, { Request, Response } from 'express';
import { PlayerCharacterService } from '../services/PlayerCharacterService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/viewMode';
import { db } from '../services/DatabaseService';

const router = express.Router();

const pcService = new PlayerCharacterService(db);

router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

router.get('/', (req: Request, res: Response) => {
  try {
    const { campaign_id, limit = '50', offset = '0' } = req.query;
    const userId = req.user!.id;

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaign_id, userId);
    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    const result = pcService.list(
      { campaign_id },
      { limit: parseInt(limit as string), offset: parseInt(offset as string) },
      'name',
      'asc',
      req.categoryViewMode || 'dm_view'
    );
    res.status(200).json({ data: result.data, pagination: { limit: parseInt(limit as string), offset: parseInt(offset as string), total: result.total } });
  } catch (error: any) {
    console.error('List player characters error:', error);
    res.status(500).json({ error: 'Failed to list player characters' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!req.body.campaign_id || !req.body.name) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, name' });
      return;
    }

    const pc = pcService.create(req.body, { ownerId: userId });
    res.status(201).json(pc);
  } catch (error: any) {
    if (error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('Create player character error:', error);
    res.status(500).json({ error: 'Failed to create player character' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const pc = pcService.findById(id);
    if (!pc) {
      res.status(404).json({ error: 'Player character not found' });
      return;
    }

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(pc.campaign_id, userId);
    if (!campaign) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.status(200).json(pc);
  } catch (error: any) {
    console.error('Get player character error:', error);
    res.status(500).json({ error: 'Failed to fetch player character' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const pc = pcService.update(id, req.body, { ownerId: userId });
    res.status(200).json(pc);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Update player character error:', error);
    res.status(500).json({ error: 'Failed to update player character' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    pcService.delete(id, { ownerId: userId });
    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete player character error:', error);
    res.status(500).json({ error: 'Failed to delete player character' });
  }
});

export default router;
