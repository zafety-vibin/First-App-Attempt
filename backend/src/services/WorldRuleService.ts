/**
 * WorldRuleService - Business logic for world rule operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { WorldRule } from '../models/worldRule';

export interface WorldRuleFilters extends EntityFilters {
  rule_type?: string;
}

export class WorldRuleService extends BaseCategoryService<WorldRule> {
  constructor(db: Database.Database) {
    super(db, 'world_rules');
  }

  protected validateCategoryFields(data: Partial<WorldRule>, options?: OperationOptions): void {
    // No special validation needed
  }

  protected insertEntity(data: WorldRule): void {
    this.db.prepare(`
      INSERT INTO world_rules (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        rule_type, exceptions, related_rules
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.rule_type || null, data.exceptions || null,
      JSON.stringify(data.related_rules || [])
    );
  }

  protected updateEntity(id: string, data: Partial<WorldRule>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') return;
      const value = (data as any)[key];
      const jsonFields = ['tags', 'custom_fields', 'related_rules'];
      updates.push(`${key} = ?`);
      params.push(jsonFields.includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE world_rules SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM world_rules WHERE id = ?').run(id);
  }

  findById(id: string): WorldRule | null {
    const row = this.db.prepare('SELECT * FROM world_rules WHERE id = ?').get(id);
    return row ? this.parseJsonFields(row, ['tags', 'custom_fields', 'related_rules']) as WorldRule : null;
  }

  list(
    filters: WorldRuleFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<WorldRule> {
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

    if (filters.rule_type) {
      whereClauses.push('rule_type = ?');
      params.push(filters.rule_type);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM world_rules ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM world_rules ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    return {
      data: rows.map((row) => this.parseJsonFields(row, ['tags', 'custom_fields', 'related_rules']) as WorldRule),
      total: count,
    };
  }
}
