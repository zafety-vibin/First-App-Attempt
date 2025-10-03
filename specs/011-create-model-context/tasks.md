# Tasks: Model Context Protocol (MCP) Integration

**Feature**: 011-create-model-context
**Generated**: 2025-10-03
**Total Tasks**: 48

## Overview

This task list implements the Model Context Protocol (MCP) server for Feature 005's AI workflows. Tasks follow TDD approach with contract tests before implementation. Tasks marked **[P]** can run in parallel.

---

## Setup & Infrastructure (T001-T004)

### T001: Install MCP SDK and Dependencies [X]
**Files**:
- `backend/package.json`

**Actions**:
```bash
cd backend
npm install @modelcontextprotocol/sdk zod
npm install --save-dev @types/node
```

**Verification**: `package.json` contains `@modelcontextprotocol/sdk` and `zod`

**Dependencies**: None

---

### T002: Create MCP Server Entry Point
**Files**:
- `backend/src/mcp/server.ts` (NEW)

**Actions**:
1. Create `backend/src/mcp/` directory
2. Implement MCP server setup with stdio transport
3. Register all 29 tools (placeholders for now)
4. Add error handling middleware
5. Add graceful shutdown on SIGTERM

**Verification**: Server starts with `node backend/dist/mcp/server.js` and responds to `tools/list`

**Dependencies**: T001

---

### T003: Create Database Migration for Tool Logs
**Files**:
- `backend/src/db/migrations/011-mcp-tool-logs.sql` (NEW)

**Actions**:
1. Create migration file with `mcp_tool_logs` table schema from data-model.md
2. Add indexes: `idx_mcp_tool_logs_campaign`, `idx_mcp_tool_logs_user`, `idx_mcp_tool_logs_tool`
3. Update `backend/src/db/migrations.ts` to include new migration

**Verification**: Migration runs successfully, table created with all indexes

**Dependencies**: None

---

### T004: Create Zod Schemas for All Tools
**Files**:
- `backend/src/mcp/schemas/card-schemas.ts` (NEW)
- `backend/src/mcp/schemas/hierarchy-schemas.ts` (NEW)
- `backend/src/mcp/schemas/graph-schemas.ts` (NEW)
- `backend/src/mcp/schemas/recap-schemas.ts` (NEW)
- `backend/src/mcp/schemas/info-level-schemas.ts` (NEW)
- `backend/src/mcp/schemas/database-schemas.ts` (NEW)
- `backend/src/mcp/schemas/map-schemas.ts` (NEW)

**Actions**:
1. Create `backend/src/mcp/schemas/` directory
2. Generate Zod schemas from all 8 contract JSON files
3. Export input/output schemas for each tool

**Verification**: All schemas compile without errors, match contract definitions

**Dependencies**: T001

---

## Contract Tests (T005, T012, T018, T023, T026, T029, T033) [P]

### T005: Contract Tests - Card Tools [P]
**Files**:
- `backend/tests/contract/mcp-card-tools.contract.test.ts` (NEW)

**Actions**:
1. Create test file importing card-schemas.ts
2. Write contract tests for 6 tools: read_card, create_card, update_card, delete_card, search_cards, move_card
3. Verify input/output schemas match contracts/card-tools.json
4. Test error codes: CARD_NOT_FOUND, CIRCULAR_REFERENCE, PERMISSION_DENIED

**Verification**: All tests fail (no implementation yet)

**Dependencies**: T004

---

### T012: Contract Tests - Hierarchy Tools [P]
**Files**:
- `backend/tests/contract/mcp-hierarchy-tools.contract.test.ts` (NEW)

**Actions**:
1. Write contract tests for 5 tools: get_card_path, get_subtree, list_children, get_siblings, get_ancestor
2. Verify recursive depth limits
3. Test error codes: CARD_NOT_FOUND, DEPTH_LIMIT_EXCEEDED

**Verification**: All tests fail (no implementation yet)

**Dependencies**: T004

---

### T018: Contract Tests - Graph Tools [P]
**Files**:
- `backend/tests/contract/mcp-graph-tools.contract.test.ts` (NEW)

