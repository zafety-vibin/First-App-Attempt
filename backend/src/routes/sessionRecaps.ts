/**
 * Session Recaps REST API Routes (standardized)
 * Feature: 014-create-the-database
 */

import express, { Request, Response } from 'express';
import { SessionRecapService } from '../services/SessionRecapService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/viewMode';
import { db } from '../services/DatabaseService';

const router = express.Router();

// Initialize service
const sessionRecapService = new SessionRecapService(db);

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

    const result = sessionRecapService.list(
      { campaign_id },
      { limit: parseInt(limit as string), offset: parseInt(offset as string) },
      'session_number',
      'desc',
      req.categoryViewMode || 'dm_view'
    );

    res.status(200).json({ data: result.data, pagination: { limit: parseInt(limit as string), offset: parseInt(offset as string), total: result.total } });
  } catch (error: any) {
    console.error('List session recaps error:', error);
    res.status(500).json({ error: 'Failed to list session recaps' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!req.body.campaign_id || !req.body.name) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, name' });
      return;
    }

    const recap = sessionRecapService.create(req.body, { ownerId: userId });
    res.status(201).json(recap);
  } catch (error: any) {
    if (error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('Create session recap error:', error);
    res.status(500).json({ error: 'Failed to create session recap' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const recap = sessionRecapService.findById(id);
    if (!recap) {
      res.status(404).json({ error: 'Session recap not found' });
      return;
    }

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(recap.campaign_id, userId);
    if (!campaign) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.status(200).json(recap);
  } catch (error: any) {
    console.error('Get session recap error:', error);
    res.status(500).json({ error: 'Failed to fetch session recap' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const recap = sessionRecapService.update(id, req.body, { ownerId: userId });
    res.status(200).json(recap);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Update session recap error:', error);
    res.status(500).json({ error: 'Failed to update session recap' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    sessionRecapService.delete(id, { ownerId: userId });
    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete session recap error:', error);
    res.status(500).json({ error: 'Failed to delete session recap' });
  }
});

export default router;
