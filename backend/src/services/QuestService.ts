/**
 * QuestService - Business logic for quest operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - CRUD operations for quests with Better-SQLite3
 * - Foreign key validation (quest_giver_id → npcs, started_session_id → session_recaps, completed_session_id → session_recaps)
 * - Status enum validation ('not_started' | 'in_progress' | 'completed' | 'failed')
 * - JSON array handling (objectives, related_npcs, related_locations, tags)
 * - Campaign ownership validation
 */

import { db } from './DatabaseService';
import { Quest } from '../models/quest';
import crypto from 'crypto';

/**
 * Database row interface for quests table
 */
interface QuestRow {
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
  status: string;
  objectives: string;
  rewards: string | null;
  quest_giver_id: string | null;
  started_session_id: string | null;
  completed_session_id: string | null;
  related_npcs: string;
  related_locations: string;
  dm_true_objective: string | null;
  dm_consequences: string | null;
}

/**
 * Input interface for creating a quest
 */
export interface CreateQuestInput {
  campaignId: string;
  name: string;
  description?: string | null;
  coreStatus?: 'active' | 'archived' | 'draft' | 'hidden';
  playerKnowledge?: string | null;
  tags?: string[];
  customFields?: Record<string, any>;
  status?: 'not_started' | 'in_progress' | 'completed' | 'failed';
  objectives?: string[];
  rewards?: string | null;
  questGiverId?: string | null;
  startedSessionId?: string | null;
  completedSessionId?: string | null;
  relatedNpcs?: string[];
  relatedLocations?: string[];
  dmTrueObjective?: string | null;
  dmConsequences?: string | null;
}

/**
 * Input interface for updating a quest
 */
export interface UpdateQuestInput {
  name?: string;
  description?: string | null;
  coreStatus?: 'active' | 'archived' | 'draft' | 'hidden';
  playerKnowledge?: string | null;
  tags?: string[];
  customFields?: Record<string, any>;
  status?: 'not_started' | 'in_progress' | 'completed' | 'failed';
  objectives?: string[];
  rewards?: string | null;
  questGiverId?: string | null;
  startedSessionId?: string | null;
  completedSessionId?: string | null;
  relatedNpcs?: string[];
  relatedLocations?: string[];
  dmTrueObjective?: string | null;
  dmConsequences?: string | null;
}

export class QuestService {
  private readonly VALID_STATUSES = ['not_started', 'in_progress', 'completed', 'failed'] as const;
  private readonly VALID_CORE_STATUSES = ['active', 'archived', 'draft', 'hidden'] as const;

