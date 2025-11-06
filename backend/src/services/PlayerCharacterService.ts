/**
 * PlayerCharacterService - Business logic for player character operations
 * Feature: 014-create-the-database (standardized)
 *
 * Implements:
 * - Standard CRUD operations via BaseCategoryService
 * - Junction table relationships (pc_faction_affiliations, pc_npc_relationships)
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { PlayerCharacter } from '../models/playerCharacter';

interface PlayerCharacterRow {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: string;
  player_knowledge: string | null;
  tags: string;
  created_at: number;
  updated_at: number;
  custom_fields: string;
  player_name: string | null;
  class: string;
  level: number | null;
  race: string | null;
  background: string | null;
  personality: string | null;
  goals: string | null;
  backstory: string | null;
  art: string | null;
  faction_affiliations: string;
  allied_npcs: string;
  dm_secrets: string | null;
  dm_plot_threads: string | null;
  dm_true_motivation: string | null;
  dm_consequences: string | null;
}

export interface PlayerCharacterFilters extends EntityFilters {
  player_name?: string;
}

export class PlayerCharacterService extends BaseCategoryService<PlayerCharacter> {
  constructor(db: Database.Database) {
    super(db, 'player_characters');
  }

  /**
   * Category-specific validation for player characters
   */
  protected validateCategoryFields(data: Partial<PlayerCharacter>, options?: OperationOptions): void {
    if (data.level !== undefined && data.level !== null && data.level < 1) {
      throw new Error('level must be at least 1');
    }
  }

  /**
   * Insert player character into database
   */
  protected insertEntity(data: PlayerCharacter): void {
    const stmt = this.db.prepare(`
      INSERT INTO player_characters (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        player_name, class, level, race, background, personality, goals,
        backstory, art, faction_affiliations, allied_npcs,
        dm_secrets, dm_plot_threads, dm_true_motivation, dm_consequences
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.campaign_id,
      data.name,
      data.description,
      data.core_status,
      data.player_knowledge,
      JSON.stringify(data.tags),
      data.created_at,
      data.updated_at,
      JSON.stringify(data.custom_fields),
      data.player_name || null,
      JSON.stringify(data.class || []),
      data.level || null,
      data.race || null,
      data.background || null,
      data.personality || null,
      data.goals || null,
      data.backstory || null,
      data.art || null,
      JSON.stringify(data.faction_affiliations || []),
      JSON.stringify(data.allied_npcs || []),
      data.dm_secrets || null,
      data.dm_plot_threads || null,
      data.dm_true_motivation || null,
      data.dm_consequences || null
    );
  }

  /**
   * Update player character in database
   */
  protected updateEntity(id: string, data: Partial<PlayerCharacter>): void {
    // Handle junction table relationships separately
    if ('faction_affiliations' in data && Array.isArray(data.faction_affiliations)) {
      this.setFactionAffiliations(id, data.faction_affiliations);
      const { faction_affiliations, ...restData } = data;
      data = restData as Partial<PlayerCharacter>;
    }

    if ('allied_npcs' in data && Array.isArray(data.allied_npcs)) {
      this.setNPCRelationships(id, data.allied_npcs);
      const { allied_npcs, ...restData } = data;
      data = restData as Partial<PlayerCharacter>;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof PlayerCharacter)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'player_name', 'class', 'level', 'race', 'background',
      'personality', 'goals', 'backstory', 'art', 'dm_secrets', 'dm_plot_threads',
      'dm_true_motivation', 'dm_consequences',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields (removed 'faction_affiliations', 'allied_npcs' - now in junction tables)
        if (['tags', 'custom_fields', 'class'].includes(field)) {
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
      UPDATE player_characters
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  /**
   * Delete player character from database
   */
  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM player_characters WHERE id = ?').run(id);
  }

  /**
   * Find player character by ID
   */
  findById(id: string): PlayerCharacter | null {
    const row = this.db
      .prepare('SELECT * FROM player_characters WHERE id = ?')
      .get(id) as PlayerCharacterRow | undefined;

    if (!row) return null;

    const pc = this.rowToPlayerCharacter(row);

    // Populate relationships from junction tables
    pc.faction_affiliations = this.getFactionAffiliations(id);
    pc.allied_npcs = this.getNPCRelationships(id);

    return pc;
  }

  /**
   * List player characters with filters and pagination
   */
  list(
    filters: PlayerCharacterFilters,
    pagination: Pagination,
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<PlayerCharacter> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    // Campaign filter (required)
    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
    }

    // Universal field filters
    if (filters.core_status) {
      whereClauses.push('core_status = ?');
      params.push(filters.core_status);
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

    // Category-specific filters
    if (filters.player_name) {
      whereClauses.push('player_name = ?');
      params.push(filters.player_name);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(() => `tags LIKE ?`).join(' OR ');
      whereClauses.push(`(${tagConditions})`);
      filters.tags.forEach((tag) => {
        params.push(`%"${tag}"%`);
      });
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM player_characters ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };

    // Fetch data
    const dataStmt = this.db.prepare(`
      SELECT * FROM player_characters
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `);

    const rows = dataStmt.all(...params, pagination.limit, pagination.offset) as PlayerCharacterRow[];

    // Batch fetch all relationships at once (N+1 query optimization)
    const pcIds = rows.map((r: any) => r.id);
    const factionAffiliationsMap = this.batchGetFactionAffiliations(pcIds);
    const npcRelationshipsMap = this.batchGetNPCRelationships(pcIds);

    // Populate relationships from junction tables for each player character
    const pcs = rows.map((row) => {
      const pc = this.rowToPlayerCharacter(row);
      pc.faction_affiliations = factionAffiliationsMap.get(pc.id) || [];
      pc.allied_npcs = npcRelationshipsMap.get(pc.id) || [];
      return pc;
    });

    return {
      data: pcs,
      total: count,
    };
  }

  /**
   * Convert database row to PlayerCharacter model
   */
  private rowToPlayerCharacter(row: PlayerCharacterRow): PlayerCharacter {
    return this.parseJsonFields(row, [
      'tags',
      'custom_fields',
      'class',
      'faction_affiliations',
      'allied_npcs',
    ]) as PlayerCharacter;
  }

  /**
   * Get player character faction affiliations from junction table
   * @param pcId - Player character ID
   * @returns Array of faction IDs
   */
  getFactionAffiliations(pcId: string): string[] {
    const rows = this.db
      .prepare('SELECT faction_id FROM pc_faction_affiliations WHERE pc_id = ?')
      .all(pcId) as { faction_id: string }[];

    return rows.map(r => r.faction_id);
  }

  /**
   * Batch fetch faction affiliations for multiple player characters (N+1 query optimization)
   * @param pcIds - Array of player character IDs
   * @returns Map of pc_id -> array of faction IDs
   */
  protected batchGetFactionAffiliations(pcIds: string[]): Map<string, string[]> {
    if (pcIds.length === 0) return new Map();

    const placeholders = pcIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT pc_id, faction_id
      FROM pc_faction_affiliations
      WHERE pc_id IN (${placeholders})
    `).all(...pcIds) as { pc_id: string; faction_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.pc_id)) {
        map.set(row.pc_id, []);
      }
      map.get(row.pc_id)!.push(row.faction_id);
    });

    return map;
  }

  /**
   * Get player character NPC relationships from junction table
   * @param pcId - Player character ID
   * @returns Array of NPC IDs
   */
  getNPCRelationships(pcId: string): string[] {
    const rows = this.db
      .prepare('SELECT npc_id FROM pc_npc_relationships WHERE pc_id = ?')
      .all(pcId) as { npc_id: string }[];

    return rows.map(r => r.npc_id);
  }

  /**
   * Batch fetch NPC relationships for multiple player characters (N+1 query optimization)
   * @param pcIds - Array of player character IDs
   * @returns Map of pc_id -> array of NPC IDs
   */
  protected batchGetNPCRelationships(pcIds: string[]): Map<string, string[]> {
    if (pcIds.length === 0) return new Map();

    const placeholders = pcIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT pc_id, npc_id
      FROM pc_npc_relationships
      WHERE pc_id IN (${placeholders})
    `).all(...pcIds) as { pc_id: string; npc_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.pc_id)) {
        map.set(row.pc_id, []);
      }
      map.get(row.pc_id)!.push(row.npc_id);
    });

    return map;
  }

  /**
   * Add faction affiliation relationship
   * @param pcId - Player character ID
   * @param factionId - Faction ID
   * @param options - Relationship options
   */
  addFactionAffiliation(
    pcId: string,
    factionId: string,
    options?: { affiliation_type?: string; reputation?: number; joined_date?: number }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO pc_faction_affiliations (id, pc_id, faction_id, affiliation_type, reputation, joined_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(pc_id, faction_id) DO UPDATE SET
          affiliation_type = COALESCE(excluded.affiliation_type, affiliation_type),
          reputation = COALESCE(excluded.reputation, reputation),
          joined_date = COALESCE(excluded.joined_date, joined_date),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        pcId,
        factionId,
        options?.affiliation_type || null,
        options?.reputation || null,
        options?.joined_date || null
      );
  }

  /**
   * Remove faction affiliation relationship
   * @param pcId - Player character ID
   * @param factionId - Faction ID
   */
  removeFactionAffiliation(pcId: string, factionId: string): void {
    this.db
      .prepare('DELETE FROM pc_faction_affiliations WHERE pc_id = ? AND faction_id = ?')
      .run(pcId, factionId);
  }

  /**
   * Set faction affiliations (replaces all existing relationships)
   * @param pcId - Player character ID
   * @param factionIds - Array of faction IDs
   */
  setFactionAffiliations(pcId: string, factionIds: string[]): void {
    // Remove all existing affiliations
    this.db.prepare('DELETE FROM pc_faction_affiliations WHERE pc_id = ?').run(pcId);

    // Add new affiliations
    factionIds.forEach(factionId => {
      this.addFactionAffiliation(pcId, factionId);
    });
  }

  /**
   * Add NPC relationship
   * @param pcId - Player character ID
   * @param npcId - NPC ID
   * @param options - Relationship options
   */
  addNPCRelationship(
    pcId: string,
    npcId: string,
    options?: { relationship_type?: string; trust_level?: number }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO pc_npc_relationships (id, pc_id, npc_id, relationship_type, trust_level, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(pc_id, npc_id) DO UPDATE SET
          relationship_type = COALESCE(excluded.relationship_type, relationship_type),
          trust_level = COALESCE(excluded.trust_level, trust_level),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        pcId,
        npcId,
        options?.relationship_type || null,
        options?.trust_level || null
      );
  }

  /**
   * Remove NPC relationship
   * @param pcId - Player character ID
   * @param npcId - NPC ID
   */
  removeNPCRelationship(pcId: string, npcId: string): void {
    this.db
      .prepare('DELETE FROM pc_npc_relationships WHERE pc_id = ? AND npc_id = ?')
      .run(pcId, npcId);
  }

  /**
   * Set NPC relationships (replaces all existing relationships)
   * @param pcId - Player character ID
   * @param npcIds - Array of NPC IDs
   */
  setNPCRelationships(pcId: string, npcIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM pc_npc_relationships WHERE pc_id = ?').run(pcId);

    // Add new relationships
    npcIds.forEach(npcId => {
      this.addNPCRelationship(pcId, npcId);
    });
  }
}
