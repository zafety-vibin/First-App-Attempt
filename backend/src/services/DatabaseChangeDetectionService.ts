/**
 * Database Change Detection Service
 * Feature 006 Extension: Campaign-Story Dual-Tier System
 *
 * Tracks changes across all Feature 014 category tables between sessions
 * Generates EntityChange logs for import_batch metadata nodes
 */

import Database from 'better-sqlite3';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Snapshot of database state at a specific point in time
 */
export interface DatabaseSnapshot {
  /** Unix timestamp when snapshot was taken */
  timestamp: number;

  /** Session number associated with this snapshot */
  session_number: number;

  /** All entities across category tables with their timestamps */
  entities: {
    npcs: EntityRecord[];
    locations: EntityRecord[];
    factions: EntityRecord[];
    session_recaps: EntityRecord[];
    quests: EntityRecord[];
    player_characters: EntityRecord[];
    lore_entries: EntityRecord[];
    world_rules: EntityRecord[];
    planar_forces: EntityRecord[];
    session_preps: EntityRecord[];
    custom_mechanics: EntityRecord[];
    items: EntityRecord[];
    creatures: EntityRecord[];
  };
}

/**
 * Minimal entity record for change detection
 */
export interface EntityRecord {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

/**
 * Description of a database change
 */
export interface EntityChange {
  /** Type of entity (table name) */
  entity_type: string;

  /** Entity ID */
  entity_id: string;

  /** Entity name for human-readable logs */
  entity_name: string;

  /** Type of change */
  change_type: 'addition' | 'modification';

  /** Which memory system this belongs to */
  memory_system: string;

