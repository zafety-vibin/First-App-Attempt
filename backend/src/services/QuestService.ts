/**
 * QuestService - Business logic for quest operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { Quest } from '../models/quest';

export interface QuestFilters extends EntityFilters {
  status?: string;
  quest_giver_id?: string;
}

export class QuestService extends BaseCategoryService<Quest> {
  constructor(db: Database.Database) {
    super(db, 'quests');
  }

  protected validateCategoryFields(data: Partial<Quest>, options?: OperationOptions): void {
    // Validate quest_giver_id FK
    if (data.quest_giver_id) {
      const npc = this.db.prepare('SELECT id FROM npcs WHERE id = ?').get(data.quest_giver_id);
      if (!npc) {
        throw new Error('quest_giver_id references non-existent NPC');
      }
    }
  }

  protected insertEntity(data: Quest): void {
    this.db.prepare(`
      INSERT INTO quests (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        status, objectives, rewards, quest_giver_id, started_session_id,
        completed_session_id, related_npcs, related_locations, faction_id,
        dm_true_objective, dm_consequences
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.status || null, JSON.stringify(data.objectives || []),
      data.rewards || null, data.quest_giver_id || null, data.started_session_id || null,
      data.completed_session_id || null, JSON.stringify(data.related_npcs || []),
      JSON.stringify(data.related_locations || []), data.faction_id || null,
      data.dm_true_objective || null, data.dm_consequences || null
    );
  }

  /**
   * Get quest related NPCs from junction table
   * @param questId - Quest ID
   * @returns Array of NPC IDs
   */
  getRelatedNPCs(questId: string): string[] {
    const rows = this.db
      .prepare('SELECT npc_id FROM quest_related_npcs WHERE quest_id = ?')
      .all(questId) as { npc_id: string }[];

    return rows.map(r => r.npc_id);
  }

  /**
   * Add related NPC to quest
   * @param questId - Quest ID
   * @param npcId - NPC ID
   * @param options - Relationship options (role_in_quest)
   */
  addRelatedNPC(
    questId: string,
    npcId: string,
    options?: { role_in_quest?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO quest_related_npcs (id, quest_id, npc_id, role_in_quest, created_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(quest_id, npc_id) DO UPDATE SET
          role_in_quest = COALESCE(excluded.role_in_quest, role_in_quest),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        questId,
        npcId,
        options?.role_in_quest || null
      );
  }

  /**
   * Remove related NPC from quest
   * @param questId - Quest ID
   * @param npcId - NPC ID
   */
  removeRelatedNPC(questId: string, npcId: string): void {
    this.db
      .prepare('DELETE FROM quest_related_npcs WHERE quest_id = ? AND npc_id = ?')
      .run(questId, npcId);
  }

  /**
   * Set quest related NPCs (replaces all existing relationships)
   * @param questId - Quest ID
   * @param npcIds - Array of NPC IDs
   */
  setRelatedNPCs(questId: string, npcIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM quest_related_npcs WHERE quest_id = ?').run(questId);

    // Add new relationships
    npcIds.forEach(npcId => {
      this.addRelatedNPC(questId, npcId);
    });
  }

  /**
   * Get quest related locations from junction table
   * @param questId - Quest ID
   * @returns Array of location IDs
   */
  getRelatedLocations(questId: string): string[] {
    const rows = this.db
      .prepare('SELECT location_id FROM quest_related_locations WHERE quest_id = ?')
      .all(questId) as { location_id: string }[];

    return rows.map(r => r.location_id);
  }

  /**
   * Add related location to quest
   * @param questId - Quest ID
   * @param locationId - Location ID
   * @param options - Relationship options (location_role)
   */
  addRelatedLocation(
    questId: string,
    locationId: string,
    options?: { location_role?: string }
  ): void {
    const { randomUUID } = require('crypto');

    this.db
      .prepare(`
        INSERT INTO quest_related_locations (id, quest_id, location_id, location_role, created_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(quest_id, location_id) DO UPDATE SET
          location_role = COALESCE(excluded.location_role, location_role),
          updated_at = strftime('%s', 'now')
      `)
      .run(
        randomUUID(),
        questId,
        locationId,
        options?.location_role || null
      );
  }

  /**
   * Remove related location from quest
   * @param questId - Quest ID
   * @param locationId - Location ID
   */
  removeRelatedLocation(questId: string, locationId: string): void {
    this.db
      .prepare('DELETE FROM quest_related_locations WHERE quest_id = ? AND location_id = ?')
      .run(questId, locationId);
  }

  /**
   * Set quest related locations (replaces all existing relationships)
   * @param questId - Quest ID
   * @param locationIds - Array of location IDs
   */
  setRelatedLocations(questId: string, locationIds: string[]): void {
    // Remove all existing relationships
    this.db.prepare('DELETE FROM quest_related_locations WHERE quest_id = ?').run(questId);

    // Add new relationships
    locationIds.forEach(locationId => {
      this.addRelatedLocation(questId, locationId);
    });
  }

  protected updateEntity(id: string, data: Partial<Quest>): void {
    // Handle junction table relationships separately
    if ('related_npcs' in data && Array.isArray(data.related_npcs)) {
      this.setRelatedNPCs(id, data.related_npcs);
      const { related_npcs, ...restData } = data;
      data = restData as Partial<Quest>;
    }

    if ('related_locations' in data && Array.isArray(data.related_locations)) {
      this.setRelatedLocations(id, data.related_locations);
      const { related_locations, ...restData } = data;
      data = restData as Partial<Quest>;
    }

    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof Quest)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'status', 'objectives', 'rewards', 'quest_giver_id',
      'started_session_id', 'completed_session_id', 'faction_id',
      'dm_true_objective', 'dm_consequences',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields (removed 'related_npcs', 'related_locations' - now in junction tables)
        if (['tags', 'custom_fields', 'objectives'].includes(field)) {
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
      UPDATE quests
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM quests WHERE id = ?').run(id);
  }

  findById(id: string): Quest | null {
    const row = this.db.prepare('SELECT * FROM quests WHERE id = ?').get(id);
    if (!row) return null;

    const jsonFields = ['tags', 'custom_fields', 'objectives', 'related_npcs', 'related_locations'];
    const quest = this.parseJsonFields(row, jsonFields) as Quest;

    // Populate relationships from junction tables
    quest.related_npcs = this.getRelatedNPCs(id);
    quest.related_locations = this.getRelatedLocations(id);

    return quest;
  }

  list(
    filters: QuestFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): ListResult<Quest> {
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

    if (filters.status) {
      whereClauses.push('status = ?');
      params.push(filters.status);
    }
    if (filters.quest_giver_id) {
      whereClauses.push('quest_giver_id = ?');
      params.push(filters.quest_giver_id);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM quests ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM quests ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    const jsonFields = ['tags', 'custom_fields', 'objectives', 'related_npcs', 'related_locations'];

    // Populate relationships from junction tables for each quest
    const quests = rows.map((row) => {
      const quest = this.parseJsonFields(row, jsonFields) as Quest;
      quest.related_npcs = this.getRelatedNPCs(quest.id);
      quest.related_locations = this.getRelatedLocations(quest.id);
      return quest;
    });

    return {
      data: quests,
      total: count,
    };
  }
}
