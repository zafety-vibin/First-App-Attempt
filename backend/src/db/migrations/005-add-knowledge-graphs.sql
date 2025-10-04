-- Migration 005: Create KnowledgeGraph, GraphNode, and GraphEdge tables
-- Feature: 005-create-the-ai
-- Date: 2025-10-03
-- CRITICAL: Feature 011 did NOT create these tables - Feature 005 creates them

CREATE TABLE IF NOT EXISTS knowledge_graphs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('geographical', 'political_web', 'world_foundations', 'campaign_story')),
  last_updated INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  UNIQUE (campaign_id, type)
);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'location', 'npc', 'faction', 'plot_thread'
  name TEXT NOT NULL,
  attributes TEXT NOT NULL, -- JSONB: {description, tags, custom_fields}
  source_card_id TEXT, -- Card that originated this node (if from Import AI)
  information_level_id TEXT, -- For filtering (FR-052: nodes inherit card's level)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_card_id) REFERENCES cards(id) ON DELETE SET NULL,
  FOREIGN KEY (information_level_id) REFERENCES information_levels(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- e.g., 'located_in', 'allied_with', 'descends_from'
  attributes TEXT NOT NULL, -- JSONB: {strength, description, custom_fields}
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (graph_id) REFERENCES knowledge_graphs(id) ON DELETE CASCADE,
  FOREIGN KEY (source_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_node_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
);

-- Indexes for knowledge_graphs
CREATE INDEX IF NOT EXISTS idx_knowledge_graphs_campaign ON knowledge_graphs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_graphs_type ON knowledge_graphs(type);

-- Indexes for graph_nodes
CREATE INDEX IF NOT EXISTS idx_graph_nodes_graph ON graph_nodes(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_level ON graph_nodes(information_level_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_source ON graph_nodes(source_card_id);

-- Indexes for graph_edges
CREATE INDEX IF NOT EXISTS idx_graph_edges_graph ON graph_edges(graph_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_type ON graph_edges(relationship_type);
