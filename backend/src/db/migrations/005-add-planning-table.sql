-- Migration 005: Create PlanningSession table
-- Feature: 005-create-the-ai
-- Date: 2025-10-03

CREATE TABLE IF NOT EXISTS planning_sessions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
  chat_history TEXT NOT NULL, -- JSONB array of {role, content, timestamp}
  graph_updates TEXT NOT NULL, -- JSONB array of GraphUpdate (incremental, not cumulative)
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

-- Indexes for planning_sessions
CREATE INDEX IF NOT EXISTS idx_planning_sessions_campaign ON planning_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_planning_sessions_status ON planning_sessions(status);
