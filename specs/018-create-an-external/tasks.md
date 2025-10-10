# Tasks: External API for Conversational Database Operations

**Feature**: 018-create-an-external
**Branch**: `018-create-an-external`
**Estimated Time**: 28-34 hours

## Overview

This tasks.md implements Feature 018's External API for conversational database operations on localhost port 3002. External AI tools (like Claude Desktop) connect to this API for conversational query/create/update/delete workflows on campaign databases. Key differentiator vs Feature 017: CONVERSATIONAL chat workflow instead of stateless type-selection - both exist for UX comparison testing during prototype development. Backend-only (no frontend UI), localhost testing only (no authentication), comprehensive audit logging (Winston + database).

**Key Components**:
- **Backend**: 1 new entity (APIRequest for audit logging), 8 API endpoint groups, 2 new services (ExternalAPIService, AuditLogService), 2 new middleware (CORS, audit logger), reuses existing services from Features 002/004/014
- **Testing**: 1 contract test file (8 endpoint groups), 8 integration tests (from quickstart scenarios), 2 unit test suites
- **Performance**: <100ms single queries, <500ms bulk queries (100 results), <200ms write operations

---

## Phase 3.1: Backend TDD - Contract Tests

### T001: Write contract tests for 8 API endpoint groups
**File**: `backend/tests/contract/external-api.test.ts`
**Description**: Write comprehensive contract tests for all 8 endpoint groups from contracts/external-api.yaml. (1) **Health**: GET /health returns status, timestamp, version, uptime. (2) **Database Query**: GET /campaigns/:id/database/:category with filter, search, pagination, sort parameters, test information filtering with X-View-Mode header. (3) **Database Create**: POST /campaigns/:id/database/:category with entity data, test validation errors for missing required fields. (4) **Database Update**: PATCH /campaigns/:id/database/:category/:entryId with partial updates. (5) **Database Delete**: DELETE with two-phase confirmation workflow (Phase 1 preview, Phase 2 confirm=true), test confirmation token expiry. (6) **Hierarchy Navigation**: GET /campaigns/:id/database/:category/:entryId/children with depth parameter. (7) **Session Recaps**: GET /campaigns/:id/recaps with start_session/end_session range, search query. (8) **Knowledge Graphs**: GET /campaigns/:id/graphs with graph_type, node_type filters. Test 401/404 error responses. Tests MUST FAIL initially (no implementation yet). Match OpenAPI schemas exactly. Use Vitest + Supertest.
**Dependencies**: None (first task)
**Success Criteria**: 30+ test cases written covering all 8 endpoint groups, all tests fail with "endpoint not found", error response schemas validated

---

## Phase 3.2: Backend Implementation - Database Layer

### T002: Create migration 018-api-requests.sql
**File**: `backend/src/db/migrations/018-api-requests.sql`
**Description**: Create SQLite migration for api_requests audit table. Schema: id (PK), campaign_id (FK CASCADE to campaigns), user_id (nullable for localhost testing), operation_type (ENUM: query/create/update/delete/navigate_hierarchy/query_recap/query_graph/bulk_operation), entity_type (category name or null), parameters (JSON string), result_status (ENUM: success/error/partial_success), result_summary (text), execution_time_ms (integer), created_at (timestamp). Add CHECK constraints for ENUMs. Create indexes on campaign_id, operation_type, entity_type, created_at, result_status. Copy SQL from data-model.md lines 17-44. Add cleanup job comment for 30-day retention.
**Dependencies**: T001 (contract tests written)
**Success Criteria**: Migration creates api_requests table with correct schema, CHECK constraints enforce ENUMs, 5 indexes created, foreign key CASCADE to campaigns, migration runs successfully

---

