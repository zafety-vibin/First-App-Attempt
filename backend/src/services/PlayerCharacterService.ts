/**
 * PlayerCharacterService - Business logic for player character operations (standardized)
 * Feature: 014-create-the-database
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { PlayerCharacter } from '../models/playerCharacter';

export interface PlayerCharacterFilters extends EntityFilters {
  player_name?: string;
}

export class PlayerCharacterService extends BaseCategoryService<PlayerCharacter> {
  constructor(db: Database.Database) {
    super(db, 'player_characters');
  }

  protected validateCategoryFields(data: Partial<PlayerCharacter>, options?: OperationOptions): void {
    if (data.level !== undefined && data.level !== null && data.level < 1) {
      throw new Error('level must be at least 1');
    }
  }

  protected insertEntity(data: PlayerCharacter): void {
    this.db.prepare(`
      INSERT INTO player_characters (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        player_name, class, level, race, background, personality, goals,
        backstory, faction_affiliations, allied_npcs,
        dm_secrets, dm_plot_threads, dm_true_motivation, dm_consequences
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, data.campaign_id, data.name, data.description, data.core_status,
      data.player_knowledge, JSON.stringify(data.tags), data.created_at, data.updated_at,
      JSON.stringify(data.custom_fields), data.player_name || null, JSON.stringify(data.class || []),
      data.level || null, data.race || null, data.background || null, data.personality || null,
      data.goals || null, data.backstory || null, JSON.stringify(data.faction_affiliations || []),
      JSON.stringify(data.allied_npcs || []), data.dm_secrets || null, data.dm_plot_threads || null,
      data.dm_true_motivation || null, data.dm_consequences || null
    );
  }

  protected updateEntity(id: string, data: Partial<PlayerCharacter>): void {
    const updates: string[] = [];
    const params: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') return;
      const value = (data as any)[key];
      const jsonFields = ['tags', 'custom_fields', 'class', 'faction_affiliations', 'allied_npcs'];
      updates.push(`${key} = ?`);
      params.push(jsonFields.includes(key) ? JSON.stringify(value) : value);
    });

    if (updates.length === 0) return;

    params.push(id);
    this.db.prepare(`UPDATE player_characters SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM player_characters WHERE id = ?').run(id);
  }

  findById(id: string): PlayerCharacter | null {
    const row = this.db.prepare('SELECT * FROM player_characters WHERE id = ?').get(id);
    const jsonFields = ['tags', 'custom_fields', 'class', 'faction_affiliations', 'allied_npcs'];
    return row ? this.parseJsonFields(row, jsonFields) as PlayerCharacter : null;
  }

  list(
    filters: PlayerCharacterFilters,
    pagination: Pagination,
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): ListResult<PlayerCharacter> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
    }
    if (filters.player_name) {
      whereClauses.push('player_name = ?');
      params.push(filters.player_name);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const { count } = this.db.prepare(`SELECT COUNT(*) as count FROM player_characters ${whereClause}`).get(...params) as { count: number };
    const rows = this.db.prepare(`SELECT * FROM player_characters ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`).all(...params, pagination.limit, pagination.offset);

    const jsonFields = ['tags', 'custom_fields', 'class', 'faction_affiliations', 'allied_npcs'];
    return {
      data: rows.map((row) => this.parseJsonFields(row, jsonFields) as PlayerCharacter),
      total: count,
    };
  }
}
