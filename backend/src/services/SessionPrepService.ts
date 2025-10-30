/**
 * SessionPrepService - Business logic for session prep operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { SessionPrep } from '../models/sessionPrep';

export interface SessionPrepFilters extends EntityFilters {
  status?: string;
  planned_date?: string;
}

export class SessionPrepService extends BaseCategoryService<SessionPrep> {
  constructor(db: Database.Database) {
    super(db, 'session_preps');
  }

  protected validateCategoryFields(data: Partial<SessionPrep>, options?: OperationOptions): void {
    // SessionPrep is always dm_only (hypothetical planning)
    if (data.player_knowledge && data.player_knowledge !== 'dm_only') {
      throw new Error('SessionPrep must have player_knowledge=dm_only (hypothetical content)');
    }
  }

  protected insertEntity(data: SessionPrep): void {
    this.db.prepare(`
      INSERT INTO session_preps (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        planned_date, status, planned_events, possible_encounters, plot_hooks,
        dm_notes, plot_threads, npcs_to_prep, locations_to_prep
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      'dm_only', // Always dm_only for session prep
      JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.planned_date || null, data.status || null,
      data.planned_events || null, data.possible_encounters || null, data.plot_hooks || null,
      data.dm_notes || null, JSON.stringify(data.plot_threads || []),
      JSON.stringify(data.npcs_to_prep || []), JSON.stringify(data.locations_to_prep || [])
    );
  }

  protected updateEntity(id: string, data: Partial<SessionPrep>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at' || key === 'player_knowledge') return;
      const value = (data as any)[key];
      const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep'];
      updates.push(`${key} = ?`);
      params.push(jsonFields.includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE session_preps SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM session_preps WHERE id = ?').run(id);
  }

  findById(id: string): SessionPrep | null {
    const row = this.db.prepare('SELECT * FROM session_preps WHERE id = ?').get(id);
    const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep'];
    return row ? this.parseJsonFields(row, jsonFields) as SessionPrep : null;
  }

  list(
    filters: SessionPrepFilters,
    pagination: Pagination,
    sortBy: string = 'planned_date',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<SessionPrep> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
    }

    // Apply view mode row filtering (Feature 004 - Information Filtering)
    // SessionPrep is always dm_only, so player_view will return no results (correct behavior)
    if (viewMode === 'player_view') {
      // Player view: Only show common_knowledge, player_knowledge, and null
      // Filter OUT dm_only and custom secret levels
      whereClauses.push("(player_knowledge IN ('common_knowledge', 'player_knowledge') OR player_knowledge IS NULL)");
    } else if (filters.player_knowledge) {
      // DM view: Respect explicit player_knowledge filter if provided
      whereClauses.push('player_knowledge = ?');
      params.push(filters.player_knowledge);
    }

    if (filters.status) {
      whereClauses.push('status = ?');
      params.push(filters.status);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM session_preps ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM session_preps ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep'];
    return {
      data: rows.map((row) => this.parseJsonFields(row, jsonFields) as SessionPrep),
      total: count,
    };
  }
}
