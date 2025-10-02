import Database from 'better-sqlite3';

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
  // Future migrations will be added here
  // {
  //   version: 2,
  //   description: 'Add byollm_config column to users',
  //   up: (db) => {
  //     db.exec(`ALTER TABLE users ADD COLUMN byollm_config TEXT`);
  //   },
  //   down: (db) => {
  //     // SQLite doesn't support DROP COLUMN easily
  //     // Would need to recreate table
  //   },
  // },
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
