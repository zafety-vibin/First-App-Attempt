/**
 * Cards routes
 * Based on: specs/003-create-a-notion/contracts/cards.yaml
 * Feature: 003-create-a-notion
 * Extended in Feature: 004-create-a-tagging (added view mode filtering, information_level_id)
 */

import express, { Request, Response } from 'express';
import { CardService } from '../services/CardService';
import { ViewModeService } from '../services/ViewModeService';
import { protect } from '../middleware/auth';
import { extractViewMode } from '../middleware/viewMode';
import { db } from '../services/DatabaseService';
import { rowToCard, CardRow } from '../models/Card';

const router = express.Router();
const cardService = new CardService();
const viewModeService = new ViewModeService();

// All routes require authentication
router.use(protect);
router.use(extractViewMode);

/**
 * GET /api/cards
 * List root cards for campaign (with view mode filtering - Feature 004)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id, type } = req.query;
    const userId = req.user!.id;
    const viewMode = req.viewMode || 'dm';

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaign_id, userId);
    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Build query
    let query = 'SELECT * FROM cards WHERE campaign_id = ? AND parent_id IS NULL';
    const params: any[] = [campaign_id];

    if (type && typeof type === 'string') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY position ASC';

    const rows = db.prepare(query).all(...params) as CardRow[];
    const allCards = rows.map(rowToCard);

    // Feature 004: Apply view mode filtering
    const filtered = viewModeService.filterCards(allCards, viewMode);

    res.status(200).json({
      cards: filtered.visibleCards,
      filtered_count: filtered.filteredCount,
    });
  } catch (error: any) {
    console.error('List cards error:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

/**
 * POST /api/cards
 * Create new card (with information_level_id - Feature 004)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, campaign_id, parent_id, position, title, content, metadata, cover_image_url, icon_emoji, information_level_id } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!type || !campaign_id || position === undefined) {
      res.status(400).json({ error: 'Missing required fields: type, campaign_id, position' });
      return;
    }

    // Validate type enum
    if (!['page', 'database', 'text', 'image'].includes(type)) {
      res.status(400).json({ error: 'Invalid card type. Must be: page, database, text, or image' });
      return;
    }

    const card = await cardService.createCard(
      {
        type,
        campaignId: campaign_id,
        parentId: parent_id || null,
        position,
        title,
        content,
        metadata,
        coverImageUrl: cover_image_url,
        iconEmoji: icon_emoji,
        informationLevelId: information_level_id, // Feature 004
      },
      userId
    );

    res.status(201).json(card);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    if (error.message.includes('depth')) {
      res.status(422).json({ error: error.message });
      return;
    }

    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

/**
 * GET /api/cards/:id
 * Get card by ID (with view mode filtering - Feature 004)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.viewMode || 'dm';

    const row = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(id, userId) as CardRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    const card = rowToCard(row);

    // Feature 004: Check view mode visibility
    if (!viewModeService.isCardVisible(card.informationLevelId, viewMode)) {
      // Return 404 instead of 403 to not reveal existence
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    res.status(200).json(card);
  } catch (error: any) {
    console.error('Get card error:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

/**
 * PUT /api/cards/:id
 * Update card content (not hierarchy) (with information_level_id - Feature 004)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, metadata, cover_image_url, icon_emoji, information_level_id } = req.body;
    const userId = req.user!.id;

    // Verify ownership
    const existing = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(id, userId) as CardRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content ? JSON.stringify(content) : null);
    }

    if (metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(metadata ? JSON.stringify(metadata) : null);
    }

    if (cover_image_url !== undefined) {
      updates.push('cover_image_url = ?');
      values.push(cover_image_url);
    }

    if (icon_emoji !== undefined) {
      updates.push('icon_emoji = ?');
      values.push(icon_emoji);
    }

    // Feature 004: Support information_level_id updates
    if (information_level_id !== undefined) {
      updates.push('information_level_id = ?');
      values.push(information_level_id);
    }

    if (updates.length === 0) {
      res.status(200).json(rowToCard(existing));
      return;
    }

    updates.push('updated_at = strftime(\'%s\', \'now\')');
    values.push(id);

    db.prepare(`
      UPDATE cards SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow;
    res.status(200).json(rowToCard(updated));
  } catch (error: any) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

/**
 * DELETE /api/cards/:id
 * Delete card and entire subtree
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { force } = req.query;
    const userId = req.user!.id;

    // Verify ownership
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    const result = await cardService.deleteCard(id, { force: force === 'true' });

    res.status(200).json(result);
  } catch (error: any) {
    if (error.message.includes('referenced') && error.references) {
      res.status(409).json({
        error: error.message,
        references: error.references,
      });
      return;
    }

    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

/**
 * GET /api/cards/:id/children
 * Get immediate children of card
 */
