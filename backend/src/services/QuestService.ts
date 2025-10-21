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

  protected updateEntity(id: string, data: Partial<Quest>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') return;
      const value = (data as any)[key];
      const jsonFields = ['tags', 'custom_fields', 'objectives', 'related_npcs', 'related_locations'];
      updates.push(`${key} = ?`);
      params.push(jsonFields.includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE quests SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM quests WHERE id = ?').run(id);
  }

  findById(id: string): Quest | null {
    const row = this.db.prepare('SELECT * FROM quests WHERE id = ?').get(id);
    const jsonFields = ['tags', 'custom_fields', 'objectives', 'related_npcs', 'related_locations'];
    return row ? this.parseJsonFields(row, jsonFields) as Quest : null;
  }

  list(
    filters: QuestFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): ListResult<Quest> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
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
    return {
      data: rows.map((row) => this.parseJsonFields(row, jsonFields) as Quest),
      total: count,
    };
  }
}
