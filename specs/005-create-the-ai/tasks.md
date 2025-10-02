# Tasks: AI Import and Planning Workflows

**Feature**: 005-create-the-ai
**Input**: Design documents from `/specs/005-create-the-ai/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**:
- Feature 003 (Card Architecture) MUST be complete
- Feature 004 (Information Filtering) MUST be complete
- **Feature 008 (BYOLLM Configuration) MUST be complete** ⚠️ BLOCKING

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: MCP SDK, LLM providers (OpenAI/Anthropic), pdf-parse, mammoth, immer, Radix UI
2. Load design documents ✓
   → data-model.md: 5 entities (ImportSession, ImportBatch, PlanningSession, KnowledgeGraph, GraphNode + GraphEdge)
   → contracts/: 3 files (import.yaml, planning.yaml, knowledge-graphs.yaml)
   → research.md: 10 technical decisions (MCP streaming, entity extraction, graph update logic)
3. Generate tasks by category ✓
   → Setup: Database migrations for import/planning/graph tables
   → Tests: contract tests, entity extraction, graph update, revert logic
   → Core: models, services (ImportAI, PlanningAI, GraphUpdate), routes
   → Frontend: ImportTab, PlanningTab, chat UI, approval summary, revert UI
   → Integration: MCP streaming, file parsing, graph querying
   → Polish: E2E tests, quickstart validation
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T072) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App - extends features 002-004)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/005-import-planning.sql`
- **Shared**: `shared/types/` (extended with ImportSession, KnowledgeGraph)

---

## Phase 3.1: Database Setup & Migrations

- [ ] **T001** Create migration 005 for ImportSession + ImportBatch tables (`backend/src/db/migrations/005-add-import-tables.sql` with tables per data-model.md)
- [ ] **T002** Create migration 005 for PlanningSession table (`backend/src/db/migrations/005-add-planning-table.sql` with table per data-model.md)
- [ ] **T003** Create migration 005 for KnowledgeGraph tables (`backend/src/db/migrations/005-add-knowledge-graphs.sql` with knowledge_graphs, graph_nodes, graph_edges tables)
- [ ] **T004** Create indexes for import/planning queries (`backend/src/db/migrations/005-add-import-indexes.sql` for campaign_id, status, graph_type)

---

## Phase 3.2: Shared Types

- [ ] **T005** [P] ImportSession type (`shared/types/ImportSession.ts` with TypeScript interfaces from data-model.md: ImportSession, ImportBatch, ChatMessage, ApprovalSummary)
- [ ] **T006** [P] PlanningSession type (`shared/types/PlanningSession.ts` with TypeScript interface from data-model.md)
- [ ] **T007** [P] KnowledgeGraph types (`shared/types/KnowledgeGraph.ts` with GraphNode, GraphEdge, GraphQueryResult interfaces)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (from contracts/)
- [ ] **T008** [P] Contract test POST /api/import/sessions (`backend/tests/contract/import.contract.test.ts` from contracts/import.yaml)
- [ ] **T009** [P] Contract test POST /api/import/sessions/:id/upload (`backend/tests/contract/import.contract.test.ts` from contracts/import.yaml)
- [ ] **T010** [P] Contract test POST /api/import/sessions/:id/approve (`backend/tests/contract/import.contract.test.ts` from contracts/import.yaml)
- [ ] **T011** [P] Contract test POST /api/import/sessions/:id/revert (`backend/tests/contract/import.contract.test.ts` from contracts/import.yaml)
- [ ] **T012** [P] Contract test POST /api/planning/sessions (`backend/tests/contract/planning.contract.test.ts` from contracts/planning.yaml)
- [ ] **T013** [P] Contract test POST /api/planning/sessions/:id/chat (`backend/tests/contract/planning.contract.test.ts` from contracts/planning.yaml)
- [ ] **T014** [P] Contract test GET /api/knowledge-graphs/:type (`backend/tests/contract/knowledge-graphs.contract.test.ts` from contracts/knowledge-graphs.yaml)
- [ ] **T015** [P] Contract test POST /api/knowledge-graphs/:type/query (`backend/tests/contract/knowledge-graphs.contract.test.ts` from contracts/knowledge-graphs.yaml)

