# Quickstart Guide: External API for Conversational Database Operations

**Feature**: 018-create-an-external
**Date**: 2025-01-10

## Overview

This guide provides step-by-step manual testing procedures for Feature 018's External API. Each scenario is based on acceptance scenarios from `spec.md` and includes prerequisites, test steps, expected results, cURL commands, and database verification queries.

---

## Prerequisites

### Required Setup

1. **Docker Environment Running**
   ```bash
   docker-compose up
   ```
   - Main app on port 3001
   - Keycloak on port 8080
   - Database at `data/wrldbldr-mcp-manager.db`

2. **External API Service Running**
   ```bash
   docker-compose up external-api
   ```
   - External API on port 3002

3. **Test Campaign Created**
   - Use main app to create campaign: "Greyhaven Campaign"
   - Note the campaign UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)

4. **Claude Desktop Configured** (Optional for conversational testing)
   - Configure MCP settings to connect to `http://localhost:3002`
   - See "Claude Desktop Integration" section below

### Environment Variables

```bash
# External API (add to docker-compose.yml)
EXTERNAL_API_PORT=3002
DATABASE_PATH=/app/data/wrldbldr-mcp-manager.db
CORS_ORIGIN=http://localhost:*,http://127.0.0.1:*
LOG_LEVEL=debug
```

---

## Acceptance Scenario 1: Conversational Query for Database Entries

**Goal**: Test querying database entries with filters

### Prerequisites
- Campaign exists with UUID `550e8400-e29b-41d4-a716-446655440000`
- 8 locations already created in campaign via main app:
  - The Rusty Anchor (tavern)
  - The Golden Griffin (tavern)
  - Docks District (district)
  - Market Square (market)
  - City Hall (government)
  - Temple of Light (temple)
  - The Black Alley (street)
  - Greyhaven City (city)

### Test Steps

#### Step 1: Query all locations
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/locations" \
  -H "X-View-Mode: dm_view" \
  -H "Content-Type: application/json"
```

**Expected Result**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "The Rusty Anchor",
      "location_type": "tavern",
      ...
    },
    // ... 7 more locations
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 8,
    "total_pages": 1
  },
  "operation_id": "...",
  "execution_time_ms": 45
}
```

#### Step 2: Filter for taverns only
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/locations?filter=%7B%22location_type%22%3A%22tavern%22%7D" \
  -H "X-View-Mode: dm_view" \
  -H "Content-Type: application/json"
```

**URL-decoded filter**: `{"location_type":"tavern"}`

**Expected Result**:
```json
{
  "success": true,
  "data": [
    {
      "name": "The Rusty Anchor",
      "location_type": "tavern"
    },
    {
      "name": "The Golden Griffin",
      "location_type": "tavern"
    }
  ],
  "pagination": {
    "total": 2
  }
}
```

#### Step 3: Search by name
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/locations?search=Rusty" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**: Returns 1 location with "Rusty" in name

### Database Verification

```sql
-- Verify all locations exist
SELECT id, name, location_type, core_status
FROM locations
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY name;

-- Verify taverns count
SELECT COUNT(*) as tavern_count
FROM locations
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND location_type = 'tavern';
-- Expected: 2

-- Verify audit log
SELECT operation_type, entity_type, result_status, execution_time_ms
FROM api_requests
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND entity_type = 'locations'
ORDER BY created_at DESC
LIMIT 3;
-- Expected: 3 'query' operations with 'success' status
```

---

## Acceptance Scenario 2: Conversational Create Operation

**Goal**: Test creating new database entry via API

### Prerequisites
- Campaign exists
- Factions table has "The Red Hand" does NOT exist yet

### Test Steps

#### Step 1: Create faction "The Red Hand"
```bash
curl -X POST "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/factions" \
  -H "Content-Type: application/json" \
  -H "X-View-Mode: dm_view" \
  -d '{
    "name": "The Red Hand",
    "description": "A thieves guild operating in the shadows",
    "faction_type": "thieves guild",
    "power_level": "local",
    "player_knowledge": "common_knowledge",
    "tags": ["criminal", "underground"]
  }'
