import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs';

/**
 * Creates a test database with all required tables for Feature 005
 */
export async function createTestDatabase(): Promise<Database.Database> {
  // Use in-memory database for tests
  const db = new Database(':memory:');

  // Enable foreign keys and WAL mode
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  // Create base tables (from earlier features)
  db.exec(`
    -- Users table (Feature 002)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      keycloak_sub TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Campaigns table (Feature 002)
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    -- Sessions table (Feature 002)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      session_number INTEGER NOT NULL,
      name TEXT,
      notes TEXT,
      scheduled_date INTEGER,
      played_date INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      UNIQUE(campaign_id, session_number)
    );

    -- Information levels table (Feature 004)
    CREATE TABLE IF NOT EXISTS information_levels (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      is_system INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      UNIQUE(campaign_id, name)
    );

    -- Cards table (Feature 003 + Feature 005 extensions)
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      content TEXT,
      card_type TEXT DEFAULT 'note',
      position INTEGER DEFAULT 0,
      information_level_id TEXT,
      is_database INTEGER DEFAULT 0,
      database_schema TEXT,
      import_session_id TEXT,
      import_batch_id TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (parent_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (information_level_id) REFERENCES information_levels(id),
      FOREIGN KEY (import_session_id) REFERENCES import_sessions(id),
      FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
    );

    -- Settings table (Feature 003)
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      value TEXT,
      setting_type TEXT DEFAULT 'custom',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      UNIQUE(campaign_id, name)
    );

    -- Session recaps table (for timeline validation)
    CREATE TABLE IF NOT EXISTS session_recaps (
      id TEXT PRIMARY KEY,
      session_number INTEGER NOT NULL,
      campaign_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );
  `);

  // Create Feature 005 tables
  db.exec(`
    -- Import sessions table
    CREATE TABLE IF NOT EXISTS import_sessions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('uploading', 'processing', 'pending_approval', 'approved', 'reverted')),
      chat_history TEXT NOT NULL,
      approval_summary TEXT,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    -- Import batches table
    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      import_session_id TEXT NOT NULL,
      node_ids TEXT NOT NULL,
      edge_ids TEXT NOT NULL,
      card_ids TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (import_session_id) REFERENCES import_sessions(id) ON DELETE CASCADE
    );

    -- Planning sessions table
    CREATE TABLE IF NOT EXISTS planning_sessions (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
      chat_history TEXT NOT NULL,
      graph_updates TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    -- Knowledge graphs table
    CREATE TABLE IF NOT EXISTS knowledge_graphs (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('geographical', 'political_web', 'world_foundations', 'campaign_story')),
      last_updated INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      UNIQUE(campaign_id, type)
    );

    -- Graph nodes table
    CREATE TABLE IF NOT EXISTS graph_nodes (
      id TEXT PRIMARY KEY,
      graph_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      attributes TEXT NOT NULL,
      source_card_id TEXT,
      information_level_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
      FOREIGN KEY (source_card_id) REFERENCES cards(id) ON DELETE SET NULL,
      FOREIGN KEY (information_level_id) REFERENCES information_levels(id) ON DELETE SET NULL
    );

    -- Graph edges table
    CREATE TABLE IF NOT EXISTS graph_edges (
      id TEXT PRIMARY KEY,
      graph_id TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      attributes TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
      FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cards_campaign ON cards(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_cards_parent ON cards(parent_id);
    CREATE INDEX IF NOT EXISTS idx_cards_import_batch ON cards(import_batch_id);
    CREATE INDEX IF NOT EXISTS idx_import_sessions_campaign ON import_sessions(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_planning_sessions_campaign ON planning_sessions(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_graph_nodes_graph ON graph_nodes(graph_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_graph ON graph_edges(graph_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_node_id);
    CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_node_id);
  `);

  return db;
}

/**
 * Cleans up test database
 */
export async function cleanupTestDatabase(db: Database.Database): Promise<void> {
  if (db) {
    db.close();
  }
}

/**
 * Generates a random ID for testing
 */
export function generateTestId(prefix: string = ''): string {
  const random = randomBytes(8).toString('hex');
  return prefix ? `${prefix}-${random}` : random;
}