import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration definition
 */
export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
  down?: (db: Database.Database) => void;
}

/**
 * All database migrations
 * Version 1: Initial schema from schema.sql
 */
export const migrations: Migration[] = [
  {
    version: 1,
    description: 'Initial schema - users, campaigns, sessions',
    up: (db) => {
      // Schema is applied via schema.sql in DatabaseService
      // This migration is just for tracking
      console.log('Migration 1: Initial schema applied via schema.sql');
    },
  },
  {
    version: 6,
    description: 'Feature 006 - Knowledge Graph Architecture with confidence decay (knowledge_graphs, graph_nodes, graph_edges, graph_versions)',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '006-knowledge-graphs.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 6: Knowledge graph tables created');
    },
  },
  {
    version: 14,
    description: 'Feature 014 - Category tables (factions, npcs, locations, session_recaps, quests, player_characters, lore_entries, world_rules, planar_forces, session_prep, custom_mechanics, items, creatures, custom_field_definitions)',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '014-category-tables.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 14: Category tables created');
    },
  },
  {
    version: 16,
    description: 'Feature 016 - Campaign settings table for setup wizard',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '016-campaign-settings.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 16: Campaign settings table created');
    },
  },
  {
    version: 18,
    description: 'Feature 018 - API audit logging table for external API operations',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '018-api-requests.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 18: API requests audit table created');
    },
  },
  {
    version: 22,
    description: 'Feature 021 - Campaign Bible table for world-building reference',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '022-campaign-bible.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 22: Campaign Bible table created');
    },
  },
  {
    version: 23,
    description: 'Feature 021 - Spatial Navigator columns (map_pin_x, map_pin_y) for geographic visualization',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '023-spatial-navigator.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 23: Spatial Navigator columns added to locations');
    },
  },
  {
    version: 24,
    description: 'Fix information level IDs (dm_only → dm-secret, common_knowledge → common-knowledge)',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '024-fix-information-level-ids.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 24: Information level IDs fixed across all tables');
    },
  },
  {
    version: 25,
    description: 'Feature 014 - Junction tables for relationships (28 tables replacing JSON arrays)',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '025-junction-tables.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 25: Junction tables created (28 relationship tables)');
    },
  },
  {
    version: 26,
    description: 'Feature 014 - Migrate JSON array data to junction tables',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '026-migrate-json-to-junctions.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 26: JSON array data migrated to junction tables');
    },
  },
  {
    version: 27,
    description: 'Cleanup information level values (public/partial → correct hyphenated IDs)',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '027-cleanup-information-level-values.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 27: Information level values cleaned (public/partial/underscores → hyphens)');
    },
  },
];

/**
 * Get current schema version
 */
export function getCurrentVersion(db: Database.Database): number {
  try {
    const result = db
      .prepare('SELECT MAX(version) as version FROM schema_version')
      .get() as { version: number | null };
    return result.version || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Run pending migrations
 */
export function runPendingMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);
  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log('✓ No pending migrations');
    return;
  }

  console.log(`Running ${pendingMigrations.length} pending migration(s)...`);

  for (const migration of pendingMigrations) {
    console.log(`Applying migration ${migration.version}: ${migration.description}`);

    const transaction = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(migration.version);
    });

    transaction();

    console.log(`✓ Migration ${migration.version} completed`);
  }
}
