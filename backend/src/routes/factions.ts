/**
 * Factions routes (standardized)
 * Feature: 014-create-the-database
 *
 * Uses standardized FactionService with:
 * - Sync methods (no async/await)
 * - Optional ownership validation via OperationOptions
 * - Standard list() method with filters
 */

import express, { Request, Response } from 'express';
import { FactionService } from '../services/FactionService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();

// Initialize FactionService (now requires db instance)
const factionService = new FactionService(db);

// All routes require authentication and view mode filtering
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * GET /api/factions
 * List all factions for a campaign
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { campaign_id, limit = '50', offset = '0' } = req.query;
    const userId = req.user!.id;

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Use standardized list method with view mode
    const result = factionService.list(
      { campaign_id },
      {
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
      },
      'created_at',
      'desc',
      req.categoryViewMode || 'dm_view'
    );

    res.status(200).json({
      data: result.data,
      pagination: {
        currentPage: 1,
        pageSize: result.data.length,
        totalPages: 1,
        totalCount: result.total,
      },
    });
  } catch (error: any) {
    console.error('List factions error:', error);
    res.status(500).json({ error: 'Failed to fetch factions' });
  }
});

/**
 * POST /api/factions
 * Create a new faction
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate required fields
    if (!req.body.campaign_id || !req.body.name) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, name' });
      return;
    }

    // Use standardized create method with ownership validation
    const faction = factionService.create(req.body, { ownerId: userId });

    res.status(201).json(faction);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    if (error.message.includes('Leader NPC')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create faction error:', error);
    res.status(500).json({ error: 'Failed to create faction' });
  }
});

/**
 * GET /api/factions/:id
 * Get faction by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Fetch faction
    const faction = factionService.findById(id);

    if (!faction) {
      res.status(404).json({ error: 'Faction not found' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(faction.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.status(200).json(faction);
  } catch (error: any) {
    console.error('Get faction error:', error);
    res.status(500).json({ error: 'Failed to fetch faction' });
  }
});

/**
 * PUT /api/factions/:id
 * Update faction by ID
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Use standardized update method with ownership validation
    const faction = factionService.update(id, req.body, { ownerId: userId });

    res.status(200).json(faction);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Leader NPC')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update faction error:', error);
    res.status(500).json({ error: 'Failed to update faction' });
  }
});

/**
 * DELETE /api/factions/:id
 * Delete faction by ID
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Use standardized delete method with ownership validation
    factionService.delete(id, { ownerId: userId });

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete faction error:', error);
    res.status(500).json({ error: 'Failed to delete faction' });
  }
});

export default router;
