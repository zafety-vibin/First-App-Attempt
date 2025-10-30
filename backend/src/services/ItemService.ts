/**
 * ItemService - Business logic for item operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { Item } from '../models/item';

export interface ItemFilters extends EntityFilters {
  item_type?: string;
  rarity?: string;
  owner_npc_id?: string;
  owner_pc_id?: string;
  location_id?: string;
}

export class ItemService extends BaseCategoryService<Item> {
  constructor(db: Database.Database) {
    super(db, 'items');
  }

  protected validateCategoryFields(data: Partial<Item>, options?: OperationOptions): void {
    // No special validation needed (value is string, not number)
  }

  protected insertEntity(data: Item): void {
    this.db.prepare(`
      INSERT INTO items (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        item_type, rarity, properties, value,
        owner_npc_id, owner_pc_id, location_id,
        dm_secret_properties, dm_true_nature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.item_type || null, data.rarity || null,
      data.properties || null, data.value || null, data.owner_npc_id || null,
      data.owner_pc_id || null, data.location_id || null, data.dm_secret_properties || null,
      data.dm_true_nature || null
    );
  }

  protected updateEntity(id: string, data: Partial<Item>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') return;
      const value = (data as any)[key];
      updates.push(`${key} = ?`);
      params.push(['tags', 'custom_fields'].includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM items WHERE id = ?').run(id);
  }

  findById(id: string): Item | null {
    const row = this.db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    return row ? this.parseJsonFields(row, ['tags', 'custom_fields']) as Item : null;
  }

  list(
    filters: ItemFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<Item> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
    }
    if (filters.core_status) {
      whereClauses.push('core_status = ?');
      params.push(filters.core_status);
    }

    // Apply view mode row filtering (Feature 004 - Information Filtering)
    if (viewMode === 'player_view') {
      // Player view: Only show common_knowledge, player_knowledge, and null
      // Filter OUT dm_only and custom secret levels
      whereClauses.push("(player_knowledge IN ('common_knowledge', 'player_knowledge') OR player_knowledge IS NULL)");
    } else if (filters.player_knowledge) {
      // DM view: Respect explicit player_knowledge filter if provided
      whereClauses.push('player_knowledge = ?');
      params.push(filters.player_knowledge);
    }

    if (filters.item_type) {
      whereClauses.push('item_type = ?');
      params.push(filters.item_type);
    }
    if (filters.rarity) {
      whereClauses.push('rarity = ?');
      params.push(filters.rarity);
    }
    if (filters.owner_npc_id) {
      whereClauses.push('owner_npc_id = ?');
      params.push(filters.owner_npc_id);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM items ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM items ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    return {
      data: rows.map((row) => this.parseJsonFields(row, ['tags', 'custom_fields']) as Item),
      total: count,
    };
  }
}
