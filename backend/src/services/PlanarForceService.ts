/**
 * PlanarForceService - Business logic for planar force operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { PlanarForce } from '../models/planarForce';

export interface PlanarForceFilters extends EntityFilters {
  entity_type?: string;
  alignment?: string;
}

export class PlanarForceService extends BaseCategoryService<PlanarForce> {
  constructor(db: Database.Database) {
    super(db, 'planar_forces');
  }

  protected validateCategoryFields(data: Partial<PlanarForce>, options?: OperationOptions): void {
    // Validate high_priest_id FK
    if (data.high_priest_id) {
      const npc = this.db.prepare('SELECT id FROM npcs WHERE id = ?').get(data.high_priest_id);
      if (!npc) {
        throw new Error('high_priest_id references non-existent NPC');
      }
    }
  }

  protected insertEntity(data: PlanarForce): void {
    this.db.prepare(`
      INSERT INTO planar_forces (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        entity_type, domains, alignment, worshiper_base, plane_of_origin,
        high_priest_id, allied_entities, rival_entities, religious_orders,
        dm_true_nature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.entity_type || null, JSON.stringify(data.domains || []),
      data.alignment || null, data.worshiper_base || null, data.plane_of_origin || null,
      data.high_priest_id || null, JSON.stringify(data.allied_entities || []),
      JSON.stringify(data.rival_entities || []), JSON.stringify(data.religious_orders || []),
      data.dm_true_nature || null
    );
  }

  protected updateEntity(id: string, data: Partial<PlanarForce>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') return;
      const value = (data as any)[key];
      const jsonFields = ['tags', 'custom_fields', 'domains', 'allied_entities', 'rival_entities', 'religious_orders'];
      updates.push(`${key} = ?`);
      params.push(jsonFields.includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE planar_forces SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM planar_forces WHERE id = ?').run(id);
  }

  findById(id: string): PlanarForce | null {
    const row = this.db.prepare('SELECT * FROM planar_forces WHERE id = ?').get(id);
    const jsonFields = ['tags', 'custom_fields', 'domains', 'allied_entities', 'rival_entities', 'religious_orders'];
    return row ? this.parseJsonFields(row, jsonFields) as PlanarForce : null;
  }

  list(
    filters: PlanarForceFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<PlanarForce> {
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

    if (filters.entity_type) {
      whereClauses.push('entity_type = ?');
      params.push(filters.entity_type);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM planar_forces ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM planar_forces ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    const jsonFields = ['tags', 'custom_fields', 'domains', 'allied_entities', 'rival_entities', 'religious_orders'];
    return {
      data: rows.map((row) => this.parseJsonFields(row, jsonFields) as PlanarForce),
      total: count,
    };
  }
}
