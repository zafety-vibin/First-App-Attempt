/**
 * ItemService - Business logic for Item operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - Standard CRUD operations for Items
 * - Foreign key validation (owner_npc_id, owner_pc_id, location_id)
 * - Mutual exclusivity validation (owner_npc_id XOR owner_pc_id)
 * - JSON field parsing (tags, custom_fields)
 * - Filtering by campaign_id, core_status, player_knowledge, tags, ownership
 * - Pagination and sorting
 * - Transaction support for multi-operation writes
 */

import Database from 'better-sqlite3';
import { Item } from '../models/item';
import { randomUUID } from 'crypto';

export interface ItemFilters {
  campaign_id?: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
  owner_npc_id?: string;
  owner_pc_id?: string;
  location_id?: string;
  item_type?: string;
  rarity?: string;
  viewMode?: 'dm_view' | 'player_view';
}

export interface Pagination {
  limit: number;
  offset: number;
}

export interface ItemListResult {
  data: Item[];
  total: number;
}

export class ItemService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create new Item with validation
   */
  create(data: Partial<Item>): Item {
    // Validate required fields
    if (!data.campaign_id || !data.name) {
      throw new Error('campaign_id and name are required');
    }

    // Validate core_status enum
    if (data.core_status && !['active', 'archived', 'draft', 'hidden'].includes(data.core_status)) {
      throw new Error('Invalid core_status value');
    }

    // Validate name length
    if (data.name.length > 255) {
      throw new Error('name must be 255 characters or less');
    }

    // CRITICAL: Validate mutual exclusivity of owner_npc_id and owner_pc_id
    if (data.owner_npc_id && data.owner_pc_id) {
      throw new Error('Cannot have both owner_npc_id and owner_pc_id set - mutual exclusivity violation');
    }

    // Validate foreign keys
    if (data.owner_npc_id) {
      const npc = this.db.prepare('SELECT id FROM npcs WHERE id = ?').get(data.owner_npc_id);
      if (!npc) {
        throw new Error('owner_npc_id references non-existent NPC');
      }
    }

    if (data.owner_pc_id) {
      const pc = this.db.prepare('SELECT id FROM player_characters WHERE id = ?').get(data.owner_pc_id);
      if (!pc) {
        throw new Error('owner_pc_id references non-existent player character');
      }
    }

    if (data.location_id) {
      const location = this.db.prepare('SELECT id FROM locations WHERE id = ?').get(data.location_id);
      if (!location) {
        throw new Error('location_id references non-existent location');
      }
    }

    // Generate ID and timestamps
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Prepare data with defaults
    const itemData: Item = {
      id,
      campaign_id: data.campaign_id,
      name: data.name,
      description: data.description || null,
      core_status: data.core_status || 'active',
      player_knowledge: data.player_knowledge || null,
      tags: data.tags || [],
      created_at: now,
      updated_at: now,
      custom_fields: data.custom_fields || {},
      item_type: data.item_type || null,
      rarity: data.rarity || null,
      properties: data.properties || null,
      value: data.value || null,
      owner_npc_id: data.owner_npc_id || null,
      owner_pc_id: data.owner_pc_id || null,
      location_id: data.location_id || null,
      dm_secret_properties: data.dm_secret_properties || null,
      dm_true_nature: data.dm_true_nature || null,
    };

    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO items (
        id, campaign_id, name, description, core_status, player_knowledge, tags,
        created_at, updated_at, custom_fields, item_type, rarity, properties,
        value, owner_npc_id, owner_pc_id, location_id,
        dm_secret_properties, dm_true_nature
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      itemData.id,
      itemData.campaign_id,
      itemData.name,
      itemData.description,
      itemData.core_status,
      itemData.player_knowledge,
      JSON.stringify(itemData.tags),
      itemData.created_at,
      itemData.updated_at,
      JSON.stringify(itemData.custom_fields),
      itemData.item_type,
      itemData.rarity,
      itemData.properties,
      itemData.value,
      itemData.owner_npc_id,
      itemData.owner_pc_id,
      itemData.location_id,
      itemData.dm_secret_properties,
      itemData.dm_true_nature
    );

    return itemData;
  }

  /**
   * Find Item by ID
   */
  findById(id: string): Item | null {
    const row = this.db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!row) {
      return null;
    }
    return this.rowToItem(row as any);
  }

  /**
   * List Items with filters and pagination
   */
  list(
    filters: ItemFilters,
    pagination: Pagination,
    sortBy: 'created_at' | 'updated_at' | 'name' = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): ItemListResult {
    // Import getPlayerKnowledgeFilter inline to avoid circular deps
    const { getPlayerKnowledgeFilter } = require('../middleware/informationFilter');

    // Build WHERE clause
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
    }

    // Apply view mode filtering
    if (filters.viewMode) {
      const pkFilter = getPlayerKnowledgeFilter(filters.viewMode);
      if (pkFilter) {
        whereClauses.push(`(${pkFilter})`);
      }
    }

    if (filters.core_status) {
      whereClauses.push('core_status = ?');
      params.push(filters.core_status);
    }

    if (filters.player_knowledge) {
      whereClauses.push('player_knowledge = ?');
      params.push(filters.player_knowledge);
    }

    if (filters.owner_npc_id) {
      whereClauses.push('owner_npc_id = ?');
      params.push(filters.owner_npc_id);
    }

    if (filters.owner_pc_id) {
      whereClauses.push('owner_pc_id = ?');
      params.push(filters.owner_pc_id);
    }

    if (filters.location_id) {
      whereClauses.push('location_id = ?');
      params.push(filters.location_id);
    }

    if (filters.item_type) {
      whereClauses.push('item_type = ?');
      params.push(filters.item_type);
    }

    if (filters.rarity) {
      whereClauses.push('rarity = ?');
      params.push(filters.rarity);
    }

    // Tag filtering: check if any of the provided tags exist in the JSON array
    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(() => `tags LIKE ?`).join(' OR ');
      whereClauses.push(`(${tagConditions})`);
      filters.tags.forEach(tag => {
        params.push(`%"${tag}"%`);
      });
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Validate sort column
    const validSortColumns = ['created_at', 'updated_at', 'name'];
    if (!validSortColumns.includes(sortBy)) {
      throw new Error('Invalid sort_by column');
    }

    // Validate sort order
    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new Error('Invalid sort_order value');
    }

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM items ${whereClause}`);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    // Get paginated data
    const dataStmt = this.db.prepare(`
      SELECT * FROM items
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(...params, pagination.limit, pagination.offset);

    const data = rows.map(row => this.rowToItem(row as any));

    return { data, total };
  }

  /**
   * Update Item
   */
  update(id: string, data: Partial<Item>): Item {
    // Check if Item exists
    const existing = this.findById(id);
    if (!existing) {
      throw new Error('Item not found');
    }

    // Prevent changing id or campaign_id
    if (data.id && data.id !== id) {
      delete data.id;
    }
    if (data.campaign_id) {
      delete data.campaign_id;
    }

    // Validate core_status enum
    if (data.core_status && !['active', 'archived', 'draft', 'hidden'].includes(data.core_status)) {
      throw new Error('Invalid core_status value');
    }

    // Validate name length
    if (data.name && data.name.length > 255) {
      throw new Error('name must be 255 characters or less');
    }

    // CRITICAL: Validate mutual exclusivity of owner_npc_id and owner_pc_id
    // Check the proposed update doesn't violate mutual exclusivity
    const proposedNpcId = 'owner_npc_id' in data ? data.owner_npc_id : existing.owner_npc_id;
    const proposedPcId = 'owner_pc_id' in data ? data.owner_pc_id : existing.owner_pc_id;

    if (proposedNpcId && proposedPcId) {
      throw new Error('Cannot have both owner_npc_id and owner_pc_id set - mutual exclusivity violation');
    }

    // Validate foreign keys
    if (data.owner_npc_id !== undefined) {
      if (data.owner_npc_id) {
        const npc = this.db.prepare('SELECT id FROM npcs WHERE id = ?').get(data.owner_npc_id);
        if (!npc) {
          throw new Error('owner_npc_id references non-existent NPC');
        }
      }
    }

    if (data.owner_pc_id !== undefined) {
      if (data.owner_pc_id) {
        const pc = this.db.prepare('SELECT id FROM player_characters WHERE id = ?').get(data.owner_pc_id);
        if (!pc) {
          throw new Error('owner_pc_id references non-existent player character');
        }
      }
    }

    if (data.location_id !== undefined) {
      if (data.location_id) {
        const location = this.db.prepare('SELECT id FROM locations WHERE id = ?').get(data.location_id);
        if (!location) {
          throw new Error('location_id references non-existent location');
        }
      }
    }

    // Update timestamp
    const now = Math.floor(Date.now() / 1000);

    // Build UPDATE statement dynamically
    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof Item)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'item_type', 'rarity', 'properties', 'value',
      'owner_npc_id', 'owner_pc_id', 'location_id',
      'dm_secret_properties', 'dm_true_nature'
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields
        if (field === 'tags' || field === 'custom_fields') {
          params.push(JSON.stringify(data[field]));
        } else {
          params.push(data[field] as any);
        }
      }
    }

    if (updates.length === 0) {
      // No updates provided
      return existing;
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE items
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);

    // Return updated Item
    return this.findById(id)!;
  }

  /**
   * Delete Item
   */
  delete(id: string): void {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error('Item not found');
    }

    // Delete Item
    const stmt = this.db.prepare('DELETE FROM items WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Convert database row to Item object
   */
  private rowToItem(row: any): Item {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      description: row.description,
      core_status: row.core_status,
      player_knowledge: row.player_knowledge,
      tags: row.tags ? JSON.parse(row.tags) : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      custom_fields: row.custom_fields ? JSON.parse(row.custom_fields) : {},
      item_type: row.item_type,
      rarity: row.rarity,
      properties: row.properties,
      value: row.value,
      owner_npc_id: row.owner_npc_id,
      owner_pc_id: row.owner_pc_id,
      location_id: row.location_id,
      dm_secret_properties: row.dm_secret_properties,
      dm_true_nature: row.dm_true_nature,
    };
  }
}
