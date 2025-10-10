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
  {
    version: 2,
    description: 'Change root cards from parent_id = NULL to parent_id = "0"',
    up: (db) => {
      console.log('Updating root cards: parent_id NULL → "0"');
      const stmt = db.prepare('UPDATE cards SET parent_id = ? WHERE parent_id IS NULL');
      const result = stmt.run('0');
      console.log(`Updated ${result.changes} root cards to use parent_id = "0"`);
    },
    down: (db) => {
      console.log('Reverting root cards: parent_id "0" → NULL');
      db.prepare('UPDATE cards SET parent_id = NULL WHERE parent_id = ?').run('0');
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
