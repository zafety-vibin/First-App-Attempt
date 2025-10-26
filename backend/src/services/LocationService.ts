/**
 * LocationService - Business logic for location operations
 * Feature: 014-create-the-database (standardized)
 *
 * Implements:
 * - Standard CRUD operations via BaseCategoryService
 * - Circular hierarchy validation (parent_location_id → locations.id)
 * - JSON array handling (notable_npcs, factions_present, connected_locations)
 */

import Database from 'better-sqlite3';
import { BaseCategoryService, EntityFilters, Pagination, ListResult, OperationOptions } from './BaseCategoryService';
import { Location } from '../models/location';

interface LocationRow {
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

export class LocationService extends BaseCategoryService<Location> {
  constructor(db: Database.Database) {
    super(db, 'locations');
  }

  /**
   * Category-specific validation for locations
   */
  protected validateCategoryFields(data: Partial<Location>, options?: OperationOptions): void {
    // Validate no circular reference if parent is set
    if (data.parent_location_id) {
      this.validateNoCircularReference(data.id!, data.parent_location_id);
    }

    // Validate population is non-negative
    if (data.population !== undefined && data.population !== null && data.population < 0) {
      throw new Error('population must be non-negative');
    }
  }

  /**
   * Insert location into database
   */
  protected insertEntity(data: Location): void {
    const stmt = this.db.prepare(`
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
      data.location_type || null,
      data.population || null,
      data.cultural_characteristics || null,
      data.map || null,
      data.parent_location_id || null,
      JSON.stringify(data.notable_npcs || []),
      JSON.stringify(data.factions_present || []),
      JSON.stringify(data.connected_locations || []),
      data.dm_secrets || null
    );
  }

  /**
   * Update location in database
   */
  protected updateEntity(id: string, data: Partial<Location>): void {
    const updates: string[] = [];
    const values: any[] = [];

    Object.keys(data).forEach((key) => {
      if (key === 'id' || key === 'campaign_id' || key === 'created_at') {
        return;
      }

      const value = (data as any)[key];

      // Handle JSON fields
      if (['tags', 'custom_fields', 'notable_npcs', 'factions_present', 'connected_locations'].includes(key)) {
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
      UPDATE locations
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Delete location from database
   */
  protected deleteEntity(id: string): void {
    this.db.prepare('DELETE FROM locations WHERE id = ?').run(id);
  }

  /**
   * Find location by ID
   */
  findById(id: string): Location | null {
    const row = this.db
      .prepare('SELECT * FROM locations WHERE id = ?')
      .get(id) as LocationRow | undefined;

    return row ? this.rowToLocation(row) : null;
  }

  /**
   * List locations with filters and pagination
   */
  list(
    filters: EntityFilters,
    pagination: Pagination,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): ListResult<Location> {
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
    if (filters.location_type) {
      whereClauses.push('location_type = ?');
      params.push(filters.location_type);
    }

    if (filters.parent_location_id !== undefined) {
      if (filters.parent_location_id === null) {
        whereClauses.push('parent_location_id IS NULL');
      } else {
        whereClauses.push('parent_location_id = ?');
        params.push(filters.parent_location_id);
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM locations ${whereClause}`);
    const { count } = countStmt.get(...params) as { count: number };

    // Fetch data
    const dataStmt = this.db.prepare(`
      SELECT * FROM locations
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `);

    const rows = dataStmt.all(...params, pagination.limit, pagination.offset) as LocationRow[];

    return {
      data: rows.map((row) => this.rowToLocation(row)),
      total: count,
    };
  }

  /**
   * Validate no circular reference in parent_location_id chain
   */
  private validateNoCircularReference(locationId: string, parentId: string): void {
    const visited = new Set<string>([locationId]);
    let currentId: string | null = parentId;

    while (currentId) {
      if (visited.has(currentId)) {
        throw new Error('Circular reference detected in location hierarchy');
      }

      visited.add(currentId);

      const parent = this.db
        .prepare('SELECT parent_location_id FROM locations WHERE id = ?')
        .get(currentId) as { parent_location_id: string | null } | undefined;

      currentId = parent?.parent_location_id || null;
    }
  }

  /**
   * Convert database row to Location model
   */
  private rowToLocation(row: LocationRow): Location {
    return this.parseJsonFields(row, [
      'tags',
      'custom_fields',
      'notable_npcs',
      'factions_present',
      'connected_locations',
    ]) as Location;
  }
}
