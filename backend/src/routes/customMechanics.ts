/**
 * CustomMechanics routes
 * Feature: 014-create-the-database
 *
 * Implements 5 CRUD endpoints with:
 * - Authentication (protect middleware)
 * - Information filtering (extractViewMode + applyInformationFilter)
 * - Self-referential validation (related_rules[] → custom_mechanics.id)
 * - Campaign ownership validation
 */

import express, { Request, Response } from 'express';
import { CustomMechanicService } from '../services/CustomMechanicService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';

const router = express.Router();
const customMechanicService = new CustomMechanicService();

// All routes require authentication and view mode filtering
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * GET /api/custom-mechanics
 * List all custom mechanics for a campaign
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

    const customMechanics = await customMechanicService.getByCampaign(campaign_id, userId);

    res.status(200).json({ customMechanics, total: customMechanics.length });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('List custom mechanics error:', error);
    res.status(500).json({ error: 'Failed to fetch custom mechanics' });
  }
});

/**
 * POST /api/custom-mechanics
 * Create a new custom mechanic
 * Body: CreateCustomMechanicRequest (see CustomMechanicService)
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

    // Validate related_rules is an array if provided
    if (req.body.related_rules && !Array.isArray(req.body.related_rules)) {
      res.status(400).json({ error: 'related_rules must be an array of custom mechanic IDs' });
      return;
    }

    const customMechanic = await customMechanicService.create(req.body, userId);

    res.status(201).json(customMechanic);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    if (error.message.includes('Related mechanic')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create custom mechanic error:', error);
    res.status(500).json({ error: 'Failed to create custom mechanic' });
  }
});

/**
 * GET /api/custom-mechanics/:id
 * Get custom mechanic by ID
 * Headers:
 *   - X-View-Mode: dm_view (default) | player_view
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const customMechanic = await customMechanicService.getById(id, userId);

    if (!customMechanic) {
      res.status(404).json({ error: 'Custom mechanic not found' });
      return;
    }

    res.status(200).json(customMechanic);
  } catch (error: any) {
    console.error('Get custom mechanic error:', error);
    res.status(500).json({ error: 'Failed to fetch custom mechanic' });
  }
});

/**
 * PUT /api/custom-mechanics/:id
 * Update custom mechanic by ID
 * Body: UpdateCustomMechanicRequest (see CustomMechanicService)
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

    // Validate related_rules is an array if provided
    if (req.body.related_rules !== undefined && req.body.related_rules !== null && !Array.isArray(req.body.related_rules)) {
      res.status(400).json({ error: 'related_rules must be an array of custom mechanic IDs' });
      return;
    }

    const customMechanic = await customMechanicService.update(id, req.body, userId);

    res.status(200).json(customMechanic);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Related mechanic') || error.message.includes('cannot reference itself')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update custom mechanic error:', error);
    res.status(500).json({ error: 'Failed to update custom mechanic' });
  }
});

/**
 * DELETE /api/custom-mechanics/:id
 * Delete custom mechanic by ID
 * Note: CASCADE behavior handled by FK constraints in database
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await customMechanicService.delete(id, userId);

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete custom mechanic error:', error);
    res.status(500).json({ error: 'Failed to delete custom mechanic' });
  }
});

export default router;