```

**Expected Result**:
```json
{
  "success": true,
  "data": {
    "id": "new-faction-uuid",
    "campaign_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "The Red Hand",
    "description": "A thieves guild operating in the shadows",
    "faction_type": "thieves guild",
    "power_level": "local",
    "core_status": "active",
    "player_knowledge": "common_knowledge",
    "tags": ["criminal", "underground"],
    "created_at": 1704902400,
    "updated_at": 1704902400,
    "custom_fields": {}
  },
  "operation_id": "...",
  "execution_time_ms": 32
}
```

Note the returned `id` for next step.

#### Step 2: Query all factions to verify
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/factions" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**: Array includes newly created "The Red Hand" faction

### Database Verification

```sql
-- Verify faction exists
SELECT id, name, description, faction_type, power_level, tags
FROM factions
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND name = 'The Red Hand';
-- Expected: 1 row

-- Verify audit log for create operation
SELECT operation_type, entity_type, result_status, result_summary
FROM api_requests
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND operation_type = 'create'
  AND entity_type = 'factions'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: operation_type='create', result_status='success'
```

### Error Case: Missing Required Field

```bash
curl -X POST "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/factions" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Missing name field"
  }'
```

**Expected Error**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Required field \"name\" is missing",
    "details": {
      "missing_fields": ["name"]
    },
    "suggestion": "Please provide a name field in your request body"
  }
}
```

---

## Acceptance Scenario 3: Conversational Update Operation

**Goal**: Test updating existing database entry

### Prerequisites
- NPC "Sir Gareth" exists with `id = npc-gareth-uuid`
- Current description: "A noble knight"

### Test Steps

#### Step 1: Update Sir Gareth's description
```bash
curl -X PATCH "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/npcs/npc-gareth-uuid" \
  -H "Content-Type: application/json" \
  -H "X-View-Mode: dm_view" \
  -d '{
    "description": "A fallen knight corrupted by dark magic, now serving sinister forces",
    "alignment": "Chaotic Evil",
    "tags": ["corrupted", "antagonist", "boss"]
  }'
```

**Expected Result**:
```json
{
  "success": true,
  "data": {
    "id": "npc-gareth-uuid",
    "name": "Sir Gareth",
    "description": "A fallen knight corrupted by dark magic, now serving sinister forces",
    "alignment": "Chaotic Evil",
    "tags": ["corrupted", "antagonist", "boss"],
    "updated_at": 1704902500,
    ...
  },
  "operation_id": "...",
  "execution_time_ms": 28
}
```

#### Step 2: Query to verify update
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/npcs?filter=%7B%22name%22%3A%22Sir%20Gareth%22%7D" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**: Description shows corruption text

### Database Verification

```sql
-- Verify update applied
SELECT id, name, description, alignment, tags, updated_at
FROM npcs
WHERE id = 'npc-gareth-uuid';
-- Expected: description contains "corrupted by dark magic"

-- Verify updated_at timestamp changed
SELECT
  updated_at > created_at as was_updated,
  updated_at
FROM npcs
WHERE id = 'npc-gareth-uuid';
-- Expected: was_updated = 1

-- Verify audit log
SELECT operation_type, parameters, result_status, execution_time_ms
FROM api_requests
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND operation_type = 'update'
  AND entity_type = 'npcs'
ORDER BY created_at DESC
LIMIT 1;
-- Expected: parameters contains patch fields
```

---

## Acceptance Scenario 4: Navigate Hierarchy Conversationally

**Goal**: Test hierarchy navigation for parent-child relationships

### Prerequisites
- Location hierarchy exists:
  - Greyhaven (city) - `id = city-greyhaven-uuid`
    - Docks (district) - `id = district-docks-uuid`, `parent_location_id = city-greyhaven-uuid`
      - Rusty Anchor (tavern) - `id = tavern-rusty-uuid`, `parent_location_id = district-docks-uuid`

### Test Steps

