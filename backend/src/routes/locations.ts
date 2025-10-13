/**
 * Locations REST API Routes
 * Feature 014 - Structured Category Database Foundation
 * Based on: specs/014-create-the-database/contracts/openapi.yaml
 */

import express, { Request, Response } from 'express';
import { LocationService, CreateLocationInput, UpdateLocationInput } from '../services/LocationService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * GET /api/locations
 * List locations with pagination, filtering, and sorting
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      campaign_id,
      limit = '50',
      offset = '0',
      core_status,
      player_knowledge,
      parent_location_id,
      tags,
      sort_by = 'name',
      sort_order = 'asc',
    } = req.query;

    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Validate required campaign_id
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

    // Parse pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({ error: 'limit must be between 1 and 100' });
      return;
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      res.status(400).json({ error: 'offset must be 0 or greater' });
      return;
    }

    // Validate sort parameters
    const validSortFields = ['created_at', 'updated_at', 'name'];
    if (!validSortFields.includes(sort_by as string)) {
      res.status(400).json({ error: 'Invalid sort_by. Must be: created_at, updated_at, or name' });
      return;
    }

    if (sort_order !== 'asc' && sort_order !== 'desc') {
      res.status(400).json({ error: 'Invalid sort_order. Must be: asc or desc' });
      return;
    }

    // Validate core_status if provided
    if (core_status && !['active', 'archived', 'draft', 'hidden'].includes(core_status as string)) {
      res.status(400).json({ error: 'Invalid core_status. Must be: active, archived, draft, or hidden' });
      return;
    }

    // Parse tags
    const tagArray = tags && typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : undefined;

    // Parse parent_location_id
    let parentLocationIdValue: string | null | undefined = undefined;
    if (parent_location_id !== undefined) {
      if (parent_location_id === '' || parent_location_id === 'null') {
        parentLocationIdValue = null;
      } else if (typeof parent_location_id === 'string') {
        parentLocationIdValue = parent_location_id;
      }
    }

    // Use service to fetch locations
    const result = LocationService.list(campaign_id, {
      limit: limitNum,
      offset: offsetNum,
      core_status: core_status as 'active' | 'archived' | 'draft' | 'hidden' | undefined,
      player_knowledge: player_knowledge as string | undefined,
      parent_location_id: parentLocationIdValue,
      tags: tagArray,
      sort_by: sort_by as 'created_at' | 'updated_at' | 'name',
      sort_order: sort_order as 'asc' | 'desc',
      viewMode: viewMode,
    });

    // Note: applyInformationFilter middleware will strip dm_* fields in player_view mode
    res.status(200).json({
      data: result.locations,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: result.total,
      },
    });
  } catch (error: any) {
    console.error('List locations error:', error);
    res.status(500).json({ error: 'Failed to list locations' });
  }
});

/**
 * POST /api/locations
 * Create new location
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const input = req.body as CreateLocationInput;

    // Validate required fields
    if (!input.campaign_id || !input.name) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, name' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(input.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Validate name length
    if (input.name.length > 255) {
      res.status(400).json({ error: 'name must be 255 characters or less' });
      return;
    }

    // Validate core_status enum
    if (input.core_status && !['active', 'archived', 'draft', 'hidden'].includes(input.core_status)) {
      res.status(400).json({ error: 'Invalid core_status. Must be: active, archived, draft, or hidden' });
      return;
    }

    // Validate population minimum
    if (input.population !== undefined && input.population !== null && input.population < 0) {
      res.status(400).json({ error: 'population must be 0 or greater' });
      return;
    }

    const location = LocationService.create(input);

    // Note: applyInformationFilter middleware will strip dm_* fields in player_view mode
    res.status(201).json(location);
  } catch (error: any) {
    if (error.message.includes('circular reference')) {
      res.status(422).json({ error: error.message });
      return;
    }

    if (error.message.includes('own parent')) {
      res.status(422).json({ error: error.message });
      return;
    }

    console.error('Create location error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

/**
 * GET /api/locations/:id
 * Get location by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Verify ownership via campaign
    const row = db.prepare(`
      SELECT l.* FROM locations l
      JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.id = ? AND c.owner_id = ?
    `).get(id, userId);

    if (!row) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    // Apply player knowledge filtering
    if (viewMode === 'player_view') {
      const playerKnowledge = (row as any).player_knowledge;
      if (playerKnowledge && !['common_knowledge', 'player_knowledge'].includes(playerKnowledge)) {
        // Return 404 to not reveal existence
        res.status(404).json({ error: 'Location not found' });
        return;
      }
    }

    const location = LocationService.findById(id);

    // Note: applyInformationFilter middleware will strip dm_* fields in player_view mode
    res.status(200).json(location);
  } catch (error: any) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

/**
 * PUT /api/locations/:id
 * Update location
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const input = req.body as UpdateLocationInput;

    // Verify ownership via campaign
    const existing = db.prepare(`
      SELECT l.* FROM locations l
      JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.id = ? AND c.owner_id = ?
    `).get(id, userId);

    if (!existing) {
      res.status(404).json({ error: 'Location not found or access denied' });
      return;
    }

    // Validate name length if provided
    if (input.name !== undefined && input.name.length > 255) {
      res.status(400).json({ error: 'name must be 255 characters or less' });
      return;
    }

    // Validate core_status enum if provided
    if (input.core_status && !['active', 'archived', 'draft', 'hidden'].includes(input.core_status)) {
      res.status(400).json({ error: 'Invalid core_status. Must be: active, archived, draft, or hidden' });
      return;
    }

    // Validate population minimum if provided
    if (input.population !== undefined && input.population !== null && input.population < 0) {
      res.status(400).json({ error: 'population must be 0 or greater' });
      return;
    }

    const location = LocationService.update(id, input);

    // Note: applyInformationFilter middleware will strip dm_* fields in player_view mode
    res.status(200).json(location);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('circular reference')) {
      res.status(422).json({ error: error.message });
      return;
    }

    if (error.message.includes('own parent')) {
      res.status(422).json({ error: error.message });
      return;
    }

    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

/**
 * DELETE /api/locations/:id
 * Delete location
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify ownership via campaign
    const existing = db.prepare(`
      SELECT l.* FROM locations l
      JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.id = ? AND c.owner_id = ?
    `).get(id, userId);

    if (!existing) {
      res.status(404).json({ error: 'Location not found or access denied' });
      return;
    }

    LocationService.delete(id);

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;