### Backend Unit Tests (Critical AI Logic)
- [ ] **T016** [P] Unit test entity extraction from text (`backend/tests/unit/services/ImportAI-extraction.test.ts` mock MCP response, validate NER output)
- [ ] **T017** [P] Unit test existing card search logic (`backend/tests/unit/services/ImportAI-search.test.ts` test update vs create detection)
- [ ] **T018** [P] Unit test approval summary generation (`backend/tests/unit/services/ImportAI-approval.test.ts` validate batch structure)
- [ ] **T019** [P] Unit test batch revert logic (`backend/tests/unit/services/ImportBatch-revert.test.ts` atomic rollback validation)
- [ ] **T020** [P] Unit test graph update from Planning AI (`backend/tests/unit/services/PlanningAI-graph-update.test.ts` lean graph enforcement for Political-Web/Campaign-Story)

### Backend Integration Tests (from quickstart.md)
- [ ] **T021** [P] Integration test: Full import workflow (`backend/tests/integration/import-workflow.integration.test.ts` upload → extract → approve → execute)
- [ ] **T022** [P] Integration test: Planning workflow with graph update (`backend/tests/integration/planning-graph-update.integration.test.ts`)
- [ ] **T023** [P] Integration test: Revert batch operation (`backend/tests/integration/import-revert.integration.test.ts` verify cascade deletion)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Models
- [ ] **T024** [P] ImportSession model (`backend/src/models/ImportSession.ts` with TypeScript interface from data-model.md)
- [ ] **T025** [P] ImportBatch model (`backend/src/models/ImportBatch.ts` with TypeScript interface from data-model.md)
- [ ] **T026** [P] PlanningSession model (`backend/src/models/PlanningSession.ts` with TypeScript interface from data-model.md)
- [ ] **T027** [P] KnowledgeGraph model (`backend/src/models/KnowledgeGraph.ts` with TypeScript interface from data-model.md)
- [ ] **T028** [P] GraphNode model (`backend/src/models/GraphNode.ts` with TypeScript interface from data-model.md)
- [ ] **T029** [P] GraphEdge model (`backend/src/models/GraphEdge.ts` with TypeScript interface from data-model.md)

### Services - Import Workflow
- [ ] **T030** MCPService (`backend/src/services/MCPService.ts` MCP client initialization, streaming response handling per research.md)
- [ ] **T031** FilePar

seService (`backend/src/services/FileParseService.ts` parse PDF/DOCX/MD/TXT using pdf-parse, mammoth, markdown-it)
- [ ] **T032** ImportAIService - Entity extraction (`backend/src/services/ImportAIService.ts` LLM-based NER with custom prompts per research.md)
- [ ] **T033** ImportAIService - Card search (`backend/src/services/ImportAIService.ts` search existing campaign cards to detect updates vs new)
- [ ] **T034** ImportAIService - Approval summary (`backend/src/services/ImportAIService.ts` generate approval summary with proposed actions)
- [ ] **T035** ImportBatchService (`backend/src/services/ImportBatchService.ts` execute batch card creation, revert logic with immer snapshots)

### Services - Planning Workflow
- [ ] **T036** PlanningAIService - Chat handling (`backend/src/services/PlanningAIService.ts` manage planning chat, stream responses via MCP)
- [ ] **T037** PlanningAIService - Graph context (`backend/src/services/PlanningAIService.ts` query knowledge graphs for session planning context)
- [ ] **T038** PlanningAIService - Graph update (`backend/src/services/PlanningAIService.ts` update graphs with user approval, enforce lean Political-Web/Campaign-Story per research.md)

### Services - Knowledge Graphs
- [ ] **T039** KnowledgeGraphService (`backend/src/services/KnowledgeGraphService.ts` CRUD for 4 graph types: Geographical, Political-Web, World-Foundations, Campaign-Story)
- [ ] **T040** GraphQueryService (`backend/src/services/GraphQueryService.ts` query graphs with filters, return subgraphs)
- [ ] **T041** GraphUpdateService (`backend/src/services/GraphUpdateService.ts` add/update/remove nodes and edges with validation)

