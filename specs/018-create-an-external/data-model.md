# Data Model: External API for Conversational Database Operations

**Feature**: 018-create-an-external
**Date**: 2025-01-10

## Overview

This document defines the data model for Feature 018's External API. The API operates on existing database tables from Feature 014 (13 category tables) and introduces one new entity for audit logging.

## New Entity: APIRequest (Audit Logging)

**Table Name**: `api_requests`
**Purpose**: Tracks all external API operations for debugging, audit, and workflow analysis

### Schema

```sql
CREATE TABLE IF NOT EXISTS api_requests (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT,  -- Keycloak sub, NULL for unauthenticated testing
  operation_type TEXT NOT NULL,
  entity_type TEXT,  -- Category table name or 'session_recap', 'knowledge_graph', NULL for multi-entity queries
  parameters TEXT,  -- JSON of query filters, create values, update fields, conversational query text
  result_status TEXT NOT NULL,
  result_summary TEXT,  -- Count of rows affected, error message if failed, result preview
  execution_time_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  -- Foreign key constraints
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Constraints
  CHECK (operation_type IN ('query', 'create', 'update', 'delete', 'navigate_hierarchy', 'query_recap', 'query_graph', 'bulk_operation')),
  CHECK (result_status IN ('success', 'error', 'partial_success'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_requests_campaign_id ON api_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_operation_type ON api_requests(operation_type);
CREATE INDEX IF NOT EXISTS idx_api_requests_entity_type ON api_requests(entity_type);
CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON api_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_result_status ON api_requests(result_status);
```

### TypeScript Interface

```typescript
interface APIRequest {
  // Core identification
  id: string;
  campaign_id: string;
  user_id: string | null;  // Keycloak sub, null for localhost testing

  // Operation tracking
  operation_type: 'query' | 'create' | 'update' | 'delete' | 'navigate_hierarchy' | 'query_recap' | 'query_graph' | 'bulk_operation';
  entity_type: string | null;  // One of 13 categories, 'session_recap', 'knowledge_graph', or null
  parameters: string | null;  // JSON string of operation parameters

  // Result tracking
  result_status: 'success' | 'error' | 'partial_success';
  result_summary: string | null;  // Human-readable result description
  execution_time_ms: number;  // Performance tracking

  // Metadata
  created_at: number;  // Unix timestamp
}

// Typed parameters for specific operations
interface QueryParameters {
  filters?: Record<string, any>;
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  conversational_query?: string;
}

interface CreateParameters {
  entity_data: Record<string, any>;
}

interface UpdateParameters {
  entry_id: string;
  updates: Record<string, any>;
}

interface DeleteParameters {
  entry_id: string;
  confirmation?: boolean;
}

interface NavigateHierarchyParameters {
  parent_id: string | null;
  depth?: number;
}

interface QueryRecapParameters {
  timeline_range?: {
    start_session?: number;
    end_session?: number;
  };
  search_query?: string;
}

interface QueryGraphParameters {
  graph_type?: string;
  node_filters?: Record<string, any>;
}
```

### Relationships

- **Belongs To**: Campaign (campaign_id → campaigns.id) - CASCADE delete
- **References**: User (user_id → Keycloak sub) - No FK constraint (testing may be unauthenticated)

### Validation Rules

- `operation_type`: Required, must be one of 8 enumerated values
- `entity_type`: Optional (null for multi-entity queries), must match known category or special type when provided
- `result_status`: Required, must be one of 3 enumerated values
- `execution_time_ms`: Required, must be >= 0
- `parameters`: Must be valid JSON string if provided
- `result_summary`: Optional, recommended for debugging

### Lifecycle

1. **Created**: At the start of every API operation (before execution)
2. **Updated**: Result fields populated after operation completes (success/error/partial)
3. **Retention**: 30 days from created_at (configurable, see research.md decision 4)
4. **Cleanup**: Automated job deletes records older than retention period

### Performance Considerations

