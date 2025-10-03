# Data Model: Model Context Protocol (MCP) Integration

**Feature**: 011-create-model-context
**Date**: 2025-10-03

## Overview
MCP Feature 011 adds **1 new table** for tool call logging. All other entities (Cards, Knowledge Graphs, Sessions) are reused from existing features without modifications.

---

## New Entities

### MCPToolLog
**Purpose**: Audit log of all AI tool calls for debugging and transparency

**Table Schema**:
```sql
CREATE TABLE IF NOT EXISTS mcp_tool_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,                    -- e.g., 'read_card', 'update_graph'
  campaign_id TEXT,                            -- FK to campaigns (NULL for global operations)
  user_id TEXT NOT NULL,                       -- FK to users (from BYOLLM session)
  parameters TEXT NOT NULL,                    -- JSONB - tool input parameters
  result_status TEXT NOT NULL CHECK(result_status IN ('success', 'error')),
  error_message TEXT,                          -- NULL if success, error details if failed
  execution_time_ms INTEGER NOT NULL,          -- How long tool took to execute
  created_at INTEGER NOT NULL,                 -- Unix timestamp

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_mcp_tool_logs_campaign ON mcp_tool_logs(campaign_id, created_at DESC);
CREATE INDEX idx_mcp_tool_logs_user ON mcp_tool_logs(user_id, created_at DESC);
CREATE INDEX idx_mcp_tool_logs_tool ON mcp_tool_logs(tool_name);
```

**Fields**:
- `id`: Auto-increment primary key
- `tool_name`: Name of MCP tool called (e.g., "read_card", "update_graph")
- `campaign_id`: Which campaign the operation targeted (NULL for cross-campaign queries)
- `user_id`: Who initiated the tool call (from BYOLLM OAuth session)
- `parameters`: JSON string of tool input parameters (e.g., `{"card_id": 123}`)
- `result_status`: 'success' or 'error'
- `error_message`: Error details if failed (NULL on success)
- `execution_time_ms`: Performance tracking (milliseconds)
- `created_at`: When tool was called (Unix timestamp)

**Relationships**:
- Many-to-one with campaigns (CASCADE delete)
- Many-to-one with users (CASCADE delete)

**Validation Rules**:
- `tool_name` must be in allowed set (29 tools total)
- `execution_time_ms` >= 0
- `result_status` enum enforced by CHECK constraint
- `error_message` required if `result_status = 'error'`, NULL otherwise

**State Transitions**: N/A (immutable log entries)