### T003 [P]: Create APIRequest model
**File**: `backend/src/models/APIRequest.ts`
**Description**: Create TypeScript model for APIRequest entity. Define APIRequest interface with id, campaign_id, user_id (nullable), operation_type (8 enum values), entity_type (nullable), parameters (nullable string), result_status (3 enum values), result_summary (nullable), execution_time_ms, created_at. Define typed parameter interfaces: QueryParameters, CreateParameters, UpdateParameters, DeleteParameters, NavigateHierarchyParameters, QueryRecapParameters, QueryGraphParameters. Add CRUD methods: create(), findById(), findByCampaignId(), updateResult(), deleteOlderThan() for 30-day cleanup. Copy interfaces from data-model.md lines 48-113. Include JSDoc comments for audit trail lifecycle.
**Dependencies**: T002 (migration created)
**Success Criteria**: Model file created, TypeScript types match database schema, parameter interfaces defined, CRUD methods implemented, no compilation errors

---

## Phase 3.3: Backend Implementation - Services Layer

### T004 [P]: Create AuditLogService (Winston + database dual logging)
**File**: `backend/src/services/AuditLogService.ts`
**Description**: Create service for dual logging strategy (Winston file logs + database audit table). Configure Winston: JSON format, daily rotation (`logs/external-api/YYYY-MM-DD.log`), 30-day retention, structured fields (timestamp, level, api_endpoint, method, campaign_id, category, operation_type, user_agent, response_time_ms, error). Implement logRequest(req: Request, res: Response, startTime: number): Promise<void> method that writes to BOTH Winston AND api_requests table asynchronously (don't block API responses). Implement getOperationLogs(campaignId: string, filters?): Promise<APIRequest[]> for querying audit history. Implement cleanupOldLogs(retentionDays = 30): Promise<number> for automated cleanup. Copy Winston config from research.md decision 3 lines 25-30. Handle write failures gracefully (log to console but don't crash).
**Dependencies**: T003 (APIRequest model)
**Success Criteria**: AuditLogService created, Winston configured with daily rotation, dual logging works, async writes don't block API, cleanup method deletes old records

---

### T005: Create ExternalAPIService (orchestration)
**File**: `backend/src/services/ExternalAPIService.ts`
**Description**: Create orchestration service that reuses existing services from Features 002/004/014. Implement query operation: queryEntries(campaignId, category, filters, viewMode): Promise<QueryResult> - calls Feature 014 DatabaseQueryService with Feature 004 ViewModeService filtering. Implement create operation: createEntry(campaignId, category, data): Promise<CreateResult> - validates with Feature 014 Zod schemas, calls DatabaseQueryService.create(). Implement update operation: updateEntry(campaignId, category, entryId, updates): Promise<UpdateResult> - partial updates, auto-refreshes updated_at timestamp. Implement delete operation with two-phase confirmation: previewDelete(entryId): Promise<DeletePreview> returns affected references + cascade info, confirmDelete(entryId, token): Promise<void> validates 60s token expiry. Implement hierarchy navigation: getChildren(entryId, category, depth): Promise<HierarchyResult> - recursive query with depth limit. Integrate Feature 002 CampaignOwnershipService for campaign validation. Copy orchestration patterns from plan.md lines 92-96. All operations return execution_time_ms for audit logging.
**Dependencies**: T004 (AuditLogService), Feature 002/004/014 services
**Success Criteria**: ExternalAPIService created, reuses existing services, all 8 operation types implemented, two-phase delete confirmation works, execution timing tracked

---

## Phase 3.4: Backend Implementation - Middleware Layer

### T006 [P]: Create externalApiCors.ts middleware
**File**: `backend/src/middleware/externalApiCors.ts`
**Description**: Create CORS middleware for localhost testing. Configure origin: ['http://localhost:*', 'http://127.0.0.1:*'] (wildcard ports for AI tool flexibility). Set credentials: false (no authentication). Allow methods: GET, POST, PATCH, DELETE, OPTIONS. Expose headers: X-View-Mode, X-Confirmation-Token. Set maxAge: 86400 (24 hours). Handle preflight OPTIONS requests. Copy CORS config from research.md decision 5 lines 45-49. Add localhost binding check (127.0.0.1 only, block external IPs for security).
**Dependencies**: T003 (models defined for types)
**Success Criteria**: CORS middleware created, localhost wildcard origins work, credentials disabled, preflight OPTIONS handled, external IPs blocked

