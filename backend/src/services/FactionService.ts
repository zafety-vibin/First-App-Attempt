/**
 * FactionService - Business logic for faction operations
 * Feature: 014-create-the-database (standardized)
 *
 * Implements:
 * - Standard CRUD operations via BaseCategoryService
 * - Foreign key validation (leader_id → npcs.id)
 * - JSON array handling (key_members, allied_factions, rival_factions, territory)
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
    const updates: string[] = [];
    const values: any[] = [];

    // Build dynamic UPDATE query for provided fields
    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') {
        return; // Skip immutable fields
      }

      const value = (data as any)[key];

      // Handle JSON fields
      if (['tags', 'key_members', 'allied_factions', 'rival_factions', 'territory', 'custom_fields'].includes(key)) {
        updates.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return;
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE factions
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
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

    return row ? this.rowToFaction(row) : null;
  }

  /**
   * List factions with filters and pagination
   */
  list(
    filters: EntityFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
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

    if (filters.player_knowledge) {
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

    return {
      data: rows.map((row) => this.rowToFaction(row)),
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
}