**Actions**:
1. Write contract tests for 4 tools: query_graph, list_graph_nodes, get_node_relationships, update_graph
2. Verify atomic update operations
3. Test error codes: GRAPH_NOT_FOUND, NODE_NOT_FOUND, VALIDATION_FAILED

**Verification**: All tests fail (no implementation yet)

**Dependencies**: T004

---

### T023: Contract Tests - Recap Tools [P]
**Files**:
- `backend/tests/contract/mcp-recap-tools.contract.test.ts` (NEW)

**Actions**:
1. Write contract tests for 2 tools: get_session_recaps, get_timeline_events
2. Verify pagination and date range filtering
3. Test error codes: CAMPAIGN_NOT_FOUND, INVALID_DATE_RANGE

**Verification**: All tests fail (no implementation yet)

**Dependencies**: T004

---

### T026: Contract Tests - Info Level Tools [P]
**Files**:
- `backend/tests/contract/mcp-info-level-tools.contract.test.ts` (NEW)

**Actions**:
1. Write contract tests for 2 tools: list_information_levels, get_information_level_by_name
2. Verify fuzzy name matching
3. Test error codes: CAMPAIGN_NOT_FOUND, LEVEL_NOT_FOUND

**Verification**: All tests fail (no implementation yet)

**Dependencies**: T004

---

### T029: Contract Tests - Database Tools [P]
**Files**:
- `backend/tests/contract/mcp-database-tools.contract.test.ts` (NEW)

**Actions**:
1. Write contract tests for 3 tools: query_database_card, create_database_entry, update_database_entry
2. Verify schema validation
3. Test error codes: CARD_NOT_DATABASE_TYPE, SCHEMA_VALIDATION_FAILED, ENTRY_NOT_FOUND

**Verification**: All tests fail (no implementation yet)

**Dependencies**: T004

---

### T033: Contract Tests - Map Tools [P]
**Files**:
- `backend/tests/contract/mcp-map-tools.contract.test.ts` (NEW)

**Actions**:
1. Write contract tests for 2 tools: list_map_pins, create_map_pin
2. Verify coordinate validation
3. Test error codes: CARD_NOT_MAP_ENABLED, INVALID_COORDINATES, REFERENCED_CARD_NOT_FOUND

**Verification**: All tests fail (no implementation yet)

**Dependencies**: T004

---

## Tool Implementations - Card Tools (T006-T011)

### T006: Implement read_card Tool
**Files**:
- `backend/src/mcp/tools/card-tools.ts` (NEW)

**Actions**:
1. Create card-tools.ts file
2. Implement read_card handler using CardService
3. Add permission check (campaign ownership + information level filtering)
4. Return card with title, content, card_type, information_level_id

**Verification**: T005 contract test passes for read_card

**Dependencies**: T005

---

### T007: Implement create_card Tool
**Files**:
- `backend/src/mcp/tools/card-tools.ts`

**Actions**:
1. Implement create_card handler
2. Validate parent_id exists (if provided)
3. Check circular reference prevention
4. Default information_level_id to "Common Knowledge" if not provided
5. Wrap in transaction

**Verification**: T005 contract test passes for create_card

**Dependencies**: T006

---

### T008: Implement update_card Tool
**Files**:
- `backend/src/mcp/tools/card-tools.ts`

**Actions**:
1. Implement update_card handler for title, content, information_level_id
2. Validate card exists and user has permission
3. Wrap in transaction

**Verification**: T005 contract test passes for update_card

**Dependencies**: T007

---

### T009: Implement delete_card Tool
**Files**:
- `backend/src/mcp/tools/card-tools.ts`

**Actions**:
1. Implement delete_card handler
2. Check for child cards (prevent deletion if children exist)
3. Return CARD_HAS_CHILDREN error if validation fails
4. Wrap in transaction

**Verification**: T005 contract test passes for delete_card

**Dependencies**: T008

---

### T010: Implement search_cards Tool
**Files**:
- `backend/src/mcp/tools/card-tools.ts`

**Actions**:
1. Implement search_cards with title and content LIKE queries
2. Apply information level filtering
3. Add pagination with limit parameter
4. Return total_count and results array