---

### T007 [P]: Create auditLogger.ts middleware
**File**: `backend/src/middleware/auditLogger.ts`
**Description**: Create Express middleware that wraps requests for audit logging. Implement async middleware that: (1) captures startTime = Date.now(), (2) calls next() to pass control to route handler, (3) on response finish, calculates execution_time_ms, (4) calls AuditLogService.logRequest() asynchronously (fire-and-forget, don't block response), (5) extracts campaign_id from req.params, operation_type from route path + method, entity_type from req.params.category. Handle errors gracefully (log to console but don't crash API). Add X-Operation-ID response header with generated operation UUID. Copy middleware pattern from plan.md lines 99-103.
**Dependencies**: T004 (AuditLogService)
**Success Criteria**: Audit logger middleware created, async logging doesn't block responses, operation_id in response header, errors handled gracefully

---

## Phase 3.5: Backend Implementation - API Layer

### T008: Create external-api.ts routes
**File**: `backend/src/routes/external-api.ts`
**Description**: Create Express router for 8 endpoint groups matching contracts/external-api.yaml. (1) GET /health: return {status: 'healthy', timestamp, version, uptime_seconds}. (2) GET /campaigns/:campaignId/database/:category: parse filter (JSON), search, pagination, sort params, call ExternalAPIService.queryEntries(), apply ViewModeService filtering, return QueryResponse. (3) POST /campaigns/:campaignId/database/:category: validate request body with Feature 014 Zod schemas, call ExternalAPIService.createEntry(), return 201 CreateResponse. (4) PATCH /campaigns/:campaignId/database/:category/:entryId: partial update, call ExternalAPIService.updateEntry(), return UpdateResponse. (5) DELETE /campaigns/:campaignId/database/:category/:entryId: if confirm=false/omitted return DeletePreviewResponse with 60s token, if confirm=true call confirmDelete() and return 204. (6) GET /campaigns/:campaignId/database/:category/:entryId/children: call ExternalAPIService.getChildren() with depth param, return HierarchyResponse. (7) GET /campaigns/:campaignId/recaps: query session_recaps table with start_session/end_session range, search, return RecapsResponse. (8) GET /campaigns/:campaignId/graphs: call Feature 005/006 KnowledgeGraphService, filter by graph_type, return GraphsResponse. Add error handling for 400/404/500 responses with AI-friendly ErrorResponse format (code, message, details, suggestion). Apply auditLogger middleware to all routes. Apply externalApiCors middleware. Register router in backend/src/server.ts on /api/v1/external prefix, listening on port 3002 (separate from main app 3001). Copy error handling patterns from research.md decision 8 lines 75-81.
**Dependencies**: T005 (ExternalAPIService), T006 (CORS middleware), T007 (audit logger middleware)
**Success Criteria**: 8 endpoint groups implemented, routes registered on port 3002, error responses match OpenAPI schema, middleware applied, campaign ownership validated

---

### T009: Fix failing backend contract tests
**File**: `backend/tests/contract/external-api.test.ts`
**Description**: Run backend contract tests from T001 and verify all tests now pass with implemented routes. Fix any schema mismatches or response format issues. Test X-View-Mode header filtering (dm_view returns all, player_view filters dm_only). Test filter parameter JSON parsing. Test pagination (page, limit). Test sort parameter (prefix with - for descending). Test delete two-phase confirmation workflow (Phase 1 preview, Phase 2 with confirm=true). Test confirmation token expiry (mock 61 seconds, expect CONFIRMATION_EXPIRED error). Test hierarchy navigation depth parameter. Test session recap timeline queries (start_session, end_session range). Test knowledge graph filtering by graph_type. Verify operation_id returned in all responses. Verify execution_time_ms field present. Add test data cleanup (delete test campaigns, api_requests CASCADE deletes).
**Dependencies**: T008 (routes implemented)
**Success Criteria**: All 30+ contract tests pass, X-View-Mode filtering works, delete confirmation workflow validated, operation_id and execution_time_ms in responses, test cleanup implemented

