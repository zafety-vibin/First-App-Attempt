/**
 * LoreEntryService - Business logic for lore entry operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { LoreEntry } from '../models/loreEntry';

export interface LoreEntryFilters extends EntityFilters {
  category?: string;
  era_period?: string;
}

export class LoreEntryService extends BaseCategoryService<LoreEntry> {
  constructor(db: Database.Database) {
    super(db, 'lore_entries');
  }

  protected validateCategoryFields(data: Partial<LoreEntry>, options?: OperationOptions): void {
    // No special validation needed
  }

  protected insertEntity(data: LoreEntry): void {
    this.db.prepare(`
      INSERT INTO lore_entries (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        category, era_period, in_game_date, historical_accuracy,
        related_npcs, related_locations, related_factions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.category || null, data.era_period || null,
      data.in_game_date || null, data.historical_accuracy || null,
      JSON.stringify(data.related_npcs || []), JSON.stringify(data.related_locations || []),
      JSON.stringify(data.related_factions || [])
    );
  }

  protected updateEntity(id: string, data: Partial<LoreEntry>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') return;
      const value = (data as any)[key];
      const jsonFields = ['tags', 'custom_fields', 'related_npcs', 'related_locations', 'related_factions'];
      updates.push(`${key} = ?`);
      params.push(jsonFields.includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE lore_entries SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM lore_entries WHERE id = ?').run(id);
  }

  findById(id: string): LoreEntry | null {
    const row = this.db.prepare('SELECT * FROM lore_entries WHERE id = ?').get(id);
    const jsonFields = ['tags', 'custom_fields', 'related_npcs', 'related_locations', 'related_factions'];
    return row ? this.parseJsonFields(row, jsonFields) as LoreEntry : null;
  }

  list(
    filters: LoreEntryFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<LoreEntry> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
    }

    // Apply view mode row filtering (Feature 004 - Information Filtering)
    if (viewMode === 'player_view') {
      // Player view: Exclude hierarchical levels (dm_only + custom hierarchical)
      // Show everything else (common_knowledge, player_knowledge, null, custom non-hierarchical)
      const hierarchicalIds = this.getHierarchicalLevelIds();
      if (hierarchicalIds.length > 0) {
        const placeholders = hierarchicalIds.map(() => '?').join(',');
        whereClauses.push(`(player_knowledge IS NULL OR player_knowledge NOT IN (${placeholders}))`);
        params.push(...hierarchicalIds);
      }
      // If no hierarchical levels exist, allow all
    } else if (filters.player_knowledge) {
      // DM view: Respect explicit player_knowledge filter if provided
      whereClauses.push('player_knowledge = ?');
      params.push(filters.player_knowledge);
    }

    if (filters.category) {
      whereClauses.push('category = ?');
      params.push(filters.category);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM lore_entries ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM lore_entries ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    const jsonFields = ['tags', 'custom_fields', 'related_npcs', 'related_locations', 'related_factions'];
    return {
      data: rows.map((row) => this.parseJsonFields(row, jsonFields) as LoreEntry),
      total: count,
    };
  }
}