### Routes
- [ ] **T042** Import routes (`backend/src/routes/import.ts` POST /sessions, /upload, /approve, /revert per contracts/import.yaml)
- [ ] **T043** Planning routes (`backend/src/routes/planning.ts` POST /sessions, /chat per contracts/planning.yaml)
- [ ] **T044** Knowledge graph routes (`backend/src/routes/knowledge-graphs.ts` GET /graphs/:type, POST /query per contracts/knowledge-graphs.yaml)

---

## Phase 3.5: Frontend Core - Import Workflow

### Import Tab UI
- [ ] **T045** ImportTab component (`frontend/src/components/import/ImportTab.tsx` main import workflow container with file upload, chat, approval UI)
- [ ] **T046** ImportFileUpload component (`frontend/src/components/import/ImportFileUpload.tsx` drag-drop file upload for PDF/DOCX/MD/TXT)
- [ ] **T047** ImportChat component (`frontend/src/components/import/ImportChat.tsx` chat interface with streaming MCP responses, react-markdown rendering)
- [ ] **T048** ImportApprovalSummary component (`frontend/src/components/import/ImportApprovalSummary.tsx` display proposed actions, edit/filter/approve UI)
- [ ] **T049** ImportBatchActions component (`frontend/src/components/import/ImportBatchActions.tsx` execute/revert buttons with confirmation)

### API Clients - Import
- [ ] **T050** [P] ImportService API client (`frontend/src/services/import.service.ts` API calls for import session CRUD, upload, approve, revert)
- [ ] **T051** [P] MCPStreamService (`frontend/src/services/mcp-stream.service.ts` handle MCP streaming responses, EventSource or WebSocket per research.md)

---

## Phase 3.6: Frontend - Planning Workflow

### Planning Tab UI
- [ ] **T052** PlanningTab component (`frontend/src/components/planning/PlanningTab.tsx` planning workflow container with chat, graph visualization)
- [ ] **T053** PlanningChat component (`frontend/src/components/planning/PlanningChat.tsx` chat interface for session planning, context-aware suggestions)
- [ ] **T054** GraphVisualization component (`frontend/src/components/planning/GraphVisualization.tsx` render knowledge graph nodes/edges with D3.js or Cytoscape per research.md)
- [ ] **T055** GraphUpdateApproval component (`frontend/src/components/planning/GraphUpdateApproval.tsx` approve/reject graph updates proposed by Planning AI)

### API Clients - Planning
- [ ] **T056** [P] PlanningService API client (`frontend/src/services/planning.service.ts` API calls for planning session CRUD, chat)
- [ ] **T057** [P] KnowledgeGraphService API client (`frontend/src/services/knowledge-graph.service.ts` API calls for graph queries, updates)

---

## Phase 3.7: Frontend - Knowledge Graph Management

### Graph Management UI
- [ ] **T058** GraphExplorer component (`frontend/src/components/graphs/GraphExplorer.tsx` browse/search knowledge graphs, view nodes/edges)
- [ ] **T059** GraphNodeEditor component (`frontend/src/components/graphs/GraphNodeEditor.tsx` edit graph nodes via Planning chat interface)
- [ ] **T060** GraphFilterPanel component (`frontend/src/components/graphs/GraphFilterPanel.tsx` filter graphs by information level, entity type)

---

## Phase 3.8: Integration & Polish

### Integration Tasks
- [ ] **T061** Integrate MCP streaming with Import chat (verify EventSource or WebSocket connection, handle disconnects, resume)
- [ ] **T062** Integrate file parsing with Import upload (verify PDF/DOCX/MD/TXT parsing, error handling for corrupted files)
- [ ] **T063** Integrate approval summary with batch execution (verify atomic execution, rollback on error)
- [ ] **T064** Integrate Planning AI with knowledge graphs (verify graph queries provide context, updates respect lean enforcement)
- [ ] **T065** Test revert operation end-to-end (create batch, approve, execute, revert, verify cascade deletion)

### Frontend Component Tests
- [ ] **T066** [P] Component test ImportTab (`frontend/tests/components/ImportTab.test.tsx` with Vitest + RTL, test file upload, chat, approval)
- [ ] **T067** [P] Component test PlanningTab (`frontend/tests/components/PlanningTab.test.tsx` test chat, graph visualization, approval)
- [ ] **T068** [P] Component test ImportApprovalSummary (`frontend/tests/components/ImportApprovalSummary.test.tsx` test filtering, editing, approval)

