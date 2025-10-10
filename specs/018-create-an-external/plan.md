
# Implementation Plan: External API for Conversational Database Operations

**Branch**: `018-create-an-external` | **Date**: 2025-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `C:/Users/zmanl/Projects/VVD-mimic/specs/018-create-an-external/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Feature 018 implements an external localhost API for conversational database operations, enabling AI tools like Claude Desktop to perform query/create/update/delete operations on campaign databases through natural language chat. Developer workflow: (1) Start localhost API on separate port (3002), (2) Configure Claude Desktop to connect, (3) Chat with AI using natural language like "Show me all NPCs in Thieves Guild" or "Create new location The Rusty Anchor tavern", (4) AI performs database operations conversationally with confirmation prompts for destructive actions. Key differentiator: CONVERSATIONAL chat workflow vs Feature 017's stateless type-selection approach - both exist for UX comparison testing. No frontend UI (pure API), no authentication (localhost prototype only), comprehensive audit logging for debugging. Operates on existing 13 category database tables (Feature 014). Performance targets: <100ms single queries, <500ms bulk queries (100 results), <200ms write operations. Purpose: Test alternative AI interaction pattern during prototype development.

## Technical Context
**Language/Version**: TypeScript 5.0+ (Node.js 20 LTS backend)
**Primary Dependencies**: Express 4.x, Better-SQLite3 with JSON1, @modelcontextprotocol/sdk (MCP tools/resources), zod (validation), winston (logging), cors
**Storage**: SQLite3 with JSON1 extension (reuse existing 13 category tables from Feature 014, new api_requests audit table)
**Testing**: Vitest + Supertest (backend contract/integration), integration tests for conversational workflow sequences
**Target Platform**: Docker localhost (Windows/Linux/macOS via Docker Compose, port 3002 separate from main app 3001)
**Project Type**: web (backend only - no frontend, pure REST API)
**Performance Goals**: <100ms single-entity queries, <500ms bulk queries (100 results), <200ms create/update/delete operations, <300ms hierarchy navigation (3-level deep)
**Constraints**: Localhost only (127.0.0.1), no authentication (prototype testing model), audit logging required for all operations, confirmation prompts for bulk destructive operations, respect campaign ownership and information level filtering
**Scale/Scope**: Single-user prototype, 13 category database access (NPCs, Locations, Factions, Session Recaps, Quests, Player Characters, Lore, World Rules, Planar Forces, Session Prep, Custom Mechanics, Items, Creatures), conversational workflow testing vs Feature 017 comparison

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Workflow-First Design (NON-NEGOTIABLE)**: ✅ PASS
Feature 018 provides conversational AI workflow for database operations, solving "plan twice" problem as alternative to manual database entry. Developers test natural language interaction: "Show all NPCs in Thieves Guild" → AI queries database → immediate results. This enables comparison testing with Feature 017's stateless import to determine which workflow feels more natural for different use cases.

**II. User Agency & Full Customization**: ✅ PASS
Conversational workflow provides complete control. FR-005 and FR-016 require explicit confirmation for destructive operations (deletes, bulk updates). AI suggests operations but user decides via chat conversation. User can refine requests conversationally before committing changes. No forced automation - all operations require user interaction.

**III. Information Filtering & Access Control**: ✅ PASS
FR-011 enforces campaign ownership (users can only access own campaigns). FR-012 enforces information level filtering (respects player_knowledge field based on view mode). API operations respect same filtering rules as main application. Edge case handling (spec lines 151-153) explicitly documents permission checks.

**IV. Knowledge Graph Architecture**: ✅ PASS
FR-008 supports knowledge graph operations (query graphs, nodes, relationships). API provides read access to existing graphs but does NOT auto-populate them (consistent with constitution principle that graphs remain user-curated). External AI tools can query graphs for context but cannot autonomously modify graph structure without explicit user commands.

**V. BYOLLM & Privacy (NON-NEGOTIABLE)**: ✅ PASS (N/A)
Feature 018 is a database API, NOT an LLM integration feature. External AI tools (Claude Desktop) connect to this API using THEIR OWN credentials managed outside Wrldbldr system. Wrldbldr never calls LLM APIs, never stores LLM credentials, never proxies LLM requests. This differs from Features 005/017 which DO make LLM API calls (those features use Feature 008 BYOLLM configuration).

**VI. Local-Only & Prototype-First**: ✅ PASS
FR-013: Localhost only (127.0.0.1). FR-014: No authentication (testing prototype model). FR-015: Security limitations documented prominently. Docker deployment on port 3002 separate from main app. Acceptable performance targets for prototype (<100ms queries, <500ms bulk). Focus on functionality over optimization. Testing-only use case clearly scoped.

**VII. Transparency & User Approval**: ✅ PASS
FR-005: Delete operations require confirmation prompts. FR-016: Bulk destructive operations require explicit confirmation (prevent accidental "delete all"). Conversational workflow enables user review and refinement before committing changes. FR-017 to FR-021: Comprehensive audit logging for all operations (debugging and accountability). User maintains full ownership through conversational interaction.

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/
│   │   └── APIRequest.ts                          # NEW: Audit logging entity (api_requests table)
│   ├── services/
│   │   ├── ExternalAPIService.ts                  # NEW: External API orchestration (reuse existing services)
│   │   ├── DatabaseQueryService.ts                # REUSE/EXTEND: Feature 014 category queries
│   │   ├── ViewModeService.ts                     # REUSE: Feature 004 information filtering
│   │   ├── CampaignOwnershipService.ts            # REUSE: Feature 002 ownership checks
│   │   └── AuditLogService.ts                     # NEW: Winston + database dual logging
│   ├── routes/
│   │   └── external-api.ts                        # NEW: 8 endpoint groups (health, query, create, update, delete, hierarchy, recaps, graphs)
│   ├── middleware/
│   │   ├── externalApiCors.ts                     # NEW: Localhost CORS configuration (port 3002)
│   │   ├── campaignOwnership.ts                   # REUSE: Feature 002 middleware
│   │   ├── viewModeFilter.ts                      # REUSE: Feature 004 middleware
│   │   └── auditLogger.ts                         # NEW: Winston request/response logging middleware
│   └── db/
│       └── migrations/
│           └── 018-api-requests.sql               # NEW: api_requests audit table
└── tests/
    ├── contract/
    │   └── external-api.test.ts                   # NEW: 8 endpoint group contract tests
    ├── integration/
    │   ├── conversational-query.test.ts           # NEW: Scenario 1 (query operations)
    │   ├── conversational-create.test.ts          # NEW: Scenario 2 (create operations)
    │   ├── conversational-update.test.ts          # NEW: Scenario 3 (update operations)
    │   ├── hierarchy-navigation.test.ts           # NEW: Scenario 4 (navigate hierarchies)
    │   ├── session-recap-timeline.test.ts         # NEW: Scenario 5 (recap queries)
    │   ├── conversational-delete.test.ts          # NEW: Scenario 6 (delete with confirmation)
    │   ├── bulk-query-filtering.test.ts           # NEW: Scenario 7 (bulk operations)
    │   └── audit-logging.test.ts                  # NEW: Scenario 8 (logging verification)
    └── unit/
        ├── ExternalAPIService.test.ts             # NEW: Service orchestration unit tests
        └── AuditLogService.test.ts                # NEW: Winston + database logging tests
```

