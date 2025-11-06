/**
 * LoreEntryService - Business logic for lore entry operations
 * Feature: 014-create-the-database (standardized)
 *
 * Implements:
 * - Standard CRUD operations via BaseCategoryService
 * - Junction table relationships (lore_entry_npcs, lore_entry_locations, lore_entry_factions)
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { LoreEntry } from '../models/loreEntry';

export interface LoreEntryFilters extends EntityFilters {
  category?: string;
  era_period?: string;
}

interface LoreEntryRow {
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
  category: string | null;
  era_period: string | null;
  in_game_date: string | null;
  historical_accuracy: string | null;
}

export class LoreEntryService extends BaseCategoryService<LoreEntry> {
  constructor(db: Database.Database) {
    super(db, 'lore_entries');
  }

  /**
   * Category-specific validation for lore entries
   */
  protected validateCategoryFields(data: Partial<LoreEntry>, options?: OperationOptions): void {
    // No special validation needed
  }

  /**
   * Insert lore entry into database
   */
  protected insertEntity(data: LoreEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO lore_entries (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        category, era_period, in_game_date, historical_accuracy
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.category || null,
      data.era_period || null,
      data.in_game_date || null,
      data.historical_accuracy || null
    );
  }

  /**
   * Update lore entry in database
   */
  protected updateEntity(id: string, data: Partial<LoreEntry>): void {
    // Handle junction table relationships separately
    if ('related_npcs' in data && Array.isArray(data.related_npcs)) {
      this.setRelatedNPCs(id, data.related_npcs);
      const { related_npcs, ...restData } = data;
      data = restData as Partial<LoreEntry>;
    }

    if ('related_locations' in data && Array.isArray(data.related_locations)) {
      this.setRelatedLocations(id, data.related_locations);
      const { related_locations, ...restData } = data;
      data = restData as Partial<LoreEntry>;
    }

    if ('related_factions' in data && Array.isArray(data.related_factions)) {
      this.setRelatedFactions(id, data.related_factions);
      const { related_factions, ...restData } = data;
      data = restData as Partial<LoreEntry>;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof LoreEntry)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'category', 'era_period', 'in_game_date', 'historical_accuracy',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields (removed 'related_npcs', 'related_locations', 'related_factions' - now in junction tables)
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
      UPDATE lore_entries
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  /**
   * Delete lore entry from database
   */
  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM lore_entries WHERE id = ?').run(id);
  }

  /**
   * Find lore entry by ID
   */
  findById(id: string): LoreEntry | null {
    const row = this.db
      .prepare('SELECT * FROM lore_entries WHERE id = ?')
      .get(id) as LoreEntryRow | undefined;

    if (!row) return null;

    const loreEntry = this.rowToLoreEntry(row);

    // Populate relationships from junction tables
    loreEntry.related_npcs = this.getRelatedNPCs(id);
    loreEntry.related_locations = this.getRelatedLocations(id);
    loreEntry.related_factions = this.getRelatedFactions(id);

    return loreEntry;
  }

  /**
   * List lore entries with filters and pagination
   */
  list(
    filters: LoreEntryFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<LoreEntry> {
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
    if (filters.category) {
      whereClauses.push('category = ?');
      params.push(filters.category);
    }

    if (filters.era_period) {
      whereClauses.push('era_period = ?');
      params.push(filters.era_period);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM lore_entries ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };

    // Fetch data
    const dataStmt = this.db.prepare(`
      SELECT * FROM lore_entries
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `);

    const rows = dataStmt.all(...params, pagination.limit, pagination.offset) as LoreEntryRow[];

    // Batch fetch all relationships at once (N+1 query optimization)
    const loreEntryIds = rows.map((r: any) => r.id);
    const npcsMap = this.batchGetRelatedNPCs(loreEntryIds);
    const locationsMap = this.batchGetRelatedLocations(loreEntryIds);
    const factionsMap = this.batchGetRelatedFactions(loreEntryIds);

    // Populate relationships from junction tables for each lore entry
    const loreEntries = rows.map((row) => {
      const loreEntry = this.rowToLoreEntry(row);
      loreEntry.related_npcs = npcsMap.get(loreEntry.id) || [];
      loreEntry.related_locations = locationsMap.get(loreEntry.id) || [];
      loreEntry.related_factions = factionsMap.get(loreEntry.id) || [];
      return loreEntry;
    });

    return {
      data: loreEntries,
      total: count,
    };
  }

  /**
   * Convert database row to LoreEntry model
   */
  private rowToLoreEntry(row: LoreEntryRow): LoreEntry {
    return this.parseJsonFields(row, [
      'tags',
      'custom_fields',
    ]) as LoreEntry;
  }

  /**
   * Get related NPCs from junction table
   * @param loreEntryId - Lore entry ID
   * @returns Array of NPC IDs
   */
  getRelatedNPCs(loreEntryId: string): string[] {
    const rows = this.db
      .prepare('SELECT npc_id FROM lore_entry_npcs WHERE lore_entry_id = ?')
      .all(loreEntryId) as { npc_id: string }[];

    return rows.map(r => r.npc_id);
  }

  /**
   * Batch fetch related NPCs for multiple lore entries (N+1 query optimization)
   * @param loreEntryIds - Array of lore entry IDs
   * @returns Map of lore_entry_id -> array of NPC IDs
   */
  protected batchGetRelatedNPCs(loreEntryIds: string[]): Map<string, string[]> {
    if (loreEntryIds.length === 0) return new Map();

    const placeholders = loreEntryIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT lore_entry_id, npc_id
      FROM lore_entry_npcs
      WHERE lore_entry_id IN (${placeholders})
    `).all(...loreEntryIds) as { lore_entry_id: string; npc_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.lore_entry_id)) {
        map.set(row.lore_entry_id, []);
      }
      map.get(row.lore_entry_id)!.push(row.npc_id);
    });

    return map;
  }

  /**
   * Get related locations from junction table
   * @param loreEntryId - Lore entry ID
   * @returns Array of location IDs
   */
  getRelatedLocations(loreEntryId: string): string[] {
    const rows = this.db
      .prepare('SELECT location_id FROM lore_entry_locations WHERE lore_entry_id = ?')
      .all(loreEntryId) as { location_id: string }[];

    return rows.map(r => r.location_id);
  }

  /**
   * Batch fetch related locations for multiple lore entries (N+1 query optimization)
   * @param loreEntryIds - Array of lore entry IDs
   * @returns Map of lore_entry_id -> array of location IDs
   */
  protected batchGetRelatedLocations(loreEntryIds: string[]): Map<string, string[]> {
    if (loreEntryIds.length === 0) return new Map();

    const placeholders = loreEntryIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT lore_entry_id, location_id
      FROM lore_entry_locations
      WHERE lore_entry_id IN (${placeholders})
    `).all(...loreEntryIds) as { lore_entry_id: string; location_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.lore_entry_id)) {
        map.set(row.lore_entry_id, []);
      }
      map.get(row.lore_entry_id)!.push(row.location_id);
    });

    return map;
  }

  /**
   * Get related factions from junction table
   * @param loreEntryId - Lore entry ID
   * @returns Array of faction IDs
   */
  getRelatedFactions(loreEntryId: string): string[] {
    const rows = this.db
      .prepare('SELECT faction_id FROM lore_entry_factions WHERE lore_entry_id = ?')
      .all(loreEntryId) as { faction_id: string }[];

    return rows.map(r => r.faction_id);
  }

  /**
   * Batch fetch related factions for multiple lore entries (N+1 query optimization)
   * @param loreEntryIds - Array of lore entry IDs
   * @returns Map of lore_entry_id -> array of faction IDs
   */
  protected batchGetRelatedFactions(loreEntryIds: string[]): Map<string, string[]> {
    if (loreEntryIds.length === 0) return new Map();

    const placeholders = loreEntryIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT lore_entry_id, faction_id
      FROM lore_entry_factions
      WHERE lore_entry_id IN (${placeholders})
    `).all(...loreEntryIds) as { lore_entry_id: string; faction_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.lore_entry_id)) {
        map.set(row.lore_entry_id, []);
      }
      map.get(row.lore_entry_id)!.push(row.faction_id);
    });

    return map;
  }

  /**
   * Add related NPC relationship
   * @param loreEntryId - Lore entry ID
   * @param npcId - NPC ID
   * @param options - Relationship options
   */
  addRelatedNPC(
    loreEntryId: string,
    npcId: string,
    options?: { relevance_type?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO lore_entry_npcs (id, lore_entry_id, npc_id, relevance_type, created_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(lore_entry_id, npc_id) DO UPDATE SET
          relevance_type = COALESCE(excluded.relevance_type, relevance_type)
      `)
      .run(
        randomUUID(),
        loreEntryId,
        npcId,
        options?.relevance_type || null
      );
  }

  /**
   * Remove related NPC relationship
   * @param loreEntryId - Lore entry ID
   * @param npcId - NPC ID
   */
  removeRelatedNPC(loreEntryId: string, npcId: string): void {
    this.db
      .prepare('DELETE FROM lore_entry_npcs WHERE lore_entry_id = ? AND npc_id = ?')
      .run(loreEntryId, npcId);
  }

  /**
   * Set related NPCs (replaces all existing relationships)
   * @param loreEntryId - Lore entry ID
   * @param npcIds - Array of NPC IDs
   */
  setRelatedNPCs(loreEntryId: string, npcIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM lore_entry_npcs WHERE lore_entry_id = ?').run(loreEntryId);

    // Add new relationships
    npcIds.forEach(npcId => {
      this.addRelatedNPC(loreEntryId, npcId);
    });
  }

  /**
   * Add related location relationship
   * @param loreEntryId - Lore entry ID
   * @param locationId - Location ID
   * @param options - Relationship options
   */
  addRelatedLocation(
    loreEntryId: string,
    locationId: string,
    options?: { relevance_type?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO lore_entry_locations (id, lore_entry_id, location_id, relevance_type, created_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(lore_entry_id, location_id) DO UPDATE SET
          relevance_type = COALESCE(excluded.relevance_type, relevance_type)
      `)
      .run(
        randomUUID(),
        loreEntryId,
        locationId,
        options?.relevance_type || null
      );
  }

  /**
   * Remove related location relationship
   * @param loreEntryId - Lore entry ID
   * @param locationId - Location ID
   */
  removeRelatedLocation(loreEntryId: string, locationId: string): void {
    this.db
      .prepare('DELETE FROM lore_entry_locations WHERE lore_entry_id = ? AND location_id = ?')
      .run(loreEntryId, locationId);
  }

  /**
   * Set related locations (replaces all existing relationships)
   * @param loreEntryId - Lore entry ID
   * @param locationIds - Array of location IDs
   */
  setRelatedLocations(loreEntryId: string, locationIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM lore_entry_locations WHERE lore_entry_id = ?').run(loreEntryId);

    // Add new relationships
    locationIds.forEach(locationId => {
      this.addRelatedLocation(loreEntryId, locationId);
    });
  }

  /**
   * Add related faction relationship
   * @param loreEntryId - Lore entry ID
   * @param factionId - Faction ID
   * @param options - Relationship options
   */
  addRelatedFaction(
    loreEntryId: string,
    factionId: string,
    options?: { relevance_type?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO lore_entry_factions (id, lore_entry_id, faction_id, relevance_type, created_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(lore_entry_id, faction_id) DO UPDATE SET
          relevance_type = COALESCE(excluded.relevance_type, relevance_type)
      `)
      .run(
        randomUUID(),
        loreEntryId,
        factionId,
        options?.relevance_type || null
      );
  }

  /**
   * Remove related faction relationship
   * @param loreEntryId - Lore entry ID
   * @param factionId - Faction ID
   */
  removeRelatedFaction(loreEntryId: string, factionId: string): void {
    this.db
      .prepare('DELETE FROM lore_entry_factions WHERE lore_entry_id = ? AND faction_id = ?')
      .run(loreEntryId, factionId);
  }

  /**
   * Set related factions (replaces all existing relationships)
   * @param loreEntryId - Lore entry ID
   * @param factionIds - Array of faction IDs
   */
  setRelatedFactions(loreEntryId: string, factionIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM lore_entry_factions WHERE lore_entry_id = ?').run(loreEntryId);

    // Add new relationships
    factionIds.forEach(factionId => {
      this.addRelatedFaction(loreEntryId, factionId);
    });
  }
}