---

## Phase 3.6: Backend Integration Tests

### T010: Write integration test for conversational query operations (Scenario 1)
**File**: `backend/tests/integration/conversational-query.test.ts`
**Description**: Write integration test for Scenario 1 from quickstart.md lines 50-162. (1) Create test campaign with 8 locations (taverns, districts, markets). (2) Query all locations via GET /database/locations, verify 8 returned. (3) Query with filter {"location_type":"tavern"}, verify 2 taverns returned. (4) Search by name "Rusty", verify 1 location returned. (5) Test pagination (limit=5, page=1 returns 5, page=2 returns 3). (6) Test sort by name ascending, verify alphabetical order. (7) Verify X-View-Mode: player_view filters dm_only locations. (8) Verify api_requests table logged 3 query operations with success status. Use Vitest + Supertest. Copy test steps from quickstart.md Scenario 1.
**Dependencies**: T009 (contract tests passing)
**Success Criteria**: Integration test passes, query filtering works, pagination works, X-View-Mode filtering verified, audit logs created

---

### T011: Write integration test for conversational create operation (Scenario 2)
**File**: `backend/tests/integration/conversational-create.test.ts`
**Description**: Write integration test for Scenario 2 from quickstart.md lines 165-268. (1) Query factions table, verify "The Red Hand" does NOT exist. (2) Create faction "The Red Hand" via POST /database/factions with body {name, description, faction_type, power_level, tags}. (3) Verify 201 response with id, created_at, updated_at auto-populated. (4) Query factions again, verify "The Red Hand" now exists in database. (5) Test error case: POST with missing required field "name", verify 400 VALIDATION_ERROR response with AI-friendly suggestion. (6) Verify api_requests table logged create operation with success status and result_summary "Created faction 'The Red Hand' with id: ...". Use Vitest + Supertest. Copy test steps from quickstart.md Scenario 2.
**Dependencies**: T009 (contract tests passing)
**Success Criteria**: Integration test passes, create operation works, auto-populated fields correct, validation errors return AI-friendly messages, audit logs created

---

### T012: Write integration test for conversational update operation (Scenario 3)
**File**: `backend/tests/integration/conversational-update.test.ts`
**Description**: Write integration test for Scenario 3 from quickstart.md lines 270-346. (1) Create test NPC "Sir Gareth" with description "A noble knight". (2) Update Sir Gareth via PATCH /database/npcs/:id with {description: "A fallen knight corrupted by dark magic", alignment: "Chaotic Evil", tags: ["corrupted", "antagonist"]}. (3) Verify 200 response with updated fields. (4) Query NPC to verify update persisted. (5) Verify updated_at timestamp changed (greater than created_at). (6) Test partial update: only update description field, verify other fields unchanged. (7) Verify api_requests table logged update operation with parameters JSON containing patch fields. Use Vitest + Supertest. Copy test steps from quickstart.md Scenario 3.
**Dependencies**: T009 (contract tests passing)
**Success Criteria**: Integration test passes, partial updates work, updated_at timestamp refreshed, audit logs contain parameters, other fields unchanged

---

