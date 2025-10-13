/**
 * Planar Force routes
 * Feature: 014-create-the-database
 * Task: T050
 *
 * Implements:
 * - 5 CRUD endpoints for planar force management
 * - Auth middleware for campaign ownership validation
 * - Information filtering for player_knowledge and dm_* fields
 * - Foreign key validation (high_priest_id -> npcs.id)
 */

import express, { Request, Response } from 'express';
import { PlanarForceService } from '../services/PlanarForceService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';

const router = express.Router();
const planarForceService = new PlanarForceService();

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * POST /api/planar-forces
 * Create new planar force
 *
 * Request body:
 * - campaign_id (required)
 * - name (required)
 * - description (optional)
 * - core_status (optional, default: 'active')
 * - player_knowledge (optional, default: 'common_knowledge')
 * - tags (optional, string array)
 * - custom_fields (optional, object)
 * - entity_type (optional)
 * - domains (optional, string array)
 * - alignment (optional)
 * - worshiper_base (optional)
 * - plane_of_origin (optional)
 * - base_of_power (optional)
 * - high_priest_id (optional, FK to npcs)
 * - allied_entities (optional, string array)
 * - rival_entities (optional, string array)
 * - religious_orders (optional, string array)
 * - dm_true_nature (optional)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      campaign_id,
      name,
      description,
      core_status,
      player_knowledge,
      tags,
      custom_fields,
      entity_type,
      domains,
      alignment,
      worshiper_base,
      plane_of_origin,
      base_of_power,
      high_priest_id,
      allied_entities,
      rival_entities,
      religious_orders,
      dm_true_nature,
    } = req.body;

    const userId = req.user!.id;

    // Validate required fields
    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id is required' });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'name is required and must not be empty' });
      return;
    }

    // Validate core_status enum if provided
    if (core_status !== undefined) {
      const validStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validStatuses.includes(core_status)) {
        res.status(400).json({
          error: 'Invalid core_status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
    }

    const planarForce = await planarForceService.create(
      {
        campaign_id,
        name: name.trim(),
        description,
        core_status,
        player_knowledge,
        tags,
        custom_fields,
        entity_type,
        domains,
        alignment,
        worshiper_base,
        plane_of_origin,
        base_of_power,
        high_priest_id,
        allied_entities,
        rival_entities,
        religious_orders,
        dm_true_nature,
      },
      userId
    );

    res.status(201).json(planarForce);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    if (error.message.includes('High Priest NPC')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create planar force error:', error);
    res.status(500).json({ error: 'Failed to create planar force' });
  }
});

/**
 * GET /api/planar-forces
 * List planar forces for campaign
 *
 * Query params:
 * - campaign_id (required)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    let planarForces = await planarForceService.getByCampaign(campaign_id, userId);

    // Apply player_knowledge filtering for player_view
    if (viewMode === 'player_view') {
      planarForces = planarForces.filter(force => {
        const pk = force.player_knowledge;
        return pk === 'common_knowledge' || pk === 'player_knowledge' || pk === null;
      });
    }

    res.status(200).json({
      data: planarForces,
      total: planarForces.length,
    });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('List planar forces error:', error);
    res.status(500).json({ error: 'Failed to fetch planar forces' });
  }
});

/**
 * GET /api/planar-forces/:id
 * Get planar force by ID
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    const planarForce = await planarForceService.getById(id, userId);

    if (!planarForce) {
      res.status(404).json({ error: 'Planar force not found' });
      return;
    }

    // Check player_knowledge visibility for player_view
    if (viewMode === 'player_view') {
      const pk = planarForce.player_knowledge;
      if (pk !== 'common_knowledge' && pk !== 'player_knowledge' && pk !== null) {
        // Return 404 instead of 403 to not reveal existence
        res.status(404).json({ error: 'Planar force not found' });
        return;
      }
    }

    res.status(200).json(planarForce);
  } catch (error: any) {
    console.error('Get planar force error:', error);
    res.status(500).json({ error: 'Failed to fetch planar force' });
  }
});

/**
 * PUT /api/planar-forces/:id
 * Update planar force
 *
 * All fields from POST are optional
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const {
      name,
      description,
      core_status,
      player_knowledge,
      tags,
      custom_fields,
      entity_type,
      domains,
      alignment,
      worshiper_base,
      plane_of_origin,
      base_of_power,
      high_priest_id,
      allied_entities,
      rival_entities,
      religious_orders,
      dm_true_nature,
    } = req.body;

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({ error: 'name must not be empty' });
      return;
    }

    // Validate core_status enum if provided
    if (core_status !== undefined) {
      const validStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validStatuses.includes(core_status)) {
        res.status(400).json({
          error: 'Invalid core_status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
    }

    const planarForce = await planarForceService.update(
      id,
      {
        name: name ? name.trim() : undefined,
        description,
        core_status,
        player_knowledge,
        tags,
        custom_fields,
        entity_type,
        domains,
        alignment,
        worshiper_base,
        plane_of_origin,
        base_of_power,
        high_priest_id,
        allied_entities,
        rival_entities,
        religious_orders,
        dm_true_nature,
      },
      userId
    );

    res.status(200).json(planarForce);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('High Priest NPC')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update planar force error:', error);
    res.status(500).json({ error: 'Failed to update planar force' });
  }
});

/**
 * DELETE /api/planar-forces/:id
 * Delete planar force
 * Note: CASCADE behavior handled by FK constraints in database
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await planarForceService.delete(id, userId);

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete planar force error:', error);
    res.status(500).json({ error: 'Failed to delete planar force' });
  }
});

export default router;
