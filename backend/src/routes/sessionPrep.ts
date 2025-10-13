/**
 * Session Prep routes
 * Feature: 014-create-the-database
 * Task: T051
 *
 * Implements:
 * - 5 CRUD endpoints for session prep management
 * - Auth middleware for campaign ownership validation
 * - Information filtering (always dm_only, hardcoded)
 * - Status enum validation ('draft' | 'ready' | 'completed' | 'cancelled')
 * - CRITICAL: Enforces is_canon=0, canonical_status='hypothetical', player_knowledge='dm_only'
 */

import express, { Request, Response } from 'express';
import { SessionPrepService } from '../services/SessionPrepService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';
import crypto from 'crypto';

const router = express.Router();
const sessionPrepService = new SessionPrepService(db);

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * POST /api/session-preps
 * Create new session prep
 *
 * Request body:
 * - campaign_id (required)
 * - name (required)
 * - description (optional)
 * - core_status (optional, default: 'active')
 * - tags (optional, string array)
 * - custom_fields (optional, object)
 * - planned_date (optional, unix timestamp)
 * - status (optional, default: 'draft')
 * - planned_events (optional)
 * - possible_encounters (optional)
 * - plot_hooks (optional)
 * - dm_notes (optional)
 * - plot_threads (optional, string array)
 * - npcs_to_prep (optional, string array)
 * - locations_to_prep (optional, string array)
 *
 * NOTE: player_knowledge, is_canon, and canonical_status are ALWAYS forced to dm_only, 0, and hypothetical
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      campaign_id,
      name,
      description,
      core_status,
      tags,
      custom_fields,
      planned_date,
      status,
      planned_events,
      possible_encounters,
      plot_hooks,
      dm_notes,
      plot_threads,
      npcs_to_prep,
      locations_to_prep,
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

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Validate status enum if provided
    if (status !== undefined) {
      const validStatuses = ['draft', 'ready', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
    }

    // Validate core_status enum if provided
    if (core_status !== undefined) {
      const validCoreStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validCoreStatuses.includes(core_status)) {
        res.status(400).json({
          error: 'Invalid core_status',
          details: `Must be one of: ${validCoreStatuses.join(', ')}`,
        });
        return;
      }
    }

    const id = crypto.randomUUID();

    const sessionPrep = sessionPrepService.create({
      id,
      campaignId: campaign_id,
      name: name.trim(),
      description,
      coreStatus: core_status,
      tags,
      customFields: custom_fields,
      plannedDate: planned_date,
      status,
      plannedEvents: planned_events,
      possibleEncounters: possible_encounters,
      plotHooks: plot_hooks,
      dmNotes: dm_notes,
      plotThreads: plot_threads,
      npcsToPrep: npcs_to_prep,
      locationsToPrep: locations_to_prep,
    });

    res.status(201).json(sessionPrep);
  } catch (error: any) {
    if (error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create session prep error:', error);
    res.status(500).json({ error: 'Failed to create session prep' });
  }
});

