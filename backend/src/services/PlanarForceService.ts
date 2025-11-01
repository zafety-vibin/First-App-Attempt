/**
 * PlanarForceService - Business logic for planar force operations (standardized)
 * Feature: 014-create-the-database
 * Junction Tables: planar_force_alliances, planar_force_rivalries, planar_force_worshipers (Phase 2c)
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
    // Handle junction table relationships separately
    if ('allied_entities' in data && Array.isArray(data.allied_entities)) {
      this.setAlliances(id, data.allied_entities);
      const { allied_entities, ...restData } = data;
      data = restData as Partial<PlanarForce>;
    }

    if ('rival_entities' in data && Array.isArray(data.rival_entities)) {
      this.setRivalries(id, data.rival_entities);
      const { rival_entities, ...restData } = data;
      data = restData as Partial<PlanarForce>;
    }

    if ('religious_orders' in data && Array.isArray(data.religious_orders)) {
      this.setWorshipers(id, data.religious_orders);
      const { religious_orders, ...restData } = data;
      data = restData as Partial<PlanarForce>;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof PlanarForce)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'entity_type', 'domains', 'alignment', 'worshiper_base',
      'plane_of_origin', 'high_priest_id', 'dm_true_nature',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields (removed 'allied_entities', 'rival_entities', 'religious_orders' - now in junction tables)
        if (['tags', 'custom_fields', 'domains'].includes(field)) {
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
      UPDATE planar_forces
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
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

  /**
   * Get planar force alliances from junction table
   * @param planarForceId - Planar force ID
   * @returns Array of allied planar force IDs
   */
  getAlliances(planarForceId: string): string[] {
    const rows = this.db
      .prepare('SELECT allied_planar_force_id FROM planar_force_alliances WHERE planar_force_id = ?')
      .all(planarForceId) as { allied_planar_force_id: string }[];

    return rows.map(r => r.allied_planar_force_id);
  }

  /**
   * Get planar force rivalries from junction table
   * @param planarForceId - Planar force ID
   * @returns Array of rival planar force IDs
   */
  getRivalries(planarForceId: string): string[] {
    const rows = this.db
      .prepare('SELECT rival_planar_force_id FROM planar_force_rivalries WHERE planar_force_id = ?')
      .all(planarForceId) as { rival_planar_force_id: string }[];

    return rows.map(r => r.rival_planar_force_id);
  }

  /**
   * Get planar force worshipers from junction table
   * @param planarForceId - Planar force ID
   * @returns Array of faction IDs (religious orders)
   */
  getWorshipers(planarForceId: string): string[] {
    const rows = this.db
      .prepare('SELECT faction_id FROM planar_force_worshipers WHERE planar_force_id = ?')
      .all(planarForceId) as { faction_id: string }[];

    return rows.map(r => r.faction_id);
  }

  /**
   * Add planar force alliance relationship
   * @param planarForceId - Planar force ID
   * @param alliedPlanarForceId - Allied planar force ID
   * @param options - Relationship options
   */
  addAlliance(
    planarForceId: string,
    alliedPlanarForceId: string,
    options?: { alliance_type?: string; strength?: number; since_date?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO planar_force_alliances (id, planar_force_id, allied_planar_force_id, alliance_type, strength, since_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(planar_force_id, allied_planar_force_id) DO UPDATE SET
          alliance_type = COALESCE(excluded.alliance_type, alliance_type),
          strength = COALESCE(excluded.strength, strength),
          since_date = COALESCE(excluded.since_date, since_date),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        planarForceId,
        alliedPlanarForceId,
        options?.alliance_type || null,
        options?.strength || null,
        options?.since_date || null
      );
  }

  /**
   * Remove planar force alliance relationship
   * @param planarForceId - Planar force ID
   * @param alliedPlanarForceId - Allied planar force ID
   */
  removeAlliance(planarForceId: string, alliedPlanarForceId: string): void {
    this.db
      .prepare('DELETE FROM planar_force_alliances WHERE planar_force_id = ? AND allied_planar_force_id = ?')
      .run(planarForceId, alliedPlanarForceId);
  }

  /**
   * Set planar force alliances (replaces all existing relationships)
   * @param planarForceId - Planar force ID
   * @param alliedPlanarForceIds - Array of allied planar force IDs
   */
  setAlliances(planarForceId: string, alliedPlanarForceIds: string[]): void {
    // Remove all existing alliances
    this.db.prepare('DELETE FROM planar_force_alliances WHERE planar_force_id = ?').run(planarForceId);

    // Add new alliances
    alliedPlanarForceIds.forEach(alliedPlanarForceId => {
      this.addAlliance(planarForceId, alliedPlanarForceId);
    });
  }

  /**
   * Add planar force rivalry relationship
   * @param planarForceId - Planar force ID
   * @param rivalPlanarForceId - Rival planar force ID
   * @param options - Relationship options
   */
  addRivalry(
    planarForceId: string,
    rivalPlanarForceId: string,
    options?: { rivalry_type?: string; intensity?: number; since_date?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO planar_force_rivalries (id, planar_force_id, rival_planar_force_id, rivalry_type, intensity, since_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(planar_force_id, rival_planar_force_id) DO UPDATE SET
          rivalry_type = COALESCE(excluded.rivalry_type, rivalry_type),
          intensity = COALESCE(excluded.intensity, intensity),
          since_date = COALESCE(excluded.since_date, since_date),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        planarForceId,
        rivalPlanarForceId,
        options?.rivalry_type || null,
        options?.intensity || null,
        options?.since_date || null
      );
  }

  /**
   * Remove planar force rivalry relationship
   * @param planarForceId - Planar force ID
   * @param rivalPlanarForceId - Rival planar force ID
   */
  removeRivalry(planarForceId: string, rivalPlanarForceId: string): void {
    this.db
      .prepare('DELETE FROM planar_force_rivalries WHERE planar_force_id = ? AND rival_planar_force_id = ?')
      .run(planarForceId, rivalPlanarForceId);
  }

  /**
   * Set planar force rivalries (replaces all existing relationships)
   * @param planarForceId - Planar force ID
   * @param rivalPlanarForceIds - Array of rival planar force IDs
   */
  setRivalries(planarForceId: string, rivalPlanarForceIds: string[]): void {
    // Remove all existing rivalries
    this.db.prepare('DELETE FROM planar_force_rivalries WHERE planar_force_id = ?').run(planarForceId);

    // Add new rivalries
    rivalPlanarForceIds.forEach(rivalPlanarForceId => {
      this.addRivalry(planarForceId, rivalPlanarForceId);
    });
  }

  /**
   * Add planar force worshiper relationship (faction)
   * @param planarForceId - Planar force ID
   * @param factionId - Faction ID (religious order)
   * @param options - Relationship options
   */
  addWorshiper(
    planarForceId: string,
    factionId: string,
    options?: { devotion_level?: number; since_date?: string; influence?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO planar_force_worshipers (id, planar_force_id, faction_id, devotion_level, since_date, influence, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(planar_force_id, faction_id) DO UPDATE SET
          devotion_level = COALESCE(excluded.devotion_level, devotion_level),
          since_date = COALESCE(excluded.since_date, since_date),
          influence = COALESCE(excluded.influence, influence),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        planarForceId,
        factionId,
        options?.devotion_level || null,
        options?.since_date || null,
        options?.influence || null
      );
  }

  /**
   * Remove planar force worshiper relationship
   * @param planarForceId - Planar force ID
   * @param factionId - Faction ID
   */
  removeWorshiper(planarForceId: string, factionId: string): void {
    this.db
      .prepare('DELETE FROM planar_force_worshipers WHERE planar_force_id = ? AND faction_id = ?')
      .run(planarForceId, factionId);
  }

  /**
   * Set planar force worshipers (replaces all existing relationships)
   * @param planarForceId - Planar force ID
   * @param factionIds - Array of faction IDs
   */
  setWorshipers(planarForceId: string, factionIds: string[]): void {
    // Remove all existing worshipers
    this.db.prepare('DELETE FROM planar_force_worshipers WHERE planar_force_id = ?').run(planarForceId);

    // Add new worshipers
    factionIds.forEach(factionId => {
      this.addWorshiper(planarForceId, factionId);
    });
  }
}
