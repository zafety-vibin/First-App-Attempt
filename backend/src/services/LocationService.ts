/**
 * LocationService - Business logic for location operations
 * Feature: 014-create-the-database (standardized)
 * Feature: 021-create-a-geographic (map operations)
 *
 * Implements:
 * - Standard CRUD operations via BaseCategoryService
 * - Circular hierarchy validation (parent_location_id → locations.id)
 * - JSON array handling (notable_npcs, factions_present, connected_locations)
 * - Map image operations (upload, delete) - Feature 021
 * - Map pin operations (create, update, delete) - Feature 021
 * - Faction region operations (create, update, delete) - Feature 021
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
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

  /**
   * Feature 021: Map Operations
   */

  /**
   * Upload map image to location
   * Adds to map_images JSON array
   */
  uploadMap(locationId: string, mapData: MapImageInput): Location {
    const location = this.findById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Parse existing map_images
    const row = this.db
      .prepare('SELECT map_images FROM locations WHERE id = ?')
      .get(locationId) as { map_images: string } | undefined;

    const mapImages = row && row.map_images ? JSON.parse(row.map_images) : [];

    // Create new map image
    const newMap: MapImage = {
      id: randomUUID(),
      name: mapData.name,
      data: mapData.data,
      width: mapData.width,
      height: mapData.height,
      uploaded_at: Math.floor(Date.now() / 1000),
    };

    // Append to array
    mapImages.push(newMap);

    // Update database
    this.db
      .prepare('UPDATE locations SET map_images = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(mapImages), Math.floor(Date.now() / 1000), locationId);

    return this.findById(locationId)!;
  }

  /**
   * Delete map image from location
   * Removes from map_images array and deletes associated pins/regions
   */
  deleteMap(locationId: string, mapId: string): { deletedPins: number; deletedRegions: number } {
    const location = this.findById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Parse existing arrays
    const row = this.db
      .prepare('SELECT map_images, map_pins, faction_regions FROM locations WHERE id = ?')
      .get(locationId) as { map_images: string; map_pins: string; faction_regions: string } | undefined;

    if (!row) {
      throw new Error('Location not found');
    }

    const mapImages = row.map_images ? JSON.parse(row.map_images) : [];
    const mapPins = row.map_pins ? JSON.parse(row.map_pins) : [];
    const factionRegions = row.faction_regions ? JSON.parse(row.faction_regions) : [];

    // Check map exists
    const mapIndex = mapImages.findIndex((m: MapImage) => m.id === mapId);
    if (mapIndex === -1) {
      throw new Error('Map not found');
    }

    // Remove map
    mapImages.splice(mapIndex, 1);

    // Remove associated pins
    const pinsBeforeCount = mapPins.length;
    const filteredPins = mapPins.filter((p: MapPin) => p.map_id !== mapId);
    const deletedPins = pinsBeforeCount - filteredPins.length;

    // Remove associated regions
    const regionsBeforeCount = factionRegions.length;
    const filteredRegions = factionRegions.filter((r: FactionRegion) => r.map_id !== mapId);
    const deletedRegions = regionsBeforeCount - filteredRegions.length;

    // Update database
    this.db
      .prepare('UPDATE locations SET map_images = ?, map_pins = ?, faction_regions = ?, updated_at = ? WHERE id = ?')
      .run(
        JSON.stringify(mapImages),
        JSON.stringify(filteredPins),
        JSON.stringify(filteredRegions),
        Math.floor(Date.now() / 1000),
        locationId
      );

    return { deletedPins, deletedRegions };
  }

  /**
   * Create map pin on location map
   * Adds to map_pins JSON array
   */
  createPin(locationId: string, mapId: string, pinData: MapPinInput): Location {
    const location = this.findById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Validate map exists
    const row = this.db
      .prepare('SELECT map_images, map_pins FROM locations WHERE id = ?')
      .get(locationId) as { map_images: string; map_pins: string } | undefined;

    if (!row) {
      throw new Error('Location not found');
    }

    const mapImages = row.map_images ? JSON.parse(row.map_images) : [];
    const map = mapImages.find((m: MapImage) => m.id === mapId);
    if (!map) {
      throw new Error('Map not found');
    }

    // Validate coordinates within map bounds
    if (pinData.x < 0 || pinData.x > map.width || pinData.y < 0 || pinData.y > map.height) {
      throw new Error('Pin coordinates out of map bounds');
    }

    // Validate linked entity exists
    this.validateLinkedEntity(location.campaign_id, pinData.linked_entity_type, pinData.linked_entity_id);

    // Parse existing pins
    const mapPins = row.map_pins ? JSON.parse(row.map_pins) : [];

    // Create new pin
    const newPin: MapPin = {
      id: randomUUID(),
      map_id: mapId,
      x: pinData.x,
      y: pinData.y,
      linked_entity_type: pinData.linked_entity_type,
      linked_entity_id: pinData.linked_entity_id,
      icon: pinData.icon || null,
      color: pinData.color || null,
      label: pinData.label || null,
      created_at: Math.floor(Date.now() / 1000),
    };

    // Append to array
    mapPins.push(newPin);

    // Update database
    this.db
      .prepare('UPDATE locations SET map_pins = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(mapPins), Math.floor(Date.now() / 1000), locationId);

    return this.findById(locationId)!;
  }

  /**
   * Update map pin
   * Updates pin in map_pins JSON array
   */
  updatePin(locationId: string, pinId: string, pinData: Partial<MapPinInput>): Location {
    const location = this.findById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Parse existing pins and maps
    const row = this.db
      .prepare('SELECT map_images, map_pins FROM locations WHERE id = ?')
      .get(locationId) as { map_images: string; map_pins: string } | undefined;

    if (!row) {
      throw new Error('Location not found');
    }

    const mapImages = row.map_images ? JSON.parse(row.map_images) : [];
    const mapPins = row.map_pins ? JSON.parse(row.map_pins) : [];

    // Find pin
    const pinIndex = mapPins.findIndex((p: MapPin) => p.id === pinId);
    if (pinIndex === -1) {
      throw new Error('Pin not found');
    }

    const existingPin = mapPins[pinIndex];

    // If coordinates are being updated, validate bounds
    if (pinData.x !== undefined || pinData.y !== undefined) {
      const map = mapImages.find((m: MapImage) => m.id === existingPin.map_id);
      if (!map) {
        throw new Error('Map not found');
      }

      const newX = pinData.x !== undefined ? pinData.x : existingPin.x;
      const newY = pinData.y !== undefined ? pinData.y : existingPin.y;

      if (newX < 0 || newX > map.width || newY < 0 || newY > map.height) {
        throw new Error('Pin coordinates out of map bounds');
      }
    }

    // If linked entity is being updated, validate it exists
    if (pinData.linked_entity_type !== undefined && pinData.linked_entity_id !== undefined) {
      this.validateLinkedEntity(location.campaign_id, pinData.linked_entity_type, pinData.linked_entity_id);
    }

    // Update pin
    mapPins[pinIndex] = {
      ...existingPin,
      ...pinData,
    };

    // Update database
    this.db
      .prepare('UPDATE locations SET map_pins = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(mapPins), Math.floor(Date.now() / 1000), locationId);

    return this.findById(locationId)!;
  }

  /**
   * Delete map pin
   * Removes from map_pins JSON array
   */
  deletePin(locationId: string, pinId: string): Location {
    const location = this.findById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Parse existing pins
    const row = this.db
      .prepare('SELECT map_pins FROM locations WHERE id = ?')
      .get(locationId) as { map_pins: string } | undefined;

    if (!row) {
      throw new Error('Location not found');
    }

    const mapPins = row.map_pins ? JSON.parse(row.map_pins) : [];

    // Find and remove pin
    const pinIndex = mapPins.findIndex((p: MapPin) => p.id === pinId);
    if (pinIndex === -1) {
      throw new Error('Pin not found');
    }

    mapPins.splice(pinIndex, 1);

    // Update database
    this.db
      .prepare('UPDATE locations SET map_pins = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(mapPins), Math.floor(Date.now() / 1000), locationId);

    return this.findById(locationId)!;
  }

  /**
   * Create faction region on location map
   * Adds to faction_regions JSON array
   */
  createRegion(locationId: string, mapId: string, regionData: FactionRegionInput): Location {
    const location = this.findById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Validate map exists
    const row = this.db
      .prepare('SELECT map_images, faction_regions FROM locations WHERE id = ?')
      .get(locationId) as { map_images: string; faction_regions: string } | undefined;

    if (!row) {
      throw new Error('Location not found');
    }

    const mapImages = row.map_images ? JSON.parse(row.map_images) : [];
    const map = mapImages.find((m: MapImage) => m.id === mapId);
    if (!map) {
      throw new Error('Map not found');
    }

    // Validate vertices (minimum 3, within bounds)
    if (regionData.vertices.length < 3) {
      throw new Error('Region must have at least 3 vertices');
    }

    for (const vertex of regionData.vertices) {
      if (vertex.x < 0 || vertex.x > map.width || vertex.y < 0 || vertex.y > map.height) {
        throw new Error('Region vertex coordinates out of map bounds');
      }
    }

    // Validate faction exists
    const faction = this.db
      .prepare('SELECT id FROM factions WHERE id = ? AND campaign_id = ?')
      .get(regionData.faction_id, location.campaign_id);

    if (!faction) {
      throw new Error('Faction not found');
    }

    // Parse existing regions
    const factionRegions = row.faction_regions ? JSON.parse(row.faction_regions) : [];

    // Create new region
    const newRegion: FactionRegion = {
      id: randomUUID(),
      map_id: mapId,
      vertices: regionData.vertices,
      faction_id: regionData.faction_id,
      color: regionData.color,
      label: regionData.label || null,
      z_order: regionData.z_order !== undefined ? regionData.z_order : 0,
      created_at: Math.floor(Date.now() / 1000),
    };

    // Append to array
    factionRegions.push(newRegion);

    // Update database
    this.db
      .prepare('UPDATE locations SET faction_regions = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(factionRegions), Math.floor(Date.now() / 1000), locationId);

    return this.findById(locationId)!;
  }

  /**
   * Update faction region
   * Updates region in faction_regions JSON array
   */
  updateRegion(locationId: string, regionId: string, regionData: Partial<FactionRegionInput>): Location {
    const location = this.findById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Parse existing regions and maps
    const row = this.db
      .prepare('SELECT map_images, faction_regions FROM locations WHERE id = ?')
      .get(locationId) as { map_images: string; faction_regions: string } | undefined;

    if (!row) {
      throw new Error('Location not found');
    }

    const mapImages = row.map_images ? JSON.parse(row.map_images) : [];
    const factionRegions = row.faction_regions ? JSON.parse(row.faction_regions) : [];

    // Find region
    const regionIndex = factionRegions.findIndex((r: FactionRegion) => r.id === regionId);
    if (regionIndex === -1) {
      throw new Error('Region not found');
    }

    const existingRegion = factionRegions[regionIndex];

    // If vertices are being updated, validate bounds
    if (regionData.vertices !== undefined) {
      const map = mapImages.find((m: MapImage) => m.id === existingRegion.map_id);
      if (!map) {
        throw new Error('Map not found');
      }

      if (regionData.vertices.length < 3) {
        throw new Error('Region must have at least 3 vertices');
      }

      for (const vertex of regionData.vertices) {
        if (vertex.x < 0 || vertex.x > map.width || vertex.y < 0 || vertex.y > map.height) {
          throw new Error('Region vertex coordinates out of map bounds');
        }
      }
    }

    // If faction is being updated, validate it exists
    if (regionData.faction_id !== undefined) {
      const faction = this.db
        .prepare('SELECT id FROM factions WHERE id = ? AND campaign_id = ?')
        .get(regionData.faction_id, location.campaign_id);

      if (!faction) {
        throw new Error('Faction not found');
      }
    }

    // Update region
    factionRegions[regionIndex] = {
      ...existingRegion,
      ...regionData,
    };

    // Update database
    this.db
      .prepare('UPDATE locations SET faction_regions = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(factionRegions), Math.floor(Date.now() / 1000), locationId);

    return this.findById(locationId)!;
  }

  /**
   * Delete faction region
   * Removes from faction_regions JSON array
   */
  deleteRegion(locationId: string, regionId: string): Location {
    const location = this.findById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Parse existing regions
    const row = this.db
      .prepare('SELECT faction_regions FROM locations WHERE id = ?')
      .get(locationId) as { faction_regions: string } | undefined;

    if (!row) {
      throw new Error('Location not found');
    }

    const factionRegions = row.faction_regions ? JSON.parse(row.faction_regions) : [];

    // Find and remove region
    const regionIndex = factionRegions.findIndex((r: FactionRegion) => r.id === regionId);
    if (regionIndex === -1) {
      throw new Error('Region not found');
    }

    factionRegions.splice(regionIndex, 1);

    // Update database
    this.db
      .prepare('UPDATE locations SET faction_regions = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(factionRegions), Math.floor(Date.now() / 1000), locationId);

    return this.findById(locationId)!;
  }

  /**
   * Validate linked entity exists in campaign
   */
  private validateLinkedEntity(campaignId: string, entityType: 'location' | 'npc', entityId: string): void {
    const table = entityType === 'location' ? 'locations' : 'npcs';
    const entity = this.db
      .prepare(`SELECT id FROM ${table} WHERE id = ? AND campaign_id = ?`)
      .get(entityId, campaignId);

    if (!entity) {
      throw new Error(`Linked ${entityType} not found`);
    }
  }
}

/**
 * Feature 021: Map Data Interfaces
 */

export interface MapImage {
  id: string;
  name: string;
  data: string; // Base64 data URL
  width: number;
  height: number;
  uploaded_at: number;
}

export interface MapImageInput {
  name: string;
  data: string;
  width: number;
  height: number;
}

export interface MapPin {
  id: string;
  map_id: string;
  x: number;
  y: number;
  linked_entity_type: 'location' | 'npc';
  linked_entity_id: string;
  icon: string | null;
  color: string | null;
  label: string | null;
  created_at: number;
}

export interface MapPinInput {
  x: number;
  y: number;
  linked_entity_type: 'location' | 'npc';
  linked_entity_id: string;
  icon?: string | null;
  color?: string | null;
  label?: string | null;
}

export interface FactionRegion {
  id: string;
  map_id: string;
  vertices: Array<{ x: number; y: number }>;
  faction_id: string;
  color: string;
  label: string | null;
  z_order: number;
  created_at: number;
}

export interface FactionRegionInput {
  vertices: Array<{ x: number; y: number }>;
  faction_id: string;
  color: string;
  label?: string | null;
  z_order?: number;
}