/**
 * GET /api/session-preps
 * List session preps for campaign with optional filtering
 *
 * Query params:
 * - campaign_id (required)
 * - status (optional, filter by status)
 * - core_status (optional, filter by core_status)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 *
 * NOTE: Player view will always return empty array since session preps are always dm_only
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id, status, core_status } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Player view: session preps are ALWAYS dm_only, return empty
    if (viewMode === 'player_view') {
      res.status(200).json({
        data: [],
        total: 0,
      });
      return;
    }

    let sessionPreps: any[] = [];

    // Apply filters
    if (status && typeof status === 'string') {
      // Validate status
      const validStatuses = ['draft', 'ready', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
      sessionPreps = sessionPrepService.getByStatus(campaign_id, status as any);
    } else if (core_status && typeof core_status === 'string') {
      // Validate core_status
      const validCoreStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validCoreStatuses.includes(core_status)) {
        res.status(400).json({
          error: 'Invalid core_status',
          details: `Must be one of: ${validCoreStatuses.join(', ')}`,
        });
        return;
      }
      sessionPreps = sessionPrepService.getByCoreStatus(campaign_id, core_status as any);
    } else {
      // Get all
      sessionPreps = sessionPrepService.getAllByCampaign(campaign_id);
    }

    res.status(200).json({
      data: sessionPreps,
      total: sessionPreps.length,
    });
  } catch (error: any) {
    if (error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('List session preps error:', error);
    res.status(500).json({ error: 'Failed to fetch session preps' });
  }
});

/**
 * GET /api/session-preps/:id
 * Get session prep by ID
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 *
 * NOTE: Player view will always return 404 since session preps are always dm_only
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Get session prep and verify ownership via campaign
    const sessionPrep = db
      .prepare(`
        SELECT sp.* FROM session_preps sp
        JOIN campaigns c ON sp.campaign_id = c.id
        WHERE sp.id = ? AND c.owner_id = ?
      `)
      .get(id, userId);

    if (!sessionPrep) {
      res.status(404).json({ error: 'Session prep not found' });
      return;
    }

    // Player view: session preps are ALWAYS dm_only, return 404
    if (viewMode === 'player_view') {
      res.status(404).json({ error: 'Session prep not found' });
      return;
    }

    // Parse JSON fields
    const sessionPrepData = {
      id: (sessionPrep as any).id,
      campaign_id: (sessionPrep as any).campaign_id,
      name: (sessionPrep as any).name,
      description: (sessionPrep as any).description,
      core_status: (sessionPrep as any).core_status,
      player_knowledge: 'dm_only',
      tags: JSON.parse((sessionPrep as any).tags),
      created_at: (sessionPrep as any).created_at,
      updated_at: (sessionPrep as any).updated_at,
      custom_fields: JSON.parse((sessionPrep as any).custom_fields),
      planned_date: (sessionPrep as any).planned_date,
      status: (sessionPrep as any).status,
      planned_events: (sessionPrep as any).planned_events,
      possible_encounters: (sessionPrep as any).possible_encounters,
      plot_hooks: (sessionPrep as any).plot_hooks,
      dm_notes: (sessionPrep as any).dm_notes,
      is_canon: 0,
      canonical_status: 'hypothetical',
      plot_threads: JSON.parse((sessionPrep as any).plot_threads),
      npcs_to_prep: JSON.parse((sessionPrep as any).npcs_to_prep),
      locations_to_prep: JSON.parse((sessionPrep as any).locations_to_prep),
    };

    res.status(200).json(sessionPrepData);
  } catch (error: any) {
    console.error('Get session prep error:', error);
    res.status(500).json({ error: 'Failed to fetch session prep' });
  }
});

/**
 * PUT /api/session-preps/:id
 * Update session prep
 *
 * All fields from POST are optional
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 *
 * NOTE: Updates are not allowed in player_view since session preps are always dm_only
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Verify ownership
    const existing = db
      .prepare(`
        SELECT sp.campaign_id FROM session_preps sp
        JOIN campaigns c ON sp.campaign_id = c.id
        WHERE sp.id = ? AND c.owner_id = ?
      `)
      .get(id, userId);

    if (!existing) {
      res.status(404).json({ error: 'Session prep not found' });
      return;
    }

    // Player view: cannot update dm_only content
    if (viewMode === 'player_view') {
      res.status(403).json({ error: 'Cannot update DM-only content in player view' });
      return;
    }

    const {
      name,
      description,
      core_status,
      tags,
      custom_fields,
      planned_date,
      status,
      planned_events,
      possible_encounters,
      plot_hooks,
      dm_notes,
      plot_threads,
      npcs_to_prep,
      locations_to_prep,
    } = req.body;

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({ error: 'name must not be empty' });
      return;
    }

    // Validate status enum if provided
    if (status !== undefined) {
      const validStatuses = ['draft', 'ready', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
    }

    // Validate core_status enum if provided
    if (core_status !== undefined) {
      const validCoreStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validCoreStatuses.includes(core_status)) {
        res.status(400).json({
          error: 'Invalid core_status',
          details: `Must be one of: ${validCoreStatuses.join(', ')}`,
        });
        return;
      }
    }

    const sessionPrep = sessionPrepService.update(id, {
      name: name ? name.trim() : undefined,
      description,
      coreStatus: core_status,
      tags,
      customFields: custom_fields,
      plannedDate: planned_date,
      status,
      plannedEvents: planned_events,
      possibleEncounters: possible_encounters,
      plotHooks: plot_hooks,
      dmNotes: dm_notes,
      plotThreads: plot_threads,
      npcsToPrep: npcs_to_prep,
      locationsToPrep: locations_to_prep,
    });

    res.status(200).json(sessionPrep);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update session prep error:', error);
    res.status(500).json({ error: 'Failed to update session prep' });
  }
});

/**
 * DELETE /api/session-preps/:id
 * Delete session prep
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Verify ownership
    const existing = db
      .prepare(`
        SELECT sp.campaign_id FROM session_preps sp
        JOIN campaigns c ON sp.campaign_id = c.id
        WHERE sp.id = ? AND c.owner_id = ?
      `)
      .get(id, userId);

    if (!existing) {
      res.status(404).json({ error: 'Session prep not found' });
      return;
    }

    // Player view: cannot delete dm_only content
    if (viewMode === 'player_view') {
      res.status(403).json({ error: 'Cannot delete DM-only content in player view' });
      return;
    }

    sessionPrepService.delete(id);

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete session prep error:', error);
    res.status(500).json({ error: 'Failed to delete session prep' });
  }
});

/**
 * GET /api/session-preps/upcoming/:campaignId
 * Get upcoming session preps (planned_date >= now, not completed/cancelled)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 *
 * NOTE: Player view will always return empty array since session preps are always dm_only
 */
router.get('/upcoming/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaignId, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Player view: session preps are ALWAYS dm_only, return empty
    if (viewMode === 'player_view') {
      res.status(200).json({
        data: [],
        total: 0,
      });
      return;
    }

    const sessionPreps = sessionPrepService.getUpcoming(campaignId);

    res.status(200).json({
      data: sessionPreps,
      total: sessionPreps.length,
    });
  } catch (error: any) {
    console.error('Get upcoming session preps error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming session preps' });
  }
});

/**
 * GET /api/session-preps/search/:campaignId
 * Search session preps by name, description, or planned_events
 *
 * Query params:
 * - query (required, search term)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 *
 * NOTE: Player view will always return empty array since session preps are always dm_only
 */
router.get('/search/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { query } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaignId, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Player view: session preps are ALWAYS dm_only, return empty
    if (viewMode === 'player_view') {
      res.status(200).json({
        data: [],
        total: 0,
      });
      return;
    }

    const sessionPreps = sessionPrepService.search(campaignId, query);

    res.status(200).json({
      data: sessionPreps,
      total: sessionPreps.length,
    });
  } catch (error: any) {
    console.error('Search session preps error:', error);
    res.status(500).json({ error: 'Failed to search session preps' });
  }
});

export default router;
