import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || '/app/data/vvd-mimic.db';

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initialize database with WAL mode
export const db = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Run database migrations
 */
export function runMigrations(): void {
  console.log('Running database migrations...');

  // Read schema.sql
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Execute schema
  db.exec(schema);

  // Insert migration version if not exists
  const version = 1;
  const existing = db
    .prepare('SELECT version FROM schema_version WHERE version = ?')
    .get(version);

  if (!existing) {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
    console.log(`✓ Migration version ${version} applied`);
  }

  console.log('✓ Database initialized');
  logDatabaseInfo();
}

/**
 * Log database information for debugging
 */
function logDatabaseInfo(): void {
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    )
    .all() as { name: string }[];

  console.log(`Database tables: ${tables.map((t) => t.name).join(', ')}`);
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  db.close();
  console.log('✓ Database connection closed');
}

// Run migrations on module load
runMigrations();

// Graceful shutdown
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
