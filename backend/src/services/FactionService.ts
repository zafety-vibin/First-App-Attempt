/**
 * FactionService - Business logic for faction operations
 * Feature: 014-create-the-database (standardized)
 *
 * Implements:
 * - Standard CRUD operations via BaseCategoryService
 * - Foreign key validation (leader_id → npcs.id)
 * - Junction table relationships (faction_alliances, faction_rivalries, faction_members, faction_territory, faction_presence)
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { Faction } from '../models/faction';

interface FactionRow {
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
  faction_type: string | null;
  power_level: string | null;
  resources: string | null;
  beliefs: string | null;
  goals: string | null;
  methods: string | null;
  leader_id: string | null;
  key_members: string;
  allied_factions: string;
  rival_factions: string;
  territory: string;
  dm_true_agenda: string | null;
}

export class FactionService extends BaseCategoryService<Faction> {
  constructor(db: Database.Database) {
    super(db, 'factions');
  }

  /**
   * Category-specific validation for factions
   */
  protected validateCategoryFields(data: Partial<Faction>, options?: OperationOptions): void {
    // Validate leader_id FK if provided
    if (data.leader_id) {
      const npc = this.db
        .prepare('SELECT id FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(data.leader_id, data.campaign_id);

      if (!npc) {
        throw new Error('Leader NPC not found in this campaign');
      }
    }
  }

  /**
   * Insert faction into database
   */
  protected insertEntity(data: Faction): void {
    const stmt = this.db.prepare(`
      INSERT INTO factions (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        faction_type, power_level, resources, beliefs, goals, methods,
        leader_id, key_members, allied_factions, rival_factions, territory,
        dm_true_agenda
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.faction_type || null,
      data.power_level || null,
      data.resources || null,
      data.beliefs || null,
      data.goals || null,
      data.methods || null,
      data.leader_id || null,
      JSON.stringify(data.key_members || []),
      JSON.stringify(data.allied_factions || []),
      JSON.stringify(data.rival_factions || []),
      JSON.stringify(data.territory || []),
      data.dm_true_agenda || null
    );
  }

  /**
   * Update faction in database
   */
  protected updateEntity(id: string, data: Partial<Faction>): void {
    // Handle junction table relationships separately
    if ('allied_factions' in data && Array.isArray(data.allied_factions)) {
      this.setAlliances(id, data.allied_factions);
      const { allied_factions, ...restData } = data;
      data = restData as Partial<Faction>;
    }

    if ('rival_factions' in data && Array.isArray(data.rival_factions)) {
      this.setRivalries(id, data.rival_factions);
      const { rival_factions, ...restData } = data;
      data = restData as Partial<Faction>;
    }

    if ('key_members' in data && Array.isArray(data.key_members)) {
      this.setMembers(id, data.key_members);
      const { key_members, ...restData } = data;
      data = restData as Partial<Faction>;
    }

    if ('territory' in data && Array.isArray(data.territory)) {
      this.setTerritory(id, data.territory);
      const { territory, ...restData } = data;
      data = restData as Partial<Faction>;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof Faction)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'faction_type', 'power_level', 'resources', 'beliefs',
      'goals', 'methods', 'leader_id', 'dm_true_agenda',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields (removed 'allied_factions', 'rival_factions', 'key_members', 'territory' - now in junction tables)
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
      UPDATE factions
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  /**
   * Delete faction from database
   */
  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM factions WHERE id = ?').run(id);
  }

  /**
   * Find faction by ID
   */
  findById(id: string): Faction | null {
    const row = this.db
      .prepare('SELECT * FROM factions WHERE id = ?')
      .get(id) as FactionRow | undefined;

    if (!row) return null;

    const faction = this.rowToFaction(row);

    // Populate relationships from junction tables
    faction.allied_factions = this.getAlliances(id);
    faction.rival_factions = this.getRivalries(id);
    faction.key_members = this.getMembers(id);
    faction.territory = this.getTerritory(id);

    return faction;
  }

  /**
   * List factions with filters and pagination
   */
  list(
    filters: EntityFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<Faction> {
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

    // Tag filtering
    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(() => `tags LIKE ?`).join(' OR ');
      whereClauses.push(`(${tagConditions})`);
      filters.tags.forEach((tag) => {
        params.push(`%"${tag}"%`);
      });
    }

    // Category-specific filters
    if (filters.faction_type) {
      whereClauses.push('faction_type = ?');
      params.push(filters.faction_type);
    }

    if (filters.leader_id) {
      whereClauses.push('leader_id = ?');
      params.push(filters.leader_id);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM factions ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };

    // Fetch data
    const dataStmt = this.db.prepare(`
      SELECT * FROM factions
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `);

    const rows = dataStmt.all(...params, pagination.limit, pagination.offset) as FactionRow[];

    // Batch fetch all relationships at once (N+1 query optimization)
    const factionIds = rows.map((r: any) => r.id);
    const alliesMap = this.batchGetAlliances(factionIds);
    const rivalsMap = this.batchGetRivalries(factionIds);
    const membersMap = this.batchGetMembers(factionIds);
    const territoryMap = this.batchGetTerritory(factionIds);

    // Populate relationships from junction tables for each faction
    const factions = rows.map((row) => {
      const faction = this.rowToFaction(row);
      faction.allied_factions = alliesMap.get(faction.id) || [];
      faction.rival_factions = rivalsMap.get(faction.id) || [];
      faction.key_members = membersMap.get(faction.id) || [];
      faction.territory = territoryMap.get(faction.id) || [];
      return faction;
    });

    return {
      data: factions,
      total: count,
    };
  }

  /**
   * Convert database row to Faction model
   */
  private rowToFaction(row: FactionRow): Faction {
    return this.parseJsonFields(row, [
      'tags',
      'custom_fields',
      'key_members',
      'allied_factions',
      'rival_factions',
      'territory',
    ]) as Faction;
  }

  /**
   * Get faction alliances from junction table
   * @param factionId - Faction ID
   * @returns Array of allied faction IDs
   */
  getAlliances(factionId: string): string[] {
    const rows = this.db
      .prepare('SELECT allied_faction_id FROM faction_alliances WHERE faction_id = ?')
      .all(factionId) as { allied_faction_id: string }[];

    return rows.map(r => r.allied_faction_id);
  }

  /**
   * Batch fetch alliances for multiple factions (N+1 query optimization)
   * @param factionIds - Array of faction IDs
   * @returns Map of faction_id -> array of allied faction IDs
   */
  protected batchGetAlliances(factionIds: string[]): Map<string, string[]> {
    if (factionIds.length === 0) return new Map();

    const placeholders = factionIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT faction_id, allied_faction_id
      FROM faction_alliances
      WHERE faction_id IN (${placeholders})
    `).all(...factionIds) as { faction_id: string; allied_faction_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.faction_id)) {
        map.set(row.faction_id, []);
      }
      map.get(row.faction_id)!.push(row.allied_faction_id);
    });

    return map;
  }

  /**
   * Get faction rivalries from junction table
   * @param factionId - Faction ID
   * @returns Array of rival faction IDs
   */
  getRivalries(factionId: string): string[] {
    const rows = this.db
      .prepare('SELECT rival_faction_id FROM faction_rivalries WHERE faction_id = ?')
      .all(factionId) as { rival_faction_id: string }[];

    return rows.map(r => r.rival_faction_id);
  }

  /**
   * Batch fetch rivalries for multiple factions (N+1 query optimization)
   * @param factionIds - Array of faction IDs
   * @returns Map of faction_id -> array of rival faction IDs
   */
  protected batchGetRivalries(factionIds: string[]): Map<string, string[]> {
    if (factionIds.length === 0) return new Map();

    const placeholders = factionIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT faction_id, rival_faction_id
      FROM faction_rivalries
      WHERE faction_id IN (${placeholders})
    `).all(...factionIds) as { faction_id: string; rival_faction_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.faction_id)) {
        map.set(row.faction_id, []);
      }
      map.get(row.faction_id)!.push(row.rival_faction_id);
    });

    return map;
  }

  /**
   * Get faction members from junction table
   * @param factionId - Faction ID
   * @returns Array of NPC IDs
   */
  getMembers(factionId: string): string[] {
    const rows = this.db
      .prepare('SELECT npc_id FROM faction_members WHERE faction_id = ?')
      .all(factionId) as { npc_id: string }[];

    return rows.map(r => r.npc_id);
  }

  /**
   * Batch fetch members for multiple factions (N+1 query optimization)
   * @param factionIds - Array of faction IDs
   * @returns Map of faction_id -> array of NPC IDs
   */
  protected batchGetMembers(factionIds: string[]): Map<string, string[]> {
    if (factionIds.length === 0) return new Map();

    const placeholders = factionIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT faction_id, npc_id
      FROM faction_members
      WHERE faction_id IN (${placeholders})
    `).all(...factionIds) as { faction_id: string; npc_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.faction_id)) {
        map.set(row.faction_id, []);
      }
      map.get(row.faction_id)!.push(row.npc_id);
    });

    return map;
  }

  /**
   * Get faction territory from junction table
   * @param factionId - Faction ID
   * @returns Array of location IDs
   */
  getTerritory(factionId: string): string[] {
    const rows = this.db
      .prepare('SELECT location_id FROM faction_territory WHERE faction_id = ?')
      .all(factionId) as { location_id: string }[];

    return rows.map(r => r.location_id);
  }

  /**
   * Batch fetch territory for multiple factions (N+1 query optimization)
   * @param factionIds - Array of faction IDs
   * @returns Map of faction_id -> array of location IDs
   */
  protected batchGetTerritory(factionIds: string[]): Map<string, string[]> {
    if (factionIds.length === 0) return new Map();

    const placeholders = factionIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT faction_id, location_id
      FROM faction_territory
      WHERE faction_id IN (${placeholders})
    `).all(...factionIds) as { faction_id: string; location_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.faction_id)) {
        map.set(row.faction_id, []);
      }
      map.get(row.faction_id)!.push(row.location_id);
    });

    return map;
  }

  /**
   * Get faction presence locations from junction table
   * @param factionId - Faction ID
   * @returns Array of location IDs where faction is present
   */
  getPresence(factionId: string): string[] {
    const rows = this.db
      .prepare('SELECT location_id FROM faction_presence WHERE faction_id = ?')
      .all(factionId) as { location_id: string }[];

    return rows.map(r => r.location_id);
  }

  /**
   * Batch fetch presence for multiple factions (N+1 query optimization)
   * @param factionIds - Array of faction IDs
   * @returns Map of faction_id -> array of location IDs where faction is present
   */
  protected batchGetPresence(factionIds: string[]): Map<string, string[]> {
    if (factionIds.length === 0) return new Map();

    const placeholders = factionIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT faction_id, location_id
      FROM faction_presence
      WHERE faction_id IN (${placeholders})
    `).all(...factionIds) as { faction_id: string; location_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.faction_id)) {
        map.set(row.faction_id, []);
      }
      map.get(row.faction_id)!.push(row.location_id);
    });

    return map;
  }

  /**
   * Add faction alliance relationship
   * @param factionId - Faction ID
   * @param alliedFactionId - Allied faction ID
   * @param options - Relationship options
   */
  addAlliance(
    factionId: string,
    alliedFactionId: string,
    options?: { alliance_type?: string; strength?: number; since_date?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO faction_alliances (id, faction_id, allied_faction_id, alliance_type, strength, since_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(faction_id, allied_faction_id) DO UPDATE SET
          alliance_type = COALESCE(excluded.alliance_type, alliance_type),
          strength = COALESCE(excluded.strength, strength),
          since_date = COALESCE(excluded.since_date, since_date),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        factionId,
        alliedFactionId,
        options?.alliance_type || null,
        options?.strength || null,
        options?.since_date || null
      );
  }

  /**
   * Remove faction alliance relationship
   * @param factionId - Faction ID
   * @param alliedFactionId - Allied faction ID
   */
  removeAlliance(factionId: string, alliedFactionId: string): void {
    this.db
      .prepare('DELETE FROM faction_alliances WHERE faction_id = ? AND allied_faction_id = ?')
      .run(factionId, alliedFactionId);
  }

  /**
   * Set faction alliances (replaces all existing relationships)
   * @param factionId - Faction ID
   * @param alliedFactionIds - Array of allied faction IDs
   */
  setAlliances(factionId: string, alliedFactionIds: string[]): void {
    // Remove all existing alliances
    this.db.prepare('DELETE FROM faction_alliances WHERE faction_id = ?').run(factionId);

    // Add new alliances
    alliedFactionIds.forEach(alliedFactionId => {
      this.addAlliance(factionId, alliedFactionId);
    });
  }

  /**
   * Add faction rivalry relationship
   * @param factionId - Faction ID
   * @param rivalFactionId - Rival faction ID
   * @param options - Relationship options
   */
  addRivalry(
    factionId: string,
    rivalFactionId: string,
    options?: { rivalry_type?: string; intensity?: number; since_date?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO faction_rivalries (id, faction_id, rival_faction_id, rivalry_type, intensity, since_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(faction_id, rival_faction_id) DO UPDATE SET
          rivalry_type = COALESCE(excluded.rivalry_type, rivalry_type),
          intensity = COALESCE(excluded.intensity, intensity),
          since_date = COALESCE(excluded.since_date, since_date),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        factionId,
        rivalFactionId,
        options?.rivalry_type || null,
        options?.intensity || null,
        options?.since_date || null
      );
  }

  /**
   * Remove faction rivalry relationship
   * @param factionId - Faction ID
   * @param rivalFactionId - Rival faction ID
   */
  removeRivalry(factionId: string, rivalFactionId: string): void {
    this.db
      .prepare('DELETE FROM faction_rivalries WHERE faction_id = ? AND rival_faction_id = ?')
      .run(factionId, rivalFactionId);
  }

  /**
   * Set faction rivalries (replaces all existing relationships)
   * @param factionId - Faction ID
   * @param rivalFactionIds - Array of rival faction IDs
   */
  setRivalries(factionId: string, rivalFactionIds: string[]): void {
    // Remove all existing rivalries
    this.db.prepare('DELETE FROM faction_rivalries WHERE faction_id = ?').run(factionId);

    // Add new rivalries
    rivalFactionIds.forEach(rivalFactionId => {
      this.addRivalry(factionId, rivalFactionId);
    });
  }

  /**
   * Add faction member relationship
   * @param factionId - Faction ID
   * @param npcId - NPC ID
   * @param options - Relationship options
   */
  addMember(
    factionId: string,
    npcId: string,
    options?: { role?: string; rank?: number; joined_date?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO faction_members (id, faction_id, npc_id, role, rank, joined_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(faction_id, npc_id) DO UPDATE SET
          role = COALESCE(excluded.role, role),
          rank = COALESCE(excluded.rank, rank),
          joined_date = COALESCE(excluded.joined_date, joined_date),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        factionId,
        npcId,
        options?.role || null,
        options?.rank || null,
        options?.joined_date || null
      );
  }

  /**
   * Remove faction member relationship
   * @param factionId - Faction ID
   * @param npcId - NPC ID
   */
  removeMember(factionId: string, npcId: string): void {
    this.db
      .prepare('DELETE FROM faction_members WHERE faction_id = ? AND npc_id = ?')
      .run(factionId, npcId);
  }

  /**
   * Set faction members (replaces all existing relationships)
   * @param factionId - Faction ID
   * @param npcIds - Array of NPC IDs
   */
  setMembers(factionId: string, npcIds: string[]): void {
    // Remove all existing members
    this.db.prepare('DELETE FROM faction_members WHERE faction_id = ?').run(factionId);

    // Add new members
    npcIds.forEach(npcId => {
      this.addMember(factionId, npcId);
    });
  }

  /**
   * Add faction territory relationship
   * @param factionId - Faction ID
   * @param locationId - Location ID
   * @param options - Relationship options
   */
  addTerritory(
    factionId: string,
    locationId: string,
    options?: { control_type?: string; control_strength?: number; since_date?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO faction_territory (id, faction_id, location_id, control_type, control_strength, since_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(faction_id, location_id) DO UPDATE SET
          control_type = COALESCE(excluded.control_type, control_type),
          control_strength = COALESCE(excluded.control_strength, control_strength),
          since_date = COALESCE(excluded.since_date, since_date),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        factionId,
        locationId,
        options?.control_type || null,
        options?.control_strength || null,
        options?.since_date || null
      );
  }

  /**
   * Remove faction territory relationship
   * @param factionId - Faction ID
   * @param locationId - Location ID
   */
  removeTerritory(factionId: string, locationId: string): void {
    this.db
      .prepare('DELETE FROM faction_territory WHERE faction_id = ? AND location_id = ?')
      .run(factionId, locationId);
  }

  /**
   * Set faction territory (replaces all existing relationships)
   * @param factionId - Faction ID
   * @param locationIds - Array of location IDs
   */
  setTerritory(factionId: string, locationIds: string[]): void {
    // Remove all existing territory
    this.db.prepare('DELETE FROM faction_territory WHERE faction_id = ?').run(factionId);

    // Add new territory
    locationIds.forEach(locationId => {
      this.addTerritory(factionId, locationId);
    });
  }

  /**
   * Add faction presence relationship
   * @param factionId - Faction ID
   * @param locationId - Location ID
   * @param options - Relationship options
   */
  addPresence(
    factionId: string,
    locationId: string,
    options?: { presence_type?: string; influence_level?: number; since_date?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO faction_presence (id, faction_id, location_id, presence_type, influence_level, since_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(faction_id, location_id) DO UPDATE SET
          presence_type = COALESCE(excluded.presence_type, presence_type),
          influence_level = COALESCE(excluded.influence_level, influence_level),
          since_date = COALESCE(excluded.since_date, since_date),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        factionId,
        locationId,
        options?.presence_type || null,
        options?.influence_level || null,
        options?.since_date || null
      );
  }

  /**
   * Remove faction presence relationship
   * @param factionId - Faction ID
   * @param locationId - Location ID
   */
  removePresence(factionId: string, locationId: string): void {
    this.db
      .prepare('DELETE FROM faction_presence WHERE faction_id = ? AND location_id = ?')
      .run(factionId, locationId);
  }

  /**
   * Set faction presence (replaces all existing relationships)
   * @param factionId - Faction ID
   * @param locationIds - Array of location IDs
   */
  setPresence(factionId: string, locationIds: string[]): void {
    // Remove all existing presence
    this.db.prepare('DELETE FROM faction_presence WHERE faction_id = ?').run(factionId);

    // Add new presence
    locationIds.forEach(locationId => {
      this.addPresence(factionId, locationId);
    });
  }
}