**Verification**: T005 contract test passes for search_cards

**Dependencies**: T009

---

### T011: Implement move_card Tool
**Files**:
- `backend/src/mcp/tools/card-tools.ts`

**Actions**:
1. Implement move_card handler for parent_id and position changes
2. Add circular reference detection (prevent card from becoming its own ancestor)
3. Recalculate sibling positions
4. Wrap in transaction

**Verification**: T005 contract test passes for move_card

**Dependencies**: T010

---

## Tool Implementations - Hierarchy Tools (T013-T017)

### T013: Implement get_card_path Tool
**Files**:
- `backend/src/mcp/tools/hierarchy-tools.ts` (NEW)

**Actions**:
1. Create hierarchy-tools.ts file
2. Implement recursive parent traversal to root
3. Return array of cards from root to target

**Verification**: T012 contract test passes for get_card_path

**Dependencies**: T012

---

### T014: Implement get_subtree Tool
**Files**:
- `backend/src/mcp/tools/hierarchy-tools.ts`

**Actions**:
1. Implement recursive child traversal with depth limit
2. Default depth to 3, max 10 (FR-016)
3. Apply information level filtering
4. Return nested tree structure

**Verification**: T012 contract test passes for get_subtree

**Dependencies**: T013

---

### T015: Implement list_children Tool
**Files**:
- `backend/src/mcp/tools/hierarchy-tools.ts`

**Actions**:
1. Implement simple SELECT WHERE parent_id = ?
2. Order by position ASC
3. Apply information level filtering

**Verification**: T012 contract test passes for list_children

**Dependencies**: T014

---

### T016: Implement get_siblings Tool
**Files**:
- `backend/src/mcp/tools/hierarchy-tools.ts`

**Actions**:
1. Find parent_id of target card
2. SELECT all cards with same parent_id
3. Exclude target card from results
4. Order by position ASC

**Verification**: T012 contract test passes for get_siblings

**Dependencies**: T015

---

### T017: Implement get_ancestor Tool
**Files**:
- `backend/src/mcp/tools/hierarchy-tools.ts`

**Actions**:
1. Traverse parent_id chain N levels up
2. Return specific ancestor at level N
3. Return null if N exceeds depth to root

**Verification**: T012 contract test passes for get_ancestor

**Dependencies**: T016

---

## Tool Implementations - Graph Tools (T019-T022)

### T019: Implement query_graph Tool
**Files**:
- `backend/src/mcp/tools/graph-tools.ts` (NEW)

**Actions**:
1. Create graph-tools.ts file
2. Implement SELECT nodes/edges with optional filters (graph_type, node_name, relationship_type)
3. Apply active filtering for Political-Web and Campaign-Story graphs
4. Apply information level filtering
5. Return nodes and edges arrays

**Verification**: T018 contract test passes for query_graph

**Dependencies**: T018

---

### T020: Implement list_graph_nodes Tool
**Files**:
- `backend/src/mcp/tools/graph-tools.ts`

**Actions**:
1. Implement SELECT nodes WHERE graph_id = ?
2. Apply active filtering if applicable
3. Apply information level filtering
4. Return nodes with id, name, node_type, attributes

**Verification**: T018 contract test passes for list_graph_nodes

**Dependencies**: T019

---

### T021: Implement get_node_relationships Tool
**Files**:
- `backend/src/mcp/tools/graph-tools.ts`

**Actions**:
1. Implement SELECT edges WHERE from_node_id = ? OR to_node_id = ?
2. Return edges with relationship_type and connected node names
3. Apply information level filtering

**Verification**: T018 contract test passes for get_node_relationships

**Dependencies**: T020

---

### T022: Implement update_graph Tool
**Files**:
- `backend/src/mcp/tools/graph-tools.ts`

**Actions**:
1. Implement atomic INSERT/UPDATE/DELETE operations for nodes and edges
2. Validate node/edge existence before delete/update
3. Wrap all operations in single transaction (all-or-nothing)
4. Return updated nodes and edges

**Verification**: T018 contract test passes for update_graph

**Dependencies**: T021

---

