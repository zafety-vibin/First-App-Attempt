/**
 * WorldRuleService - Business logic for world rule operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - CRUD operations for world_rules table
 * - Self-referential many-to-many via related_rules JSON array
 * - Campaign ownership validation
 * - Universal field handling (tags, custom_fields as JSON)
 */

import { db } from './DatabaseService';
import { WorldRule } from '../models/worldRule';
import crypto from 'crypto';

interface CreateWorldRuleInput {
  campaign_id: string;
  name: string;
  description?: string | null;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string | null;
  tags?: string[];
  custom_fields?: Record<string, any>;
  rule_type?: string | null;
  exceptions?: string | null;
  related_rules?: string[];
}

interface UpdateWorldRuleInput {
  name?: string;
  description?: string | null;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string | null;
  tags?: string[];
  custom_fields?: Record<string, any>;
  rule_type?: string | null;
  exceptions?: string | null;
  related_rules?: string[];
}

interface WorldRuleRow {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string;
  created_at: number;
  updated_at: number;
  custom_fields: string;
  rule_type: string | null;
  exceptions: string | null;
  related_rules: string;
}

export class WorldRuleService {
  /**
   * Convert database row to WorldRule model
   */
  private static rowToWorldRule(row: WorldRuleRow): WorldRule {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      description: row.description,
      core_status: row.core_status,
      player_knowledge: row.player_knowledge,
      tags: JSON.parse(row.tags),
      created_at: row.created_at,
      updated_at: row.updated_at,
      custom_fields: JSON.parse(row.custom_fields),
      rule_type: row.rule_type,
      exceptions: row.exceptions,
      related_rules: JSON.parse(row.related_rules),
    };
  }

  /**
   * Validate campaign ownership
   */
  private static validateCampaignOwnership(campaignId: string, ownerId: string): void {
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaignId, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }
  }

  /**
   * Validate related_rules references exist
   */
  private static validateRelatedRules(relatedRules: string[], campaignId: string): void {
    if (relatedRules.length === 0) return;

    for (const ruleId of relatedRules) {
      const rule = db
        .prepare('SELECT id FROM world_rules WHERE id = ? AND campaign_id = ?')
        .get(ruleId, campaignId);

      if (!rule) {
        throw new Error(`Related rule ${ruleId} not found in this campaign`);
      }
    }
  }

  /**
   * Create new world rule
   */
  static createWorldRule(input: CreateWorldRuleInput, ownerId: string): WorldRule {
    // Validate campaign ownership
    this.validateCampaignOwnership(input.campaign_id, ownerId);

    // Validate related_rules if provided
    if (input.related_rules && input.related_rules.length > 0) {
      this.validateRelatedRules(input.related_rules, input.campaign_id);
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO world_rules (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        rule_type, exceptions, related_rules
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.campaign_id,
      input.name,
      input.description ?? null,
      input.core_status ?? 'active',
      input.player_knowledge ?? null,
      JSON.stringify(input.tags ?? []),
      now,
      now,
      JSON.stringify(input.custom_fields ?? {}),
      input.rule_type ?? null,
      input.exceptions ?? null,
      JSON.stringify(input.related_rules ?? [])
    );

    const row = db.prepare('SELECT * FROM world_rules WHERE id = ?').get(id) as WorldRuleRow;
    return this.rowToWorldRule(row);
  }

  /**
   * Get world rule by ID
   */
  static getWorldRuleById(id: string, campaignId: string): WorldRule | null {
    const row = db
      .prepare('SELECT * FROM world_rules WHERE id = ? AND campaign_id = ?')
      .get(id, campaignId) as WorldRuleRow | undefined;

    return row ? this.rowToWorldRule(row) : null;
  }

  /**
   * Get all world rules for a campaign
   */
  static getWorldRulesByCampaign(
    campaignId: string,
    ownerId: string,
    filters?: {
      core_status?: 'active' | 'archived' | 'draft' | 'hidden';
      player_knowledge?: string;
      limit?: number;
      offset?: number;
    }
  ): { world_rules: WorldRule[]; total: number } {
    // Validate campaign ownership
    this.validateCampaignOwnership(campaignId, ownerId);

    // Build WHERE clause
    const conditions = ['campaign_id = ?'];
    const params: any[] = [campaignId];

    if (filters?.core_status) {
      conditions.push('core_status = ?');
      params.push(filters.core_status);
    }

    if (filters?.player_knowledge) {
      conditions.push('player_knowledge = ?');
      params.push(filters.player_knowledge);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM world_rules WHERE ${whereClause}`)
      .get(...params) as { count: number };

    // Get world rules with pagination
    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const rows = db
      .prepare(
        `SELECT * FROM world_rules WHERE ${whereClause}
         ORDER BY updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as WorldRuleRow[];

    return {
      world_rules: rows.map(this.rowToWorldRule),
      total: countResult.count,
    };
  }

  /**
   * Update world rule
   */
  static updateWorldRule(
    id: string,
    campaignId: string,
    input: UpdateWorldRuleInput,
    ownerId: string
  ): WorldRule {
    // Validate campaign ownership
    this.validateCampaignOwnership(campaignId, ownerId);

    // Check if world rule exists
    const existing = this.getWorldRuleById(id, campaignId);
    if (!existing) {
      throw new Error('World rule not found');
    }

    // Validate related_rules if provided
    if (input.related_rules && input.related_rules.length > 0) {
      this.validateRelatedRules(input.related_rules, campaignId);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    if (input.core_status !== undefined) {
      updates.push('core_status = ?');
      values.push(input.core_status);
    }

    if (input.player_knowledge !== undefined) {
      updates.push('player_knowledge = ?');
      values.push(input.player_knowledge);
    }

    if (input.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(input.tags));
    }

    if (input.custom_fields !== undefined) {
      updates.push('custom_fields = ?');
      values.push(JSON.stringify(input.custom_fields));
    }

    if (input.rule_type !== undefined) {
      updates.push('rule_type = ?');
      values.push(input.rule_type);
    }

    if (input.exceptions !== undefined) {
      updates.push('exceptions = ?');
      values.push(input.exceptions);
    }

    if (input.related_rules !== undefined) {
      updates.push('related_rules = ?');
      values.push(JSON.stringify(input.related_rules));
    }

    // Always update updated_at
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);

    // Add id and campaign_id to values for WHERE clause
    values.push(id, campaignId);

    const stmt = db.prepare(
      `UPDATE world_rules SET ${updates.join(', ')} WHERE id = ? AND campaign_id = ?`
    );
    stmt.run(...values);

    const updated = this.getWorldRuleById(id, campaignId);
    if (!updated) {
      throw new Error('Failed to retrieve updated world rule');
    }

    return updated;
  }

  /**
   * Delete world rule
   */
  static deleteWorldRule(id: string, campaignId: string, ownerId: string): void {
    // Validate campaign ownership
    this.validateCampaignOwnership(campaignId, ownerId);

    const stmt = db.prepare('DELETE FROM world_rules WHERE id = ? AND campaign_id = ?');
    const result = stmt.run(id, campaignId);

    if (result.changes === 0) {
      throw new Error('World rule not found');
    }
  }

  /**
   * Get world rules related to a specific world rule (via related_rules array)
   */
  static getRelatedWorldRules(id: string, campaignId: string): WorldRule[] {
    const worldRule = this.getWorldRuleById(id, campaignId);
    if (!worldRule) {
      throw new Error('World rule not found');
    }

    if (worldRule.related_rules.length === 0) {
      return [];
    }

    // Build IN clause with placeholders
    const placeholders = worldRule.related_rules.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT * FROM world_rules
         WHERE id IN (${placeholders}) AND campaign_id = ?
         ORDER BY name ASC`
      )
      .all(...worldRule.related_rules, campaignId) as WorldRuleRow[];

    return rows.map(this.rowToWorldRule);
  }

  /**
   * Search world rules by name
   */
  static searchWorldRules(
    campaignId: string,
    searchTerm: string,
    ownerId: string,
    limit = 20
  ): WorldRule[] {
    // Validate campaign ownership
    this.validateCampaignOwnership(campaignId, ownerId);

    const rows = db
      .prepare(
        `SELECT * FROM world_rules
         WHERE campaign_id = ? AND name LIKE ?
         ORDER BY name ASC LIMIT ?`
      )
      .all(campaignId, `%${searchTerm}%`, limit) as WorldRuleRow[];

    return rows.map(this.rowToWorldRule);
  }
}