### T013: Write integration test for hierarchy navigation (Scenario 4)
**File**: `backend/tests/integration/hierarchy-navigation.test.ts`
**Description**: Write integration test for Scenario 4 from quickstart.md lines 348-438. (1) Create location hierarchy: Greyhaven (city) → Docks (district) → Rusty Anchor (tavern). Set parent_location_id correctly. (2) GET /database/locations/:cityId/children, verify Docks district returned as child. (3) GET /database/locations/:docksId/children, verify Rusty Anchor tavern returned. (4) GET /database/locations/:cityId/children?depth=2, verify 2-level traversal returns both districts AND their children. (5) Test NPC hierarchy: create chain of command with superior_npc_id, verify children query works for npcs category. (6) Verify api_requests table logged navigate_hierarchy operations. Use Vitest + Supertest. Copy test steps from quickstart.md Scenario 4.
**Dependencies**: T009 (contract tests passing)
**Success Criteria**: Integration test passes, parent-child relationships work, depth parameter traverses multiple levels, operation logged as navigate_hierarchy

---

### T014: Write integration test for session recap timeline queries (Scenario 5)
**File**: `backend/tests/integration/session-recap-timeline.test.ts`
**Description**: Write integration test for Scenario 5 from quickstart.md lines 440-529. (1) Create 5 session recaps with session_number 1-5. (2) Session 2 and Session 4 mention "Dragon of Ash Peak" in summary or key_events. (3) GET /recaps?limit=3&sort=-session_number, verify last 3 sessions returned (5, 4, 3). (4) GET /recaps?search=Dragon%20of%20Ash%20Peak, verify sessions 2 and 4 returned. (5) GET /recaps?start_session=2&end_session=4, verify sessions 2, 3, 4 returned (range query). (6) Test default sort (descending session_number). (7) Verify api_requests table logged query_recap operations. Use Vitest + Supertest. Copy test steps from quickstart.md Scenario 5.
**Dependencies**: T009 (contract tests passing)
**Success Criteria**: Integration test passes, timeline queries work, search finds matching recaps, range queries correct, operation logged as query_recap

---

### T015: Write integration test for conversational delete with confirmation (Scenario 6)
**File**: `backend/tests/integration/conversational-delete.test.ts`
**Description**: Write integration test for Scenario 6 from quickstart.md lines 531-636. (1) Create item "Broken Sword". (2) Phase 1: DELETE /database/items/:id (confirm=false/omitted), verify 200 response with DeletePreviewResponse containing preview{entry, affected_references, will_cascade}, confirmation_token, expires_at. (3) Phase 2: DELETE /database/items/:id?confirm=true with X-Confirmation-Token header, verify 204 No Content. (4) Query item, verify 404 NOT_FOUND. (5) Test confirmation expiry: mock 61 seconds delay after Phase 1, attempt Phase 2, verify 400 CONFIRMATION_EXPIRED error. (6) Test deletion with references: create NPC that references faction_id, delete faction Phase 1, verify affected_references shows npcs count. (7) Verify api_requests table logged 2 delete operations (preview + confirmed). Use Vitest + Supertest with time mocking. Copy test steps from quickstart.md Scenario 6.
**Dependencies**: T009 (contract tests passing)
**Success Criteria**: Integration test passes, two-phase confirmation workflow works, token expiry validated, affected_references accurate, both phases logged

---

### T016: Write integration test for bulk query with information filtering (Scenario 7)
**File**: `backend/tests/integration/bulk-query-filtering.test.ts`
**Description**: Write integration test for Scenario 7 from quickstart.md lines 638-709. (1) Create 50 NPCs across multiple factions. (2) Create "Thieves Guild" faction. (3) 8 NPCs have faction_id = Thieves Guild. (4) 3 of those 8 NPCs have player_knowledge = 'dm_only'. (5) GET /database/npcs?filter={"faction_id":"thieves-guild-123"} with X-View-Mode: dm_view, verify 8 NPCs returned. (6) GET with same filter + X-View-Mode: player_view, verify 5 NPCs returned (8 - 3 dm_only). (7) GET with filter={"faction_id":"...", "player_knowledge":"dm_only"} with X-View-Mode: dm_view, verify 3 dm_only NPCs returned. (8) Test bulk query pagination for 50 NPCs (limit=20, verify 3 pages). (9) Verify api_requests table logged bulk_operation for queries returning 50+ results. Use Vitest + Supertest. Copy test steps from quickstart.md Scenario 7.
**Dependencies**: T009 (contract tests passing)
**Success Criteria**: Integration test passes, information filtering works correctly, dm_only entities hidden in player_view, bulk queries paginated, bulk_operation logged