#### Step 1: Get districts in Greyhaven city
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/locations/city-greyhaven-uuid/children" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**:
```json
{
  "success": true,
  "data": {
    "parent": {
      "id": "city-greyhaven-uuid",
      "name": "Greyhaven",
      "location_type": "city"
    },
    "children": [
      {
        "id": "district-docks-uuid",
        "name": "Docks",
        "location_type": "district",
        "parent_location_id": "city-greyhaven-uuid"
      }
      // ... other districts
    ],
    "depth": 1
  },
  "operation_id": "...",
  "execution_time_ms": 67
}
```

#### Step 2: Get locations in Docks district
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/locations/district-docks-uuid/children" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**: Returns Rusty Anchor tavern

#### Step 3: Multi-level hierarchy (depth=2)
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/locations/city-greyhaven-uuid/children?depth=2" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**: Returns districts AND their child locations (2 levels deep)

### Database Verification

```sql
-- Verify hierarchy structure
SELECT
  id,
  name,
  location_type,
  parent_location_id,
  CASE
    WHEN parent_location_id IS NULL THEN 0
    ELSE 1
  END as depth_level
FROM locations
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND (id = 'city-greyhaven-uuid'
       OR parent_location_id = 'city-greyhaven-uuid'
       OR parent_location_id IN (
         SELECT id FROM locations WHERE parent_location_id = 'city-greyhaven-uuid'
       ))
ORDER BY depth_level, name;
-- Expected: Hierarchical structure with 3 levels

-- Verify operation logged
SELECT operation_type, entity_type, result_status
FROM api_requests
WHERE operation_type = 'navigate_hierarchy'
ORDER BY created_at DESC
LIMIT 3;
```

---

## Acceptance Scenario 5: Query Session Recap Timeline

**Goal**: Test timeline queries for session recaps

### Prerequisites
- 5 session recaps exist with session numbers 1-5
- Session 2 and Session 4 mention "Dragon of Ash Peak"

### Test Steps

#### Step 1: Get last 3 sessions
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/recaps?limit=3&sort=-session_number" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Session 5: ...",
      "session_number": 5,
      ...
    },
    {
      "id": "...",
      "name": "Session 4: ...",
      "session_number": 4,
      ...
    },
    {
      "id": "...",
      "name": "Session 3: ...",
      "session_number": 3,
      ...
    }
  ],
  "pagination": {
    "limit": 3,
    "total": 5
  }
}
```

#### Step 2: Search for "Dragon of Ash Peak"
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/recaps?search=Dragon%20of%20Ash%20Peak" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**: Returns session 2 and session 4

#### Step 3: Query session range
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/recaps?start_session=2&end_session=4" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**: Returns sessions 2, 3, and 4

### Database Verification

```sql
-- Verify session recap count
SELECT COUNT(*) as total_sessions
FROM session_recaps
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000';
-- Expected: 5

-- Verify search matches
SELECT id, name, summary
FROM session_recaps
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND (summary LIKE '%Dragon of Ash Peak%'
       OR key_events LIKE '%Dragon of Ash Peak%'
       OR description LIKE '%Dragon of Ash Peak%');
-- Expected: 2 rows (sessions 2 and 4)

-- Verify operation logged
SELECT operation_type, parameters, result_status
FROM api_requests
WHERE operation_type = 'query_recap'
ORDER BY created_at DESC
LIMIT 3;
```

---

## Acceptance Scenario 6: Conversational Delete Operation

**Goal**: Test two-phase delete confirmation workflow

### Prerequisites
- Item "Broken Sword" exists with `id = item-broken-sword-uuid`
- No other items reference this item

### Test Steps

#### Step 1: Request deletion (Phase 1 - Preview)
```bash
curl -X DELETE "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/items/item-broken-sword-uuid" \
  -H "X-View-Mode: dm_view"
```

**Expected Result**:
```json
{
  "success": true,
  "message": "Deletion preview - confirm to proceed",
  "preview": {
    "entry": {
      "id": "item-broken-sword-uuid",
      "name": "Broken Sword",
      "item_type": "weapon",
      ...
    },
    "affected_references": [],
    "will_cascade": false
  },
  "confirmation_token": "confirm-123456-abcdef",
  "expires_at": "2025-01-10T12:01:00Z"
}
```

#### Step 2: Confirm deletion (Phase 2)
```bash
curl -X DELETE "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/items/item-broken-sword-uuid?confirm=true" \
  -H "X-View-Mode: dm_view" \
  -H "X-Confirmation-Token: confirm-123456-abcdef"
