# Implementation Plan: Model Context Protocol (MCP) Integration

**Branch**: `011-create-model-context` | **Date**: 2025-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-create-model-context/spec.md`

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
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

## Summary
Implement Anthropic's Model Context Protocol (MCP) to provide structured tools for AI to manipulate campaign data. This infrastructure layer enables Feature 005's Import AI and Planning AI to directly call functions (read_card, create_card, update_graph) instead of parsing JSON outputs. MCP provides 29 tools across 8 categories: card operations, hierarchy navigation, knowledge graphs, session recaps, information level discovery, database card operations, map card operations, and resources/prompts. All operations use atomic transactions, enforce campaign permissions, and support concurrent requests.

## Technical Context
**Language/Version**: TypeScript 5.0+ (Node.js 20 LTS)
**Primary Dependencies**: @modelcontextprotocol/sdk (official Anthropic MCP SDK), Better-SQLite3 (existing), zod (schema validation)
**Storage**: SQLite3 (existing database, no new tables required except mcp_tool_logs)
**Testing**: Vitest + Supertest (contract tests), Vitest (unit tests), Playwright (E2E integration with Feature 005)
**Target Platform**: Docker container on localhost (Node.js process)
**Project Type**: Web (backend infrastructure for frontend AI features)
**Performance Goals**: <100ms single card read, <500ms search queries (100 results), 5 concurrent tool calls
**Constraints**: Atomic transactions (all-or-nothing), 10s tool timeout (resolved), permission enforcement, minimal new database tables
**Scale/Scope**: 29 MCP tools, 3 resources, 2 prompts, support 500 graph nodes + 1000 edges

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I: Workflow-First Design**
- ✅ MCP tools operate on existing card hierarchy (no new "plan twice" workflows)
- ✅ Tools expose campaign content IS the data model
- ✅ Bulk import via MCP API-driven changes (enables Feature 005)

**Principle II: User Agency**
- ✅ MCP tools enforce campaign ownership (GM owns data)
- ✅ All operations atomic (user can trust data integrity)
- ✅ Explicit tool call logging (transparency)
- ✅ No MCP tool modifies data without Feature 005 user approval workflow

**Principle III: Information Filtering**
- ✅ MCP tools respect information_level parameter
- ✅ Permission context enforces DM vs Player view filtering
- ✅ list_information_levels tool enables AI to discover level IDs dynamically

**Principle IV: Knowledge Graph Architecture**
- ✅ MCP provides tools for 4 graph types (existing from Feature 006)
- ✅ update_graph tool supports toggle controls, active filtering
- ✅ All graphs optional (AI controls context per query)

**Principle V: BYOLLM & Privacy**
- ✅ MCP server uses existing BYOLLM credentials (Feature 008)
- ✅ No new credential storage, reuses encrypted API keys
- ✅ Tools called by AI using user's own LLM

**Principle VI: Local-Only & Prototype-First**
- ✅ MCP server runs in Docker container (localhost only)
- ✅ stdio communication (no network exposure)
- ✅ Feature functionality over optimization (10s timeout acceptable)

**Principle VII: Transparency & User Approval**
- ✅ MCP tools log all calls (timestamp, tool, params, result)
- ✅ Feature 005 will handle user approval workflow (not MCP's concern)
- ✅ MCP provides infrastructure, Feature 005 provides approval UI

**Constitutional Compliance**: PASS ✅

## Project Structure

### Documentation (this feature)
```
specs/011-create-model-context/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (MCP SDK patterns, tool schemas)
├── data-model.md        # Phase 1 output (tool schemas, logging tables)
├── quickstart.md        # Phase 1 output (manual MCP tool testing)
├── contracts/           # Phase 1 output (tool schemas in JSON Schema format)
│   ├── card-tools.json
│   ├── hierarchy-tools.json
│   ├── graph-tools.json
│   ├── recap-tools.json
│   ├── info-level-tools.json
│   ├── database-tools.json
│   ├── map-tools.json
│   └── resources-prompts.json
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── mcp/
│   │   ├── server.ts              # MCP server entry point (stdio communication)
│   │   ├── tools/
│   │   │   ├── card-tools.ts      # read_card, create_card, update_card, delete_card, search_cards, move_card
│   │   │   ├── hierarchy-tools.ts # get_card_path, get_subtree, list_children, get_siblings, get_ancestor
│   │   │   ├── graph-tools.ts     # query_graph, list_graph_nodes, get_node_relationships, update_graph
│   │   │   ├── recap-tools.ts     # get_session_recaps, get_timeline_events
│   │   │   ├── info-level-tools.ts # list_information_levels, get_information_level_by_name
│   │   │   ├── database-tools.ts  # query_database_card, create_database_entry, update_database_entry
│   │   │   └── map-tools.ts       # list_map_pins, create_map_pin
│   │   ├── resources/
│   │   │   ├── cards-resource.ts  # campaign://cards browsing
│   │   │   ├── recaps-resource.ts # campaign://recaps browsing
│   │   │   └── graphs-resource.ts # campaign://graphs/{type} browsing
│   │   ├── prompts/
│   │   │   ├── import-workflow.ts # Import AI structured prompt
│   │   │   └── planning-workflow.ts # Planning AI structured prompt
│   │   ├── schemas/               # Zod schemas for tool validation
│   │   │   ├── card-schemas.ts
│   │   │   ├── hierarchy-schemas.ts
│   │   │   ├── graph-schemas.ts
│   │   │   ├── recap-schemas.ts
│   │   │   ├── info-level-schemas.ts
│   │   │   ├── database-schemas.ts
│   │   │   └── map-schemas.ts
│   │   └── middleware/
│   │       ├── permissions.ts     # Campaign ownership + information level enforcement
│   │       ├── transactions.ts    # Atomic operation wrappers
│   │       └── logging.ts         # Tool call logging
│   ├── services/
│   │   └── (existing services - CardService, KnowledgeGraphService reused)
│   └── db/
│       └── migrations/
│           └── 011-mcp-tool-logs.sql # New table for tool call logging
├── tests/
│   ├── contract/
│   │   ├── card-tools.contract.test.ts
│   │   ├── hierarchy-tools.contract.test.ts
│   │   ├── graph-tools.contract.test.ts
│   │   ├── recap-tools.contract.test.ts
│   │   ├── info-level-tools.contract.test.ts
│   │   ├── database-tools.contract.test.ts
│   │   └── map-tools.contract.test.ts
│   ├── integration/
│   │   ├── mcp-atomic-operations.test.ts
│   │   ├── mcp-permissions.test.ts
│   │   └── mcp-concurrent-requests.test.ts
│   └── unit/
│       ├── mcp-server.test.ts
│       └── mcp-schemas.test.ts
└── package.json                   # Add @modelcontextprotocol/sdk dependency

