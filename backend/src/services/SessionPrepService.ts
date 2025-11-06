/**
 * SessionPrepService - Business logic for session prep operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { SessionPrep } from '../models/SessionPrep';

export interface SessionPrepFilters extends EntityFilters {
  status?: string;
  planned_date?: string;
}

export class SessionPrepService extends BaseCategoryService<SessionPrep> {
  constructor(db: Database.Database) {
    super(db, 'session_preps');
  }

  protected validateCategoryFields(data: Partial<SessionPrep>, options?: OperationOptions): void {
    // SessionPrep is always dm-secret (hypothetical planning)
    if (data.player_knowledge && data.player_knowledge !== 'dm-secret') {
      throw new Error('SessionPrep must have player_knowledge=dm-secret (hypothetical content)');
    }
  }

  protected insertEntity(data: SessionPrep): void {
    this.db.prepare(`
      INSERT INTO session_preps (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        planned_date, status, planned_events, possible_encounters, plot_hooks,
        dm_notes, plot_threads, npcs_to_prep, locations_to_prep
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      'dm-secret', // Always dm-secret for session prep
      JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.planned_date || null, data.status || null,
      data.planned_events || null, data.possible_encounters || null, data.plot_hooks || null,
      data.dm_notes || null, JSON.stringify(data.plot_threads || []),
      JSON.stringify(data.npcs_to_prep || []), JSON.stringify(data.locations_to_prep || [])
    );
  }

  protected updateEntity(id: string, data: Partial<SessionPrep>): void {
    // Handle junction table relationships separately
    if ('npcs_to_prep' in data && Array.isArray(data.npcs_to_prep)) {
      this.setNPCsToPrep(id, data.npcs_to_prep);
      const { npcs_to_prep, ...restData } = data;
      data = restData as Partial<SessionPrep>;
    }

    if ('locations_to_prep' in data && Array.isArray(data.locations_to_prep)) {
      this.setLocationsToPrep(id, data.locations_to_prep);
      const { locations_to_prep, ...restData } = data;
      data = restData as Partial<SessionPrep>;
    }

    if ('quests_to_advance' in data && Array.isArray(data.quests_to_advance)) {
      this.setQuestsToAdvance(id, data.quests_to_advance);
      const { quests_to_advance, ...restData } = data;
      data = restData as Partial<SessionPrep>;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof SessionPrep)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'planned_date', 'status', 'planned_events',
      'possible_encounters', 'plot_hooks', 'dm_notes', 'plot_threads',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields (removed 'npcs_to_prep', 'locations_to_prep', 'quests_to_advance' - now in junction tables)
        if (['tags', 'custom_fields', 'plot_threads'].includes(field)) {
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
      UPDATE session_preps
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM session_preps WHERE id = ?').run(id);
  }

  findById(id: string): SessionPrep | null {
    const row = this.db.prepare('SELECT * FROM session_preps WHERE id = ?').get(id);
    if (!row) return null;

    const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep', 'quests_to_advance'];
    const prep = this.parseJsonFields(row, jsonFields) as SessionPrep;

    // Populate relationships from junction tables
    prep.npcs_to_prep = this.getNPCsToPrep(id);
    prep.locations_to_prep = this.getLocationsToPrep(id);
    prep.quests_to_advance = this.getQuestsToAdvance(id);

    return prep;
  }

  list(
    filters: SessionPrepFilters,
    pagination: Pagination,
    sortBy: string = 'planned_date',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<SessionPrep> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
    }

    // Apply view mode row filtering (Feature 004 - Information Filtering)
    // SessionPrep is always dm-secret, so player_view will return no results (correct behavior)
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

    if (filters.status) {
      whereClauses.push('status = ?');
      params.push(filters.status);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM session_preps ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM session_preps ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    const jsonFields = ['tags', 'custom_fields', 'plot_threads', 'npcs_to_prep', 'locations_to_prep', 'quests_to_advance'];

    // Batch fetch all relationships at once (N+1 query optimization)
    const prepIds = rows.map((r: any) => r.id);
    const npcsMap = this.batchGetNPCsToPrep(prepIds);
    const locationsMap = this.batchGetLocationsToPrep(prepIds);
    const questsMap = this.batchGetQuestsToAdvance(prepIds);

    // Populate relationships from junction tables for each session prep
    const preps = rows.map((row) => {
      const prep = this.parseJsonFields(row, jsonFields) as SessionPrep;
      prep.npcs_to_prep = npcsMap.get(prep.id) || [];
      prep.locations_to_prep = locationsMap.get(prep.id) || [];
      prep.quests_to_advance = questsMap.get(prep.id) || [];
      return prep;
    });

    return {
      data: preps,
      total: count,
    };
  }

  // ========================================
  // Junction Table Methods: NPCs to Prep
  // ========================================

  /**
   * Get NPCs to prep for this session
   * @param prepId - Session prep ID
   * @returns Array of NPC IDs
   */
  getNPCsToPrep(prepId: string): string[] {
    const rows = this.db
      .prepare('SELECT npc_id FROM dm_session_prep_npcs WHERE session_prep_id = ?')
      .all(prepId) as { npc_id: string }[];

    return rows.map(r => r.npc_id);
  }

  /**
   * Batch fetch NPCs to prep for multiple session preps (N+1 query optimization)
   * @param prepIds - Array of session prep IDs
   * @returns Map of session_prep_id -> array of NPC IDs
   */
  protected batchGetNPCsToPrep(prepIds: string[]): Map<string, string[]> {
    if (prepIds.length === 0) return new Map();

    const placeholders = prepIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT session_prep_id, npc_id
      FROM dm_session_prep_npcs
      WHERE session_prep_id IN (${placeholders})
    `).all(...prepIds) as { session_prep_id: string; npc_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.session_prep_id)) {
        map.set(row.session_prep_id, []);
      }
      map.get(row.session_prep_id)!.push(row.npc_id);
    });

    return map;
  }

  /**
   * Add NPC to prep for session
   * @param prepId - Session prep ID
   * @param npcId - NPC ID
   * @param options - Relationship options (prep_priority, prep_notes)
   */
  addNPCToPrep(
    prepId: string,
    npcId: string,
    options?: { prep_priority?: number; prep_notes?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO dm_session_prep_npcs (id, session_prep_id, npc_id, prep_priority, prep_notes, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(session_prep_id, npc_id) DO UPDATE SET
          prep_priority = COALESCE(excluded.prep_priority, prep_priority),
          prep_notes = COALESCE(excluded.prep_notes, prep_notes)
      `)
      .run(
        randomUUID(),
        prepId,
        npcId,
        options?.prep_priority || null,
        options?.prep_notes || null
      );
  }

  /**
   * Remove NPC from session prep
   * @param prepId - Session prep ID
   * @param npcId - NPC ID
   */
  removeNPCToPrep(prepId: string, npcId: string): void {
    this.db
      .prepare('DELETE FROM dm_session_prep_npcs WHERE session_prep_id = ? AND npc_id = ?')
      .run(prepId, npcId);
  }

  /**
   * Set NPCs to prep (replaces all existing relationships)
   * @param prepId - Session prep ID
   * @param npcIds - Array of NPC IDs
   */
  setNPCsToPrep(prepId: string, npcIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM dm_session_prep_npcs WHERE session_prep_id = ?').run(prepId);

    // Add new relationships
    npcIds.forEach(npcId => {
      this.addNPCToPrep(prepId, npcId);
    });
  }

  // ========================================
  // Junction Table Methods: Locations to Prep
  // ========================================

  /**
   * Get locations to prep for this session
   * @param prepId - Session prep ID
   * @returns Array of location IDs
   */
  getLocationsToPrep(prepId: string): string[] {
    const rows = this.db
      .prepare('SELECT location_id FROM dm_session_prep_locations WHERE session_prep_id = ?')
      .all(prepId) as { location_id: string }[];

    return rows.map(r => r.location_id);
  }

  /**
   * Batch fetch locations to prep for multiple session preps (N+1 query optimization)
   * @param prepIds - Array of session prep IDs
   * @returns Map of session_prep_id -> array of location IDs
   */
  protected batchGetLocationsToPrep(prepIds: string[]): Map<string, string[]> {
    if (prepIds.length === 0) return new Map();

    const placeholders = prepIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT session_prep_id, location_id
      FROM dm_session_prep_locations
      WHERE session_prep_id IN (${placeholders})
    `).all(...prepIds) as { session_prep_id: string; location_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.session_prep_id)) {
        map.set(row.session_prep_id, []);
      }
      map.get(row.session_prep_id)!.push(row.location_id);
    });

    return map;
  }

  /**
   * Add location to prep for session
   * @param prepId - Session prep ID
   * @param locationId - Location ID
   * @param options - Relationship options (prep_priority, prep_notes)
   */
  addLocationToPrep(
    prepId: string,
    locationId: string,
    options?: { prep_priority?: number; prep_notes?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO dm_session_prep_locations (id, session_prep_id, location_id, prep_priority, prep_notes, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(session_prep_id, location_id) DO UPDATE SET
          prep_priority = COALESCE(excluded.prep_priority, prep_priority),
          prep_notes = COALESCE(excluded.prep_notes, prep_notes)
      `)
      .run(
        randomUUID(),
        prepId,
        locationId,
        options?.prep_priority || null,
        options?.prep_notes || null
      );
  }

  /**
   * Remove location from session prep
   * @param prepId - Session prep ID
   * @param locationId - Location ID
   */
  removeLocationToPrep(prepId: string, locationId: string): void {
    this.db
      .prepare('DELETE FROM dm_session_prep_locations WHERE session_prep_id = ? AND location_id = ?')
      .run(prepId, locationId);
  }

  /**
   * Set locations to prep (replaces all existing relationships)
   * @param prepId - Session prep ID
   * @param locationIds - Array of location IDs
   */
  setLocationsToPrep(prepId: string, locationIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM dm_session_prep_locations WHERE session_prep_id = ?').run(prepId);

    // Add new relationships
    locationIds.forEach(locationId => {
      this.addLocationToPrep(prepId, locationId);
    });
  }

  // ========================================
  // Junction Table Methods: Quests to Advance
  // ========================================

  /**
   * Get quests to advance in this session
   * @param prepId - Session prep ID
   * @returns Array of quest IDs
   */
  getQuestsToAdvance(prepId: string): string[] {
    const rows = this.db
      .prepare('SELECT quest_id FROM dm_session_prep_quests WHERE session_prep_id = ?')
      .all(prepId) as { quest_id: string }[];

    return rows.map(r => r.quest_id);
  }

  /**
   * Batch fetch quests to advance for multiple session preps (N+1 query optimization)
   * @param prepIds - Array of session prep IDs
   * @returns Map of session_prep_id -> array of quest IDs
   */
  protected batchGetQuestsToAdvance(prepIds: string[]): Map<string, string[]> {
    if (prepIds.length === 0) return new Map();

    const placeholders = prepIds.map(() => '?').join(',');
    const rows = this.db.prepare(`
      SELECT session_prep_id, quest_id
      FROM dm_session_prep_quests
      WHERE session_prep_id IN (${placeholders})
    `).all(...prepIds) as { session_prep_id: string; quest_id: string }[];

    const map = new Map<string, string[]>();
    rows.forEach(row => {
      if (!map.has(row.session_prep_id)) {
        map.set(row.session_prep_id, []);
      }
      map.get(row.session_prep_id)!.push(row.quest_id);
    });

    return map;
  }

  /**
   * Add quest to advance in session
   * @param prepId - Session prep ID
   * @param questId - Quest ID
   * @param options - Relationship options (prep_priority, prep_notes)
   */
  addQuestToAdvance(
    prepId: string,
    questId: string,
    options?: { prep_priority?: number; prep_notes?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO dm_session_prep_quests (id, session_prep_id, quest_id, prep_priority, prep_notes, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(session_prep_id, quest_id) DO UPDATE SET
          prep_priority = COALESCE(excluded.prep_priority, prep_priority),
          prep_notes = COALESCE(excluded.prep_notes, prep_notes)
      `)
      .run(
        randomUUID(),
        prepId,
        questId,
        options?.prep_priority || null,
        options?.prep_notes || null
      );
  }

  /**
   * Remove quest from session prep
   * @param prepId - Session prep ID
   * @param questId - Quest ID
   */
  removeQuestToAdvance(prepId: string, questId: string): void {
    this.db
      .prepare('DELETE FROM dm_session_prep_quests WHERE session_prep_id = ? AND quest_id = ?')
      .run(prepId, questId);
  }

  /**
   * Set quests to advance (replaces all existing relationships)
   * @param prepId - Session prep ID
   * @param questIds - Array of quest IDs
   */
  setQuestsToAdvance(prepId: string, questIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM dm_session_prep_quests WHERE session_prep_id = ?').run(prepId);

    // Add new relationships
    questIds.forEach(questId => {
      this.addQuestToAdvance(prepId, questId);
    });
  }
}