**Indexes**:
- Campaign + created_at DESC (for viewing campaign audit trail)
- User + created_at DESC (for viewing user's AI activity)
- Tool name (for tool-specific debugging)

---

## Existing Entities (Reused, No Changes)

### Cards (from Feature 003)
**Reused For**: All card operation tools (read_card, create_card, update_card, delete_card, search_cards, move_card)

**Relevant Fields**:
- `id` (INTEGER PRIMARY KEY)
- `campaign_id` (TEXT FK) - Permission filtering
- `parent_id` (INTEGER FK) - Hierarchy navigation
- `title` (TEXT) - Search queries
- `card_type` (TEXT) - Filtering by type
- `content` (TEXT JSONB) - Rich text content
- `information_level_id` (INTEGER FK) - DM/Player visibility
- `position` (INTEGER) - Sibling ordering
- `created_at`, `updated_at`

**MCP Operations**:
- Read: SELECT by id, campaign_id
- Create: INSERT with hierarchy validation
- Update: UPDATE title, content, information_level_id
- Delete: DELETE with child protection check
- Search: SELECT WHERE title LIKE ? OR content LIKE ?
- Move: UPDATE parent_id, position with circular ref detection

### Knowledge Graphs (from Feature 006)
**Reused For**: Graph tool operations (query_graph, update_graph)

**Tables**:
- `knowledge_graphs` (id, campaign_id, graph_type, toggle_state, created_at, updated_at)
- `graph_nodes` (id, graph_id, name, node_type, attributes JSONB, information_level_id)
- `graph_edges` (id, graph_id, from_node_id, to_node_id, relationship_type, attributes JSONB)

**MCP Operations**:
- Query: SELECT nodes/edges by graph_type, node_name, relationship_type
- List Nodes: SELECT nodes WHERE graph_id = ? (with active filtering)
- Get Relationships: SELECT edges WHERE from_node_id = ? OR to_node_id = ?
- Update: INSERT/UPDATE/DELETE nodes/edges atomically

### Sessions (from Feature 002)
**Reused For**: Session recap tools (get_session_recaps, get_timeline_events)

**Relevant Fields**:
- `session_id` (TEXT PRIMARY KEY)
- `campaign_id` (TEXT FK) - Permission filtering
- `recap` (TEXT) - Session summary for AI context
- `timeline_events` (TEXT JSONB) - Structured events for temporal queries
- `session_date` (INTEGER) - Chronological ordering
- `tags` (TEXT) - Filtering (e.g., "active", "party-relevant")

**MCP Operations**:
- Get Recaps: SELECT recap WHERE campaign_id = ? ORDER BY session_date DESC LIMIT ?
- Get Timeline: SELECT timeline_events WHERE session_date BETWEEN ? AND ?

### Information Levels (from Feature 004)
**Reused For**: Permission filtering in all tools

**Relevant Fields**:
- `id` (INTEGER PRIMARY KEY)
- `campaign_id` (TEXT FK)
- `name` (TEXT) - e.g., "DM Secret", "Player Knowledge"
- `hierarchy_level` (INTEGER) - Filtering threshold

**MCP Operations**:
- Filter by level: WHERE information_level_id <= ? (based on AI context mode)

---

## MCP Tool Categories

### 1. Card Operations (6 tools)
| Tool | Entities Used | Key Operations |
|------|---------------|----------------|
| read_card | Cards | SELECT by id + campaign_id |
| create_card | Cards | INSERT with hierarchy validation |
| update_card | Cards | UPDATE title/content/info_level |
| delete_card | Cards | DELETE with child count check |
| search_cards | Cards | SELECT WHERE title/content LIKE ? |
| move_card | Cards | UPDATE parent_id + circular ref check |

### 2. Hierarchy Navigation (5 tools)
| Tool | Entities Used | Key Operations |
|------|---------------|----------------|
| get_card_path | Cards | Recursive parent traversal to root |
| get_subtree | Cards | Recursive child traversal with depth limit |
| list_children | Cards | SELECT WHERE parent_id = ? |
| get_siblings | Cards | SELECT WHERE parent_id = (same parent) |
| get_ancestor | Cards | Traverse parent N levels up |

### 3. Knowledge Graphs (4 tools)
| Tool | Entities Used | Key Operations |
|------|---------------|----------------|
| query_graph | KnowledgeGraphs, GraphNodes, GraphEdges | SELECT nodes/edges with filters |
| list_graph_nodes | GraphNodes | SELECT WHERE graph_id + active filtering |
| get_node_relationships | GraphEdges | SELECT WHERE from/to_node_id |
| update_graph | GraphNodes, GraphEdges | INSERT/UPDATE/DELETE (atomic) |

### 4. Session Recaps (2 tools)
| Tool | Entities Used | Key Operations |
|------|---------------|----------------|
| get_session_recaps | Sessions | SELECT recap + pagination |
| get_timeline_events | Sessions | SELECT timeline_events + date range |

### 5. Information Level Discovery (2 tools)
| Tool | Entities Used | Key Operations |
|------|---------------|----------------|
| list_information_levels | InformationLevels | SELECT all levels for campaign |
| get_information_level_by_name | InformationLevels | SELECT WHERE name LIKE ? (fuzzy match) |

### 6. Database Card Operations (3 tools)
| Tool | Entities Used | Key Operations |
|------|---------------|----------------|
| query_database_card | Cards (database type) | SELECT rows with filters + pagination |
| create_database_entry | Cards (database type) | INSERT row into database card |
| update_database_entry | Cards (database type) | UPDATE row in database card |

### 7. Map Card Operations (2 tools)
| Tool | Entities Used | Key Operations |
|------|---------------|----------------|
| list_map_pins | Cards (map-enabled pins) | SELECT pins WHERE parent_id = map_card |
| create_map_pin | Cards (create pin child) | INSERT pin card with x,y coordinates |

### 8. Resources & Prompts (5 tools)
| Tool | Entities Used | Key Operations |
|------|---------------|----------------|
| campaign://cards | Cards | Browsable hierarchy view |
| campaign://recaps | Sessions | Browsable recap timeline |
| campaign://graphs/{type} | Knowledge Graphs | Browsable graph nodes/edges |
| import_workflow | N/A | Structured prompt template |
| planning_workflow | N/A | Structured prompt template |

---

## Data Flow Diagram

```
AI Request (Feature 005)
  ↓
MCP Server (stdio)
  ↓
Tool Handler (read_card, create_card, etc.)
  ↓
Permissions Middleware ←→ Information Levels
  ↓                          (filter by hierarchy_level)
  ↓
Transaction Middleware
  ↓
[db.transaction()]
  ↓
CardService / KnowledgeGraphService (existing)
  ↓
SQLite (Cards, Knowledge Graphs, Sessions)
  ↓
Response → AI
  ↓
MCPToolLog (audit entry)
```

---

## Migration File

**File**: `backend/src/db/migrations/011-mcp-tool-logs.sql`

```sql
-- Add MCP tool call logging table
CREATE TABLE IF NOT EXISTS mcp_tool_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  campaign_id TEXT,
  user_id TEXT NOT NULL,
  parameters TEXT NOT NULL,
  result_status TEXT NOT NULL CHECK(result_status IN ('success', 'error')),
  error_message TEXT,
  execution_time_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL,

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_mcp_tool_logs_campaign ON mcp_tool_logs(campaign_id, created_at DESC);
CREATE INDEX idx_mcp_tool_logs_user ON mcp_tool_logs(user_id, created_at DESC);
CREATE INDEX idx_mcp_tool_logs_tool ON mcp_tool_logs(tool_name);
```

---

## Performance Considerations

**Query Optimization**:
- Card operations: Indexed by campaign_id, parent_id (existing indexes)
- Graph operations: Indexed by graph_id, from_node_id, to_node_id (existing indexes from Feature 006)
- Tool logs: Indexed by campaign_id + created_at for audit trail queries

**Transaction Scope**:
- Keep transactions < 100ms (single-entity operations)
- Batch operations (e.g., create 10 cards) use single transaction
- Minimize lock contention by consistent lock ordering

**Concurrent Access**:
- WAL mode (already enabled) allows concurrent reads during writes
- Write locks serialize automatically via SQLite
- Target: 5 concurrent tool calls without deadlocks

---

## Validation Summary

| Entity | Required Fields | Optional Fields | Constraints |
|--------|----------------|-----------------|-------------|
| MCPToolLog | tool_name, user_id, parameters, result_status, execution_time_ms, created_at | campaign_id, error_message | result_status IN ('success', 'error'), execution_time_ms >= 0 |
| Cards (existing) | campaign_id, title, card_type | parent_id, content, information_level_id, position | No circular parent_id |
| GraphNodes (existing) | graph_id, name, node_type | attributes, information_level_id | graph_id FK valid |
| GraphEdges (existing) | graph_id, from_node_id, to_node_id, relationship_type | attributes | from/to nodes exist |

---

**Next Phase**: Generate API contracts (tool schemas in JSON Schema format)