  /** Human-readable description of the change */
  details: string;
}

/**
 * Collection of detected changes
 */
export interface DatabaseChanges {
  additions: EntityChange[];
  modifications: EntityChange[];
}

// ============================================================================
// CATEGORY TABLE CONFIGURATION
// ============================================================================

/**
 * Map category tables to their memory systems
 */
const CATEGORY_MEMORY_MAP: Record<string, string> = {
  npcs: 'political-web-memory',
  factions: 'political-web-memory',
  locations: 'geographic-memory',
  session_recaps: 'campaign-story-memory',
  quests: 'campaign-story-memory',
  player_characters: 'campaign-story-memory',
  lore_entries: 'world-foundations-memory',
  world_rules: 'world-foundations-memory',
  planar_forces: 'world-foundations-memory',
  session_preps: 'campaign-story-memory',
  custom_mechanics: 'world-foundations-memory',
  items: 'inventory-database',
  creatures: 'world-foundations-memory'
};

/**
 * All category tables from Feature 014
 */
const CATEGORY_TABLES = Object.keys(CATEGORY_MEMORY_MAP);

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DatabaseChangeDetectionService {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Capture current database state for a campaign
   */
  captureSnapshot(campaignId: string, sessionNumber: number): DatabaseSnapshot {
    const timestamp = Math.floor(Date.now() / 1000);
    const snapshot: DatabaseSnapshot = {
      timestamp,
      session_number: sessionNumber,
      entities: {
        npcs: this.getEntityRecords('npcs', campaignId),
        locations: this.getEntityRecords('locations', campaignId),
        factions: this.getEntityRecords('factions', campaignId),
        session_recaps: this.getEntityRecords('session_recaps', campaignId),
        quests: this.getEntityRecords('quests', campaignId),
        player_characters: this.getEntityRecords('player_characters', campaignId),
        lore_entries: this.getEntityRecords('lore_entries', campaignId),
        world_rules: this.getEntityRecords('world_rules', campaignId),
        planar_forces: this.getEntityRecords('planar_forces', campaignId),
        session_preps: this.getEntityRecords('session_preps', campaignId),
        custom_mechanics: this.getEntityRecords('custom_mechanics', campaignId),
        items: this.getEntityRecords('items', campaignId),
        creatures: this.getEntityRecords('creatures', campaignId)
      }
    };

    return snapshot;
  }

  /**
   * Get entity records for a specific table
   */
  private getEntityRecords(table: string, campaignId: string): EntityRecord[] {
    try {
      const query = `
        SELECT id, name, created_at, updated_at
        FROM ${table}
        WHERE campaign_id = ?
        ORDER BY created_at ASC
      `;

      const rows = this.db.prepare(query).all(campaignId) as EntityRecord[];
      return rows;
    } catch (error) {
      // Table might not exist in older migrations
      console.warn(`Warning: Could not query table ${table}:`, error);
      return [];
    }
  }

  /**
   * Detect changes between two snapshots
   */
  detectChanges(
    previousSnapshot: DatabaseSnapshot | null,
    currentSnapshot: DatabaseSnapshot
  ): DatabaseChanges {
    const additions: EntityChange[] = [];
    const modifications: EntityChange[] = [];

    // If no previous snapshot, all current entities are "additions"
    if (!previousSnapshot) {
      // But we don't log them as changes (user started fresh)
      return { additions, modifications };
    }

    // Compare each category table
    for (const table of CATEGORY_TABLES) {
      const previousEntities = previousSnapshot.entities[table as keyof typeof previousSnapshot.entities] || [];
      const currentEntities = currentSnapshot.entities[table as keyof typeof currentSnapshot.entities] || [];

      // Build lookup maps
      const previousMap = new Map(previousEntities.map(e => [e.id, e]));
      const currentMap = new Map(currentEntities.map(e => [e.id, e]));

      // Detect additions (exists in current, not in previous)
      for (const current of currentEntities) {
        if (!previousMap.has(current.id)) {
          additions.push({
            entity_type: table,
            entity_id: current.id,
            entity_name: current.name,
            change_type: 'addition',
            memory_system: CATEGORY_MEMORY_MAP[table],
            details: `Added ${this.singularize(table)}: ${current.name} to ${CATEGORY_MEMORY_MAP[table]}`
          });
        }
      }

      // Detect modifications (exists in both, but updated_at changed)
      for (const current of currentEntities) {
        const previous = previousMap.get(current.id);
        if (previous && current.updated_at > previous.updated_at) {
          modifications.push({
            entity_type: table,
            entity_id: current.id,
            entity_name: current.name,
            change_type: 'modification',
            memory_system: CATEGORY_MEMORY_MAP[table],
            details: `Modified ${this.singularize(table)}: ${current.name}`
          });
        }
      }
    }

    return { additions, modifications };
  }

  /**
   * Detect changes since a specific timestamp
   * Useful for finding changes between session imports
   */
  detectChangesSinceTimestamp(
    campaignId: string,
    sinceTimestamp: number,
    currentSessionNumber: number
  ): DatabaseChanges {
    const additions: EntityChange[] = [];
    const modifications: EntityChange[] = [];

    for (const table of CATEGORY_TABLES) {
      // Find new entities (created after timestamp)
      const newEntities = this.getEntitiesCreatedAfter(table, campaignId, sinceTimestamp);
      for (const entity of newEntities) {
        additions.push({
          entity_type: table,
          entity_id: entity.id,
          entity_name: entity.name,
          change_type: 'addition',
          memory_system: CATEGORY_MEMORY_MAP[table],
          details: `Added ${this.singularize(table)}: ${entity.name} to ${CATEGORY_MEMORY_MAP[table]}`
        });
      }

      // Find modified entities (updated after timestamp, but created before)
      const modifiedEntities = this.getEntitiesModifiedAfter(table, campaignId, sinceTimestamp);
      for (const entity of modifiedEntities) {
        modifications.push({
          entity_type: table,
          entity_id: entity.id,
          entity_name: entity.name,
          change_type: 'modification',
          memory_system: CATEGORY_MEMORY_MAP[table],
          details: `Modified ${this.singularize(table)}: ${entity.name}`
        });
      }
    }

    return { additions, modifications };
  }

  /**
   * Get entities created after a timestamp
   */
  private getEntitiesCreatedAfter(
    table: string,
    campaignId: string,
    timestamp: number
  ): EntityRecord[] {
    try {
      const query = `
        SELECT id, name, created_at, updated_at
        FROM ${table}
        WHERE campaign_id = ? AND created_at > ?
        ORDER BY created_at ASC
      `;

      return this.db.prepare(query).all(campaignId, timestamp) as EntityRecord[];
    } catch (error) {
      console.warn(`Warning: Could not query table ${table}:`, error);
      return [];
    }
  }

  /**
   * Get entities modified after a timestamp (but created before)
   */
  private getEntitiesModifiedAfter(
    table: string,
    campaignId: string,
    timestamp: number
  ): EntityRecord[] {
    try {
      const query = `
        SELECT id, name, created_at, updated_at
        FROM ${table}
        WHERE campaign_id = ?
          AND updated_at > ?
          AND created_at <= ?
        ORDER BY updated_at ASC
      `;

      return this.db.prepare(query).all(campaignId, timestamp, timestamp) as EntityRecord[];
    } catch (error) {
      console.warn(`Warning: Could not query table ${table}:`, error);
      return [];
    }
  }

  /**
   * Filter changes by source (AI vs manual)
   * Currently not implemented - would require tracking source in category tables
   * For now, returns all changes
   */
  filterChangesBySource(
    changes: DatabaseChanges,
    source: 'ai' | 'manual' | 'all'
  ): DatabaseChanges {
    if (source === 'all') {
      return changes;
    }

    // TODO: Implement source tracking in category tables
    // For now, return all changes
    console.warn('Source filtering not yet implemented, returning all changes');
    return changes;
  }

  /**
   * Convert plural table name to singular entity name
   */
  private singularize(tableName: string): string {
    const singularMap: Record<string, string> = {
      npcs: 'NPC',
      locations: 'Location',
      factions: 'Faction',
      session_recaps: 'Session Recap',
      quests: 'Quest',
      player_characters: 'Player Character',
      lore_entries: 'Lore Entry',
      world_rules: 'World Rule',
      planar_forces: 'Planar Force',
      session_preps: 'Session Prep',
      custom_mechanics: 'Custom Mechanic',
      items: 'Item',
      creatures: 'Creature'
    };

    return singularMap[tableName] || tableName;
  }

  /**
   * Format changes as human-readable observations for import_batch node
   */
  formatChangesAsObservations(changes: DatabaseChanges): string[] {
    const observations: string[] = [];

    // Group by memory system for cleaner logs
    const byMemory: Record<string, EntityChange[]> = {};

    const allChanges = [...changes.additions, ...changes.modifications];
    for (const change of allChanges) {
      if (!byMemory[change.memory_system]) {
        byMemory[change.memory_system] = [];
      }
      byMemory[change.memory_system].push(change);
    }

    // Format each memory system's changes
    for (const [memory, memoryChanges] of Object.entries(byMemory)) {
      for (const change of memoryChanges) {
        observations.push(change.details);
      }
    }

    return observations;
  }

  /**
   * Get summary statistics for changes
   */
  getChangeSummary(changes: DatabaseChanges): string {
    const totalAdditions = changes.additions.length;
    const totalModifications = changes.modifications.length;
    const total = totalAdditions + totalModifications;

    if (total === 0) {
      return 'No database changes detected';
    }

    const parts: string[] = [];
    if (totalAdditions > 0) {
      parts.push(`${totalAdditions} addition${totalAdditions !== 1 ? 's' : ''}`);
    }
    if (totalModifications > 0) {
      parts.push(`${totalModifications} modification${totalModifications !== 1 ? 's' : ''}`);
    }

    return `${total} change${total !== 1 ? 's' : ''}: ${parts.join(', ')}`;
  }
}

/**
 * Singleton instance (created with database connection)
 */
let changeDetectionServiceInstance: DatabaseChangeDetectionService | null = null;

export function createDatabaseChangeDetectionService(db: Database.Database): DatabaseChangeDetectionService {
  changeDetectionServiceInstance = new DatabaseChangeDetectionService(db);
  return changeDetectionServiceInstance;
}

export function getDatabaseChangeDetectionService(): DatabaseChangeDetectionService {
  if (!changeDetectionServiceInstance) {
    throw new Error('DatabaseChangeDetectionService not initialized');
  }
  return changeDetectionServiceInstance;
}