```

**Expected Result**: HTTP 204 No Content (successful deletion)

#### Step 3: Verify deletion
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/items/item-broken-sword-uuid" \
  -H "X-View-Mode: dm_view"
```

**Expected Error**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Item not found",
    "suggestion": "The item may have been deleted or does not exist"
  }
}
```

### Database Verification

```sql
-- Verify item deleted
SELECT COUNT(*) as item_exists
FROM items
WHERE id = 'item-broken-sword-uuid';
-- Expected: 0

-- Verify delete operations logged
SELECT operation_type, result_status, result_summary
FROM api_requests
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND operation_type = 'delete'
  AND entity_type = 'items'
ORDER BY created_at DESC
LIMIT 2;
-- Expected: 2 rows (preview + confirmed delete)
```

### Error Case: Confirmation Expired

Wait 61 seconds after Phase 1, then attempt Phase 2:

```bash
curl -X DELETE "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/items/item-broken-sword-uuid?confirm=true" \
  -H "X-Confirmation-Token: confirm-123456-abcdef"
```

**Expected Error**:
```json
{
  "success": false,
  "error": {
    "code": "CONFIRMATION_EXPIRED",
    "message": "Deletion confirmation expired",
    "suggestion": "Request a new deletion preview to get a fresh confirmation token"
  }
}
```

---

## Acceptance Scenario 7: Bulk Query with Filtering

**Goal**: Test filtering queries on large datasets

### Prerequisites
- 50 NPCs exist across multiple factions
- 8 NPCs belong to "Thieves Guild" faction (`faction_id = faction-thieves-guild-uuid`)
- 3 of those 8 NPCs have `player_knowledge = 'dm_only'`

### Test Steps

#### Step 1: Query all NPCs in Thieves Guild
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/npcs?filter=%7B%22faction_id%22%3A%22faction-thieves-guild-uuid%22%7D" \
  -H "X-View-Mode: dm_view"
```

**URL-decoded filter**: `{"faction_id":"faction-thieves-guild-uuid"}`

**Expected Result**: Returns 8 NPCs

#### Step 2: Filter for DM-only NPCs in that faction
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/npcs?filter=%7B%22faction_id%22%3A%22faction-thieves-guild-uuid%22%2C%22player_knowledge%22%3A%22dm_only%22%7D" \
  -H "X-View-Mode: dm_view"
```

**URL-decoded filter**: `{"faction_id":"faction-thieves-guild-uuid","player_knowledge":"dm_only"}`

**Expected Result**: Returns 3 NPCs with `player_knowledge = 'dm_only'`

#### Step 3: Same query in player_view (should hide dm_only NPCs)
```bash
curl -X GET "http://localhost:3002/api/v1/external/campaigns/550e8400-e29b-41d4-a716-446655440000/database/npcs?filter=%7B%22faction_id%22%3A%22faction-thieves-guild-uuid%22%7D" \
  -H "X-View-Mode: player_view"
```

**Expected Result**: Returns 5 NPCs (8 total - 3 dm_only = 5 visible to players)

### Database Verification

```sql
-- Verify total NPCs
SELECT COUNT(*) as total_npcs
FROM npcs
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000';
-- Expected: 50

-- Verify Thieves Guild NPCs
SELECT COUNT(*) as guild_npcs
FROM npcs
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND faction_id = 'faction-thieves-guild-uuid';
-- Expected: 8

-- Verify dm_only NPCs in guild
SELECT COUNT(*) as secret_npcs
FROM npcs
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND faction_id = 'faction-thieves-guild-uuid'
  AND player_knowledge = 'dm_only';
-- Expected: 3

-- Verify player-visible NPCs
SELECT COUNT(*) as visible_npcs
FROM npcs
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
  AND faction_id = 'faction-thieves-guild-uuid'
  AND player_knowledge IN ('common_knowledge', 'player_knowledge', NULL);
