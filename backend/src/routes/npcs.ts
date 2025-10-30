/**
 * NPC Routes
 * Feature: 014-create-the-database
 *
 * REST endpoints for NPC operations with:
 * - Keycloak authentication
 * - View mode filtering (dm_view vs player_view)
 * - Pagination (limit/offset)
 * - Filtering (campaign_id, core_status, player_knowledge, tags)
 * - Sorting (created_at, updated_at, name)
 */

import express, { Request, Response } from 'express';
import { NPCService } from '../services/NPCService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Apply view mode extraction and filtering
router.use(extractViewMode);
router.use(applyInformationFilter);

// Initialize service
const npcService = new NPCService(db);

/**
 * GET /api/npcs
 * List NPCs with filters, pagination, and sorting
 */
router.get('/', (req: Request, res: Response) => {
  try {
    // Parse pagination
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    // Parse filters
    const campaign_id = req.query.campaign_id as string | undefined;
    const core_status = req.query.core_status as 'active' | 'archived' | 'draft' | 'hidden' | undefined;
    const player_knowledge = req.query.player_knowledge as string | undefined;
    const tags = req.query.tags ? (req.query.tags as string).split(',').map(t => t.trim()) : undefined;

    // Validate campaign_id is provided
    if (!campaign_id) {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to access this campaign' });
      return;
    }

    // Validate core_status if provided
    if (core_status && !['active', 'archived', 'draft', 'hidden'].includes(core_status)) {
      res.status(400).json({ error: 'Invalid core_status value. Must be: active, archived, draft, or hidden' });
      return;
    }

    // Parse sorting
    const sort_by = (req.query.sort_by as string) || 'created_at';
    const sort_order = (req.query.sort_order as string) || 'desc';

    // Validate sort_by
    if (!['created_at', 'updated_at', 'name'].includes(sort_by)) {
      res.status(400).json({ error: 'Invalid sort_by value. Must be: created_at, updated_at, or name' });
      return;
    }

    // Validate sort_order
    if (!['asc', 'desc'].includes(sort_order)) {
      res.status(400).json({ error: 'Invalid sort_order value. Must be: asc or desc' });
      return;
    }

    // Build filters object
    const filters: any = { campaign_id };

    if (core_status) {
      filters.core_status = core_status;
    }

    if (player_knowledge) {
      filters.player_knowledge = player_knowledge;
    }

    if (tags) {
      filters.tags = tags;
    }

    // List NPCs with filters and view mode (service handles row filtering)
    const result = npcService.list(
      filters,
      { limit, offset },
      sort_by as 'created_at' | 'updated_at' | 'name',
      sort_order as 'asc' | 'desc',
      req.categoryViewMode || 'dm_view'
    );

    res.status(200).json({
      data: result.data,
      pagination: {
        limit,
        offset,
        total: result.total,
      },
    });
  } catch (error: any) {
    console.error('List NPCs error:', error);
    res.status(500).json({ error: 'Failed to list NPCs', details: error.message });
  }
});

/**
 * POST /api/npcs
 * Create new NPC
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { campaign_id } = req.body;

    // Validate campaign_id
    if (!campaign_id) {
      res.status(400).json({ error: 'campaign_id is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to create NPCs in this campaign' });
      return;
    }

    // Create NPC
    const npc = npcService.create(req.body);

    res.status(201).json(npc);
  } catch (error: any) {
    console.error('Create NPC error:', error);

    // Handle validation errors
    if (error.message.includes('required') ||
        error.message.includes('Invalid') ||
        error.message.includes('must be') ||
        error.message.includes('references non-existent') ||
        error.message.includes('Circular hierarchy')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create NPC', details: error.message });
  }
});

/**
 * GET /api/npcs/:id
 * Get NPC by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const npc = npcService.findById(id);

    if (!npc) {
      res.status(404).json({ error: 'NPC not found' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(npc.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to access this NPC' });
      return;
    }

    // Apply player_knowledge filtering for player_view
    // @ts-ignore - TypeScript type narrowing issue with Express augmentation
    if (req.categoryViewMode === "player_view") {
      if (npc.player_knowledge && !['common_knowledge', 'player_knowledge'].includes(npc.player_knowledge)) {
        res.status(404).json({ error: 'NPC not found' });
        return;
      }
    }

    res.status(200).json(npc);
  } catch (error: any) {
    console.error('Get NPC error:', error);
    res.status(500).json({ error: 'Failed to get NPC', details: error.message });
  }
});

/**
 * PUT /api/npcs/:id
 * Update NPC
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = npcService.findById(id);

    if (!existing) {
      res.status(404).json({ error: 'NPC not found' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(existing.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to update this NPC' });
      return;
    }

    // Prevent changing campaign_id via update
    if (req.body.campaign_id && req.body.campaign_id !== existing.campaign_id) {
      res.status(400).json({ error: 'Cannot change campaign_id of existing NPC' });
      return;
    }

    // Update NPC
    const updated = npcService.update(id, req.body);

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update NPC error:', error);

    // Handle validation errors
    if (error.message.includes('NPC not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Invalid') ||
        error.message.includes('must be') ||
        error.message.includes('references non-existent') ||
        error.message.includes('Circular hierarchy') ||
        error.message.includes('cannot be its own')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update NPC', details: error.message });
  }
});

/**
 * DELETE /api/npcs/:id
 * Delete NPC
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = npcService.findById(id);

    if (!existing) {
      res.status(404).json({ error: 'NPC not found' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(existing.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to delete this NPC' });
      return;
    }

    // Delete NPC
    npcService.delete(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete NPC error:', error);

    if (error.message.includes('NPC not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete NPC', details: error.message });
  }
});

export default router;
