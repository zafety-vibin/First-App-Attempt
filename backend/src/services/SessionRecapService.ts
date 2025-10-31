/**
 * SessionRecapService - Business logic for session recap operations (standardized)
 * Feature: 014-create-the-database
 *
 * Extends BaseCategoryService for:
 * - Standard CRUD with universal field handling
 * - Junction table relationships (recap_npcs_encountered, recap_locations_visited, recap_quests_progressed, recap_loot_acquired)
 * - Session number validation
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { SessionRecap } from '../models/sessionRecap';

export interface SessionRecapFilters extends EntityFilters {
  session_number?: number;
}

export class SessionRecapService extends BaseCategoryService<SessionRecap> {
  constructor(db: Database.Database) {
    super(db, 'session_recaps');
  }

  /**
   * Category-specific validation for session recaps
   */
  protected validateCategoryFields(data: Partial<SessionRecap>, options?: OperationOptions): void {
    if (data.session_number !== undefined && data.session_number < 1) {
      throw new Error('session_number must be at least 1');
    }
  }

  /**
   * Insert session recap into database
   */
  protected insertEntity(data: SessionRecap): void {
    this.db.prepare(`
      INSERT INTO session_recaps (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        session_number, session_date, in_game_date_start, in_game_date_end,
        time_passed, summary, key_events, player_decisions,
        npcs_encountered, locations_visited, quests_progressed, loot_acquired,
        dm_consequences, dm_behind_scenes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.session_number, data.session_date || null,
      data.in_game_date_start || null, data.in_game_date_end || null, data.time_passed || null,
      data.summary || null, data.key_events || null, data.player_decisions || null,
      JSON.stringify(data.npcs_encountered || []), JSON.stringify(data.locations_visited || []),
      JSON.stringify(data.quests_progressed || []), JSON.stringify(data.loot_acquired || []),
      data.dm_consequences || null, data.dm_behind_scenes || null
    );
  }

  /**
   * Update session recap in database
   */
  protected updateEntity(id: string, data: Partial<SessionRecap>): void {
    // Handle junction table relationships separately
    if ('npcs_encountered' in data && Array.isArray(data.npcs_encountered)) {
      this.setEncounteredNPCs(id, data.npcs_encountered);
      const { npcs_encountered, ...restData } = data;
      data = restData as Partial<SessionRecap>;
    }

    if ('locations_visited' in data && Array.isArray(data.locations_visited)) {
      this.setVisitedLocations(id, data.locations_visited);
      const { locations_visited, ...restData } = data;
      data = restData as Partial<SessionRecap>;
    }

    if ('quests_progressed' in data && Array.isArray(data.quests_progressed)) {
      this.setProgressedQuests(id, data.quests_progressed);
      const { quests_progressed, ...restData } = data;
      data = restData as Partial<SessionRecap>;
    }

    if ('loot_acquired' in data && Array.isArray(data.loot_acquired)) {
      this.setLoot(id, data.loot_acquired);
      const { loot_acquired, ...restData } = data;
      data = restData as Partial<SessionRecap>;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof SessionRecap)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'session_number', 'session_date', 'in_game_date_start',
      'in_game_date_end', 'time_passed', 'summary', 'key_events', 'player_decisions',
      'dm_consequences', 'dm_behind_scenes',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields (removed 'npcs_encountered', 'locations_visited', 'quests_progressed', 'loot_acquired' - now in junction tables)
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
      UPDATE session_recaps
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  /**
   * Delete session recap from database
   */
  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM session_recaps WHERE id = ?').run(id);
  }

  /**
   * Find session recap by ID
   */
  findById(id: string): SessionRecap | null {
    const row = this.db.prepare('SELECT * FROM session_recaps WHERE id = ?').get(id);
    return row ? this.rowToSessionRecap(row as any) : null;
  }

  /**
   * List session recaps with filters and pagination
   */
  list(
    filters: SessionRecapFilters,
    pagination: Pagination,
    sortBy: string = 'session_number',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<SessionRecap> {
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

    if (filters.session_number) {
      whereClauses.push('session_number = ?');
      params.push(filters.session_number);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM session_recaps ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };

    // Fetch data
    const dataStmt = this.db.prepare(`
      SELECT * FROM session_recaps
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `);

    const rows = dataStmt.all(...params, pagination.limit, pagination.offset);

    return {
      data: rows.map((row) => this.rowToSessionRecap(row as any)),
      total: count,
    };
  }

  /**
   * Convert database row to SessionRecap model
   */
  private rowToSessionRecap(row: any): SessionRecap {
    return this.parseJsonFields(row, ['tags', 'custom_fields', 'npcs_encountered', 'locations_visited', 'quests_progressed', 'loot_acquired']) as SessionRecap;
  }

  // ========================================
  // Junction Table Methods: NPCs Encountered
  // ========================================

  /**
   * Get NPCs encountered in this session recap
   * @param recapId - Session recap ID
   * @returns Array of NPC IDs
   */
  getNPCsEncountered(recapId: string): string[] {
    const rows = this.db
      .prepare('SELECT npc_id FROM recap_npcs_encountered WHERE recap_id = ?')
      .all(recapId) as { npc_id: string }[];

    return rows.map(r => r.npc_id);
  }

  /**
   * Add encountered NPC to session recap
   * @param recapId - Session recap ID
   * @param npcId - NPC ID
   * @param options - Relationship options (interaction_type, importance_to_session)
   */
  addEncounteredNPC(
    recapId: string,
    npcId: string,
    options?: { interaction_type?: string; importance_to_session?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO recap_npcs_encountered (id, recap_id, npc_id, interaction_type, importance_to_session, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(recap_id, npc_id) DO UPDATE SET
          interaction_type = COALESCE(excluded.interaction_type, interaction_type),
          importance_to_session = COALESCE(excluded.importance_to_session, importance_to_session),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        recapId,
        npcId,
        options?.interaction_type || null,
        options?.importance_to_session || null
      );
  }

  /**
   * Remove encountered NPC from session recap
   * @param recapId - Session recap ID
   * @param npcId - NPC ID
   */
  removeEncounteredNPC(recapId: string, npcId: string): void {
    this.db
      .prepare('DELETE FROM recap_npcs_encountered WHERE recap_id = ? AND npc_id = ?')
      .run(recapId, npcId);
  }

  /**
   * Set encountered NPCs (replaces all existing relationships)
   * @param recapId - Session recap ID
   * @param npcIds - Array of NPC IDs
   */
  setEncounteredNPCs(recapId: string, npcIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM recap_npcs_encountered WHERE recap_id = ?').run(recapId);

    // Add new relationships
    npcIds.forEach(npcId => {
      this.addEncounteredNPC(recapId, npcId);
    });
  }

  // ========================================
  // Junction Table Methods: Locations Visited
  // ========================================

  /**
   * Get locations visited in this session recap
   * @param recapId - Session recap ID
   * @returns Array of location IDs
   */
  getLocationsVisited(recapId: string): string[] {
    const rows = this.db
      .prepare('SELECT location_id FROM recap_locations_visited WHERE recap_id = ?')
      .all(recapId) as { location_id: string }[];

    return rows.map(r => r.location_id);
  }

  /**
   * Add visited location to session recap
   * @param recapId - Session recap ID
   * @param locationId - Location ID
   * @param options - Relationship options (duration_in_location, events_at_location)
   */
  addVisitedLocation(
    recapId: string,
    locationId: string,
    options?: { duration_in_location?: string; events_at_location?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO recap_locations_visited (id, recap_id, location_id, duration_in_location, events_at_location, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(recap_id, location_id) DO UPDATE SET
          duration_in_location = COALESCE(excluded.duration_in_location, duration_in_location),
          events_at_location = COALESCE(excluded.events_at_location, events_at_location),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        recapId,
        locationId,
        options?.duration_in_location || null,
        options?.events_at_location || null
      );
  }

  /**
   * Remove visited location from session recap
   * @param recapId - Session recap ID
   * @param locationId - Location ID
   */
  removeVisitedLocation(recapId: string, locationId: string): void {
    this.db
      .prepare('DELETE FROM recap_locations_visited WHERE recap_id = ? AND location_id = ?')
      .run(recapId, locationId);
  }

  /**
   * Set visited locations (replaces all existing relationships)
   * @param recapId - Session recap ID
   * @param locationIds - Array of location IDs
   */
  setVisitedLocations(recapId: string, locationIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM recap_locations_visited WHERE recap_id = ?').run(recapId);

    // Add new relationships
    locationIds.forEach(locationId => {
      this.addVisitedLocation(recapId, locationId);
    });
  }

  // ========================================
  // Junction Table Methods: Quests Progressed
  // ========================================

  /**
   * Get quests progressed in this session recap
   * @param recapId - Session recap ID
   * @returns Array of quest IDs
   */
  getQuestsProgressed(recapId: string): string[] {
    const rows = this.db
      .prepare('SELECT quest_id FROM recap_quests_progressed WHERE recap_id = ?')
      .all(recapId) as { quest_id: string }[];

    return rows.map(r => r.quest_id);
  }

  /**
   * Add progressed quest to session recap
   * @param recapId - Session recap ID
   * @param questId - Quest ID
   * @param options - Relationship options (progress_type, progress_notes)
   */
  addProgressedQuest(
    recapId: string,
    questId: string,
    options?: { progress_type?: string; progress_notes?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO recap_quests_progressed (id, recap_id, quest_id, progress_type, progress_notes, created_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(recap_id, quest_id) DO UPDATE SET
          progress_type = COALESCE(excluded.progress_type, progress_type),
          progress_notes = COALESCE(excluded.progress_notes, progress_notes),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        recapId,
        questId,
        options?.progress_type || null,
        options?.progress_notes || null
      );
  }

  /**
   * Remove progressed quest from session recap
   * @param recapId - Session recap ID
   * @param questId - Quest ID
   */
  removeProgressedQuest(recapId: string, questId: string): void {
    this.db
      .prepare('DELETE FROM recap_quests_progressed WHERE recap_id = ? AND quest_id = ?')
      .run(recapId, questId);
  }

  /**
   * Set progressed quests (replaces all existing relationships)
   * @param recapId - Session recap ID
   * @param questIds - Array of quest IDs
   */
  setProgressedQuests(recapId: string, questIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM recap_quests_progressed WHERE recap_id = ?').run(recapId);

    // Add new relationships
    questIds.forEach(questId => {
      this.addProgressedQuest(recapId, questId);
    });
  }

  // ========================================
  // Junction Table Methods: Loot Acquired
  // ========================================

  /**
   * Get loot acquired in this session recap
   * @param recapId - Session recap ID
   * @returns Array of item IDs
   */
  getLootAcquired(recapId: string): string[] {
    const rows = this.db
      .prepare('SELECT item_id FROM recap_loot_acquired WHERE recap_id = ?')
      .all(recapId) as { item_id: string }[];

    return rows.map(r => r.item_id);
  }

  /**
   * Add loot to session recap
   * @param recapId - Session recap ID
   * @param itemId - Item ID
   * @param options - Relationship options (acquired_by_pc_id, acquisition_method, circumstances)
   */
  addLoot(
    recapId: string,
    itemId: string,
    options?: { acquired_by_pc_id?: string; acquisition_method?: string; circumstances?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO recap_loot_acquired (id, recap_id, item_id, acquired_by_pc_id, acquisition_method, circumstances, created_at)
        VALUES (?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(recap_id, item_id) DO UPDATE SET
          acquired_by_pc_id = COALESCE(excluded.acquired_by_pc_id, acquired_by_pc_id),
          acquisition_method = COALESCE(excluded.acquisition_method, acquisition_method),
          circumstances = COALESCE(excluded.circumstances, circumstances),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        recapId,
        itemId,
        options?.acquired_by_pc_id || null,
        options?.acquisition_method || null,
        options?.circumstances || null
      );
  }

  /**
   * Remove loot from session recap
   * @param recapId - Session recap ID
   * @param itemId - Item ID
   */
  removeLoot(recapId: string, itemId: string): void {
    this.db
      .prepare('DELETE FROM recap_loot_acquired WHERE recap_id = ? AND item_id = ?')
      .run(recapId, itemId);
  }

  /**
   * Set loot (replaces all existing relationships)
   * @param recapId - Session recap ID
   * @param itemIds - Array of item IDs
   */
  setLoot(recapId: string, itemIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM recap_loot_acquired WHERE recap_id = ?').run(recapId);

    // Add new relationships
    itemIds.forEach(itemId => {
      this.addLoot(recapId, itemId);
    });
  }
}
