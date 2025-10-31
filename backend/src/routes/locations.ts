/**
 * Locations REST API Routes
 * Feature 014 - Structured Category Database Foundation (standardized)
 * Based on: specs/014-create-the-database/contracts/openapi.yaml
 */

import express, { Request, Response } from 'express';
import { LocationService } from '../services/LocationService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/viewMode';
import { db } from '../services/DatabaseService';

const router = express.Router();

// Initialize LocationService (now instance-based)
const locationService = new LocationService(db);

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * GET /api/locations
 * List locations with pagination, filtering, and sorting
 */
router.get('/', (req: Request, res: Response) => {
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

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      res.status(400).json({ error: 'limit must be between 1 and 1000' });
      return;
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      res.status(400).json({ error: 'offset must be 0 or greater' });
      return;
    }

    // Parse tags
    const tagArray = tags && typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : undefined;

    // Use standardized service method with view mode filtering
    const result = locationService.list(
      {
        campaign_id,
        core_status: core_status as any,
        player_knowledge: player_knowledge as string,
        parent_location_id: parent_location_id as any,
        tags: tagArray,
      },
      { limit: limitNum, offset: offsetNum },
      sort_by as string,
      sort_order as 'asc' | 'desc',
      req.categoryViewMode || 'dm_view' // Pass view mode for row filtering
    );

    res.status(200).json({
      data: result.data,
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
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const input = req.body;

    // Validate required fields
    if (!input.campaign_id || !input.name) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, name' });
      return;
    }

    // Use standardized service method with ownership validation
    const location = locationService.create(input, { ownerId: userId });

    res.status(201).json(location);
  } catch (error: any) {
    if (error.message.includes('circular reference')) {
      res.status(422).json({ error: error.message });
      return;
    }

    if (error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
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
router.get('/:id', (req: Request, res: Response) => {
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
        res.status(404).json({ error: 'Location not found' });
        return;
      }
    }

    const location = locationService.findById(id);

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
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const input = req.body;

    // Use standardized service method with ownership validation
    const location = locationService.update(id, input, { ownerId: userId });

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

    if (error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
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
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Use standardized service method with ownership validation
    locationService.delete(id, { ownerId: userId });

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('Delete location error:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;
