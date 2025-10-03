-- Migration 011: Add MCP Tool Logs table for tracking Model Context Protocol tool usage
-- This table logs all MCP tool invocations for auditing and debugging purposes

CREATE TABLE IF NOT EXISTS mcp_tool_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  campaign_id TEXT,
  user_id TEXT NOT NULL,
  parameters TEXT NOT NULL, -- JSON string of tool parameters
  result_status TEXT NOT NULL CHECK(result_status IN ('success', 'error')),
  error_message TEXT, -- Only populated when result_status = 'error'
  execution_time_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL, -- Unix timestamp

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Index for querying by campaign (most common use case)
CREATE INDEX idx_mcp_tool_logs_campaign ON mcp_tool_logs(campaign_id, created_at DESC);

-- Index for querying by user (audit purposes)
CREATE INDEX idx_mcp_tool_logs_user ON mcp_tool_logs(user_id, created_at DESC);

-- Index for querying by tool name (debugging and analytics)
CREATE INDEX idx_mcp_tool_logs_tool ON mcp_tool_logs(tool_name);