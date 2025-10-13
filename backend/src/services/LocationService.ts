/**
 * Location Service - Handles location CRUD operations
 * Feature 014: Structured Category Database Foundation
 */

import { db } from './DatabaseService';
import { Location } from '../models/location';
import crypto from 'crypto';

export interface CreateLocationInput {
  campaign_id: string;
  name: string;
  description?: string | null;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string | null;
  tags?: string[];
  custom_fields?: Record<string, any>;

  // Category-specific fields
  location_type?: string | null;
  population?: number | null;
  cultural_characteristics?: string | null;
  map?: string | null;

  // Explicit connections
  parent_location_id?: string | null;

  // Many-to-many connections
  notable_npcs?: string[];
  factions_present?: string[];
  connected_locations?: string[];

  // DM-only fields
  dm_secrets?: string | null;
}

export interface UpdateLocationInput {
  name?: string;
  description?: string | null;
  core_status?: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge?: string | null;
  tags?: string[];
  custom_fields?: Record<string, any>;

  // Category-specific fields
  location_type?: string | null;
  population?: number | null;
  cultural_characteristics?: string | null;
  map?: string | null;

  // Explicit connections
  parent_location_id?: string | null;

  // Many-to-many connections
  notable_npcs?: string[];
  factions_present?: string[];
  connected_locations?: string[];

  // DM-only fields
  dm_secrets?: string | null;
}

interface LocationRow {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  core_status: 'active' | 'archived' | 'draft' | 'hidden';
  player_knowledge: string | null;
  tags: string;
  created_at: number;
  updated_at: number;
  custom_fields: string;

  location_type: string | null;
  population: number | null;
  cultural_characteristics: string | null;
  map: string | null;

  parent_location_id: string | null;

  notable_npcs: string;
  factions_present: string;
  connected_locations: string;

  dm_secrets: string | null;
}

export class LocationService {
  /**
   * Convert database row to Location model
   */
  private static rowToLocation(row: LocationRow): Location {
    return {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      description: row.description,
      core_status: row.core_status,
      player_knowledge: row.player_knowledge,
      tags: JSON.parse(row.tags),
      created_at: row.created_at,
      updated_at: row.updated_at,
      custom_fields: JSON.parse(row.custom_fields),

      location_type: row.location_type,
      population: row.population,
      cultural_characteristics: row.cultural_characteristics,
      map: row.map,

      parent_location_id: row.parent_location_id,

      notable_npcs: JSON.parse(row.notable_npcs),
      factions_present: JSON.parse(row.factions_present),
      connected_locations: JSON.parse(row.connected_locations),

      dm_secrets: row.dm_secrets,
    };
  }

  /**
   * Validate circular reference prevention
   * Prevents a location from being its own ancestor
   */
  private static validateNoCircularReference(
    locationId: string,
    parentLocationId: string | null
  ): void {
    if (!parentLocationId) return;

    // Cannot be own parent
    if (locationId === parentLocationId) {
      throw new Error('Location cannot be its own parent');
    }

    // Check if proposed parent is already a descendant
    const ancestors = this.getAncestorIds(parentLocationId);
    if (ancestors.includes(locationId)) {
      throw new Error('Circular reference detected: proposed parent is a descendant of this location');
    }
  }

  /**
   * Get all ancestor IDs for a location (traverses up the hierarchy)
   */
  private static getAncestorIds(locationId: string): string[] {
    const ancestors: string[] = [];
    let currentId: string | null = locationId;
    const maxDepth = 100; // Safety limit
    let depth = 0;

    while (currentId && depth < maxDepth) {
      const row = db
        .prepare('SELECT parent_location_id FROM locations WHERE id = ?')
        .get(currentId) as { parent_location_id: string | null } | undefined;

      if (!row || !row.parent_location_id) break;

      ancestors.push(row.parent_location_id);
      currentId = row.parent_location_id;
      depth++;
    }

    return ancestors;
  }