frontend/
└── (no frontend changes for Feature 011 - Feature 005 will consume MCP tools)
```

**Structure Decision**: Web application (backend-only). MCP server is a separate Node.js process communicating via stdio with Feature 005's AI features. No frontend changes needed - Feature 005 will integrate MCP tools into Import/Planning AI workflows.

## Phase 0: Outline & Research

**Unknowns from Technical Context** (resolved):
1. ~~Tool timeout value~~ → **10 seconds** (balances complex queries vs hanging prevention)
2. ~~Graph node/edge JSONB schema~~ → **Existing schema from Feature 006** (no changes needed)

**Research Tasks**:
1. **MCP SDK best practices**:
   - Task: Research @modelcontextprotocol/sdk tool registration patterns
   - Task: Research MCP stdio communication protocol (JSON-RPC)
   - Task: Find examples of MCP tool error handling

2. **Atomic transaction patterns**:
   - Task: Research Better-SQLite3 transaction rollback on errors
   - Task: Find patterns for concurrent request isolation

3. **Permission enforcement integration**:
   - Task: Research how to inject campaign context into MCP tool calls
   - Task: Find patterns for information level filtering in tool responses

**Output**: research.md consolidating findings

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete

### 1. Extract Entities → data-model.md

**New Entities**:
- **MCPToolLog**: Logs all tool calls
  - Fields: id (INTEGER PRIMARY KEY), tool_name (TEXT), campaign_id (TEXT FK), user_id (TEXT FK), parameters (TEXT JSONB), result_status ('success' | 'error'), error_message (TEXT NULL), execution_time_ms (INTEGER), created_at (INTEGER)
  - Relationships: Many-to-one with campaigns, many-to-one with users
  - Validation: tool_name in allowed set (29 tools), execution_time_ms >= 0

**Existing Entities (Reused)**:
- Cards, KnowledgeGraphs, GraphNodes, GraphEdges, Sessions, InformationLevels (no changes)

### 2. Generate API Contracts → /contracts/

**Tool Schemas** (JSON Schema format following MCP spec):

- **card-tools.json**: read_card, create_card, update_card, delete_card, search_cards, move_card
  - Each tool: input schema (parameters), output schema (return type), error codes

- **hierarchy-tools.json**: get_card_path, get_subtree, list_children, get_siblings, get_ancestor
  - Recursive depth limits, circular reference detection

- **graph-tools.json**: query_graph, list_graph_nodes, get_node_relationships, update_graph
  - Active filtering toggle, operation types (add_node, add_edge, remove_edge, etc.)

- **recap-tools.json**: get_session_recaps, get_timeline_events
  - Pagination parameters, date range filters

- **info-level-tools.json**: list_information_levels, get_information_level_by_name
  - Information level discovery for AI to find "DM Secret" ID dynamically

- **database-tools.json**: query_database_card, create_database_entry, update_database_entry
  - Database card row operations (NPC databases, quest logs)

- **map-tools.json**: list_map_pins, create_map_pin
  - Map pin listing and creation with x,y coordinates

- **resources-prompts.json**: campaign://cards, campaign://recaps, campaign://graphs/{type}, import_workflow, planning_workflow
  - URI schemes, prompt template parameters

### 3. Generate Contract Tests → tests/contract/

- **card-tools.contract.test.ts**: Test all card tool schemas match implementation
- **hierarchy-tools.contract.test.ts**: Test hierarchy navigation returns correct structure
- **graph-tools.contract.test.ts**: Test graph operations follow schema
- **recap-tools.contract.test.ts**: Test recap queries return valid data
- **info-level-tools.contract.test.ts**: Test information level discovery
- **database-tools.contract.test.ts**: Test database card row operations
- **map-tools.contract.test.ts**: Test map pin operations

### 4. Extract Test Scenarios → quickstart.md

- Scenario 1: Manually call read_card via MCP stdio
- Scenario 2: Create card via create_card tool, verify atomicity
- Scenario 3: Update Political-Web graph via update_graph, check active filtering
- Scenario 4: Test permission enforcement (DM Secret card access)
- Scenario 5: Trigger tool timeout, verify rollback
- Scenario 6: Test information level discovery tools
- Scenario 7: Test database card queries
- Scenario 8: Test map pin creation

### 5. Update CLAUDE.md

Run: `.specify/scripts/bash/update-agent-context.sh claude`
- Add MCP SDK to Active Technologies
- Add 29 MCP tools to Project Structure
- Update Recent Changes with Feature 011
- Preserve existing manual additions

**Output**: data-model.md, contracts/*.json, failing tests, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from contracts:
   - Each tool schema → contract test task [P]
   - Each tool → implementation task
   - Each resource → resource handler task
   - Each prompt → prompt template task

**Ordering Strategy** (TDD + Dependency Order):
1. **Setup tasks** (sequential):
   - T001: Install @modelcontextprotocol/sdk dependency
   - T002: Create MCP server entry point (server.ts)
   - T003: Create migration 011-mcp-tool-logs.sql
   - T004: Create Zod schemas for all tools

2. **Card tools** (parallel after schemas):
   - T005: [P] Contract test: card-tools.contract.test.ts
   - T006: [P] Implement read_card tool
   - T007: [P] Implement search_cards tool
   - T008: Implement create_card tool (uses card service)
   - T009: Implement update_card tool
   - T010: Implement delete_card tool (child protection)
   - T011: Implement move_card tool (circular ref detection)

3. **Hierarchy tools** (parallel after card tools):
   - T012: [P] Contract test: hierarchy-tools.contract.test.ts
   - T013: [P] Implement get_card_path tool
   - T014: [P] Implement get_subtree tool
   - T015: [P] Implement list_children tool
   - T016: [P] Implement get_siblings tool
   - T017: [P] Implement get_ancestor tool

4. **Graph tools** (parallel, depends on KnowledgeGraphService):
   - T018: [P] Contract test: graph-tools.contract.test.ts
   - T019: [P] Implement query_graph tool
   - T020: [P] Implement list_graph_nodes tool (active filtering)
   - T021: [P] Implement get_node_relationships tool
   - T022: Implement update_graph tool (atomic mutations)

5. **Recap tools** (parallel):
   - T023: [P] Contract test: recap-tools.contract.test.ts
   - T024: [P] Implement get_session_recaps tool
   - T025: [P] Implement get_timeline_events tool

6. **Information level tools** (parallel):
   - T026: [P] Contract test: info-level-tools.contract.test.ts
   - T027: [P] Implement list_information_levels tool
   - T028: [P] Implement get_information_level_by_name tool

7. **Database card tools** (parallel):
   - T029: [P] Contract test: database-tools.contract.test.ts
   - T030: [P] Implement query_database_card tool
   - T031: [P] Implement create_database_entry tool
   - T032: [P] Implement update_database_entry tool

8. **Map card tools** (parallel):
   - T033: [P] Contract test: map-tools.contract.test.ts
   - T034: [P] Implement list_map_pins tool
   - T035: [P] Implement create_map_pin tool

9. **Resources & Prompts** (parallel):
   - T036: [P] Implement campaign://cards resource
   - T037: [P] Implement campaign://recaps resource
   - T038: [P] Implement campaign://graphs/{type} resource
   - T039: [P] Create import_workflow prompt template
   - T040: [P] Create planning_workflow prompt template

10. **Middleware** (sequential):
   - T041: Implement permissions middleware (campaign ownership + info levels)
   - T042: Implement transactions middleware (atomic operations)
   - T043: Implement logging middleware (tool call logs)

11. **Integration tests** (after all tools):
   - T044: Test atomic operations (rollback on error)
   - T045: Test permissions enforcement (DM Secret filtering)
   - T046: Test concurrent requests (5 simultaneous)

12. **Quickstart validation**:
   - T047: Execute quickstart.md scenarios manually
   - T048: Update CLAUDE.md with final Feature 011 summary

**Estimated Output**: 48 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, verify performance <100ms read, <500ms search)

## Complexity Tracking
*No constitutional violations - all checks passed*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
