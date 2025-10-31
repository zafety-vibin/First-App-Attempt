/**
 * CreatureService - Business logic for creature operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { Creature } from '../models/creature';

export interface CreatureFilters extends EntityFilters {
  creature_type?: string;
  challenge_rating?: string;
}

export class CreatureService extends BaseCategoryService<Creature> {
  constructor(db: Database.Database) {
    super(db, 'creatures');
  }

  protected validateCategoryFields(data: Partial<Creature>, options?: OperationOptions): void {
    // No special validation needed (challenge_rating is string)
  }

  protected insertEntity(data: Creature): void {
    this.db.prepare(`
      INSERT INTO creatures (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        creature_type, challenge_rating, abilities, habitats,
        dm_behavior_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.creature_type || null,
      data.challenge_rating || null, data.abilities || null,
      JSON.stringify(data.habitats || []), data.dm_behavior_notes || null
    );
  }

  protected updateEntity(id: string, data: Partial<Creature>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') return;
      const value = (data as any)[key];
      updates.push(`${key} = ?`);
      params.push(['tags', 'custom_fields', 'habitats'].includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE creatures SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM creatures WHERE id = ?').run(id);
  }

  findById(id: string): Creature | null {
    const row = this.db.prepare('SELECT * FROM creatures WHERE id = ?').get(id);
    return row ? this.parseJsonFields(row, ['tags', 'custom_fields', 'habitats']) as Creature : null;
  }

  list(
    filters: CreatureFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<Creature> {
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

    if (filters.creature_type) {
      whereClauses.push('creature_type = ?');
      params.push(filters.creature_type);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM creatures ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM creatures ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    return {
      data: rows.map((row) => this.parseJsonFields(row, ['tags', 'custom_fields', 'habitats']) as Creature),
      total: count,
    };
  }
}