-- Expected: 5
```

---

## Acceptance Scenario 8: Audit Logging of Operations

**Goal**: Test comprehensive audit logging for all operations

### Prerequisites
- Perform 5 operations:
  1. Query locations (2 NPCs returned)
  2. Create faction
  3. Create NPC
  4. Update NPC
  5. Query session recaps (3 recaps returned)

### Test Steps

#### Step 1: Execute 5 operations (use commands from previous scenarios)

Execute in sequence:
1. Scenario 1 Step 1 (query locations)
2. Scenario 2 Step 1 (create faction)
3. Scenario 2 modified (create NPC)
4. Scenario 3 Step 1 (update NPC)
5. Scenario 5 Step 1 (query recaps)

#### Step 2: Query audit log via database

```sql
SELECT
  id,
  operation_type,
  entity_type,
  result_status,
  execution_time_ms,
  created_at
FROM api_requests
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result**:
```
id                  | operation_type | entity_type    | result_status | execution_time_ms | created_at
--------------------|----------------|----------------|---------------|-------------------|------------
operation-5-uuid    | query_recap    | session_recap  | success       | 52                | 1704902700
operation-4-uuid    | update         | npcs           | success       | 28                | 1704902650
operation-3-uuid    | create         | npcs           | success       | 35                | 1704902600
operation-2-uuid    | create         | factions       | success       | 32                | 1704902550
operation-1-uuid    | query          | locations      | success       | 45                | 1704902500
```

#### Step 3: Verify operation details

```sql
SELECT
  operation_type,
  parameters,
  result_summary
FROM api_requests
WHERE id = 'operation-2-uuid';  -- The create faction operation
```

**Expected Result**:
```json
{
  "operation_type": "create",
  "parameters": "{\"name\":\"The Red Hand\",\"description\":\"A thieves guild operating in the shadows\",\"faction_type\":\"thieves guild\"}",
  "result_summary": "Created faction 'The Red Hand' with id: new-faction-uuid"
}
```

#### Step 4: Performance analysis

```sql
SELECT
  operation_type,
  AVG(execution_time_ms) as avg_time_ms,
  MAX(execution_time_ms) as max_time_ms,
  COUNT(*) as operation_count
FROM api_requests
WHERE campaign_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY operation_type
ORDER BY avg_time_ms DESC;
```

**Expected Result**: Average execution times for each operation type

### Winston Log Verification

```bash
# View today's external API log file
cat logs/external-api/2025-01-10.log | tail -20
```

**Expected JSON Log Entries**:
```json
{"timestamp":"2025-01-10T12:00:00Z","level":"info","api_endpoint":"/campaigns/550e.../database/locations","method":"GET","campaign_id":"550e...","category":"locations","operation_type":"query","user_agent":"curl/7.68.0","response_time_ms":45}
{"timestamp":"2025-01-10T12:01:00Z","level":"info","api_endpoint":"/campaigns/550e.../database/factions","method":"POST","campaign_id":"550e...","category":"factions","operation_type":"create","user_agent":"curl/7.68.0","response_time_ms":32}
...
```

---

## Claude Desktop Integration (Optional)

### Configuration

1. **Install Claude Desktop** (if not already installed)

2. **Configure MCP Settings**

Create/edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "wrldbldr-external-api": {
      "url": "http://localhost:3002/api/v1/external",
      "type": "rest",
      "authentication": "none"
    }
  }
}
```

On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

3. **Restart Claude Desktop**

### Conversational Testing

Once configured, test conversational workflows:

**Example Conversation 1: Query**
```
User: "Show me all NPCs in my Greyhaven campaign."

Claude: [Makes API call to GET /campaigns/{id}/database/npcs]
        "I found 12 NPCs in your Greyhaven campaign:
         1. Marcus the Merchant (Trader, Thieves Guild)
         2. Sir Gareth (Knight, corrupted)
         ..."
```

**Example Conversation 2: Create**
```
User: "Create a new NPC named Marcus the Merchant in the Traders Guild faction."

Claude: [Makes API call to POST /campaigns/{id}/database/npcs]
        "I've created Marcus the Merchant as a new NPC in your campaign.
         Would you like to add more details like description or personality?"
```

**Example Conversation 3: Update**
```
User: "Update Sir Gareth's description to say he's a fallen knight corrupted by dark magic."

