/**
 * SessionRecapService - Business logic for session recap operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { SessionRecap } from '../models/sessionRecap';

export interface SessionRecapFilters extends EntityFilters {
  session_number?: number;
}

export class SessionRecapService extends BaseCategoryService<SessionRecap> {
  constructor(db: Database.Database) {
    super(db, 'session_recaps');
  }

  protected validateCategoryFields(data: Partial<SessionRecap>, options?: OperationOptions): void {
    if (data.session_number !== undefined && data.session_number < 1) {
      throw new Error('session_number must be at least 1');
    }
  }

  protected insertEntity(data: SessionRecap): void {
    this.db.prepare(`
      INSERT INTO session_recaps (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        session_number, session_date, in_game_date_start, in_game_date_end,
        time_passed, summary, key_events, player_decisions,
        npcs_encountered, locations_visited, quests_progressed, loot_acquired,
        dm_consequences, dm_behind_scenes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.session_number, data.session_date || null,
      data.in_game_date_start || null, data.in_game_date_end || null, data.time_passed || null,
      data.summary || null, data.key_events || null, data.player_decisions || null,
      JSON.stringify(data.npcs_encountered || []), JSON.stringify(data.locations_visited || []),
      JSON.stringify(data.quests_progressed || []), JSON.stringify(data.loot_acquired || []),
      data.dm_consequences || null, data.dm_behind_scenes || null
    );
  }

  protected updateEntity(id: string, data: Partial<SessionRecap>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') return;
      const value = (data as any)[key];
      const jsonFields = ['tags', 'custom_fields', 'npcs_encountered', 'locations_visited', 'quests_progressed', 'loot_acquired'];
      updates.push(`${key} = ?`);
      params.push(jsonFields.includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE session_recaps SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM session_recaps WHERE id = ?').run(id);
  }

  findById(id: string): SessionRecap | null {
    const row = this.db.prepare('SELECT * FROM session_recaps WHERE id = ?').get(id);
    const jsonFields = ['tags', 'custom_fields', 'npcs_encountered', 'locations_visited', 'quests_progressed', 'loot_acquired'];
    return row ? this.parseJsonFields(row, jsonFields) as SessionRecap : null;
  }

  list(
    filters: SessionRecapFilters,
    pagination: Pagination,
    sortBy: string = 'session_number',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<SessionRecap> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
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

    if (filters.session_number) {
      whereClauses.push('session_number = ?');
      params.push(filters.session_number);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM session_recaps ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM session_recaps ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    const jsonFields = ['tags', 'custom_fields', 'npcs_encountered', 'locations_visited', 'quests_progressed', 'loot_acquired'];
    return {
      data: rows.map((row) => this.parseJsonFields(row, jsonFields) as SessionRecap),
      total: count,
    };
  }
}