## Tool Implementations - Recap Tools (T024-T025)

### T024: Implement get_session_recaps Tool
**Files**:
- `backend/src/mcp/tools/recap-tools.ts` (NEW)

**Actions**:
1. Create recap-tools.ts file
2. Implement SELECT recap FROM sessions WHERE campaign_id = ?
3. Order by session_date DESC
4. Add limit parameter (default 10, max 50)
5. Return recaps array with session_id, recap, session_date

**Verification**: T023 contract test passes for get_session_recaps

**Dependencies**: T023

---

### T025: Implement get_timeline_events Tool
**Files**:
- `backend/src/mcp/tools/recap-tools.ts`

**Actions**:
1. Implement SELECT timeline_events WHERE session_date BETWEEN start_date AND end_date
2. Parse JSONB timeline_events column
3. Flatten events from all matching sessions
4. Return chronologically ordered array

**Verification**: T023 contract test passes for get_timeline_events

**Dependencies**: T024

---

## Tool Implementations - Info Level Tools (T027-T028)

### T027: Implement list_information_levels Tool
**Files**:
- `backend/src/mcp/tools/info-level-tools.ts` (NEW)

**Actions**:
1. Create info-level-tools.ts file
2. Implement SELECT * FROM information_levels WHERE campaign_id = ?
3. Order by hierarchy_level ASC
4. Return array with id, name, hierarchy_level

**Verification**: T026 contract test passes for list_information_levels

**Dependencies**: T026

---

### T028: Implement get_information_level_by_name Tool
**Files**:
- `backend/src/mcp/tools/info-level-tools.ts`

**Actions**:
1. Implement fuzzy name matching (case-insensitive LIKE ?)
2. Return first match if multiple exist
3. Return LEVEL_NOT_FOUND error if no match

**Verification**: T026 contract test passes for get_information_level_by_name

**Dependencies**: T027

---

## Tool Implementations - Database Tools (T030-T032)

### T030: Implement query_database_card Tool
**Files**:
- `backend/src/mcp/tools/database-tools.ts` (NEW)

**Actions**:
1. Create database-tools.ts file
2. Verify card is database type (card_type = 'database')
3. Parse database schema from card content JSONB
4. Apply column filters from input
5. Implement sort_by and sort_order
6. Add pagination with limit (default 100, max 500)
7. Return schema, rows, total_count

**Verification**: T029 contract test passes for query_database_card

**Dependencies**: T029

---

### T031: Implement create_database_entry Tool
**Files**:
- `backend/src/mcp/tools/database-tools.ts`

**Actions**:
1. Verify card is database type
2. Validate data matches database schema
3. Generate new entry_id (auto-increment within card)
4. Insert row into database card content JSONB
5. Wrap in transaction
6. Return entry_id and created data

**Verification**: T029 contract test passes for create_database_entry

**Dependencies**: T030

---

### T032: Implement update_database_entry Tool
**Files**:
- `backend/src/mcp/tools/database-tools.ts`

**Actions**:
1. Verify card is database type
2. Find entry by entry_id
3. Validate partial data matches schema
4. Merge data with existing row
5. Wrap in transaction
6. Return entry_id and updated data

**Verification**: T029 contract test passes for update_database_entry

**Dependencies**: T031

---

## Tool Implementations - Map Tools (T034-T035)

### T034: Implement list_map_pins Tool
**Files**:
- `backend/src/mcp/tools/map-tools.ts` (NEW)

**Actions**:
1. Create map-tools.ts file
2. Verify card has map_enabled flag = true
3. SELECT child cards WHERE parent_id = card_id AND card_type = 'pin'
4. Parse x, y coordinates from pin card content
5. Apply information level filtering
6. Return pins array with pin_card_id, x, y, label, referenced_card_id, information_level_id
7. Return map_dimensions from parent card

**Verification**: T033 contract test passes for list_map_pins

**Dependencies**: T033

---

### T035: Implement create_map_pin Tool
**Files**:
- `backend/src/mcp/tools/map-tools.ts`