---

### T017: Write integration test for audit logging verification (Scenario 8)
**File**: `backend/tests/integration/audit-logging.test.ts`
**Description**: Write integration test for Scenario 8 from quickstart.md lines 711-812. (1) Execute 5 operations in sequence: query locations (2 returned), create faction, create NPC, update NPC, query recaps (3 returned). (2) Query api_requests table ordered by created_at DESC, verify 5 records logged. (3) Verify each record has: operation_type (query/create/update), entity_type (category name), result_status=success, execution_time_ms > 0. (4) Verify create faction record has parameters JSON containing request body. (5) Verify result_summary contains human-readable description: "Created faction 'The Red Hand' with id: ...". (6) Calculate average execution_time_ms by operation_type, verify query operations < 100ms, create/update < 200ms. (7) Verify Winston log file exists at logs/external-api/YYYY-MM-DD.log with JSON entries. (8) Parse Winston log, verify 5 structured log entries match database records. Use Vitest + Supertest + fs to read log file. Copy test steps from quickstart.md Scenario 8.
**Dependencies**: T009 (contract tests passing), T004 (AuditLogService)
**Success Criteria**: Integration test passes, all operations logged to database and Winston file, parameters captured, result_summary human-readable, performance metrics accurate

---

## Phase 3.7: Backend Unit Tests

### T018 [P]: Write unit tests for ExternalAPIService
**File**: `backend/tests/unit/ExternalAPIService.test.ts`
**Description**: Write unit tests for ExternalAPIService orchestration methods using mocked dependencies. Test queryEntries(): (1) Mock DatabaseQueryService.query(), verify filters passed correctly. (2) Mock ViewModeService.applyFiltering(), verify dm_view returns all, player_view filters dm_only. (3) Test pagination logic (page, limit calculation). (4) Test sort parameter parsing ("-created_at" → descending). Test createEntry(): (1) Mock Zod schema validation, test validation failure returns error. (2) Mock DatabaseQueryService.create(), verify auto-populated fields (id, created_at, updated_at). Test updateEntry(): (1) Mock partial update, verify only updated fields modified. (2) Verify updated_at timestamp refreshed. Test delete confirmation: (1) previewDelete() returns affected_references count. (2) confirmDelete() validates token expiry (mock 61s). (3) Test confirmation token generation and validation. Test hierarchy navigation: (1) Mock recursive query for depth=2, verify 2 levels traversed. (2) Test categories that don't support hierarchy return error. Use Vitest + vi.mock().
**Dependencies**: T005 (ExternalAPIService)
**Success Criteria**: Unit tests pass, mocked dependencies work, validation tested, delete confirmation workflow validated, hierarchy depth logic correct

---

