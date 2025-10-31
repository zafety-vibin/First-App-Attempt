import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || '/app/data/wrldbldr-mcp-manager.db';

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Detect if running as MCP server (stdio must be clean for JSON-RPC)
const isMCPMode = process.argv.some(arg => arg.includes('mcp/server'));

// Initialize database with WAL mode (explicit type annotation for TypeScript)
export const db: Database.Database = new Database(DB_PATH, {
  verbose: !isMCPMode && process.env.NODE_ENV === 'development' ? console.error : undefined,
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Verify JSON1 extension is available (required for Feature 003 - Card-Based Content Architecture)
try {
  db.prepare("SELECT json('{}')").get();
  if (!isMCPMode) console.error('✓ SQLite JSON1 extension available');
} catch (error) {
  console.error('✗ SQLite JSON1 extension not available');
  console.error('Feature 003 (Card-Based Content Architecture) requires JSON1 extension');
  console.error('Please ensure your SQLite version includes JSON1 support');
  process.exit(1);
}

/**
 * Run database migrations
 */
export function runMigrations(): void {
  if (!isMCPMode) console.error('Running database migrations...');

  // Migration 1: Base schema (Feature 002)
  runMigration(1, () => {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  });

  // Migration 3: Feature 003 - Card-Based Content Architecture
  runMigration(3, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const migration003Files = [
      '003-add-settings.sql',
      '003-extend-campaigns.sql',
      '003-add-cards.sql',
      '003-add-card-indexes.sql',
      '003-create-default-cards.sql',
    ];

    for (const file of migration003Files) {
      const filePath = path.join(migrationsDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        db.exec(sql);
        if (!isMCPMode) console.error(`  ✓ Applied ${file}`);
      }
    }
  });

  // Migration 4: Feature 003 - Image Upload
  runMigration(4, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '004-add-images.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 004-add-images.sql`);
    }
  });

  // Migration 5: Feature 004 - Information Level-Based Filtering
  runMigration(5, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const migration005Files = [
      '005-add-information-levels.sql',
      '005-extend-cards.sql',
      '005-add-filtering-indexes.sql',
    ];

    for (const file of migration005Files) {
      const filePath = path.join(migrationsDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        db.exec(sql);
        if (!isMCPMode) console.error(`  ✓ Applied ${file}`);
      }
    }
  });

  // Migration 6: Feature 006 - Knowledge Graph Architecture
  runMigration(6, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '006-knowledge-graphs.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 006-knowledge-graphs.sql`);
    }
  });

  // Migration 8: Feature 008 - BYOLLM Configuration
  runMigration(8, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const migration008Files = [
      '008-add-byollm-tables.sql',
      '008-add-byollm-indexes.sql',
      '008-test-encryption.sql',
    ];

    for (const file of migration008Files) {
      const filePath = path.join(migrationsDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        db.exec(sql);
        if (!isMCPMode) console.error(`  ✓ Applied ${file}`);
      }
    }
  });

  // Migration 11: Feature 011 - Model Context Protocol Integration
  runMigration(11, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '011-mcp-tool-logs.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 011-mcp-tool-logs.sql`);
    }
  });

  // Migration 14: Feature 014 - Structured Category Database Foundation
  runMigration(14, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '014-category-tables.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 014-category-tables.sql`);
    }
  });

  // Migration 15: Feature 015 - Dashboard Canvas System
  runMigration(15, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '015-dashboard-canvas.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 015-dashboard-canvas.sql`);
    }
  });

  // Migration 16: Feature 016 - Campaign Setup Wizard
  runMigration(16, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '016-campaign-settings.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 016-campaign-settings.sql`);
    }
  });

  // Migration 18: Feature 018 - External API Audit Logging
  runMigration(18, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '018-api-requests.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 018-api-requests.sql`);
    }
  });

  // Migration 19: Fix - Add missing session_number column
  runMigration(19, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '019-add-session-number.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 019-add-session-number.sql`);
    }
  });

  // Migration 21: Geographic Map System (Feature 021)
  runMigration(21, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '021-geographic-maps.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 021-geographic-maps.sql`);
    }
  });

  // Migration 22: Campaign Bible (Campaign Wizard Enhancement)
  runMigration(22, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '022-campaign-bible.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 022-campaign-bible.sql`);
    }
  });

  // Migration 23: Spatial Navigator (Geographic Navigator Redesign)
  runMigration(23, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '023-spatial-navigator.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 023-spatial-navigator.sql`);
    }
  });

  // Migration 24: Fix information level ID mismatch
  runMigration(24, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const filePath = path.join(migrationsDir, '024-fix-information-level-ids.sql');
    if (fs.existsSync(filePath)) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      if (!isMCPMode) console.error(`  ✓ Applied 024-fix-information-level-ids.sql`);
    }
  });

  if (!isMCPMode) console.error('✓ Database initialized');
  logDatabaseInfo();
}

/**
 * Run a single migration if not already applied
 */
function runMigration(version: number, migrationFn: () => void): void {
  // Ensure schema_version table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  const existing = db
    .prepare('SELECT version FROM schema_version WHERE version = ?')
    .get(version);

  if (!existing) {
    migrationFn();
    db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, strftime(\'%s\', \'now\'))').run(version);
    if (!isMCPMode) console.error(`✓ Migration version ${version} applied`);
  } else {
    if (!isMCPMode) console.error(`  Migration version ${version} already applied`);
  }
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

  if (!isMCPMode) console.error(`Database tables: ${tables.map((t) => t.name).join(', ')}`);
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
