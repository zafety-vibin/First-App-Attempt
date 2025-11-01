/**
 * WorldRuleService - Business logic for world rule operations (standardized)
 * Feature: 014-create-the-database
 * Junction Tables: world_rule_relations (Phase 2c)
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
    // Handle junction table relationships separately
    if ('related_rules' in data && Array.isArray(data.related_rules)) {
      this.setRelatedRules(id, data.related_rules);
      const { related_rules, ...restData } = data;
      data = restData as Partial<WorldRule>;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof WorldRule)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'rule_type', 'exceptions',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields (removed 'related_rules' - now in junction table)
        if (['tags', 'custom_fields'].includes(field)) {
          params.push(JSON.stringify(data[field]));
        } else {
          params.push(data[field] as any);
        }
      }
    }

    if (updates.length === 0) {
      return;
    }

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE world_rules
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM world_rules WHERE id = ?').run(id);
  }

  findById(id: string): WorldRule | null {
    const row = this.db.prepare('SELECT * FROM world_rules WHERE id = ?').get(id);
    if (!row) return null;

    const rule = this.parseJsonFields(row, ['tags', 'custom_fields', 'related_rules']) as WorldRule;

    // Populate relationships from junction tables
    rule.related_rules = this.getRelatedRules(id);

    return rule;
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

    if (filters.rule_type) {
      whereClauses.push('rule_type = ?');
      params.push(filters.rule_type);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM world_rules ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM world_rules ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    // Populate relationships from junction tables for each world rule
    const rules = rows.map((row) => {
      const rule = this.parseJsonFields(row, ['tags', 'custom_fields', 'related_rules']) as WorldRule;
      rule.related_rules = this.getRelatedRules(rule.id);
      return rule;
    });

    return {
      data: rules,
      total: count,
    };
  }

  /**
   * Get related rules from junction table
   * @param ruleId - World rule ID
   * @returns Array of related rule IDs
   */
  getRelatedRules(ruleId: string): string[] {
    const rows = this.db
      .prepare('SELECT related_rule_id FROM world_rule_relations WHERE rule_id = ?')
      .all(ruleId) as { related_rule_id: string }[];

    return rows.map(r => r.related_rule_id);
  }

  /**
   * Add related rule relationship
   * @param ruleId - World rule ID
   * @param relatedRuleId - Related rule ID
   * @param options - Relationship options
   */
  addRelatedRule(
    ruleId: string,
    relatedRuleId: string,
    options?: { relation_type?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO world_rule_relations (id, rule_id, related_rule_id, relation_type, created_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(rule_id, related_rule_id) DO UPDATE SET
          relation_type = COALESCE(excluded.relation_type, relation_type),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        ruleId,
        relatedRuleId,
        options?.relation_type || null
      );
  }

  /**
   * Remove related rule relationship
   * @param ruleId - World rule ID
   * @param relatedRuleId - Related rule ID
   */
  removeRelatedRule(ruleId: string, relatedRuleId: string): void {
    this.db
      .prepare('DELETE FROM world_rule_relations WHERE rule_id = ? AND related_rule_id = ?')
      .run(ruleId, relatedRuleId);
  }

  /**
   * Set related rules (replaces all existing relationships)
   * @param ruleId - World rule ID
   * @param relatedRuleIds - Array of related rule IDs
   */
  setRelatedRules(ruleId: string, relatedRuleIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM world_rule_relations WHERE rule_id = ?').run(ruleId);

    // Add new relationships
    relatedRuleIds.forEach(relatedRuleId => {
      this.addRelatedRule(ruleId, relatedRuleId);
    });
  }
}
