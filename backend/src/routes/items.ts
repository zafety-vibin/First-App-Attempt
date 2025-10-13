/**
 * Items routes
 * Feature: 014-create-the-database
 *
 * Implements 5 CRUD endpoints with:
 * - Authentication (protect middleware)
 * - Information filtering (extractViewMode + applyInformationFilter)
 * - Foreign key validation (owner_npc_id, owner_pc_id, location_id)
 * - CRITICAL: Mutual exclusivity validation (owner_npc_id XOR owner_pc_id)
 * - Campaign ownership validation
 */

import express, { Request, Response } from 'express';
import { ItemService } from '../services/ItemService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();
const itemService = new ItemService(db);

// All routes require authentication and view mode filtering
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * GET /api/items
 * List all items for a campaign with filtering
 * Query params:
 *   - campaign_id (required): Campaign ID
 *   - core_status (optional): Filter by status (active, archived, draft, hidden)
 *   - player_knowledge (optional): Filter by player knowledge level
 *   - tags (optional): Comma-separated tag filters
 *   - owner_npc_id (optional): Filter by NPC owner
 *   - owner_pc_id (optional): Filter by PC owner
 *   - location_id (optional): Filter by location
 *   - item_type (optional): Filter by item type
 *   - rarity (optional): Filter by rarity
 *   - limit (optional): Page size (default 100, max 500)
 *   - offset (optional): Page offset (default 0)
 *   - sort_by (optional): Sort field (created_at, updated_at, name)
 *   - sort_order (optional): Sort order (asc, desc)
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

    // Validate campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== userId) {
      res.status(403).json({ error: 'Not authorized to access this campaign' });
      return;
    }

    // Parse pagination
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    // Parse filters
    const viewMode = req.categoryViewMode || 'dm_view';
    const filters: any = {
      campaign_id,
      viewMode: viewMode
    };

    if (req.query.core_status) {
      const validStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validStatuses.includes(req.query.core_status as string)) {
        res.status(400).json({ error: 'Invalid core_status. Must be: active, archived, draft, or hidden' });
        return;
      }
      filters.core_status = req.query.core_status;
    }

    if (req.query.player_knowledge) {
      filters.player_knowledge = req.query.player_knowledge;
    }

    if (req.query.tags) {
      filters.tags = (req.query.tags as string).split(',').map(t => t.trim());
    }

    if (req.query.owner_npc_id) {
      filters.owner_npc_id = req.query.owner_npc_id;
    }

    if (req.query.owner_pc_id) {
      filters.owner_pc_id = req.query.owner_pc_id;
    }

    if (req.query.location_id) {
      filters.location_id = req.query.location_id;
    }

    if (req.query.item_type) {
      filters.item_type = req.query.item_type;
    }

    if (req.query.rarity) {
      filters.rarity = req.query.rarity;
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

    // Service now handles viewMode filtering internally
    const result = itemService.list(
      filters,
      { limit, offset },
      sort_by as 'created_at' | 'updated_at' | 'name',
      sort_order as 'asc' | 'desc'
    );

    // Note: applyInformationFilter middleware will strip dm_* fields in player_view mode
    res.status(200).json({
      data: result.data,
      pagination: {
        limit,
        offset,
        total: result.total,
      },
    });
  } catch (error: any) {
    console.error('List items error:', error);
    res.status(500).json({ error: 'Failed to fetch items', details: error.message });
  }
});

/**
 * POST /api/items
 * Create a new item
 * Body: CreateItemRequest (see Item model)
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

    // Validate campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(req.body.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== userId) {
      res.status(403).json({ error: 'Not authorized to create items in this campaign' });
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

    const item = itemService.create(req.body);

    res.status(201).json(item);
  } catch (error: any) {
    console.error('Create item error:', error);

    // Handle validation errors
    if (error.message.includes('required') ||
        error.message.includes('Invalid') ||
        error.message.includes('must be') ||
        error.message.includes('references non-existent') ||
        error.message.includes('mutual exclusivity')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create item', details: error.message });
  }
});

/**
 * GET /api/items/:id
 * Get item by ID
 * Headers:
 *   - X-View-Mode: dm_view (default) | player_view
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const item = itemService.findById(id);

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // Validate campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(item.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== userId) {
      res.status(403).json({ error: 'Not authorized to access this item' });
      return;
    }

    // Apply player_knowledge filtering for player_view
    if (req.categoryViewMode === 'player_view') {
      if (item.player_knowledge && !['common_knowledge', 'player_knowledge'].includes(item.player_knowledge)) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
    }

    res.status(200).json(item);
  } catch (error: any) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Failed to fetch item', details: error.message });
  }
});

/**
 * PUT /api/items/:id
 * Update item by ID
 * Body: UpdateItemRequest (see Item model)
 * Headers:
 *   - X-View-Mode: dm_view (default) | player_view
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = itemService.findById(id);

    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // Validate campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(existing.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== userId) {
      res.status(403).json({ error: 'Not authorized to update this item' });
      return;
    }

    // Prevent changing campaign_id via update
    if (req.body.campaign_id && req.body.campaign_id !== existing.campaign_id) {
      res.status(400).json({ error: 'Cannot change campaign_id of existing item' });
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

    const updated = itemService.update(id, req.body);

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update item error:', error);

    // Handle validation errors
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Invalid') ||
        error.message.includes('must be') ||
        error.message.includes('references non-existent') ||
        error.message.includes('mutual exclusivity')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update item', details: error.message });
  }
});

/**
 * DELETE /api/items/:id
 * Delete item by ID
 * Note: CASCADE behavior handled by FK constraints in database
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = itemService.findById(id);

    if (!existing) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    // Validate campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(existing.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== userId) {
      res.status(403).json({ error: 'Not authorized to delete this item' });
      return;
    }

    itemService.delete(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete item error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete item', details: error.message });
  }
});

export default router;
