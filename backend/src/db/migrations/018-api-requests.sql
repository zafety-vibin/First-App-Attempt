-- Migration: 018-api-requests.sql
-- Feature: External API for Conversational Database Operations
-- Date: 2025-01-10
--
-- Purpose: Create api_requests audit table for comprehensive logging of all
-- external API operations. Tracks operation metadata, parameters, results,
-- and execution timing for debugging and workflow analysis.

CREATE TABLE IF NOT EXISTS api_requests (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT,  -- Keycloak sub, NULL for unauthenticated localhost testing
  operation_type TEXT NOT NULL,
  entity_type TEXT,  -- Category table name ('npcs', 'locations', etc.), 'session_recap', 'knowledge_graph', or NULL for multi-entity queries
  parameters TEXT,  -- JSON string of query filters, create values, update fields, conversational query text
  result_status TEXT NOT NULL,
  result_summary TEXT,  -- Human-readable result description (count of rows, error message if failed, result preview)
  execution_time_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Enum constraints
  CHECK (operation_type IN ('query', 'create', 'update', 'delete', 'navigate_hierarchy', 'query_recap', 'query_graph', 'bulk_operation')),
  CHECK (result_status IN ('success', 'error', 'partial_success'))
);

-- Indexes for efficient querying by campaign, operation type, entity type, timestamp, and status
CREATE INDEX IF NOT EXISTS idx_api_requests_campaign_id ON api_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_operation_type ON api_requests(operation_type);
CREATE INDEX IF NOT EXISTS idx_api_requests_entity_type ON api_requests(entity_type);
CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON api_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_result_status ON api_requests(result_status);

-- Cleanup job placeholder (implement in backend service AuditLogService.cleanupOldLogs())
-- Automated cleanup for 30-day retention policy:
-- DELETE FROM api_requests WHERE created_at < (strftime('%s', 'now') - 2592000);  -- 30 days in seconds
