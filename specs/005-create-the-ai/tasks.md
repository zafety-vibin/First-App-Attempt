# Tasks: AI Import and Planning Workflows

**Feature**: 005-create-the-ai
**Input**: Design documents from `/specs/005-create-the-ai/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**:
- Feature 003 (Card Architecture) MUST be complete ✓
- Feature 004 (Information Filtering) MUST be complete ✓
- Feature 008 (BYOLLM Configuration) MUST be complete ✓
- Feature 011 (MCP Integration) MUST be complete ✓ - Provides 24 reusable tool handlers

**CRITICAL CORRECTION**: Feature 011 provides tool handlers but did NOT create knowledge graph tables. Feature 005 creates them.

---

## Phase 3.1: Database Setup & Migrations

- [ ] **T001** Create migration 005 for ImportSession + ImportBatch tables (`backend/src/db/migrations/005-add-import-tables.sql`)
- [ ] **T002** Create migration 005 for PlanningSession table (`backend/src/db/migrations/005-add-planning-table.sql`)
- [ ] **T003** Create migration 005 for KnowledgeGraph tables (`backend/src/db/migrations/005-add-knowledge-graphs.sql` with knowledge_graphs, graph_nodes, graph_edges)
- [ ] **T004** Create indexes (`backend/src/db/migrations/005-add-indexes.sql`)
- [ ] **T005** Extend cards table (`backend/src/db/migrations/005-extend-cards.sql` ADD import_session_id, import_batch_id)

---

## Phase 3.2: Shared Types

- [ ] **T006** [P] ImportSession type (`shared/types/ImportSession.ts`)
- [ ] **T007** [P] PlanningSession type (`shared/types/PlanningSession.ts`)
- [ ] **T008** [P] KnowledgeGraph types (`shared/types/KnowledgeGraph.ts`)

---

## Phase 3.3: Tests First (TDD)

### Contract Tests
- [ ] **T009-T016** [P] Contract tests for import/planning/graphs endpoints

### Unit Tests
- [ ] **T017-T024** [P] Unit tests for function calling, entity extraction, graph updates

### Integration Tests
- [ ] **T025-T027** [P] Integration tests for full workflows

---

## Phase 3.4: Backend Core Implementation

### Models
- [ ] **T028-T031** [P] Models (ImportSession, ImportBatch, PlanningSession, KnowledgeGraph, GraphNode, GraphEdge)

### Services - Function Calling Infrastructure
- [ ] **T032** FunctionCallingService - OpenAI conversion
- [ ] **T033** FunctionCallingService - Anthropic conversion
- [ ] **T034** LLMOrchestrationService - Streaming setup
- [ ] **T035** LLMOrchestrationService - Function calling loop
- [ ] **T036** LLMOrchestrationService - Error handling
- [ ] **T037** ToolRegistryService - Handler registration (import from Feature 011 tools)
- [ ] **T038** ToolRegistryService - Execution

### Services - Import/Planning Workflows
- [ ] **T039** FileParseService (PDF/DOCX/MD parsing)
- [ ] **T040** ImportAIService - Entity extraction (via function calling)
- [ ] **T041** ImportAIService - Card search (using search_cards handler)
- [ ] **T042** ImportAIService - Approval summary
- [ ] **T043** ImportBatchService - Execute batch + revert
- [ ] **T044** PlanningAIService - Chat handling
- [ ] **T045** PlanningAIService - Graph context (using query_graph handler)
- [ ] **T046** PlanningAIService - Graph updates (using update_graph handler)

### Routes
- [ ] **T047** Import routes (`backend/src/routes/import.ts`)
- [ ] **T048** Planning routes (`backend/src/routes/planning.ts`)
- [ ] **T049** Knowledge graph routes (`backend/src/routes/knowledge-graphs.ts`)

---

## Phase 3.5-3.7: Frontend Implementation

### Import Tab UI (T050-T054)
- [ ] **T050-T054** ImportTab components (main, file upload, chat, approval, batch actions)
- [ ] **T055-T056** [P] Import API clients

### Planning Tab UI (T057-T060)
- [ ] **T057-T060** PlanningTab components (main, chat, graph viz, approval)
- [ ] **T061-T062** [P] Planning API clients

### Graph Management UI (T063-T065)
- [ ] **T063-T065** Graph components (explorer, node editor, filter panel)

---

## Phase 3.8: Integration & Polish (T066-T079)

- [ ] **T066-T068** Integration tasks (streaming, file parsing, batch execution, graph updates, revert)
- [ ] **T069-T071** [P] Component tests
- [ ] **T072-T074** E2E tests (import workflow, revert, planning with graphs)
- [ ] **T075-T079** Documentation, validation, performance tests

---

## Critical Dependencies

**Strict Ordering**:
1. T001-T005 (migrations) BEFORE all other tasks
2. T006-T008 (types) BEFORE T009-T027 (tests)
3. T009-T027 (tests) MUST FAIL BEFORE T028-T049 (implementation)
4. T032-T038 (function calling infrastructure) BEFORE T040-T046 (AI services)
5. T037-T038 (ToolRegistry) BEFORE T040-T046 (AI services need to call Feature 011 handlers)

**Key Dependencies**:
- T003 (KnowledgeGraph tables) blocks T024 (graph update tests), T031 (GraphNode/Edge models), T045-T046 (graph services)
- T037 (ToolRegistry) blocks T040-T041 (ImportAI needs search_cards handler), T045-T046 (PlanningAI needs graph handlers)

---

**Total Tasks**: 79 (added T003 KnowledgeGraph tables + T005 extend cards)
**Critical Path**: T001-T005 → T006-T008 → T009-T027 → T028-T049 → T050-T079
**Estimated**: 12-16 days

**Feature 011 Tool Handlers Available**:
- Card: search_cards, create_card, update_card, delete_card, read_card, move_card
- Graph: update_graph, query_graph, list_graph_nodes, get_relationships
- Recap: get_session_recaps, get_timeline_events
- Hierarchy: get_card_path, get_subtree, list_children
- Database: query_database, create_database_entry
- Info levels: list_information_levels

All handlers imported from `backend/src/mcp/tools/*` and called via ToolRegistryService.