**Actions**:
1. Verify parent card is map-enabled
2. Validate x, y coordinates within map bounds
3. Verify referenced_card_id exists (if provided)
4. Inherit information_level_id from referenced card or use provided value
5. Create pin card as child with coordinates in content JSONB
6. Wrap in transaction
7. Return pin_card_id, x, y, label, referenced_card_id, information_level_id

**Verification**: T033 contract test passes for create_map_pin

**Dependencies**: T034

---

## Resources & Prompts (T036-T040)

### T036: Implement campaign://cards Resource
**Files**:
- `backend/src/mcp/resources/card-resource.ts` (NEW)

**Actions**:
1. Create `backend/src/mcp/resources/` directory
2. Implement browsable card hierarchy view
3. Return tree structure with URI navigation
4. Apply information level filtering

**Verification**: MCP client can browse `campaign://<campaign_id>/cards`

**Dependencies**: T011

---

### T037: Implement campaign://recaps Resource
**Files**:
- `backend/src/mcp/resources/recap-resource.ts` (NEW)

**Actions**:
1. Implement browsable session recap timeline
2. Return recaps ordered by session_date DESC
3. Provide URI navigation to individual sessions

**Verification**: MCP client can browse `campaign://<campaign_id>/recaps`

**Dependencies**: T025

---

### T038: Implement campaign://graphs/{type} Resource
**Files**:
- `backend/src/mcp/resources/graph-resource.ts` (NEW)

**Actions**:
1. Implement browsable knowledge graph view
2. Support graph types: geographical, political-web, world-foundations, campaign-story
3. Return nodes and edges with URI navigation
4. Apply active filtering and information level filtering

**Verification**: MCP client can browse `campaign://<campaign_id>/graphs/political-web`

**Dependencies**: T022

---

### T039: Implement import_workflow Prompt Template
**Files**:
- `backend/src/mcp/prompts/import-prompt.ts` (NEW)

**Actions**:
1. Create `backend/src/mcp/prompts/` directory
2. Implement structured prompt template for Import AI workflow
3. Include instructions for entity extraction from session notes
4. Guide AI to use available tools (create_card, update_graph, etc.)

**Verification**: MCP client can request `import_workflow` prompt

**Dependencies**: T036

---

### T040: Implement planning_workflow Prompt Template
**Files**:
- `backend/src/mcp/prompts/planning-prompt.ts` (NEW)

**Actions**:
1. Implement structured prompt template for Planning AI workflow
2. Include instructions for session planning and graph updates
3. Guide AI to query existing cards/graphs before creating new content

**Verification**: MCP client can request `planning_workflow` prompt

**Dependencies**: T039

---

## Middleware & Cross-Cutting (T041-T043)

### T041: Implement Permission Middleware
**Files**:
- `backend/src/mcp/middleware/permissions.ts` (NEW)

**Actions**:
1. Create middleware wrapping all tool handlers
2. Verify campaign ownership (user_id matches campaign owner)
3. Apply information level filtering based on context (DM vs Player mode)
4. Return PERMISSION_DENIED error for unauthorized access

**Verification**: Contract tests pass with permission checks

**Dependencies**: T040

---

### T042: Implement Transaction Middleware
**Files**:
- `backend/src/mcp/middleware/transactions.ts` (NEW)

**Actions**:
1. Create middleware wrapping all mutating tool handlers
2. Use `db.transaction()` for atomic operations
3. Set 10 second timeout (FR-039)
4. Rollback on error, commit on success

**Verification**: Integration test for atomic operations (T044)

**Dependencies**: T041

---

### T043: Implement Tool Logging Middleware
**Files**:
- `backend/src/mcp/middleware/logging.ts` (NEW)

**Actions**:
1. Create middleware wrapping all tool handlers
2. Log all tool calls to `mcp_tool_logs` table
3. Record: tool_name, campaign_id, user_id, parameters, result_status, error_message, execution_time_ms
4. Insert after tool execution completes

**Verification**: Integration test verifies log entries created (T045)

**Dependencies**: T042

---

## Integration Tests (T044-T046)

### T044: Integration Test - Atomic Graph Update
**Files**:
- `backend/tests/integration/mcp-atomic-operations.integration.test.ts` (NEW)

