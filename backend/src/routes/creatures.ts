/**
 * Creatures routes
 * Feature: 014-create-the-database
 *
 * Implements 5 CRUD endpoints with:
 * - Authentication (protect middleware)
 * - Information filtering (extractViewMode + applyInformationFilter)
 * - JSON array handling (habitats[] - location IDs)
 * - Campaign ownership validation
 */

import express, { Request, Response } from 'express';
import { CreatureService } from '../services/CreatureService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();
const creatureService = new CreatureService(db);

// All routes require authentication and view mode filtering
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * GET /api/creatures
 * List all creatures for a campaign
 * Query params:
 *   - campaign_id (required): Campaign ID
 *   - core_status (optional): Filter by status (active, archived, draft, hidden)
 * Headers:
 *   - X-View-Mode: dm_view (default) | player_view
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id, core_status } = req.query;
    const userId = req.user!.id;

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Validate core_status if provided
    if (core_status) {
      const validStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validStatuses.includes(core_status as string)) {
        res.status(400).json({ error: 'Invalid core_status. Must be: active, archived, draft, or hidden' });
        return;
      }
    }

    let creatures;

    if (core_status) {
      creatures = await creatureService.getCreaturesByStatus(campaign_id, core_status as 'active' | 'archived' | 'draft' | 'hidden', userId);
    } else {
      creatures = await creatureService.getCreaturesByCampaignId(campaign_id, userId);
    }

    res.status(200).json({ creatures, total: creatures.length });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('List creatures error:', error);
    res.status(500).json({ error: 'Failed to fetch creatures' });
  }
});

/**
 * POST /api/creatures
 * Create a new creature
 * Body: CreateCreatureRequest (see Creature model)
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

    // Validate habitats is an array if provided
    if (req.body.habitats && !Array.isArray(req.body.habitats)) {
      res.status(400).json({ error: 'habitats must be an array of location IDs' });
      return;
    }

    const creature = await creatureService.createCreature(req.body, userId);

    res.status(201).json(creature);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    if (error.message.includes('habitat location IDs')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create creature error:', error);
    res.status(500).json({ error: 'Failed to create creature' });
  }
});

/**
 * GET /api/creatures/:id
 * Get creature by ID
 * Headers:
 *   - X-View-Mode: dm_view (default) | player_view
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const creature = await creatureService.getCreatureById(id, userId);

    if (!creature) {
      res.status(404).json({ error: 'Creature not found' });
      return;
    }

    res.status(200).json(creature);
  } catch (error: any) {
    console.error('Get creature error:', error);
    res.status(500).json({ error: 'Failed to fetch creature' });
  }
});

/**
 * PUT /api/creatures/:id
 * Update creature by ID
 * Body: UpdateCreatureRequest (see Creature model)
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

    // Validate habitats is an array if provided
    if (req.body.habitats !== undefined && req.body.habitats !== null && !Array.isArray(req.body.habitats)) {
      res.status(400).json({ error: 'habitats must be an array of location IDs' });
      return;
    }

    const creature = await creatureService.updateCreature(id, req.body, userId);

    res.status(200).json(creature);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('habitat location IDs')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update creature error:', error);
    res.status(500).json({ error: 'Failed to update creature' });
  }
});

/**
 * DELETE /api/creatures/:id
 * Delete creature by ID
 * Note: CASCADE behavior handled by FK constraints in database
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await creatureService.deleteCreature(id, userId);

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete creature error:', error);
    res.status(500).json({ error: 'Failed to delete creature' });
  }
});

export default router;