**Structure Decision**: Backend-only web application - Feature 018 is a pure REST API with no frontend. Extends existing backend patterns from Features 002 (campaign ownership), 004 (information filtering), and 014 (database categories). New components: 1 model (APIRequest), 2 services (ExternalAPIService, AuditLogService), 1 route (external-api.ts with 8 endpoint groups), 3 middleware (CORS, audit logging), 1 migration (api_requests table). Reuses existing services for database queries, campaign ownership, and view mode filtering. 8 integration tests map to 8 acceptance scenarios from quickstart.md. Runs on separate port (3002) from main application (3001) for isolated testing.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from contracts/external-api.yaml (8 endpoint groups), data-model.md (1 entity, audit logging models), and quickstart.md (8 test scenarios)
- Backend tasks (TDD order):
  * Database layer: Migration 018-api-requests.sql → APIRequest model
  * Services layer: AuditLogService (Winston + database dual logging) [P] → ExternalAPIService (orchestration, reuse existing services)
  * Middleware layer: externalApiCors.ts [P] → auditLogger.ts [P]
  * API layer: external-api.ts routes (8 endpoint groups: health, query, create, update, delete, hierarchy, recaps, graphs)
  * Contract tests: external-api.test.ts (8 endpoint group contract tests)
  * Unit tests: ExternalAPIService.test.ts [P] → AuditLogService.test.ts [P]
  * Integration tests: 8 scenarios matching quickstart.md (conversational-query, conversational-create, conversational-update, hierarchy-navigation, session-recap-timeline, conversational-delete, bulk-query-filtering, audit-logging)
- No frontend tasks (backend-only API)

**Ordering Strategy**:
- Backend: TDD order (tests before implementation), database → services → middleware → API → integration
- Parallelize independent files within same layer (marked [P])
- Integration tests last (require working backend)

**Estimated Output**: 22-26 numbered, ordered tasks in tasks.md
- Backend: 22-26 tasks (1 database, 3 services, 2 middleware, 1 route, 1 contract test, 2 unit tests, 8 integration tests, 2-6 supporting tasks)
- Dependencies: Feature 002 (CampaignOwnershipService reuse), Feature 004 (ViewModeService reuse), Feature 014 (DatabaseQueryService reuse/extend)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ 2025-01-10
- [x] Phase 1: Design complete (/plan command) - ✅ 2025-01-10
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ 2025-01-10
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - ✅ 2025-01-10
- [x] Post-Design Constitution Check: PASS - ✅ 2025-01-10
- [x] All NEEDS CLARIFICATION resolved - ✅ 2025-01-10
- [x] Complexity deviations documented - N/A (no violations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
