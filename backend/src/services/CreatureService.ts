/**
 * CreatureService - Business logic for creature operations (standardized)
 * Feature: 014-create-the-database
 * Junction Tables: creature_habitats (Phase 2c)
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
    // Handle junction table relationships separately
    if ('habitats' in data && Array.isArray(data.habitats)) {
      this.setHabitats(id, data.habitats);
      const { habitats, ...restData } = data;
      data = restData as Partial<Creature>;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof Creature)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'creature_type', 'challenge_rating', 'abilities',
      'dm_behavior_notes',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields (removed 'habitats' - now in junction table)
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
      UPDATE creatures
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM creatures WHERE id = ?').run(id);
  }

  findById(id: string): Creature | null {
    const row = this.db.prepare('SELECT * FROM creatures WHERE id = ?').get(id);
    if (!row) return null;

    const creature = this.parseJsonFields(row, ['tags', 'custom_fields', 'habitats']) as Creature;

    // Populate relationships from junction tables
    creature.habitats = this.getHabitats(id);

    return creature;
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

    // Batch fetch all relationships at once (N+1 query optimization)
    const creatureIds = rows.map((r: any) => r.id);
    const habitatsMap = this.batchGetHabitats(creatureIds);

    // Populate relationships from junction tables for each creature
    const creatures = rows.map((row) => {
      const creature = this.parseJsonFields(row, ['tags', 'custom_fields', 'habitats']) as Creature;
      creature.habitats = habitatsMap.get(creature.id) || [];
      return creature;
    });

    return {
      data: creatures,
      total: count,
    };
  }

  /**
   * Get creature habitats from junction table
   * @param creatureId - Creature ID
   * @returns Array of location IDs
   */
  getHabitats(creatureId: string): string[] {
    const rows = this.db
      .prepare('SELECT location_id FROM creature_habitats WHERE creature_id = ?')
      .all(creatureId) as { location_id: string }[];

    return rows.map(r => r.location_id);
  }

  /**
   * Batch fetch habitats for multiple creatures (N+1 query optimization)
   * @param creatureIds - Array of creature IDs
   * @returns Map of creature_id -> array of location IDs
   */
  protected batchGetHabitats(creatureIds: string[]): Map<string, string[]> {
    if (creatureIds.length === 0) return new Map();

    const placeholders = creatureIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT creature_id, location_id
      FROM creature_habitats
      WHERE creature_id IN (${placeholders})
    `).all(...creatureIds) as { creature_id: string; location_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.creature_id)) {
        map.set(row.creature_id, []);
      }
      map.get(row.creature_id)!.push(row.location_id);
    });

    return map;
  }

  /**
   * Add creature habitat relationship
   * @param creatureId - Creature ID
   * @param locationId - Location ID
   * @param options - Relationship options
   */
  addHabitat(
    creatureId: string,
    locationId: string,
    options?: { habitat_frequency?: string; time_of_day?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO creature_habitats (id, creature_id, location_id, habitat_frequency, time_of_day, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(creature_id, location_id) DO UPDATE SET
          habitat_frequency = COALESCE(excluded.habitat_frequency, habitat_frequency),
          time_of_day = COALESCE(excluded.time_of_day, time_of_day),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        creatureId,
        locationId,
        options?.habitat_frequency || null,
        options?.time_of_day || null
      );
  }

  /**
   * Remove creature habitat relationship
   * @param creatureId - Creature ID
   * @param locationId - Location ID
   */
  removeHabitat(creatureId: string, locationId: string): void {
    this.db
      .prepare('DELETE FROM creature_habitats WHERE creature_id = ? AND location_id = ?')
      .run(creatureId, locationId);
  }

  /**
   * Set creature habitats (replaces all existing relationships)
   * @param creatureId - Creature ID
   * @param locationIds - Array of location IDs
   */
  setHabitats(creatureId: string, locationIds: string[]): void {
    // Remove all existing habitats
    this.db.prepare('DELETE FROM creature_habitats WHERE creature_id = ?').run(creatureId);

    // Add new habitats
    locationIds.forEach(locationId => {
      this.addHabitat(creatureId, locationId);
    });
  }
}
