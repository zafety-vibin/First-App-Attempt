/**
 * Session Recap Routes
 * Feature: 014-create-the-database
 *
 * CRITICAL: Session Recaps are ALWAYS canonical (is_canon=1, canonical_status='canon')
 * This is enforced at the service layer, overriding any user input.
 *
 * Applies:
 * - protect: Authentication middleware (all routes)
 * - extractViewMode: X-View-Mode header parsing
 * - applyInformationFilter: Automatic dm_* field stripping in player_view mode
 */

import express, { Request, Response } from 'express';
import { SessionRecapService } from '../services/SessionRecapService';
import { db } from '../services/DatabaseService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';

const router = express.Router();
const service = new SessionRecapService(db);

// Apply authentication, view mode extraction, and information filtering to all routes
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * POST /api/session-recaps
 * Create new session recap
 *
 * Body: {
 *   campaign_id: string,
 *   name: string,
 *   description?: string,
 *   core_status?: 'active' | 'archived' | 'draft' | 'hidden',
 *   player_knowledge?: string,
 *   tags?: string[],
 *   custom_fields?: Record<string, any>,
 *   session_date?: number,
 *   in_game_date_start?: string,
 *   in_game_date_end?: string,
 *   time_passed?: string,
 *   summary?: string,
 *   key_events?: string[],
 *   player_decisions?: string[],
 *   npcs_encountered?: string[],
 *   locations_visited?: string[],
 *   quests_progressed?: string[],
 *   loot_acquired?: string[],
 *   dm_consequences?: string,
 *   dm_behind_scenes?: string
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

    // Generate ID
    const id = require('crypto').randomBytes(16).toString('hex');

    // Create session recap (service enforces is_canon=1, canonical_status='canon')
    const recap = service.create({
      id,
      campaign_id: data.campaign_id,
      name: data.name,
      description: data.description,
      core_status: data.core_status,
      player_knowledge: data.player_knowledge,
      tags: data.tags,
      custom_fields: data.custom_fields,
      session_date: data.session_date,
      in_game_date_start: data.in_game_date_start,
      in_game_date_end: data.in_game_date_end,
      time_passed: data.time_passed,
      summary: data.summary,
      key_events: data.key_events,
      player_decisions: data.player_decisions,
      npcs_encountered: data.npcs_encountered,
      locations_visited: data.locations_visited,
      quests_progressed: data.quests_progressed,
      loot_acquired: data.loot_acquired,
      dm_consequences: data.dm_consequences,
      dm_behind_scenes: data.dm_behind_scenes,
    });

    res.status(201).json(recap);
  } catch (error: any) {
    console.error('Create session recap error:', error);
    res.status(500).json({ error: 'Failed to create session recap', details: error.message });
  }
});

/**
 * GET /api/session-recaps
 * List all session recaps for a campaign
 *
 * Query params:
 * - campaign_id: string (required)
 * - core_status?: 'active' | 'archived' | 'draft' | 'hidden'
 * - start_date?: number (Unix timestamp)
 * - end_date?: number (Unix timestamp)
 * - search?: string (search name or summary)
 *
 * Headers:
 * - X-View-Mode: 'dm_view' | 'player_view' (optional, defaults to dm_view)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';
    const { campaign_id, core_status, start_date, end_date, search } = req.query;

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

    let recaps;

    // Handle different query types
    if (search && typeof search === 'string') {
      recaps = service.search(campaign_id, search);
    } else if (core_status && typeof core_status === 'string') {
      if (!['active', 'archived', 'draft', 'hidden'].includes(core_status)) {
        res.status(400).json({ error: 'Invalid core_status. Must be: active, archived, draft, or hidden' });
        return;
      }
      recaps = service.getByCoreStatus(campaign_id, core_status as any);
    } else if (start_date && end_date) {
      const startNum = parseInt(start_date as string);
      const endNum = parseInt(end_date as string);
      if (isNaN(startNum) || isNaN(endNum)) {
        res.status(400).json({ error: 'Invalid date range. start_date and end_date must be Unix timestamps' });
        return;
      }
      recaps = service.getByDateRange(campaign_id, startNum, endNum);
    } else {
      recaps = service.getAllByCampaign(campaign_id);
    }

    // Apply player knowledge filtering for player_view
    if (viewMode === 'player_view') {
      recaps = recaps.filter(recap => {
        const pk = recap.player_knowledge;
        return pk === 'common_knowledge' || pk === 'player_knowledge' || pk === null;
      });
    }

    // Note: dm_* field stripping is handled by applyInformationFilter middleware

    res.status(200).json({
      data: recaps,
      pagination: {
        currentPage: 1,
        pageSize: recaps.length,
        totalPages: 1,
        totalCount: recaps.length
      }
    });
  } catch (error: any) {
    console.error('List session recaps error:', error);
    res.status(500).json({ error: 'Failed to fetch session recaps', details: error.message });
  }
});

/**
 * GET /api/session-recaps/:id
 * Get single session recap by ID
 *
 * Headers:
 * - X-View-Mode: 'dm_view' | 'player_view' (optional, defaults to dm_view)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';
    const { id } = req.params;

    const recap = service.getById(id);

    if (!recap) {
      res.status(404).json({ error: 'Session recap not found' });
      return;
    }

    // Validate campaign ownership
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(recap.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Apply player knowledge filtering for player_view
    if (viewMode === 'player_view') {
      const pk = recap.player_knowledge;
      if (pk !== 'common_knowledge' && pk !== 'player_knowledge' && pk !== null) {
        // Return 404 instead of 403 to not reveal existence
        res.status(404).json({ error: 'Session recap not found' });
        return;
      }
    }

    // Note: dm_* field stripping is handled by applyInformationFilter middleware

    res.status(200).json(recap);
  } catch (error: any) {
    console.error('Get session recap error:', error);
    res.status(500).json({ error: 'Failed to fetch session recap', details: error.message });
  }
});

/**
 * PUT /api/session-recaps/:id
 * Update session recap
 *
 * Body: {
 *   name?: string,
 *   description?: string,
 *   core_status?: 'active' | 'archived' | 'draft' | 'hidden',
 *   player_knowledge?: string,
 *   tags?: string[],
 *   custom_fields?: Record<string, any>,
 *   session_date?: number,
 *   in_game_date_start?: string,
 *   in_game_date_end?: string,
 *   time_passed?: string,
 *   summary?: string,
 *   key_events?: string[],
 *   player_decisions?: string[],
 *   npcs_encountered?: string[],
 *   locations_visited?: string[],
 *   quests_progressed?: string[],
 *   loot_acquired?: string[],
 *   dm_consequences?: string,
 *   dm_behind_scenes?: string
 * }
 *
 * CRITICAL: is_canon and canonical_status are ALWAYS enforced as 1 and 'canon' by service
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body;

    // Check if recap exists and validate ownership
    const existing = service.getById(id);

    if (!existing) {
      res.status(404).json({ error: 'Session recap not found' });
      return;
    }

    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(existing.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Update session recap (service enforces is_canon=1, canonical_status='canon')
    const updated = service.update(id, data);

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update session recap error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update session recap', details: error.message });
  }
});

/**
 * DELETE /api/session-recaps/:id
 * Delete session recap
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Check if recap exists and validate ownership
    const existing = service.getById(id);

    if (!existing) {
      res.status(404).json({ error: 'Session recap not found' });
      return;
    }

    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(existing.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Delete session recap
    service.delete(id);

    res.status(200).json({ message: 'Session recap deleted successfully' });
  } catch (error: any) {
    console.error('Delete session recap error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete session recap', details: error.message });
  }
});

export default router;