  /**
   * Convert database row to Quest model
   */
  private rowToQuest(row: QuestRow): Quest {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      description: row.description,
      core_status: row.core_status as 'active' | 'archived' | 'draft' | 'hidden',
      player_knowledge: row.player_knowledge,
      tags: JSON.parse(row.tags),
      created_at: row.created_at,
      updated_at: row.updated_at,
      custom_fields: JSON.parse(row.custom_fields),
      status: row.status as 'not_started' | 'in_progress' | 'completed' | 'failed',
      objectives: JSON.parse(row.objectives),
      rewards: row.rewards,
      quest_giver_id: row.quest_giver_id,
      started_session_id: row.started_session_id,
      completed_session_id: row.completed_session_id,
      related_npcs: JSON.parse(row.related_npcs),
      related_locations: JSON.parse(row.related_locations),
      dm_true_objective: row.dm_true_objective,
      dm_consequences: row.dm_consequences,
    };
  }

  /**
   * Validate quest status enum
   */
  private validateStatus(status: string): void {
    if (!this.VALID_STATUSES.includes(status as any)) {
      throw new Error(`Invalid quest status: ${status}. Must be one of: ${this.VALID_STATUSES.join(', ')}`);
    }
  }

  /**
   * Validate core status enum
   */
  private validateCoreStatus(coreStatus: string): void {
    if (!this.VALID_CORE_STATUSES.includes(coreStatus as any)) {
      throw new Error(`Invalid core status: ${coreStatus}. Must be one of: ${this.VALID_CORE_STATUSES.join(', ')}`);
    }
  }

  /**
   * Validate campaign exists and user has access
   */
  private validateCampaignAccess(campaignId: string, ownerId: string): void {
    const campaign = db
      .prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaignId, ownerId);

    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }
  }

  /**
   * Validate foreign key references
   */
  private validateForeignKeys(
    campaignId: string,
    questGiverId?: string | null,
    startedSessionId?: string | null,
    completedSessionId?: string | null
  ): void {
    // Validate quest_giver_id references npcs table
    if (questGiverId) {
      const npc = db
        .prepare('SELECT id FROM npcs WHERE id = ? AND campaign_id = ?')
        .get(questGiverId, campaignId);

      if (!npc) {
        throw new Error('Quest giver NPC not found in this campaign');
      }
    }

    // Validate started_session_id references session_recaps table
    if (startedSessionId) {
      const session = db
        .prepare('SELECT id FROM session_recaps WHERE id = ? AND campaign_id = ?')
        .get(startedSessionId, campaignId);

      if (!session) {
        throw new Error('Started session recap not found in this campaign');
      }
    }

    // Validate completed_session_id references session_recaps table
    if (completedSessionId) {
      const session = db
        .prepare('SELECT id FROM session_recaps WHERE id = ? AND campaign_id = ?')
        .get(completedSessionId, campaignId);

      if (!session) {
        throw new Error('Completed session recap not found in this campaign');
      }
    }
  }

  /**
   * Get quest by ID
   */
  getQuestById(id: string): Quest | null {
    const row = db
      .prepare('SELECT * FROM quests WHERE id = ?')
      .get(id) as QuestRow | undefined;

    return row ? this.rowToQuest(row) : null;
  }

  /**
   * Get quests by campaign ID with pagination
   */
  getQuestsByCampaign(
    campaignId: string,
    limit = 50,
    offset = 0,
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): { quests: Quest[]; total: number } {
    // Import getPlayerKnowledgeFilter inline to avoid circular deps
    const { getPlayerKnowledgeFilter } = require('../middleware/informationFilter');

    // Build WHERE clause with viewMode filtering
    const conditions: string[] = ['campaign_id = ?'];
    const params: any[] = [campaignId];

    // Apply view mode filtering
    const pkFilter = getPlayerKnowledgeFilter(viewMode);
    if (pkFilter) {
      conditions.push(`(${pkFilter})`);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM quests WHERE ${whereClause}`)
      .get(...params) as { count: number };

    // Get quests with pagination, ordered by updated_at DESC
    const rows = db
      .prepare(
        `SELECT * FROM quests WHERE ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as QuestRow[];

    return {
      quests: rows.map(row => this.rowToQuest(row)),
      total: countResult.count,
    };
  }

  /**
   * Get quests by status
   */
  getQuestsByStatus(
    campaignId: string,
    status: 'not_started' | 'in_progress' | 'completed' | 'failed',
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): Quest[] {
    this.validateStatus(status);

    // Import getPlayerKnowledgeFilter inline to avoid circular deps
    const { getPlayerKnowledgeFilter } = require('../middleware/informationFilter');

    // Build WHERE clause with viewMode filtering
    const conditions: string[] = ['campaign_id = ?', 'status = ?'];
    const params: any[] = [campaignId, status];

    // Apply view mode filtering
    const pkFilter = getPlayerKnowledgeFilter(viewMode);
    if (pkFilter) {
      conditions.push(`(${pkFilter})`);
    }

    const whereClause = conditions.join(' AND ');

    const rows = db
      .prepare(`SELECT * FROM quests WHERE ${whereClause} ORDER BY updated_at DESC`)
      .all(...params) as QuestRow[];

    return rows.map(row => this.rowToQuest(row));
  }

  /**
   * Get quests by quest giver NPC
   */
  getQuestsByQuestGiver(
    campaignId: string,
    questGiverId: string,
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): Quest[] {
    // Import getPlayerKnowledgeFilter inline to avoid circular deps
    const { getPlayerKnowledgeFilter } = require('../middleware/informationFilter');

    // Build WHERE clause with viewMode filtering
    const conditions: string[] = ['campaign_id = ?', 'quest_giver_id = ?'];
    const params: any[] = [campaignId, questGiverId];

    // Apply view mode filtering
    const pkFilter = getPlayerKnowledgeFilter(viewMode);
    if (pkFilter) {
      conditions.push(`(${pkFilter})`);
    }

    const whereClause = conditions.join(' AND ');

    const rows = db
      .prepare(`SELECT * FROM quests WHERE ${whereClause} ORDER BY updated_at DESC`)
      .all(...params) as QuestRow[];

    return rows.map(row => this.rowToQuest(row));
  }

  /**
   * Create new quest with validation
   */
  createQuest(input: CreateQuestInput, ownerId: string): Quest {
    // Validate campaign access
    this.validateCampaignAccess(input.campaignId, ownerId);

    // Validate status
    const status = input.status || 'not_started';
    this.validateStatus(status);

    // Validate core status
    const coreStatus = input.coreStatus || 'active';
    this.validateCoreStatus(coreStatus);

    // Validate foreign keys
    this.validateForeignKeys(
      input.campaignId,
      input.questGiverId,
      input.startedSessionId,
      input.completedSessionId
    );

    // Generate ID and timestamps
    const questId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Prepare JSON fields
    const tags = JSON.stringify(input.tags || []);
    const objectives = JSON.stringify(input.objectives || []);
    const relatedNpcs = JSON.stringify(input.relatedNpcs || []);
    const relatedLocations = JSON.stringify(input.relatedLocations || []);
    const customFields = JSON.stringify(input.customFields || {});

    // Insert into database
    db.prepare(`
      INSERT INTO quests (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        status, objectives, rewards,
        quest_giver_id, started_session_id, completed_session_id,
        related_npcs, related_locations,
        dm_true_objective, dm_consequences
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      questId,
      input.campaignId,
      input.name,
      input.description || null,
      coreStatus,
      input.playerKnowledge || 'common_knowledge',
      tags,
      now,
      now,
      customFields,
      status,
      objectives,
      input.rewards || null,
      input.questGiverId || null,
      input.startedSessionId || null,
      input.completedSessionId || null,
      relatedNpcs,
      relatedLocations,
      input.dmTrueObjective || null,
      input.dmConsequences || null
    );

    const createdRow = db
      .prepare('SELECT * FROM quests WHERE id = ?')
      .get(questId) as QuestRow;

    return this.rowToQuest(createdRow);
  }

  /**
   * Update quest with validation
   */
  updateQuest(id: string, input: UpdateQuestInput, ownerId: string): Quest {
    // Get existing quest and validate ownership
    const existing = db
      .prepare(`
        SELECT q.* FROM quests q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE q.id = ? AND c.owner_id = ?
      `)
      .get(id, ownerId) as QuestRow | undefined;

    if (!existing) {
      throw new Error('Quest not found or access denied');
    }

    // Validate status if provided
    if (input.status !== undefined) {
      this.validateStatus(input.status);
    }

    // Validate core status if provided
    if (input.coreStatus !== undefined) {
      this.validateCoreStatus(input.coreStatus);
    }

    // Validate foreign keys if provided
    if (
      input.questGiverId !== undefined ||
      input.startedSessionId !== undefined ||
      input.completedSessionId !== undefined
    ) {
      this.validateForeignKeys(
        existing.campaign_id,
        input.questGiverId !== undefined ? input.questGiverId : existing.quest_giver_id,
        input.startedSessionId !== undefined ? input.startedSessionId : existing.started_session_id,
        input.completedSessionId !== undefined ? input.completedSessionId : existing.completed_session_id
      );
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    if (input.coreStatus !== undefined) {
      updates.push('core_status = ?');
      values.push(input.coreStatus);
    }

    if (input.playerKnowledge !== undefined) {
      updates.push('player_knowledge = ?');
      values.push(input.playerKnowledge);
    }

    if (input.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(input.tags));
    }

    if (input.customFields !== undefined) {
      updates.push('custom_fields = ?');
      values.push(JSON.stringify(input.customFields));
    }

    if (input.status !== undefined) {
      updates.push('status = ?');
      values.push(input.status);
    }

    if (input.objectives !== undefined) {
      updates.push('objectives = ?');
      values.push(JSON.stringify(input.objectives));
    }

    if (input.rewards !== undefined) {
      updates.push('rewards = ?');
      values.push(input.rewards);
    }

    if (input.questGiverId !== undefined) {
      updates.push('quest_giver_id = ?');
      values.push(input.questGiverId);
    }

    if (input.startedSessionId !== undefined) {
      updates.push('started_session_id = ?');
      values.push(input.startedSessionId);
    }

    if (input.completedSessionId !== undefined) {
      updates.push('completed_session_id = ?');
      values.push(input.completedSessionId);
    }

    if (input.relatedNpcs !== undefined) {
      updates.push('related_npcs = ?');
      values.push(JSON.stringify(input.relatedNpcs));
    }

    if (input.relatedLocations !== undefined) {
      updates.push('related_locations = ?');
      values.push(JSON.stringify(input.relatedLocations));
    }

    if (input.dmTrueObjective !== undefined) {
      updates.push('dm_true_objective = ?');
      values.push(input.dmTrueObjective);
    }

    if (input.dmConsequences !== undefined) {
      updates.push('dm_consequences = ?');
      values.push(input.dmConsequences);
    }

    // Always update updated_at
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);

    // Add id to values for WHERE clause
    values.push(id);

    // Execute update
    db.prepare(`UPDATE quests SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updatedRow = db
      .prepare('SELECT * FROM quests WHERE id = ?')
      .get(id) as QuestRow;

    return this.rowToQuest(updatedRow);
  }

  /**
   * Delete quest
   */
  deleteQuest(id: string, ownerId: string): void {
    // Validate ownership
    const quest = db
      .prepare(`
        SELECT q.id FROM quests q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE q.id = ? AND c.owner_id = ?
      `)
      .get(id, ownerId);

    if (!quest) {
      throw new Error('Quest not found or access denied');
    }

    const result = db.prepare('DELETE FROM quests WHERE id = ?').run(id);

    if (result.changes === 0) {
      throw new Error('Quest not found');
    }
  }

  /**
   * Check if user owns quest (via campaign ownership)
   */
  isOwner(questId: string, userId: string): boolean {
    const quest = db
      .prepare(`
        SELECT q.id FROM quests q
        JOIN campaigns c ON q.campaign_id = c.id
        WHERE q.id = ? AND c.owner_id = ?
      `)
      .get(questId, userId);

    return !!quest;
  }

  /**
   * Get quests related to a specific NPC (as related_npcs JSON array member)
   */
  getQuestsRelatedToNpc(
    campaignId: string,
    npcId: string,
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): Quest[] {
    // Import getPlayerKnowledgeFilter inline to avoid circular deps
    const { getPlayerKnowledgeFilter } = require('../middleware/informationFilter');

    // Build WHERE clause with viewMode filtering
    const conditions: string[] = [
      'campaign_id = ?',
      '(quest_giver_id = ? OR json_extract(related_npcs, \'$\') LIKE ?)'
    ];
    const params: any[] = [campaignId, npcId, `%"${npcId}"%`];

    // Apply view mode filtering
    const pkFilter = getPlayerKnowledgeFilter(viewMode);
    if (pkFilter) {
      conditions.push(`(${pkFilter})`);
    }

    const whereClause = conditions.join(' AND ');

    // SQLite JSON1 extension query for array membership
    const rows = db
      .prepare(`
        SELECT * FROM quests
        WHERE ${whereClause}
        ORDER BY updated_at DESC
      `)
      .all(...params) as QuestRow[];

    return rows.map(row => this.rowToQuest(row));
  }

  /**
   * Get quests related to a specific location (as related_locations JSON array member)
   */
  getQuestsRelatedToLocation(
    campaignId: string,
    locationId: string,
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): Quest[] {
    // Import getPlayerKnowledgeFilter inline to avoid circular deps
    const { getPlayerKnowledgeFilter } = require('../middleware/informationFilter');

    // Build WHERE clause with viewMode filtering
    const conditions: string[] = [
      'campaign_id = ?',
      'json_extract(related_locations, \'$\') LIKE ?'
    ];
    const params: any[] = [campaignId, `%"${locationId}"%`];

    // Apply view mode filtering
    const pkFilter = getPlayerKnowledgeFilter(viewMode);
    if (pkFilter) {
      conditions.push(`(${pkFilter})`);
    }

    const whereClause = conditions.join(' AND ');

    // SQLite JSON1 extension query for array membership
    const rows = db
      .prepare(`
        SELECT * FROM quests
        WHERE ${whereClause}
        ORDER BY updated_at DESC
      `)
      .all(...params) as QuestRow[];

    return rows.map(row => this.rowToQuest(row));
  }

  /**
   * Get quests related to a specific session recap
   */
  getQuestsRelatedToSession(
    campaignId: string,
    sessionId: string,
    viewMode: 'dm_view' | 'player_view' = 'dm_view'
  ): Quest[] {
    // Import getPlayerKnowledgeFilter inline to avoid circular deps
    const { getPlayerKnowledgeFilter } = require('../middleware/informationFilter');

    // Build WHERE clause with viewMode filtering
    const conditions: string[] = [
      'campaign_id = ?',
      '(started_session_id = ? OR completed_session_id = ?)'
    ];
    const params: any[] = [campaignId, sessionId, sessionId];

    // Apply view mode filtering
    const pkFilter = getPlayerKnowledgeFilter(viewMode);
    if (pkFilter) {
      conditions.push(`(${pkFilter})`);
    }

    const whereClause = conditions.join(' AND ');

    const rows = db
      .prepare(`
        SELECT * FROM quests
        WHERE ${whereClause}
        ORDER BY updated_at DESC
      `)
      .all(...params) as QuestRow[];

    return rows.map(row => this.rowToQuest(row));
  }
}