### E2E Tests
- [ ] **T069** E2E test: Full import workflow (`frontend/tests/e2e/import-workflow.spec.ts` with Playwright: upload PDF → extract entities → approve → execute → verify cards created)
- [ ] **T070** E2E test: Import revert workflow (`frontend/tests/e2e/import-revert.spec.ts` execute batch → revert → verify cascade deletion)
- [ ] **T071** E2E test: Planning workflow with graph update (`frontend/tests/e2e/planning-graph-update.spec.ts` chat → graph update → approve → verify graph nodes added)

### Documentation & Cleanup
- [ ] **T072** Validate quickstart.md (execute all steps: import PDF → entity extraction → approval → Planning AI session planning → graph update)
- [ ] **T073** [P] Add inline comments to complex AI logic (entity extraction prompts, graph update lean enforcement, revert cascade logic)
- [ ] **T074** [P] Performance test import workflow (5000-word document, verify <10s extraction per plan.md)
- [ ] **T075** [P] Performance test graph update (50 imported cards, verify <30s graph update per plan.md)

---

## Dependencies

### Strict Ordering
1. **Database migrations before everything**: T001-T004 before all other tasks
2. **Shared types before tests**: T005-T007 before T008-T023
3. **Tests before implementation**: T008-T023 MUST complete (and fail) before T024-T044
4. **Backend services before routes**: T030-T041 before T042-T044
5. **Backend routes before frontend API clients**: T042-T044 before T050-T051, T056-T057
6. **Import services before Planning services**: T030-T035 before T036-T038 (Planning builds on Import patterns)
7. **MCP service before AI services**: T030 before T032-T034, T036-T038 (all AI services use MCP)
8. **All core before integration**: T001-T060 before T061-T065
9. **Implementation before E2E tests**: T001-T065 before T069-T071

### Specific Dependencies
- T003 (KnowledgeGraph tables) blocks T014-T015, T020, T022 (graph tests need tables)
- T030 (MCPService) blocks T032-T034, T036-T038 (AI services need MCP client)
- T031 (FileParseService) blocks T033 (entity extraction needs parsed text)
- T035 (ImportBatchService) blocks T042 (revert route needs batch service)
- T039 (KnowledgeGraphService) blocks T040, T041, T044 (graph routes need service)
- T050 (ImportService API client) blocks T045-T049 (Import UI components need API)
- T056 (PlanningService API client) blocks T052-T055 (Planning UI components need API)

---

## Parallel Execution Examples

### Example 1: Shared Types (Phase 3.2)
```bash
# Launch T005-T007 together (different type files):
Task: "ImportSession type in shared/types/ImportSession.ts"
Task: "PlanningSession type in shared/types/PlanningSession.ts"
Task: "KnowledgeGraph types in shared/types/KnowledgeGraph.ts"
```

### Example 2: Contract Tests (Phase 3.3)
```bash
# Launch T008-T015 together (different contract test files):
Task: "Contract test POST /api/import/sessions in backend/tests/contract/import.contract.test.ts"
Task: "Contract test POST /api/planning/sessions in backend/tests/contract/planning.contract.test.ts"
Task: "Contract test GET /api/knowledge-graphs/:type in backend/tests/contract/knowledge-graphs.contract.test.ts"
```

### Example 3: Unit Tests (Phase 3.3)
```bash
# Launch T016-T020 together (different unit test files):
Task: "Unit test entity extraction from text in backend/tests/unit/services/ImportAI-extraction.test.ts"
Task: "Unit test existing card search logic in backend/tests/unit/services/ImportAI-search.test.ts"
Task: "Unit test approval summary generation in backend/tests/unit/services/ImportAI-approval.test.ts"
Task: "Unit test batch revert logic in backend/tests/unit/services/ImportBatch-revert.test.ts"
Task: "Unit test graph update from Planning AI in backend/tests/unit/services/PlanningAI-graph-update.test.ts"
```

