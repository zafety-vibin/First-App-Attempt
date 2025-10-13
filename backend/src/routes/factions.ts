/**
 * Factions routes
 * Feature: 014-create-the-database
 * Task: T043 - Wire FactionService to REST endpoints
 *
 * Implements 5 CRUD endpoints with:
 * - Authentication (protect middleware)
 * - Information filtering (extractViewMode + applyInformationFilter)
 * - Foreign key validation (leader_id → npcs.id)
 * - Campaign ownership validation
 */

import express, { Request, Response } from 'express';
import { FactionService } from '../services/FactionService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';

const router = express.Router();
const factionService = new FactionService();

// All routes require authentication and view mode filtering
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * GET /api/factions
 * List all factions for a campaign
 * Query params:
 *   - campaign_id (required): Campaign ID
 * Headers:
 *   - X-View-Mode: dm_view (default) | player_view
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id } = req.query;
    const userId = req.user!.id;

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    const factions = await factionService.getByCampaign(campaign_id, userId);

    res.status(200).json({ factions, total: factions.length });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('List factions error:', error);
    res.status(500).json({ error: 'Failed to fetch factions' });
  }
});

/**
 * POST /api/factions
 * Create a new faction
 * Body: CreateFactionRequest (see FactionService)
 * Headers:
 *   - X-View-Mode: dm_view (default) | player_view
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate required fields
    if (!req.body.campaign_id || !req.body.name) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, name' });
      return;
    }

    // Validate core_status enum if provided
    if (req.body.core_status) {
      const validStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validStatuses.includes(req.body.core_status)) {
        res.status(400).json({
          error: 'Invalid core_status. Must be: active, archived, draft, or hidden',
        });
        return;
      }
    }

    const faction = await factionService.create(req.body, userId);

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
 * Headers:
 *   - X-View-Mode: dm_view (default) | player_view
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const faction = await factionService.getById(id, userId);

    if (!faction) {
      res.status(404).json({ error: 'Faction not found' });
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
 * Body: UpdateFactionRequest (see FactionService)
 * Headers:
 *   - X-View-Mode: dm_view (default) | player_view
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Validate core_status enum if provided
    if (req.body.core_status) {
      const validStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validStatuses.includes(req.body.core_status)) {
        res.status(400).json({
          error: 'Invalid core_status. Must be: active, archived, draft, or hidden',
        });
        return;
      }
    }

    const faction = await factionService.update(id, req.body, userId);

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
 * Note: CASCADE behavior handled by FK constraints in database
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await factionService.delete(id, userId);

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