  /**
   * Create new location
   */
  static create(input: CreateLocationInput): Location {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Validate no circular reference if parent is set
    if (input.parent_location_id) {
      this.validateNoCircularReference(id, input.parent_location_id);
    }

    const stmt = db.prepare(`
      INSERT INTO locations (
        id, campaign_id, name, description, core_status, player_knowledge,
        tags, created_at, updated_at, custom_fields,
        location_type, population, cultural_characteristics, map,
        parent_location_id,
        notable_npcs, factions_present, connected_locations,
        dm_secrets
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.campaign_id,
      input.name,
      input.description ?? null,
      input.core_status ?? 'active',
      input.player_knowledge ?? 'common_knowledge',
      JSON.stringify(input.tags ?? []),
      now,
      now,
      JSON.stringify(input.custom_fields ?? {}),
      input.location_type ?? null,
      input.population ?? null,
      input.cultural_characteristics ?? null,
      input.map ?? null,
      input.parent_location_id ?? null,
      JSON.stringify(input.notable_npcs ?? []),
      JSON.stringify(input.factions_present ?? []),
      JSON.stringify(input.connected_locations ?? []),
      input.dm_secrets ?? null
    );

    return this.findById(id)!;
  }

  /**
   * Find location by ID
   */
  static findById(id: string): Location | null {
    const row = db
      .prepare('SELECT * FROM locations WHERE id = ?')
      .get(id) as LocationRow | undefined;

    return row ? this.rowToLocation(row) : null;
  }

  /**
   * List locations by campaign with pagination and filtering
   */
  static list(
    campaignId: string,
    options: {
      limit?: number;
      offset?: number;
      core_status?: 'active' | 'archived' | 'draft' | 'hidden';
      player_knowledge?: string;
      parent_location_id?: string | null;
      tags?: string[];
      sort_by?: 'created_at' | 'updated_at' | 'name';
      sort_order?: 'asc' | 'desc';
      viewMode?: 'dm_view' | 'player_view';
    } = {}
  ): { locations: Location[]; total: number } {
    const {
      limit = 50,
      offset = 0,
      core_status,
      player_knowledge,
      parent_location_id,
      tags,
      sort_by = 'name',
      sort_order = 'asc',
      viewMode = 'dm_view'
    } = options;

    // Import getPlayerKnowledgeFilter inline to avoid circular deps
    const { getPlayerKnowledgeFilter } = require('../middleware/informationFilter');

    // Build WHERE clause
    const conditions: string[] = ['campaign_id = ?'];
    const params: any[] = [campaignId];

    // Apply view mode filtering
    const pkFilter = getPlayerKnowledgeFilter(viewMode);
    if (pkFilter) {
      conditions.push(`(${pkFilter})`);
    }

    if (core_status) {
      conditions.push('core_status = ?');
      params.push(core_status);
    }

    if (player_knowledge) {
      conditions.push('player_knowledge = ?');
      params.push(player_knowledge);
    }

    if (parent_location_id !== undefined) {
      if (parent_location_id === null) {
        conditions.push('parent_location_id IS NULL');
      } else {
        conditions.push('parent_location_id = ?');
        params.push(parent_location_id);
      }
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => 'tags LIKE ?');
      conditions.push(`(${tagConditions.join(' OR ')})`);
      tags.forEach(tag => {
        params.push(`%"${tag}"%`);
      });
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM locations WHERE ${whereClause}`)
      .get(...params) as { count: number };

    // Get paginated results with sorting
    const rows = db
      .prepare(
        `SELECT * FROM locations WHERE ${whereClause} ORDER BY ${sort_by} ${sort_order.toUpperCase()} LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as LocationRow[];

    return {
      locations: rows.map(this.rowToLocation),
      total: countResult.count,
    };
  }

  /**
   * Update location
   */
  static update(id: string, input: UpdateLocationInput): Location {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error('Location not found');
    }

    // Validate circular reference if parent is being changed
    if (input.parent_location_id !== undefined) {
      this.validateNoCircularReference(id, input.parent_location_id);
    }

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

    if (input.core_status !== undefined) {
      updates.push('core_status = ?');
      values.push(input.core_status);
    }

    if (input.player_knowledge !== undefined) {
      updates.push('player_knowledge = ?');
      values.push(input.player_knowledge);
    }

    if (input.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(input.tags));
    }

    if (input.custom_fields !== undefined) {
      updates.push('custom_fields = ?');
      values.push(JSON.stringify(input.custom_fields));
    }

    if (input.location_type !== undefined) {
      updates.push('location_type = ?');
      values.push(input.location_type);
    }

    if (input.population !== undefined) {
      updates.push('population = ?');
      values.push(input.population);
    }

    if (input.cultural_characteristics !== undefined) {
      updates.push('cultural_characteristics = ?');
      values.push(input.cultural_characteristics);
    }

    if (input.map !== undefined) {
      updates.push('map = ?');
      values.push(input.map);
    }

    if (input.parent_location_id !== undefined) {
      updates.push('parent_location_id = ?');
      values.push(input.parent_location_id);
    }

    if (input.notable_npcs !== undefined) {
      updates.push('notable_npcs = ?');
      values.push(JSON.stringify(input.notable_npcs));
    }

    if (input.factions_present !== undefined) {
      updates.push('factions_present = ?');
      values.push(JSON.stringify(input.factions_present));
    }

    if (input.connected_locations !== undefined) {
      updates.push('connected_locations = ?');
      values.push(JSON.stringify(input.connected_locations));
    }

    if (input.dm_secrets !== undefined) {
      updates.push('dm_secrets = ?');
      values.push(input.dm_secrets);
    }

    if (updates.length === 0) {
      return existing;
    }

    // Always update updated_at
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);

    // Add id for WHERE clause
    values.push(id);

    const stmt = db.prepare(
      `UPDATE locations SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    return this.findById(id)!;
  }

  /**
   * Delete location
   */
  static delete(id: string): void {
    const stmt = db.prepare('DELETE FROM locations WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new Error('Location not found');
    }
  }

  /**
   * Get child locations (direct descendants)
   */
  static getChildren(parentId: string): Location[] {
    const rows = db
      .prepare('SELECT * FROM locations WHERE parent_location_id = ? ORDER BY name ASC')
      .all(parentId) as LocationRow[];

    return rows.map(this.rowToLocation);
  }

  /**
   * Get all descendant locations (recursive)
   */
  static getDescendants(parentId: string): Location[] {
    const descendants: Location[] = [];
    const queue: string[] = [parentId];
    const visited = new Set<string>();
    const maxNodes = 1000; // Safety limit

    while (queue.length > 0 && descendants.length < maxNodes) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const children = this.getChildren(currentId);
      for (const child of children) {
        descendants.push(child);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  /**
   * Execute callback within a transaction
   */
  static transaction<T>(callback: () => T): T {
    const transaction = db.transaction(callback);
    return transaction();
  }
}
