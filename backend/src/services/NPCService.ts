/**
 * NPCService - Business logic for NPC operations (standardized)
 * Feature: 014-create-the-database
 *
 * Extends BaseCategoryService for:
 * - Standard CRUD with universal field handling
 * - FK validation (faction_id, superior_npc_id)
 * - Circular hierarchy detection for superior chain
 * - JSON field handling (class, locations, tags, custom_fields)
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { NPC } from '../models/npc';

export interface NPCFilters extends EntityFilters {
  faction_id?: string;
  superior_npc_id?: string;
}

export class NPCService extends BaseCategoryService<NPC> {
  constructor(db: Database.Database) {
    super(db, 'npcs');
  }

  /**
   * Category-specific validation for NPCs
   */
  protected validateCategoryFields(data: Partial<NPC>, options?: OperationOptions): void {
    // Validate level minimum
    if (data.level !== undefined && data.level !== null && data.level < 1) {
      throw new Error('level must be at least 1');
    }

    // Validate name length
    if (data.name && data.name.length > 255) {
      throw new Error('name must be 255 characters or less');
    }

    // Validate faction_id FK
    if (data.faction_id) {
      const faction = this.db.prepare('SELECT id FROM factions WHERE id = ?').get(data.faction_id);
      if (!faction) {
        throw new Error('faction_id references non-existent faction');
      }
    }

    // Validate superior_npc_id FK and check circular hierarchy
    if (data.superior_npc_id) {
      if (data.superior_npc_id === data.id) {
        throw new Error('NPC cannot be its own superior');
      }

      const superior = this.db.prepare('SELECT id FROM npcs WHERE id = ?').get(data.superior_npc_id);
      if (!superior) {
        throw new Error('superior_npc_id references non-existent NPC');
      }

      // Check for circular hierarchy
      if (data.id) {
        this.validateNoCircularHierarchy(data.id, data.superior_npc_id);
      }
    }
  }

  /**
   * Insert NPC into database
   */
  protected insertEntity(data: NPC): void {
    const stmt = this.db.prepare(`
      INSERT INTO npcs (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        race, class, level, alignment, appearance, personality_traits,
        motivation, relationship_to_party, met_party, art,
        faction_id, superior_npc_id, locations,
        dm_secrets, dm_plot_relevance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.race || null,
      JSON.stringify(data.class || []),
      data.level || null,
      data.alignment || null,
      data.appearance || null,
      data.personality_traits || null,
      data.motivation || null,
      data.relationship_to_party || null,
      data.met_party || 0,
      data.art || null,
      data.faction_id || null,
      data.superior_npc_id || null,
      JSON.stringify(data.locations || []),
      data.dm_secrets || null,
      data.dm_plot_relevance || null
    );
  }

  /**
   * Update NPC in database
   */
  protected updateEntity(id: string, data: Partial<NPC>): void {
    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof NPC)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'race', 'class', 'level', 'alignment', 'appearance',
      'personality_traits', 'motivation', 'relationship_to_party', 'met_party',
      'art', 'faction_id', 'superior_npc_id', 'locations', 'dm_secrets', 'dm_plot_relevance',
      'updated_at' // CRITICAL: Include updated_at to ensure timestamp refresh
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields
        if (['tags', 'custom_fields', 'class', 'locations'].includes(field)) {
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
      UPDATE npcs
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);
  }

  /**
   * Delete NPC from database
   */
  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM npcs WHERE id = ?').run(id);
  }

  /**
   * Find NPC by ID
   */
  findById(id: string): NPC | null {
    const row = this.db.prepare('SELECT * FROM npcs WHERE id = ?').get(id);
    if (!row) {
      return null;
    }
    return this.rowToNPC(row as any);
  }

  /**
   * List NPCs with filters and pagination
   */
  list(
    filters: NPCFilters,
    pagination: Pagination,
    sortBy: 'created_at' | 'updated_at' | 'name' = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): ListResult<NPC> {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters.campaign_id) {
      whereClauses.push('campaign_id = ?');
      params.push(filters.campaign_id);
    }

    if (filters.core_status) {
      whereClauses.push('core_status = ?');
      params.push(filters.core_status);
    }

    if (filters.player_knowledge) {
      whereClauses.push('player_knowledge = ?');
      params.push(filters.player_knowledge);
    }

    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(() => `tags LIKE ?`).join(' OR ');
      whereClauses.push(`(${tagConditions})`);
      filters.tags.forEach((tag) => {
        params.push(`%"${tag}"%`);
      });
    }

    // Category-specific filters
    if (filters.faction_id) {
      whereClauses.push('faction_id = ?');
      params.push(filters.faction_id);
    }

    if (filters.superior_npc_id !== undefined) {
      if (filters.superior_npc_id === null) {
        whereClauses.push('superior_npc_id IS NULL');
      } else {
        whereClauses.push('superior_npc_id = ?');
        params.push(filters.superior_npc_id);
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM npcs ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };

    // Fetch data
    const dataStmt = this.db.prepare(`
      SELECT * FROM npcs
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `);

    const rows = dataStmt.all(...params, pagination.limit, pagination.offset);

    return {
      data: rows.map((row) => this.rowToNPC(row as any)),
      total: count,
    };
  }

  /**
   * Validate no circular hierarchy in superior chain
   */
  private validateNoCircularHierarchy(npcId: string, superiorId: string): void {
    const visited = new Set<string>([npcId]);
    let currentId: string | null = superiorId;

    while (currentId) {
      if (visited.has(currentId)) {
        throw new Error('Circular reference detected in NPC hierarchy');
      }

      visited.add(currentId);

      const superior = this.db
        .prepare('SELECT superior_npc_id FROM npcs WHERE id = ?')
        .get(currentId) as { superior_npc_id: string | null } | undefined;

      currentId = superior?.superior_npc_id || null;
    }
  }

  /**
   * Convert database row to NPC model
   */
  private rowToNPC(row: any): NPC {
    return this.parseJsonFields(row, ['tags', 'custom_fields', 'class', 'locations']) as NPC;
  }
}
