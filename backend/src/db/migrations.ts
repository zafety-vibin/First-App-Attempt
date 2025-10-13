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
    version: 14,
    description: 'Feature 014 - Category tables (factions, npcs, locations, session_recaps, quests, player_characters, lore_entries, world_rules, planar_forces, session_prep, custom_mechanics, items, creatures, custom_field_definitions)',
    up: (db) => {
      const migrationPath = path.join(__dirname, 'migrations', '014-category-tables.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      db.exec(sql);
      console.log('Migration 14: Category tables created');
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
