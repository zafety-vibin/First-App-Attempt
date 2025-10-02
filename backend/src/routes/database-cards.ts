/**
 * Database Cards routes
 * Based on: specs/003-create-a-notion/contracts/database-cards.yaml
 * Feature: 003-create-a-notion
 *
 * Handles database schema management and entry CRUD operations
 */

import express, { Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { db } from '../services/DatabaseService';
import { CardRow, generateCardId } from '../models/Card';
import { DatabaseCardMetadata } from '../../shared/types/DatabaseSchema';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * GET /api/cards/:database_id/schema
 * Get database schema
 */
router.get('/:database_id/schema', async (req: Request, res: Response) => {
  try {
    const { database_id } = req.params;
    const userId = req.user!.id;

    // Verify ownership and type
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(database_id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Database card not found or access denied' });
      return;
    }

    if (card.type !== 'database') {
      res.status(422).json({ error: `Card is not a database (type='${card.type}')` });
      return;
    }

    const metadata: DatabaseCardMetadata = card.metadata ? JSON.parse(card.metadata) : { schema: { columns: [] }, views: [], defaultViewId: '' };

    res.status(200).json({
      columns: metadata.schema.columns,
      views: metadata.views,
      defaultViewId: metadata.defaultViewId,
    });
  } catch (error: any) {
    console.error('Get database schema error:', error);
    res.status(500).json({ error: 'Failed to fetch database schema' });
  }
});

/**
 * PUT /api/cards/:database_id/schema
 * Update database schema
 */
router.put('/:database_id/schema', async (req: Request, res: Response) => {
  try {
    const { database_id } = req.params;
    const { columns, views, defaultViewId } = req.body;
    const userId = req.user!.id;

    // Verify ownership and type
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(database_id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Database card not found or access denied' });
      return;
    }

    if (card.type !== 'database') {
      res.status(422).json({ error: `Card is not a database (type='${card.type}')` });
      return;
    }

    // Validate column references in views
    const columnIds = new Set(columns.map((c: any) => c.id));
    for (const view of views) {
      if (view.filter) {
        for (const rule of view.filter) {
          if (!columnIds.has(rule.columnId)) {
            res.status(422).json({ error: `View references non-existent column ID: ${rule.columnId}` });
            return;
          }
        }
      }
      if (view.sort) {
        for (const rule of view.sort) {
          if (!columnIds.has(rule.columnId)) {
            res.status(422).json({ error: `View references non-existent column ID: ${rule.columnId}` });
            return;
          }
        }
      }
      if (view.groupBy && !columnIds.has(view.groupBy)) {
        res.status(422).json({ error: `View references non-existent column ID: ${view.groupBy}` });
        return;
      }
    }

    // Update metadata
    const metadata: DatabaseCardMetadata = {
      schema: { columns },
      views,
      defaultViewId,
    };

    db.prepare(`
      UPDATE cards SET metadata = ?, updated_at = strftime('%s', 'now') WHERE id = ?
    `).run(JSON.stringify(metadata), database_id);

    res.status(200).json({
      columns: metadata.schema.columns,
      views: metadata.views,
      defaultViewId: metadata.defaultViewId,
    });
  } catch (error: any) {
    console.error('Update database schema error:', error);
    res.status(500).json({ error: 'Failed to update database schema' });
  }
});

/**
 * POST /api/cards/:database_id/columns
 * Add column to database
 */
router.post('/:database_id/columns', async (req: Request, res: Response) => {
  try {
    const { database_id } = req.params;
    const column = req.body;
    const userId = req.user!.id;

    // Verify ownership and type
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(database_id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Database card not found or access denied' });
      return;
    }

    if (card.type !== 'database') {
      res.status(422).json({ error: `Card is not a database (type='${card.type}')` });
      return;
    }

    // Validate column type
    const validTypes = ['text', 'number', 'date', 'select', 'multi-select', 'entity-reference'];
    if (!validTypes.includes(column.type)) {
      res.status(400).json({ error: `Invalid column type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const metadata: DatabaseCardMetadata = card.metadata ? JSON.parse(card.metadata) : { schema: { columns: [] }, views: [], defaultViewId: '' };
    metadata.schema.columns.push(column);

    db.prepare(`
      UPDATE cards SET metadata = ?, updated_at = strftime('%s', 'now') WHERE id = ?
    `).run(JSON.stringify(metadata), database_id);

    res.status(201).json({
      columns: metadata.schema.columns,
      views: metadata.views,
      defaultViewId: metadata.defaultViewId,
    });
  } catch (error: any) {
    console.error('Add column error:', error);
    res.status(500).json({ error: 'Failed to add column' });
  }
});

/**
 * DELETE /api/cards/:database_id/columns/:column_id
 * Delete column from database
 */
router.delete('/:database_id/columns/:column_id', async (req: Request, res: Response) => {
  try {
    const { database_id, column_id } = req.params;
    const { confirm } = req.query;
    const userId = req.user!.id;

    if (confirm !== 'true') {
      res.status(400).json({ error: 'Confirmation required: add ?confirm=true to delete column' });
      return;
    }

    // Verify ownership and type
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(database_id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Database card not found or access denied' });
      return;
    }

    if (card.type !== 'database') {
      res.status(422).json({ error: `Card is not a database (type='${card.type}')` });
      return;
    }

    const metadata: DatabaseCardMetadata = card.metadata ? JSON.parse(card.metadata) : { schema: { columns: [] }, views: [], defaultViewId: '' };
    metadata.schema.columns = metadata.schema.columns.filter(c => c.id !== column_id);

    db.prepare(`
      UPDATE cards SET metadata = ?, updated_at = strftime('%s', 'now') WHERE id = ?
    `).run(JSON.stringify(metadata), database_id);

    res.status(200).json({
      columns: metadata.schema.columns,
      views: metadata.views,
      defaultViewId: metadata.defaultViewId,
    });
  } catch (error: any) {
    console.error('Delete column error:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

/**
 * POST /api/cards/:database_id/views
 * Add view to database
 */
router.post('/:database_id/views', async (req: Request, res: Response) => {
  try {
    const { database_id } = req.params;
    const view = req.body;
    const userId = req.user!.id;

    // Verify ownership and type
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(database_id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Database card not found or access denied' });
      return;
    }

    if (card.type !== 'database') {
      res.status(422).json({ error: `Card is not a database (type='${card.type}')` });
      return;
    }

    // Validate view type
    const validTypes = ['table', 'list', 'gallery', 'kanban'];
    if (!validTypes.includes(view.type)) {
      res.status(400).json({ error: `Invalid view type. Must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const metadata: DatabaseCardMetadata = card.metadata ? JSON.parse(card.metadata) : { schema: { columns: [] }, views: [], defaultViewId: '' };
    metadata.views.push(view);

    db.prepare(`
      UPDATE cards SET metadata = ?, updated_at = strftime('%s', 'now') WHERE id = ?
    `).run(JSON.stringify(metadata), database_id);

    res.status(201).json({
      columns: metadata.schema.columns,
      views: metadata.views,
      defaultViewId: metadata.defaultViewId,
    });
  } catch (error: any) {
    console.error('Add view error:', error);
    res.status(500).json({ error: 'Failed to add view' });
  }
});

/**
 * DELETE /api/cards/:database_id/views/:view_id
 * Delete view from database
 */
router.delete('/:database_id/views/:view_id', async (req: Request, res: Response) => {
  try {
    const { database_id, view_id } = req.params;
    const userId = req.user!.id;

    // Verify ownership and type
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(database_id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Database card not found or access denied' });
      return;
    }

    if (card.type !== 'database') {
      res.status(422).json({ error: `Card is not a database (type='${card.type}')` });
      return;
    }

    const metadata: DatabaseCardMetadata = card.metadata ? JSON.parse(card.metadata) : { schema: { columns: [] }, views: [], defaultViewId: '' };
    metadata.views = metadata.views.filter(v => v.id !== view_id);

    db.prepare(`
      UPDATE cards SET metadata = ?, updated_at = strftime('%s', 'now') WHERE id = ?
    `).run(JSON.stringify(metadata), database_id);

    res.status(200).json({
      columns: metadata.schema.columns,
      views: metadata.views,
      defaultViewId: metadata.defaultViewId,
    });
  } catch (error: any) {
    console.error('Delete view error:', error);
    res.status(500).json({ error: 'Failed to delete view' });
  }
});

/**
 * GET /api/cards/:database_id/entries
 * List database entries
 */
router.get('/:database_id/entries', async (req: Request, res: Response) => {
  try {
    const { database_id } = req.params;
    const { view_id: _view_id, limit, offset } = req.query;
    const userId = req.user!.id;

    // Verify ownership and type
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(database_id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Database card not found or access denied' });
      return;
    }

    if (card.type !== 'database') {
      res.status(422).json({ error: `Card is not a database (type='${card.type}')` });
      return;
    }

    // Get entries (page cards with parent_id = database_id)
    const limitNum = limit ? parseInt(limit as string) : 10;
    const offsetNum = offset ? parseInt(offset as string) : 0;

    const entries = db.prepare(`
      SELECT * FROM cards WHERE parent_id = ? ORDER BY position ASC LIMIT ? OFFSET ?
    `).all(database_id, limitNum, offsetNum) as CardRow[];

    const total = db.prepare('SELECT COUNT(*) as count FROM cards WHERE parent_id = ?').get(database_id) as { count: number };

    const formattedEntries = entries.map(entry => {
      const metadata = entry.metadata ? JSON.parse(entry.metadata) : {};
      return {
        id: entry.id,
        databaseId: entry.parent_id,
        title: entry.title,
        values: metadata.values || {},
        content: entry.content ? JSON.parse(entry.content) : null,
        createdAt: new Date(entry.created_at * 1000).toISOString(),
        updatedAt: new Date(entry.updated_at * 1000).toISOString(),
      };
    });

    res.status(200).json({
      entries: formattedEntries,
      total: total.count,
    });
  } catch (error: any) {
    console.error('List entries error:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

/**
 * POST /api/cards/:database_id/entries
 * Create database entry
 */
router.post('/:database_id/entries', async (req: Request, res: Response) => {
  try {
    const { database_id } = req.params;
    const { title, values, content } = req.body;
    const userId = req.user!.id;

    // Verify ownership and type
    const dbCard = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(database_id, userId) as CardRow | undefined;

    if (!dbCard) {
      res.status(404).json({ error: 'Database card not found or access denied' });
      return;
    }

    if (dbCard.type !== 'database') {
      res.status(422).json({ error: `Card is not a database (type='${dbCard.type}')` });
      return;
    }

    // Validate required columns
    const metadata: DatabaseCardMetadata = dbCard.metadata ? JSON.parse(dbCard.metadata) : { schema: { columns: [] }, views: [], defaultViewId: '' };
    for (const column of metadata.schema.columns) {
      if (column.required && !values[column.id]) {
        res.status(422).json({ error: `Missing required column: ${column.name}` });
        return;
      }
    }

    // Create entry as page card
    const entryId = generateCardId();
    const path = `${dbCard.path}/${entryId}`;
    const now = Math.floor(Date.now() / 1000);

    const entryMetadata = {
      databaseId: database_id,
      values,
    };

    db.prepare(`
      INSERT INTO cards (
        id, type, parent_id, campaign_id, path, position, depth,
        title, content, metadata, created_at, updated_at
      )
      VALUES (?, 'page', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entryId,
      database_id,
      dbCard.campaign_id,
      path,
      0, // Position will be managed by client
      dbCard.depth + 1,
      title || null,
      content ? JSON.stringify(content) : null,
      JSON.stringify(entryMetadata),
      now,
      now
    );

    res.status(201).json({
      id: entryId,
      databaseId: database_id,
      title: title || null,
      values,
      content,
      createdAt: new Date(now * 1000).toISOString(),
      updatedAt: new Date(now * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Create entry error:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

/**
 * GET /api/cards/:database_id/entries/:entry_id
 * Get database entry
 */
router.get('/:database_id/entries/:entry_id', async (req: Request, res: Response) => {
  try {
    const { database_id, entry_id } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const entry = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND c.parent_id = ? AND cam.owner_id = ?
    `).get(entry_id, database_id, userId) as CardRow | undefined;

    if (!entry) {
      res.status(404).json({ error: 'Entry not found or access denied' });
      return;
    }

    const metadata = entry.metadata ? JSON.parse(entry.metadata) : {};

    res.status(200).json({
      id: entry.id,
      databaseId: entry.parent_id,
      title: entry.title,
      values: metadata.values || {},
      content: entry.content ? JSON.parse(entry.content) : null,
      createdAt: new Date(entry.created_at * 1000).toISOString(),
      updatedAt: new Date(entry.updated_at * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Get entry error:', error);
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

/**
 * PUT /api/cards/:database_id/entries/:entry_id
 * Update database entry
 */
router.put('/:database_id/entries/:entry_id', async (req: Request, res: Response) => {
  try {
    const { database_id, entry_id } = req.params;
    const { title, values, content } = req.body;
    const userId = req.user!.id;

    // Verify ownership
    const entry = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND c.parent_id = ? AND cam.owner_id = ?
    `).get(entry_id, database_id, userId) as CardRow | undefined;

    if (!entry) {
      res.status(404).json({ error: 'Entry not found or access denied' });
      return;
    }

    // Update entry
    const currentMetadata = entry.metadata ? JSON.parse(entry.metadata) : { databaseId: database_id, values: {} };

    if (values) {
      currentMetadata.values = { ...currentMetadata.values, ...values };
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content ? JSON.stringify(content) : null);
    }

    if (values) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(currentMetadata));
    }

    updates.push('updated_at = strftime(\'%s\', \'now\')');
    params.push(entry_id);

    db.prepare(`
      UPDATE cards SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(entry_id) as CardRow;
    const updatedMetadata = updated.metadata ? JSON.parse(updated.metadata) : {};

    res.status(200).json({
      id: updated.id,
      databaseId: updated.parent_id,
      title: updated.title,
      values: updatedMetadata.values || {},
      content: updated.content ? JSON.parse(updated.content) : null,
      createdAt: new Date(updated.created_at * 1000).toISOString(),
      updatedAt: new Date(updated.updated_at * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

/**
 * DELETE /api/cards/:database_id/entries/:entry_id
 * Delete database entry
 */
router.delete('/:database_id/entries/:entry_id', async (req: Request, res: Response) => {
  try {
    const { database_id, entry_id } = req.params;
    const userId = req.user!.id;

    // Verify ownership
    const entry = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND c.parent_id = ? AND cam.owner_id = ?
    `).get(entry_id, database_id, userId) as CardRow | undefined;

    if (!entry) {
      res.status(404).json({ error: 'Entry not found or access denied' });
      return;
    }

    // Delete entry (CASCADE will delete subtree if any)
    db.prepare('DELETE FROM cards WHERE id = ? OR path LIKE ?').run(entry_id, `${entry.path}/%`);

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
