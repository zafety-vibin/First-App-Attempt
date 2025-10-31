/**
 * Quests REST API Routes (standardized)
 * Feature: 014-create-the-database
 */

import express, { Request, Response } from 'express';
import { QuestService } from '../services/QuestService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/viewMode';
import { db } from '../services/DatabaseService';

const router = express.Router();

const questService = new QuestService(db);

router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

router.get('/', (req: Request, res: Response) => {
  try {
    const { campaign_id, limit = '50', offset = '0', status } = req.query;
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

    const result = questService.list(
      { campaign_id, status: status as string },
      { limit: parseInt(limit as string), offset: parseInt(offset as string) },
      'created_at',
      'desc',
      req.categoryViewMode || 'dm_view'
    );

    res.status(200).json({ data: result.data, pagination: { limit: parseInt(limit as string), offset: parseInt(offset as string), total: result.total } });
  } catch (error: any) {
    console.error('List quests error:', error);
    res.status(500).json({ error: 'Failed to list quests' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!req.body.campaign_id || !req.body.name) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, name' });
      return;
    }

    const quest = questService.create(req.body, { ownerId: userId });
    res.status(201).json(quest);
  } catch (error: any) {
    if (error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('Create quest error:', error);
    res.status(500).json({ error: 'Failed to create quest' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const quest = questService.findById(id);
    if (!quest) {
      res.status(404).json({ error: 'Quest not found' });
      return;
    }

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(quest.campaign_id, userId);
    if (!campaign) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.status(200).json(quest);
  } catch (error: any) {
    console.error('Get quest error:', error);
    res.status(500).json({ error: 'Failed to fetch quest' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const quest = questService.update(id, req.body, { ownerId: userId });
    res.status(200).json(quest);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Update quest error:', error);
    res.status(500).json({ error: 'Failed to update quest' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    questService.delete(id, { ownerId: userId });
    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete quest error:', error);
    res.status(500).json({ error: 'Failed to delete quest' });
  }
});

export default router;