router.get('/:id/children', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const userId = req.user!.id;

    // Verify ownership
    const parent = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(id, userId) as CardRow | undefined;

    if (!parent) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    // Get children
    let query = 'SELECT * FROM cards WHERE parent_id = ?';
    const params: any[] = [id];

    if (type && typeof type === 'string') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY position ASC';

    const rows = db.prepare(query).all(...params) as CardRow[];
    const cards = rows.map(rowToCard);

    res.status(200).json({ cards });
  } catch (error: any) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

/**
 * GET /api/cards/:id/subtree
 * Get card and all descendants
 */
router.get('/:id/subtree', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { max_depth } = req.query;
    const userId = req.user!.id;

    // Verify ownership
    const root = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(id, userId) as CardRow | undefined;

    if (!root) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    // Get descendants using path
    let query = 'SELECT * FROM cards WHERE path LIKE ?';
    const params: any[] = [`${root.path}/%`];

    if (max_depth) {
      const maxDepthNum = parseInt(max_depth as string);
      query += ' AND depth <= ?';
      params.push(root.depth + maxDepthNum);
    }

    query += ' ORDER BY path ASC, position ASC';

    const descendantRows = db.prepare(query).all(...params) as CardRow[];
    const descendants = descendantRows.map(rowToCard);

    res.status(200).json({
      root: rowToCard(root),
      descendants,
      total_count: descendants.length + 1,
    });
  } catch (error: any) {
    console.error('Get subtree error:', error);
    res.status(500).json({ error: 'Failed to fetch subtree' });
  }
});

/**
 * PATCH /api/cards/:id/move
 * Move card to new parent
 */
router.patch('/:id/move', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { new_parent_id, position } = req.body;
    const userId = req.user!.id;

    if (position === undefined) {
      res.status(400).json({ error: 'Missing required field: position' });
      return;
    }

    const card = await cardService.moveCard(id, new_parent_id || null, position, userId);

    res.status(200).json(card);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('circular') || error.message.includes('subtree') || error.message.includes('depth')) {
      res.status(422).json({ error: error.message });
      return;
    }

    console.error('Move card error:', error);
    res.status(500).json({ error: 'Failed to move card' });
  }
});

/**
 * PATCH /api/cards/:id/reorder
 * Change card position within parent
 */
router.patch('/:id/reorder', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { position } = req.body;
    const userId = req.user!.id;

    if (position === undefined) {
      res.status(400).json({ error: 'Missing required field: position' });
      return;
    }

    // Verify ownership
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    // Update position
    db.prepare(`
      UPDATE cards SET position = ?, updated_at = strftime('%s', 'now') WHERE id = ?
    `).run(position, id);

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow;
    res.status(200).json(rowToCard(updated));
  } catch (error: any) {
    console.error('Reorder card error:', error);
    res.status(500).json({ error: 'Failed to reorder card' });
  }
});

/**
 * GET /api/cards/search
 * Search cards by title
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { campaign_id, q, type } = req.query;
    const userId = req.user!.id;

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      res.status(400).json({ error: 'q query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaign_id, userId);
    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Search cards
    let query = 'SELECT * FROM cards WHERE campaign_id = ? AND title LIKE ?';
    const params: any[] = [campaign_id, `%${q.trim()}%`];

    if (type && typeof type === 'string') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY updated_at DESC';

    const rows = db.prepare(query).all(...params) as CardRow[];
    const cards = rows.map(rowToCard);

    res.status(200).json({
      cards,
      total: cards.length,
    });
  } catch (error: any) {
    console.error('Search cards error:', error);
    res.status(500).json({ error: 'Failed to search cards' });
  }
});

export default router;
