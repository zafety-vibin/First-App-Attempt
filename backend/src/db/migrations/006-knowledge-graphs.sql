-- Migration 006: Knowledge Graph Architecture with Confidence Decay
-- Feature: 006-create-the-knowledge
-- Creates 4 tables: knowledge_graphs, graph_nodes, graph_edges, graph_versions
-- Implements temporal awareness with confidence decay based on memento-mcp pattern

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. KNOWLEDGE GRAPHS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_graphs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  graph_type TEXT NOT NULL,
  graph_name TEXT NOT NULL,
  toggle_state INTEGER NOT NULL DEFAULT 1 CHECK(toggle_state IN (0,1)),
  decay_rate REAL NOT NULL DEFAULT 0.1,
  maintenance_rules TEXT, -- JSONB: user-defined automatic maintenance config
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  current_version_id TEXT,
  backup_version_id TEXT,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, graph_name)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_graphs_campaign ON knowledge_graphs(campaign_id);

-- ============================================================================
-- 2. GRAPH NODES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  name TEXT NOT NULL,
  attributes TEXT NOT NULL DEFAULT '{}', -- JSONB: free-form user-defined content
  observations TEXT, -- JSONB array: [{text, created_at, last_accessed}]
  information_level_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  last_accessed INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (information_level_id) REFERENCES information_levels(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_graph ON graph_nodes(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_node_type ON graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_info_level ON graph_nodes(information_level_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_last_accessed ON graph_nodes(last_accessed);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_pinned ON graph_nodes(pinned);

-- ============================================================================
-- 3. GRAPH EDGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  directed INTEGER NOT NULL DEFAULT 1 CHECK(directed IN (0,1)),
  metadata TEXT, -- JSONB: optional relationship data
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_graph ON graph_edges(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_edge_type ON graph_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_node_id);

-- ============================================================================
-- 4. GRAPH VERSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS graph_versions (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  snapshot_content TEXT NOT NULL, -- JSONB: full graph state {nodes, edges, metadata}
  version_type TEXT NOT NULL CHECK(version_type IN ('current', 'backup')),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE
);

-- Unique partial indexes enforce 1 current + 1 backup per graph
CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_versions_current
  ON graph_versions(graph_id, version_type)
  WHERE version_type = 'current';

CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_versions_backup
  ON graph_versions(graph_id, version_type)
  WHERE version_type = 'backup';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp on knowledge_graphs
CREATE TRIGGER IF NOT EXISTS update_knowledge_graphs_timestamp
AFTER UPDATE ON knowledge_graphs
FOR EACH ROW
BEGIN
  UPDATE knowledge_graphs SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
END;

-- ============================================================================
-- SEED DATA: Default Graph Type Configurations
-- ============================================================================
-- Note: These are metadata about the 4 default graph types and their decay rates.
-- Actual graph instances are created per campaign dynamically.
-- The decay rates follow the confidence-decay.json specification:
--   World-Foundations: 0.0 (never decays, permanent world rules)
--   Political-Web: 0.1 (fades over ~10 weeks, NPC relationships)
--   Geographical: 0.05 (fades over ~20 weeks, locations persist longer)
--   Campaign-Story: 0.2 (fades over ~5 weeks, recent story details)

-- No INSERT statements here - default graph instances are created by CampaignService
-- when a new campaign is initialized (see Feature 006 spec, Phase 3.3)