- Writes are asynchronous (don't block API responses)
- Indexed on campaign_id, operation_type, entity_type, created_at for analytics queries
- JSON parameters column allows flexible filtering for workflow analysis
- result_status index enables error rate monitoring

---

## Existing Entities (No Changes)

Feature 018 operates on existing database entities from Feature 014:

### 13 Category Database Tables
1. **npcs** - Non-player characters
2. **locations** - Geographic areas, settlements, dungeons
3. **factions** - Guilds, kingdoms, organizations
4. **session_recaps** - Canonical session records
5. **quests** - Mission tracking, narrative threads
6. **player_characters** - PC roster
7. **lore_entries** - Historical events, mythology
8. **world_rules** - Magic systems, cosmology
9. **planar_forces** - Deities, extraplanar entities
10. **session_prep** - DM planning workspace
11. **custom_mechanics** - House rules, homebrew
12. **items** - Weapons, armor, artifacts
13. **creatures** - Bestiary entries

All 13 tables share:
- **Universal Fields**: id, campaign_id, name, description, core_status, player_knowledge, tags, created_at, updated_at, custom_fields
- **Information Level Filtering**: Respect player_knowledge field (Feature 004)
- **Campaign Ownership**: Filtered by campaign_id (Feature 002)

See `specs/014-create-the-database/data-model.md` for complete schemas.

### Related Entities (Read-Only)
- **campaigns** - Campaign ownership context (Feature 002)
- **information_levels** - Custom information levels (Feature 004)
- **knowledge_graphs** - AI planning graphs (Feature 005/006)

---

## Information Level Filtering

Feature 018 API respects existing information level filtering from Feature 004.

### X-View-Mode Header

**dm_view** (default):
- Return all entities regardless of player_knowledge value
- Include all dm_* prefixed fields

**player_view**:
- Filter WHERE clause: `player_knowledge IN ('common_knowledge', 'player_knowledge', null)`
- Exclude entities with player_knowledge = 'dm_only' or custom secret levels
- Strip all dm_* prefixed fields from response

### Implementation

Reuses `ViewModeService` from Feature 004 (see research.md decision 7).

---

## Campaign Ownership

All API operations enforce campaign ownership:

1. **Campaign ID in URL**: `/api/v1/external/campaigns/{campaignId}/...`
2. **Validation**: Campaign must exist and be accessible
3. **Filtering**: All queries automatically filter by campaign_id
4. **Isolation**: Users cannot access other users' campaigns (localhost testing assumes single user)

---

## Audit Trail

### Logging Strategy

Feature 018 implements dual logging per research.md decision 3:

1. **Winston File Logs**: JSON format, daily rotation
   - Fields: timestamp, level, api_endpoint, method, campaign_id, category, operation_type, user_agent, response_time_ms, error
   - Location: `logs/external-api/YYYY-MM-DD.log`
   - Retention: 30 days

2. **Database Audit Table**: api_requests table
   - Queryable for workflow analysis
   - Supports filtering by operation type, entity type, result status
   - Links to campaign context

### Analytics Use Cases

- Compare conversational API (Feature 018) vs stateless import (Feature 017) metrics
- Identify slow queries or error patterns
- Track AI tool usage patterns
- Debug conversational workflow issues

---

## State Transitions

### API Request Status Flow

```
(Operation starts) → result_status = NULL
                ↓
(Operation executes) → result_status = 'success' | 'error' | 'partial_success'
                ↓
(Retention period expires) → Record deleted
```

**partial_success**: Used for bulk operations where some entries succeed and others fail

---

## Migration

### Migration Order

1. Create `api_requests` table (depends on existing campaigns table)
2. No changes to existing 13 category tables
3. No changes to campaigns, information_levels, or knowledge_graphs tables

### SQL Migration

```sql
-- Migration: 018-api-requests.sql
-- Feature: External API for Conversational Database Operations
-- Date: 2025-01-10

CREATE TABLE IF NOT EXISTS api_requests (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  user_id TEXT,
  operation_type TEXT NOT NULL,
  entity_type TEXT,
  parameters TEXT,
  result_status TEXT NOT NULL,
  result_summary TEXT,
  execution_time_ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,

  CHECK (operation_type IN ('query', 'create', 'update', 'delete', 'navigate_hierarchy', 'query_recap', 'query_graph', 'bulk_operation')),
  CHECK (result_status IN ('success', 'error', 'partial_success'))
);

CREATE INDEX IF NOT EXISTS idx_api_requests_campaign_id ON api_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_api_requests_operation_type ON api_requests(operation_type);
CREATE INDEX IF NOT EXISTS idx_api_requests_entity_type ON api_requests(entity_type);
CREATE INDEX IF NOT EXISTS idx_api_requests_created_at ON api_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_result_status ON api_requests(result_status);

-- Cleanup job placeholder (implement in backend service)
-- DELETE FROM api_requests WHERE created_at < (strftime('%s', 'now') - 2592000);  -- 30 days
```

---

**Status**: ✅ Data model complete - 1 new entity (APIRequest) documented, operates on existing 13 category tables
