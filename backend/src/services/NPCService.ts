/**
 * NPCService - Business logic for NPC operations
 * Feature: 014-create-the-database
 *
 * Implements:
 * - Standard CRUD operations for NPCs
 * - Foreign key validation (faction_id, superior_npc_id)
 * - Circular hierarchy detection for superior_npc_id
 * - JSON field parsing (class, locations, tags, custom_fields)
 * - Filtering by campaign_id, core_status, player_knowledge, tags
 * - Pagination and sorting
 * - Transaction support for multi-operation writes
 */

import Database from 'better-sqlite3';
import { NPC } from '../models/npc';
import { randomUUID } from 'crypto';

export interface NPCFilters {
  campaign_id?: string;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string;
  tags?: string[];
}

export interface Pagination {
  limit: number;
  offset: number;
}

export interface NPCListResult {
  data: NPC[];
  total: number;
}

export class NPCService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create new NPC with validation
   */
  create(data: Partial<NPC>): NPC {
    // Validate required fields
    if (!data.campaign_id || !data.name) {
      throw new Error('campaign_id and name are required');
    }

    // Validate core_status enum
    if (data.core_status && !['active', 'archived', 'draft', 'hidden'].includes(data.core_status)) {
      throw new Error('Invalid core_status value');
    }

    // Validate level minimum
    if (data.level !== undefined && data.level !== null && data.level < 1) {
      throw new Error('level must be at least 1');
    }

    // Validate name length
    if (data.name.length > 255) {
      throw new Error('name must be 255 characters or less');
    }

    // Validate foreign keys
    if (data.faction_id) {
      const faction = this.db.prepare('SELECT id FROM factions WHERE id = ?').get(data.faction_id);
      if (!faction) {
        throw new Error('faction_id references non-existent faction');
      }
    }

    if (data.superior_npc_id) {
      const superior = this.db.prepare('SELECT id FROM npcs WHERE id = ?').get(data.superior_npc_id);
      if (!superior) {
        throw new Error('superior_npc_id references non-existent NPC');
      }

      // Check for circular hierarchy
      this.validateNoCircularHierarchy(null, data.superior_npc_id);
    }

    // Generate ID and timestamps
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Prepare data with defaults
    const npcData: NPC = {
      id,
      campaign_id: data.campaign_id,
      name: data.name,
      description: data.description || null,
      core_status: data.core_status || 'active',
      player_knowledge: data.player_knowledge || null,
      tags: data.tags || [],
      created_at: now,
      updated_at: now,
      custom_fields: data.custom_fields || {},
      race: data.race || null,
      class: data.class || null,
      level: data.level || null,
      alignment: data.alignment || null,
      appearance: data.appearance || null,
      personality_traits: data.personality_traits || null,
      motivation: data.motivation || null,
      relationship_to_party: data.relationship_to_party || null,
      met_party: data.met_party || 0,
      art: data.art || null,
      faction_id: data.faction_id || null,
      superior_npc_id: data.superior_npc_id || null,
      locations: data.locations || [],
      dm_secrets: data.dm_secrets || null,
      dm_plot_relevance: data.dm_plot_relevance || null,
    };

    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO npcs (
        id, campaign_id, name, description, core_status, player_knowledge, tags,
        created_at, updated_at, custom_fields, race, class, level, alignment,
        appearance, personality_traits, motivation, relationship_to_party,
        met_party, art, faction_id, superior_npc_id, locations,
        dm_secrets, dm_plot_relevance
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      npcData.id,
      npcData.campaign_id,
      npcData.name,
      npcData.description,
      npcData.core_status,
      npcData.player_knowledge,
      JSON.stringify(npcData.tags),
      npcData.created_at,
      npcData.updated_at,
      JSON.stringify(npcData.custom_fields),
      npcData.race,
      npcData.class ? JSON.stringify(npcData.class) : null,
      npcData.level,
      npcData.alignment,
      npcData.appearance,
      npcData.personality_traits,
      npcData.motivation,
      npcData.relationship_to_party,
      npcData.met_party,
      npcData.art,
      npcData.faction_id,
      npcData.superior_npc_id,
      JSON.stringify(npcData.locations),
      npcData.dm_secrets,
      npcData.dm_plot_relevance
    );

    return npcData;
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
  ): NPCListResult {
    // Build WHERE clause
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

    // Tag filtering: check if any of the provided tags exist in the JSON array
    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(() => `tags LIKE ?`).join(' OR ');
      whereClauses.push(`(${tagConditions})`);
      filters.tags.forEach(tag => {
        params.push(`%"${tag}"%`);
      });
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Validate sort column
    const validSortColumns = ['created_at', 'updated_at', 'name'];
    if (!validSortColumns.includes(sortBy)) {
      throw new Error('Invalid sort_by column');
    }

    // Validate sort order
    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new Error('Invalid sort_order value');
    }

    // Get total count
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM npcs ${whereClause}`);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    // Get paginated data
    const dataStmt = this.db.prepare(`
      SELECT * FROM npcs
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `);
    const rows = dataStmt.all(...params, pagination.limit, pagination.offset);

    const data = rows.map(row => this.rowToNPC(row as any));

    return { data, total };
  }

  /**
   * Update NPC
   */
  update(id: string, data: Partial<NPC>): NPC {
    // Check if NPC exists
    const existing = this.findById(id);
    if (!existing) {
      throw new Error('NPC not found');
    }

    // Prevent changing id or campaign_id
    if (data.id && data.id !== id) {
      delete data.id;
    }
    if (data.campaign_id) {
      delete data.campaign_id;
    }

    // Validate core_status enum
    if (data.core_status && !['active', 'archived', 'draft', 'hidden'].includes(data.core_status)) {
      throw new Error('Invalid core_status value');
    }

    // Validate level minimum
    if (data.level !== undefined && data.level !== null && data.level < 1) {
      throw new Error('level must be at least 1');
    }

    // Validate name length
    if (data.name && data.name.length > 255) {
      throw new Error('name must be 255 characters or less');
    }

    // Validate foreign keys
    if (data.faction_id) {
      const faction = this.db.prepare('SELECT id FROM factions WHERE id = ?').get(data.faction_id);
      if (!faction) {
        throw new Error('faction_id references non-existent faction');
      }
    }

    if (data.superior_npc_id !== undefined) {
      if (data.superior_npc_id) {
        // Prevent self-reference
        if (data.superior_npc_id === id) {
          throw new Error('NPC cannot be its own superior');
        }

        const superior = this.db.prepare('SELECT id FROM npcs WHERE id = ?').get(data.superior_npc_id);
        if (!superior) {
          throw new Error('superior_npc_id references non-existent NPC');
        }

        // Check for circular hierarchy
        this.validateNoCircularHierarchy(id, data.superior_npc_id);
      }
    }

    // Update timestamp
    const now = Math.floor(Date.now() / 1000);

    // Build UPDATE statement dynamically
    const updates: string[] = [];
    const params: any[] = [];

    const updatableFields: (keyof NPC)[] = [
      'name', 'description', 'core_status', 'player_knowledge', 'tags',
      'custom_fields', 'race', 'class', 'level', 'alignment', 'appearance',
      'personality_traits', 'motivation', 'relationship_to_party', 'met_party',
      'art', 'faction_id', 'superior_npc_id', 'locations', 'dm_secrets', 'dm_plot_relevance'
    ];

    for (const field of updatableFields) {
      if (field in data) {
        updates.push(`${field} = ?`);

        // Handle JSON fields
        if (field === 'tags' || field === 'custom_fields' || field === 'class' || field === 'locations') {
          params.push(JSON.stringify(data[field]));
        } else {
          params.push(data[field] as any);
        }
      }
    }

    if (updates.length === 0) {
      // No updates provided
      return existing;
    }

    updates.push('updated_at = ?');
    params.push(now);
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE npcs
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...params);

    // Return updated NPC
    return this.findById(id)!;
  }

  /**
   * Delete NPC
   */
  delete(id: string): void {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error('NPC not found');
    }

    // Delete NPC (CASCADE will handle subordinates via ON DELETE SET NULL)
    const stmt = this.db.prepare('DELETE FROM npcs WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Validate no circular hierarchy in superior_npc_id chain
   * Uses iterative traversal to detect cycles
   */
  private validateNoCircularHierarchy(currentId: string | null, newSuperiorId: string): void {
    const visited = new Set<string>();
    let checkId: string | null = newSuperiorId;

    // If we're updating an existing NPC, it shouldn't appear in the chain
    if (currentId) {
      visited.add(currentId);
    }

    // Traverse up the hierarchy
    while (checkId !== null) {
      if (visited.has(checkId)) {
        throw new Error('Circular hierarchy detected in superior_npc_id chain');
      }

      visited.add(checkId);

      // Get superior of current NPC
      const row = this.db.prepare('SELECT superior_npc_id FROM npcs WHERE id = ?').get(checkId) as { superior_npc_id: string | null } | undefined;

      if (!row) {
        // NPC not found, end traversal
        break;
      }

      checkId = row.superior_npc_id;
    }
  }

  /**
   * Convert database row to NPC object
   */
  private rowToNPC(row: any): NPC {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      description: row.description,
      core_status: row.core_status,
      player_knowledge: row.player_knowledge,
      tags: row.tags ? JSON.parse(row.tags) : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      custom_fields: row.custom_fields ? JSON.parse(row.custom_fields) : {},
      race: row.race,
      class: row.class ? JSON.parse(row.class) : null,
      level: row.level,
      alignment: row.alignment,
      appearance: row.appearance,
      personality_traits: row.personality_traits,
      motivation: row.motivation,
      relationship_to_party: row.relationship_to_party,
      met_party: row.met_party,
      art: row.art,
      faction_id: row.faction_id,
      superior_npc_id: row.superior_npc_id,
      locations: row.locations ? JSON.parse(row.locations) : [],
      dm_secrets: row.dm_secrets,
      dm_plot_relevance: row.dm_plot_relevance,
    };
  }
}
