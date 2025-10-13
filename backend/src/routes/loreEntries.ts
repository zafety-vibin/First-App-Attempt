/**
 * Lore Entry Routes
 * Feature: 014-create-the-database
 *
 * Notes:
 * - No foreign key validation needed (relationships via JSON arrays only)
 * - related_npcs, related_locations, related_factions are JSON arrays of IDs
 * - No referential integrity enforcement by design
 *
 * Applies:
 * - protect: Authentication middleware (all routes)
 * - extractViewMode: X-View-Mode header parsing
 * - applyInformationFilter: Automatic dm_* field stripping in player_view mode (no dm_* fields in this table)
 */

import express, { Request, Response } from 'express';
import { LoreEntryService } from '../services/LoreEntryService';
import { db } from '../services/DatabaseService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';

const router = express.Router();
const service = new LoreEntryService();

// Apply authentication, view mode extraction, and information filtering to all routes
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * POST /api/lore-entries
 * Create new lore entry
 *
 * Body: {
 *   campaign_id: string,
 *   name: string,
 *   description?: string,
 *   core_status?: 'active' | 'archived' | 'draft' | 'hidden',
 *   player_knowledge?: string,
 *   tags?: string[],
 *   custom_fields?: Record<string, any>,
 *   category?: string,
 *   era_period?: string,
 *   in_game_date?: string,
 *   historical_accuracy?: string,
 *   related_npcs?: string[],
 *   related_locations?: string[],
 *   related_factions?: string[]
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    // Validate required fields
    if (!data.campaign_id || !data.name) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, name' });
      return;
    }

    // Validate campaign ownership
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(data.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Create lore entry
    const entry = service.create(data);

    res.status(201).json(entry);
  } catch (error: any) {
    console.error('Create lore entry error:', error);

    if (error.message.includes('Campaign not found')) {
      res.status(403).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create lore entry', details: error.message });
  }
});

/**
 * GET /api/lore-entries
 * List all lore entries for a campaign
 *
 * Query params:
 * - campaign_id: string (required)
 * - core_status?: 'active' | 'archived' | 'draft' | 'hidden'
 * - player_knowledge?: string
 * - category?: string
 * - tags?: string (comma-separated tag list)
 * - limit?: number
 * - offset?: number
 *
 * Headers:
 * - X-View-Mode: 'dm_view' | 'player_view' (optional, defaults to dm_view)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';
    const { campaign_id, core_status, player_knowledge, category, tags, limit, offset } = req.query;

    // Validate required query params
    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'Missing required query parameter: campaign_id' });
      return;
    }

    // Validate campaign ownership
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Build filters
    const filters: any = { campaign_id };

    if (core_status && typeof core_status === 'string') {
      if (!['active', 'archived', 'draft', 'hidden'].includes(core_status)) {
        res.status(400).json({ error: 'Invalid core_status. Must be: active, archived, draft, or hidden' });
        return;
      }
      filters.core_status = core_status;
    }

    if (player_knowledge && typeof player_knowledge === 'string') {
      filters.player_knowledge = player_knowledge;
    }

    if (category && typeof category === 'string') {
      filters.category = category;
    }

    if (tags && typeof tags === 'string') {
      filters.tags = tags.split(',').map(t => t.trim());
    }

    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        filters.limit = limitNum;
      }
    }

    if (offset && typeof offset === 'string') {
      const offsetNum = parseInt(offset);
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        filters.offset = offsetNum;
      }
    }

    let entries = service.list(filters);

    // Apply player knowledge filtering for player_view
    if (viewMode === 'player_view') {
      entries = entries.filter(entry => {
        const pk = entry.player_knowledge;
        return pk === 'common_knowledge' || pk === 'player_knowledge' || pk === null;
      });
    }

    // Get total count for pagination
    const total = service.count(campaign_id, {
      core_status: filters.core_status,
      player_knowledge: filters.player_knowledge,
    });

    res.status(200).json({
      data: entries,
      total,
      limit: filters.limit || null,
      offset: filters.offset || 0,
    });
  } catch (error: any) {
    console.error('List lore entries error:', error);
    res.status(500).json({ error: 'Failed to fetch lore entries', details: error.message });
  }
});

/**
 * GET /api/lore-entries/:id
 * Get single lore entry by ID
 *
 * Headers:
 * - X-View-Mode: 'dm_view' | 'player_view' (optional, defaults to dm_view)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';
    const { id } = req.params;

    const entry = service.findById(id);

    if (!entry) {
      res.status(404).json({ error: 'Lore entry not found' });
      return;
    }

    // Validate campaign ownership
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(entry.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Apply player knowledge filtering for player_view
    if (viewMode === 'player_view') {
      const pk = entry.player_knowledge;
      if (pk !== 'common_knowledge' && pk !== 'player_knowledge' && pk !== null) {
        // Return 404 instead of 403 to not reveal existence
        res.status(404).json({ error: 'Lore entry not found' });
        return;
      }
    }

    res.status(200).json(entry);
  } catch (error: any) {
    console.error('Get lore entry error:', error);
    res.status(500).json({ error: 'Failed to fetch lore entry', details: error.message });
  }
});

/**
 * PUT /api/lore-entries/:id
 * Update lore entry
 *
 * Body: {
 *   name?: string,
 *   description?: string,
 *   core_status?: 'active' | 'archived' | 'draft' | 'hidden',
 *   player_knowledge?: string,
 *   tags?: string[],
 *   custom_fields?: Record<string, any>,
 *   category?: string,
 *   era_period?: string,
 *   in_game_date?: string,
 *   historical_accuracy?: string,
 *   related_npcs?: string[],
 *   related_locations?: string[],
 *   related_factions?: string[]
 * }
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body;

    // Check if entry exists and validate ownership
    const existing = service.findById(id);

    if (!existing) {
      res.status(404).json({ error: 'Lore entry not found' });
      return;
    }

    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(existing.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Update lore entry
    const updated = service.update(id, data);

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update lore entry error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update lore entry', details: error.message });
  }
});

/**
 * DELETE /api/lore-entries/:id
 * Delete lore entry
 *
 * Note: No foreign key constraints - deletion always succeeds if entry exists
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if entry exists and validate ownership
    const existing = service.findById(id);

    if (!existing) {
      res.status(404).json({ error: 'Lore entry not found' });
      return;
    }

    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(existing.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Delete lore entry
    service.delete(id);

    res.status(200).json({ message: 'Lore entry deleted successfully' });
  } catch (error: any) {
    console.error('Delete lore entry error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete lore entry', details: error.message });
  }
});

export default router;
