/**
 * CustomMechanicService - Business logic for custom mechanic operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { CustomMechanic } from '../models/customMechanic';

export interface CustomMechanicFilters extends EntityFilters {
  mechanic_type?: string;
}

export class CustomMechanicService extends BaseCategoryService<CustomMechanic> {
  constructor(db: Database.Database) {
    super(db, 'custom_mechanics');
  }

  protected validateCategoryFields(data: Partial<CustomMechanic>, options?: OperationOptions): void {
    // No special validation needed
  }

  protected insertEntity(data: CustomMechanic): void {
    this.db.prepare(`
      INSERT INTO custom_mechanics (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        mechanic_type, rules_text, prerequisites, source, related_rules
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.mechanic_type || null,
      data.rules_text || null, data.prerequisites || null, data.source || null,
      JSON.stringify(data.related_rules || [])
    );
  }

  protected updateEntity(id: string, data: Partial<CustomMechanic>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') return;
      const value = (data as any)[key];
      updates.push(`${key} = ?`);
      params.push(['tags', 'custom_fields', 'related_rules'].includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE custom_mechanics SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM custom_mechanics WHERE id = ?').run(id);
  }

  findById(id: string): CustomMechanic | null {
    const row = this.db.prepare('SELECT * FROM custom_mechanics WHERE id = ?').get(id);
    return row ? this.parseJsonFields(row, ['tags', 'custom_fields', 'related_rules']) as CustomMechanic : null;
  }

  list(
    filters: CustomMechanicFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<CustomMechanic> {
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

    if (filters.mechanic_type) {
      whereClauses.push('mechanic_type = ?');
      params.push(filters.mechanic_type);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM custom_mechanics ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM custom_mechanics ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    return {
      data: rows.map((row) => this.parseJsonFields(row, ['tags', 'custom_fields', 'related_rules']) as CustomMechanic),
      total: count,
    };
  }
}
