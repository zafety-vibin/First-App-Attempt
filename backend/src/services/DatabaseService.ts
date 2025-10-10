import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || '/app/data/wrldbldr-mcp-manager.db';

// Ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Initialize database with WAL mode
export const db: Database.Database = new Database(DB_PATH, {
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
});

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Verify JSON1 extension is available (required for Feature 003 - Card-Based Content Architecture)
try {
  db.prepare("SELECT json('{}')").get();
  console.log('✓ SQLite JSON1 extension available');
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
  console.log('Running database migrations...');

  // Migration 1: Base schema (Feature 002)
  runMigration(1, () => {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
  });

  // Migration 2: Change root cards from parent_id = NULL to parent_id = "0" (REVERTED IN MIGRATION 12)
  runMigration(2, () => {
    console.log('Updating root cards: parent_id NULL → "0"');
    db.pragma('foreign_keys = OFF');
    const stmt = db.prepare('UPDATE cards SET parent_id = ? WHERE parent_id IS NULL');
    const result = stmt.run('0');
    db.pragma('foreign_keys = ON');
    console.log(`  ✓ Updated ${result.changes} root cards to use parent_id = "0"`);
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
        console.log(`  ✓ Applied ${file}`);
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
      console.log(`  ✓ Applied 004-add-images.sql`);
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
        console.log(`  ✓ Applied ${file}`);
      }
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
        console.log(`  ✓ Applied ${file}`);
      }
    }
  });

  // Migration 6: Feature 005 - AI Import and Planning Workflows
  runMigration(6, () => {
    const migrationsDir = path.join(__dirname, '../db/migrations');
    const migration005Files = [
      '005-add-import-tables.sql',
      '005-add-planning-table.sql',
      '005-add-knowledge-graphs.sql',
      '005-extend-cards-import.sql',
    ];

    for (const file of migration005Files) {
      const filePath = path.join(migrationsDir, file);
      if (fs.existsSync(filePath)) {
        const sql = fs.readFileSync(filePath, 'utf-8');
        db.exec(sql);
        console.log(`  ✓ Applied ${file}`);
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
      console.log(`  ✓ Applied 011-mcp-tool-logs.sql`);
    }
  });

  // Migration 12: REMOVED - This was a mistake, we want to keep "0" for root cards
  // See migration 13 for the correct fix

  // Migration 13: Remove foreign key constraint on parent_id and restore "0" for root cards
  runMigration(13, () => {
    console.log('Fixing parent_id: removing FK constraint and restoring "0" for root cards');

    // SQLite requires recreating table to remove foreign key
    db.pragma('foreign_keys = OFF');

    // Drop cards_new if it exists from a previous failed migration
    db.exec(`DROP TABLE IF EXISTS cards_new;`);

    // Create new cards table without parent_id FK constraint
    db.exec(`
      CREATE TABLE cards_new (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        parent_id TEXT,
        campaign_id TEXT NOT NULL,
        path TEXT NOT NULL,
        position INTEGER NOT NULL,
        depth INTEGER NOT NULL DEFAULT 0,
        title TEXT,
        content TEXT,
        metadata TEXT,
        cover_image_url TEXT,
        icon_emoji TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        information_level_id TEXT DEFAULT 'system',
        import_session_id TEXT,
        import_batch_id TEXT,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (information_level_id) REFERENCES information_levels(id),
        FOREIGN KEY (import_session_id) REFERENCES import_sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (import_batch_id) REFERENCES import_batches(id) ON DELETE SET NULL,
        CHECK (type IN ('page', 'database', 'text', 'image')),
        CHECK (depth >= 0 AND depth <= 50),
        CHECK (length(icon_emoji) <= 4)
      );
    `);

    // Copy data from old table
    db.exec(`
      INSERT INTO cards_new (
        id, type, parent_id, campaign_id, path, position, depth,
        title, content, metadata, cover_image_url, icon_emoji,
        created_at, updated_at, information_level_id,
        import_session_id, import_batch_id
      )
      SELECT
        id, type, parent_id, campaign_id, path, position, depth,
        title, content, metadata, cover_image_url, icon_emoji,
        created_at, updated_at, information_level_id,
        import_session_id, import_batch_id
      FROM cards;
    `);

    // Drop old table
    db.exec(`DROP TABLE cards;`);

    // Rename new table
    db.exec(`ALTER TABLE cards_new RENAME TO cards;`);

    // Recreate indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cards_campaign ON cards(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_cards_parent ON cards(parent_id);
      CREATE INDEX IF NOT EXISTS idx_cards_path ON cards(path);
      CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(parent_id, position);
      CREATE INDEX IF NOT EXISTS idx_cards_information_level ON cards(information_level_id);
      CREATE INDEX IF NOT EXISTS idx_cards_hierarchical_secret ON cards(information_level_id, path);
    `);

    // Update NULL parent_id to "0"
    const result = db.prepare('UPDATE cards SET parent_id = ? WHERE parent_id IS NULL').run('0');
    console.log(`  ✓ Updated ${result.changes} root cards to use parent_id = "0"`);

    db.pragma('foreign_keys = ON');
  });

  console.log('✓ Database initialized');
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
    console.log(`✓ Migration version ${version} applied`);
  } else {
    console.log(`  Migration version ${version} already applied`);
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