**Actions**:
1. Create test scenario: update_graph with 3 nodes + 2 edges
2. Simulate error on 3rd operation
3. Verify entire transaction rolled back (0 nodes/edges created)
4. Verify success case: all 5 operations committed atomically

**Verification**: Test passes with transaction middleware

**Dependencies**: T043

---

### T045: Integration Test - Permission Filtering
**Files**:
- `backend/tests/integration/mcp-permissions.integration.test.ts` (NEW)

**Actions**:
1. Create test campaign with mixed information levels
2. Verify DM mode sees all cards (hierarchy_level <= 3)
3. Verify Player mode sees only Player Knowledge + Common (hierarchy_level <= 1)
4. Test unauthorized campaign access returns PERMISSION_DENIED

**Verification**: Test passes with permission middleware

**Dependencies**: T044

---

### T046: Integration Test - Concurrent Tool Calls
**Files**:
- `backend/tests/integration/mcp-concurrency.integration.test.ts` (NEW)

**Actions**:
1. Simulate 5 concurrent tool calls to same campaign
2. Verify WAL mode allows concurrent reads
3. Verify write locks serialize correctly (no deadlocks)
4. All operations complete within 10 second timeout

**Verification**: Test passes with <100ms average latency per tool call

**Dependencies**: T045

---

## Validation & Documentation (T047-T048)

### T047: Validate Quickstart Scenarios
**Files**:
- `specs/011-create-model-context/quickstart.md`

**Actions**:
1. Manually test all 8 quickstart scenarios from quickstart.md
2. Verify each scenario completes successfully
3. Document any edge cases discovered
4. Update quickstart.md with actual tool call examples

**Verification**: All scenarios pass end-to-end

**Dependencies**: T046

---

### T048: Update CLAUDE.md with MCP Integration
**Files**:
- `CLAUDE.md`

**Actions**:
1. Add Feature 011 summary to "Recent Changes" section
2. Update Project Structure with `backend/src/mcp/` directory
3. Add MCP server startup command to "Commands" section
4. Document environment variables for MCP server (if any)

**Verification**: CLAUDE.md reflects Feature 011 accurately

**Dependencies**: T047

---

## Parallel Execution Guide

Tasks marked **[P]** can run concurrently. Example parallelization:

**Phase 1 - Contract Tests** (after T004 completes):
```bash
# Run all 7 contract test tasks in parallel
npm test -- T005 & npm test -- T012 & npm test -- T018 & npm test -- T023 & npm test -- T026 & npm test -- T029 & npm test -- T033
```

**Phase 2 - Tool Implementations** (after contract tests complete):
- Card tools (T006-T011): Sequential (each depends on previous)
- Hierarchy tools (T013-T017): Sequential
- Graph tools (T019-T022): Sequential
- Recap tools (T024-T025): Sequential
- Info level tools (T027-T028): Sequential
- Database tools (T030-T032): Sequential
- Map tools (T034-T035): Sequential

**Phase 3 - Resources & Middleware** (after T035 completes):
```bash
# Resources in parallel
T036 & T037 & T038 & T039 & T040

# Then middleware sequentially
T041 → T042 → T043
```

**Phase 4 - Integration Tests** (after T043 completes):
```bash
# All integration tests in parallel
T044 & T045 & T046
```

---

## Task Summary

- **Setup**: 4 tasks (T001-T004)
- **Contract Tests**: 7 tasks [P] (T005, T012, T018, T023, T026, T029, T033)
- **Tool Implementations**: 29 tasks (T006-T011, T013-T017, T019-T022, T024-T025, T027-T028, T030-T032, T034-T035)
- **Resources & Prompts**: 5 tasks (T036-T040)
- **Middleware**: 3 tasks (T041-T043)
- **Integration Tests**: 3 tasks (T044-T046)
- **Validation**: 2 tasks (T047-T048)

**Total**: 48 tasks
**Estimated Duration**: 2-3 days with parallel execution
**Critical Path**: T001 → T002 → T004 → T005/T012/T018/T023/T026/T029/T033 [P] → Tool Implementations → T041 → T042 → T043 → T044/T045/T046 [P] → T047 → T048
