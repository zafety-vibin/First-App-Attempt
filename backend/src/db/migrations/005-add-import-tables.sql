-- Migration 005: Create ImportSession and ImportBatch tables
-- Feature: 005-create-the-ai
-- Date: 2025-10-03

CREATE TABLE IF NOT EXISTS import_sessions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('uploading', 'processing', 'pending_approval', 'approved', 'reverted')),
  chat_history TEXT NOT NULL, -- JSONB array of {role, content, timestamp}
  approval_summary TEXT, -- JSONB: {entities_extracted, nodes_added, edges_added, cards_created}
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  import_session_id TEXT NOT NULL,
  node_ids TEXT NOT NULL, -- JSONB array of GraphNode IDs
  edge_ids TEXT NOT NULL, -- JSONB array of GraphEdge IDs
  card_ids TEXT NOT NULL, -- JSONB array of Card IDs
  created_at INTEGER NOT NULL,
  FOREIGN KEY (import_session_id) REFERENCES import_sessions(id) ON DELETE CASCADE
);

-- Indexes for import tables
CREATE INDEX IF NOT EXISTS idx_import_sessions_campaign ON import_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
CREATE INDEX IF NOT EXISTS idx_import_batches_session ON import_batches(import_session_id);