Claude: [Makes API call to PATCH /campaigns/{id}/database/npcs/{gareth-id}]
        "I've updated Sir Gareth's description. He's now marked as a fallen knight
         corrupted by dark magic. The alignment has been changed to Chaotic Evil."
```

**Example Conversation 4: Hierarchy Navigation**
```
User: "What districts are in Greyhaven city?"

Claude: [Makes API call to GET /campaigns/{id}/database/locations/{city-id}/children]
        "Greyhaven has 4 districts:
         1. Docks District
         2. Market Quarter
         3. Noble Heights
         4. The Undercity"
```

---

## Performance Benchmarks

### Expected Response Times

Based on FR-023 to FR-026:

| Operation Type            | Target Time | Acceptable Range |
|---------------------------|-------------|------------------|
| Single-entity query       | 100ms       | < 150ms          |
| Bulk query (100 results)  | 500ms       | < 750ms          |
| Create operation          | 200ms       | < 300ms          |
| Update operation          | 200ms       | < 300ms          |
| Delete operation          | 200ms       | < 300ms          |
| Hierarchy navigation (3-level) | 300ms  | < 500ms          |
| Session recap query       | 200ms       | < 400ms          |
| Knowledge graph query     | 300ms       | < 600ms          |

### Performance Testing Script

```bash
#!/bin/bash
# performance-test.sh

CAMPAIGN_ID="550e8400-e29b-41d4-a716-446655440000"
BASE_URL="http://localhost:3002/api/v1/external"

echo "Testing single-entity query..."
curl -w "Time: %{time_total}s\n" -o /dev/null -s \
  "$BASE_URL/campaigns/$CAMPAIGN_ID/database/npcs?limit=1"

echo "Testing bulk query (100 results)..."
curl -w "Time: %{time_total}s\n" -o /dev/null -s \
  "$BASE_URL/campaigns/$CAMPAIGN_ID/database/npcs?limit=100"

echo "Testing create operation..."
curl -w "Time: %{time_total}s\n" -o /dev/null -s \
  -X POST "$BASE_URL/campaigns/$CAMPAIGN_ID/database/factions" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Faction"}'

# Add more tests...
```

---

## Troubleshooting

### External API Not Starting

**Symptom**: `curl: (7) Failed to connect to localhost port 3002`

**Solutions**:
1. Check Docker logs: `docker-compose logs external-api`
2. Verify port not in use: `lsof -i :3002` (macOS/Linux) or `netstat -ano | findstr :3002` (Windows)
3. Check docker-compose.yml has external-api service defined
4. Restart: `docker-compose restart external-api`

### Database Connection Errors

**Symptom**: `Error: SQLITE_CANTOPEN: unable to open database file`

**Solutions**:
1. Verify database exists: `ls -la data/wrldbldr-mcp-manager.db`
2. Check permissions: `chmod 644 data/wrldbldr-mcp-manager.db`
3. Check Docker volume mount in docker-compose.yml

### CORS Errors from Claude Desktop

**Symptom**: `Access to fetch blocked by CORS policy`

**Solutions**:
1. Verify CORS_ORIGIN includes `http://localhost:*`
2. Check external-api CORS middleware configuration
3. Restart external-api: `docker-compose restart external-api`

### Audit Logs Not Recording

**Symptom**: No entries in `api_requests` table

**Solutions**:
1. Verify migration ran: `SELECT name FROM sqlite_master WHERE type='table' AND name='api_requests';`
2. Check application logs for async write failures
3. Verify database write permissions

---

## Cleanup

### Reset Test Data

```sql
-- Delete test campaign and all related data
DELETE FROM campaigns WHERE id = '550e8400-e29b-41d4-a716-446655440000';
-- Note: CASCADE deletes all category entries and api_requests

-- Reset api_requests table
DELETE FROM api_requests;

-- Vacuum database to reclaim space
VACUUM;
```

### Stop Services

```bash
# Stop external API only
docker-compose stop external-api

# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```

---

**Status**: ✅ Quickstart guide complete - 8 acceptance scenarios with cURL commands, database verification, and troubleshooting