### T019 [P]: Write unit tests for AuditLogService
**File**: `backend/tests/unit/AuditLogService.test.ts`
**Description**: Write unit tests for dual logging strategy. Test logRequest(): (1) Mock Winston logger, verify JSON log entry written with structured fields (timestamp, level, api_endpoint, method, campaign_id, category, operation_type, user_agent, response_time_ms). (2) Mock APIRequest.create(), verify database record created asynchronously. (3) Test Winston write failure handled gracefully (console log, don't crash). (4) Test database write failure handled gracefully. Test getOperationLogs(): (1) Mock APIRequest.findByCampaignId(), verify filters applied (operation_type, entity_type, result_status). (2) Test pagination for audit log queries. Test cleanupOldLogs(): (1) Mock Date.now(), set retentionDays=30. (2) Mock APIRequest.deleteOlderThan(), verify records older than 30 days deleted. (3) Return count of deleted records. Test async logging: (1) Verify logRequest() doesn't block (returns immediately, logs in background). (2) Mock delayed database write, verify API response not delayed. Use Vitest + vi.mock().
**Dependencies**: T004 (AuditLogService)
**Success Criteria**: Unit tests pass, dual logging validated, error handling works, async writes don't block, cleanup logic correct

---

## Phase 3.8: Docker Configuration & Testing

### T020: Add external-api service to docker-compose.yml
**File**: `docker-compose.yml`
**Description**: Add external-api service to docker-compose.yml for Feature 018. Use same backend Docker image but expose port 3002 instead of 3001. Set environment variables: EXTERNAL_API_PORT=3002, DATABASE_PATH=/app/data/wrldbldr-mcp-manager.db, CORS_ORIGIN=http://localhost:*,http://127.0.0.1:*, LOG_LEVEL=debug. Bind mount logs directory for Winston output: ./logs:/app/logs. Share database volume with main backend service. Add healthcheck: curl http://localhost:3002/api/v1/external/health (interval 30s, timeout 5s, retries 3). Add depends_on: [backend] to ensure main app starts first. Set restart: unless-stopped. Add network: app-network (same as main services). Copy Docker patterns from existing backend service. Update README.md with external-api startup instructions.
**Dependencies**: T009 (routes implemented)
**Success Criteria**: External-api service added to docker-compose.yml, port 3002 exposed, environment variables set, logs bind mounted, healthcheck configured, service starts successfully

---

### T021: Test external API on port 3002 with cURL
**File**: N/A (manual testing)
**Description**: Manual testing to verify external API works on port 3002. (1) Start services: docker-compose up. (2) Verify external-api service started: docker-compose ps | grep external-api. (3) Test health endpoint: curl http://localhost:3002/api/v1/external/health, verify 200 response with {status: "healthy", ...}. (4) Create test campaign via main app on port 3001, note campaign_id. (5) Test query endpoint: curl "http://localhost:3002/api/v1/external/campaigns/{id}/database/npcs", verify empty array returned. (6) Test create endpoint: curl -X POST with NPC data, verify 201 response. (7) Test query again, verify created NPC returned. (8) Test CORS headers: curl -H "Origin: http://localhost:5173" -I, verify Access-Control-Allow-Origin header present. (9) Check Winston log file: cat logs/external-api/$(date +%Y-%m-%d).log | tail -10, verify JSON log entries. (10) Check database audit table: SELECT * FROM api_requests ORDER BY created_at DESC LIMIT 5, verify operations logged. Document all cURL commands in quickstart.md if not already present.
**Dependencies**: T020 (Docker configured)
**Success Criteria**: External API accessible on port 3002, health check works, CRUD operations work, CORS headers present, Winston logs created, database audit logs created

---

## Phase 3.9: Documentation & Polish

### T022: Update CLAUDE.md with Feature 018 documentation
**File**: `C:/Users/zmanl/projects/VVD-mimic/CLAUDE.md`
**Description**: Update project documentation with Feature 018 context. Add to "Active Technologies" section: "Feature 018: External API for Conversational Database Operations - Express 4.x (port 3002), Winston (JSON logging with daily rotation), Better-SQLite3 (audit logging), CORS (localhost wildcard origins), no authentication (testing prototype)". Add to "Project Structure" section: backend services (ExternalAPIService, AuditLogService, reuse DatabaseQueryService/ViewModeService/CampaignOwnershipService), middleware (externalApiCors.ts, auditLogger.ts), routes (external-api.ts with 8 endpoint groups), 1 new table (api_requests for audit), logs directory (Winston output). Add to "Commands" section: "docker-compose up external-api" to start external API on port 3002, "curl http://localhost:3002/api/v1/external/health" for health check, "cat logs/external-api/$(date +%Y-%m-%d).log" to view today's audit logs. Add to "Recent Changes" section: "Feature 018 (2025-01-10): External API for conversational database operations on localhost port 3002. AI tools like Claude Desktop connect for query/create/update/delete workflows. 8 API endpoint groups, dual audit logging (Winston + database), two-phase delete confirmation, information level filtering, no authentication (localhost testing only). Performance: <100ms queries, <200ms writes. Comparison testing vs Feature 017 stateless import. Technologies: Express, Winston, Better-SQLite3, CORS."
**Dependencies**: All tasks complete
**Success Criteria**: CLAUDE.md updated with Feature 018 sections, tech stack documented, commands added, recent changes logged

---

## Parallel Execution Groups

**Maximum Parallelization**: 5 tasks can run concurrently in optimal scenario.

### Group 1: Backend Models & Middleware (T003, T006, T007) - 3 parallel
After T002 (migration), APIRequest model, CORS middleware, and audit logger middleware are independent files.

### Group 2: Backend Services (T004 parallel candidate)
AuditLogService can start in parallel with T003 if APIRequest interface is defined first.

### Group 3: Backend Integration Tests (T010-T017) - 8 parallel
After T009, all integration test files are independent and can run in parallel.

### Group 4: Backend Unit Tests (T018, T019) - 2 parallel
After T005 and T004 complete, both unit test files are independent.

---

## Task Dependency Graph

```
T001 (contract tests - all 8 endpoint groups)
  ↓
T002 (migration)
  ↓
T003, T006, T007 (model, CORS, audit logger) [P]
  ↓
T004 (AuditLogService) [P with T003]
  ↓
T005 (ExternalAPIService - depends on T004)
  ↓
T008 (routes - integrates T005, T006, T007)
  ↓
T009 (fix contract tests)
  ↓
T010, T011, T012, T013, T014, T015, T016, T017 (integration tests) [P]
  ↓
T018, T019 (unit tests) [P]
  ↓
T020 (Docker configuration)
  ↓
T021 (manual testing)
  ↓
T022 (CLAUDE.md update)
```

---

## Estimated Time Breakdown

**Backend**: 24-28 hours
- Contract tests: 4 hours (T001 - 8 endpoint groups)
- Database layer: 2 hours (T002-T003)
- Services layer: 5 hours (T004-T005)
- Middleware layer: 2 hours (T006-T007)
- API layer: 3 hours (T008-T009)
- Integration tests: 6 hours (T010-T017 - 8 scenarios)
- Unit tests: 2 hours (T018-T019)

**Infrastructure**: 2-3 hours
- Docker configuration: 1 hour (T020)
- Manual testing: 1 hour (T021)

**Documentation**: 2-3 hours
- CLAUDE.md update: 1 hour (T022)
- Quickstart validation: 1 hour (T021)

**Total**: 28-34 hours for complete implementation

---

## Success Criteria

✅ **All 22 tasks completed**
✅ **All tests passing**: 30+ contract tests (8 endpoint groups), 8 integration tests (quickstart scenarios), 2 unit test suites
✅ **Feature workflow validated**: External API accessible on port 3002, CRUD operations work, information filtering works, delete confirmation workflow validated
✅ **Performance targets met**: <100ms single queries, <500ms bulk queries, <200ms writes
✅ **Dependencies integrated**: Feature 002 campaign ownership, Feature 004 information filtering, Feature 014 database queries
✅ **Audit logging works**: Winston file logs + database api_requests table, structured JSON format, 30-day retention
✅ **Docker deployment works**: external-api service on port 3002, healthcheck configured, CORS localhost wildcard
✅ **Documentation updated**: CLAUDE.md with Feature 018 context, quickstart scenarios validated

---

**Status**: ✅ Tasks.md generated - 22 tasks, 28-34 hour estimate, ready for implementation