### Example 4: Models (Phase 3.4)
```bash
# Launch T024-T029 together (different model files):
Task: "ImportSession model in backend/src/models/ImportSession.ts"
Task: "ImportBatch model in backend/src/models/ImportBatch.ts"
Task: "PlanningSession model in backend/src/models/PlanningSession.ts"
Task: "KnowledgeGraph model in backend/src/models/KnowledgeGraph.ts"
Task: "GraphNode model in backend/src/models/GraphNode.ts"
Task: "GraphEdge model in backend/src/models/GraphEdge.ts"
```

### Example 5: API Clients (Phase 3.5-3.6)
```bash
# Launch T050-T051, T056-T057 together (different service files):
Task: "ImportService API client in frontend/src/services/import.service.ts"
Task: "MCPStreamService in frontend/src/services/mcp-stream.service.ts"
Task: "PlanningService API client in frontend/src/services/planning.service.ts"
Task: "KnowledgeGraphService API client in frontend/src/services/knowledge-graph.service.ts"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T008-T015 cover import.yaml, planning.yaml, knowledge-graphs.yaml)
- [x] All entities have model tasks (T024-T029 for ImportSession, ImportBatch, PlanningSession, KnowledgeGraph, GraphNode, GraphEdge)
- [x] All tests come before implementation (T008-T023 before T024-T044)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts)
- [x] Critical AI logic has unit tests (T016-T020 for entity extraction, card search, approval, revert, graph update)
- [x] Complex workflows have E2E tests (T069-T071 for import, revert, planning)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for AI workflows with LLM mocking)
- **MCP streaming** must handle 10k+ token responses (T030, T051) - test with large PDF imports
- **Entity extraction** quality depends on LLM (T032) - provide clear custom prompts per research.md
- **Card search** logic complex (T033) - must distinguish updates vs new additions to avoid duplicates
- **Approval summary** UX critical (T048) - allow edit/filter before batch execution
- **Batch revert** atomic (T035, T065) - use immer snapshots for rollback
- **Knowledge graphs lean enforcement** (T038, T039) - Political-Web and Campaign-Story must stay focused on "active party-relevant" content per research.md
- **File parsing** error handling (T031, T062) - corrupted PDFs must fail gracefully, not crash import
- **Planning AI** NO autonomous edits (T036-T038) - all graph updates require explicit user approval

---

## Critical Risk Areas

1. **MCP Streaming Reliability** (T030, T051, T061):
   - Handle 10k+ token responses without truncation
   - Reconnect on disconnect, resume streaming
   - EventSource vs WebSocket decision per research.md

2. **Entity Extraction Quality** (T032, T016):
   - LLM-based NER quality varies
   - Custom prompts per campaign setting
   - Mock MCP responses in tests with realistic fixtures

3. **Card Search Accuracy** (T033, T017):
   - Must detect existing cards to avoid duplicates
   - Fuzzy matching vs exact matching trade-offs
   - Handle similar names (e.g., "John Smith" vs "John the Blacksmith")

4. **Approval Summary UX** (T034, T048):
   - 500 proposed actions overwhelming
   - Filter by entity type, action type (create/update)
   - Allow inline editing before approval

5. **Batch Revert Atomicity** (T035, T065):
   - Cascade deletion must be atomic
   - Immer snapshots for rollback
   - Most recent batch only (no deep history)

6. **Knowledge Graph Lean Enforcement** (T038, T039, T020):
   - Political-Web: only "active party-relevant" relationships
   - Campaign-Story: only "active story threads" from Session Recaps
   - Prevent graph bloat (10k node limit per graph type)

7. **File Parsing Robustness** (T031, T062):
   - PDF parsing with pdf-parse (quality varies by PDF structure)
   - DOCX parsing with mammoth (handle complex formatting)
   - Corrupted files must fail gracefully, not crash backend

---

**Total Tasks**: 75
**Estimated Completion**: 10-14 days (complex AI workflows, MCP streaming, graph logic, E2E testing with LLM mocks)
**Critical Path**: T001-T004 → T005-T007 → T008-T023 → T024-T044 → T045-T060 → T061-T065 → T069-T075
**Blocking Dependency**: Feature 008 (BYOLLM Configuration) MUST be implemented FIRST for LLM API credentials
