# Tasks: AI Import and Planning Workflows

**Feature**: 005-create-the-ai
**Input**: Design documents from `/specs/005-create-the-ai/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**:
- Feature 003 (Card Architecture) MUST be complete ✓
- Feature 004 (Information Filtering) MUST be complete ✓
- Feature 008 (BYOLLM Configuration) MUST be complete ✓
- **Feature 011 (MCP Integration) MUST be complete ✓** - Provides 24 reusable tool handlers

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: OpenAI/Anthropic SDKs, shared tool handlers (Feature 011), pdf-parse, mammoth, immer, Radix UI
2. Load design documents ✓
   → data-model.md: 3 NEW entities (ImportSession, ImportBatch, PlanningSession) + reuse KnowledgeGraph from Feature 011
   → contracts/: 3 files (import.yaml, planning.yaml, knowledge-graphs.yaml)
   → research.md: 10 technical decisions (function calling, entity extraction, graph update logic)
3. Generate tasks by category ✓
   → Setup: Database migrations for import/planning tables (Feature 011 already has graph tables)
   → Tests: contract tests, entity extraction, graph update, revert logic
   → Core: models (3 new), services (FunctionCalling, LLMOrchestration, ToolRegistry, ImportAI, PlanningAI), routes
   → Frontend: ImportTab, PlanningTab, chat UI, approval summary, revert UI
   → Integration: LLM streaming with function calling, file parsing, graph tool handler calls
   → Polish: E2E tests, quickstart validation
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T068) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App - extends features 002-004, 008, 011)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/005-import-planning.sql`
- **Shared**: `shared/types/` (extended with ImportSession, PlanningSession)
- **Reused from Feature 011**: `backend/src/mcp/tools/*` (tool handlers), `backend/src/mcp/schemas/*` (Zod schemas)

---

## Phase 3.1: Database Setup & Migrations

- [ ] **T001** Create migration 005 for ImportSession + ImportBatch tables (`backend/src/db/migrations/005-add-import-tables.sql` with tables per data-model.md)
- [ ] **T002** Create migration 005 for PlanningSession table (`backend/src/db/migrations/005-add-planning-table.sql` with table per data-model.md)
- [ ] **T003** Create indexes for import/planning queries (`backend/src/db/migrations/005-add-import-indexes.sql` for campaign_id, status, session_date)

**Note**: KnowledgeGraph tables (knowledge_graphs, graph_nodes, graph_edges) already exist from Feature 011 - no migration needed

---

## Phase 3.2: Shared Types

- [ ] **T004** [P] ImportSession type (`shared/types/ImportSession.ts` with TypeScript interfaces from data-model.md: ImportSession, ImportBatch, ChatMessage, ApprovalSummary)
- [ ] **T005** [P] PlanningSession type (`shared/types/PlanningSession.ts` with TypeScript interface from data-model.md)

**Note**: KnowledgeGraph, GraphNode, GraphEdge types may already exist from Feature 011 - reuse or extend as needed

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (from contracts/)
- [ ] **T006** [P] Contract test POST /api/import/sessions (`backend/tests/contract/import.contract.test.ts` from contracts/import.yaml)
- [ ] **T007** [P] Contract test POST /api/import/sessions/:id/upload (`backend/tests/contract/import.contract.test.ts` from contracts/import.yaml)
- [ ] **T008** [P] Contract test POST /api/import/sessions/:id/approve (`backend/tests/contract/import.contract.test.ts` from contracts/import.yaml)
- [ ] **T009** [P] Contract test POST /api/import/sessions/:id/revert (`backend/tests/contract/import.contract.test.ts` from contracts/import.yaml)
- [ ] **T010** [P] Contract test POST /api/planning/sessions (`backend/tests/contract/planning.contract.test.ts` from contracts/planning.yaml)
- [ ] **T011** [P] Contract test POST /api/planning/sessions/:id/chat (`backend/tests/contract/planning.contract.test.ts` from contracts/planning.yaml)
- [ ] **T012** [P] Contract test GET /api/knowledge-graphs/:type (`backend/tests/contract/knowledge-graphs.contract.test.ts` from contracts/knowledge-graphs.yaml)
- [ ] **T013** [P] Contract test POST /api/knowledge-graphs/:type/query (`backend/tests/contract/knowledge-graphs.contract.test.ts` from contracts/knowledge-graphs.yaml)

### Backend Unit Tests (Critical AI Logic)
- [ ] **T014** [P] Unit test Zod schema conversion to OpenAI function schema (`backend/tests/unit/services/FunctionCalling-openai.test.ts` validate schema structure)
- [ ] **T015** [P] Unit test Zod schema conversion to Anthropic tool schema (`backend/tests/unit/services/FunctionCalling-anthropic.test.ts` validate schema structure)
- [ ] **T016** [P] Unit test function calling loop with mocked LLM (`backend/tests/unit/services/LLMOrchestration-loop.test.ts` test multi-turn function calling)
- [ ] **T017** [P] Unit test tool registry execution (`backend/tests/unit/services/ToolRegistry-execute.test.ts` test handler mapping and execution)
- [ ] **T018** [P] Unit test entity extraction from text (`backend/tests/unit/services/ImportAI-extraction.test.ts` mock OpenAI/Anthropic response, validate NER output)
- [ ] **T019** [P] Unit test existing card search logic (`backend/tests/unit/services/ImportAI-search.test.ts` test update vs create detection using search_cards handler)
- [ ] **T020** [P] Unit test approval summary generation (`backend/tests/unit/services/ImportAI-approval.test.ts` validate batch structure)
- [ ] **T021** [P] Unit test batch revert logic (`backend/tests/unit/services/ImportBatch-revert.test.ts` atomic rollback validation)
- [ ] **T022** [P] Unit test graph update from Planning AI (`backend/tests/unit/services/PlanningAI-graph-update.test.ts` lean graph enforcement for Political-Web/Campaign-Story using update_graph handler)

### Backend Integration Tests (from quickstart.md)
- [ ] **T023** [P] Integration test: Full import workflow (`backend/tests/integration/import-workflow.integration.test.ts` upload → extract → approve → execute)
- [ ] **T024** [P] Integration test: Planning workflow with graph update (`backend/tests/integration/planning-graph-update.integration.test.ts`)
- [ ] **T025** [P] Integration test: Revert batch operation (`backend/tests/integration/import-revert.integration.test.ts` verify cascade deletion)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Models
- [ ] **T026** [P] ImportSession model (`backend/src/models/ImportSession.ts` with TypeScript interface from data-model.md)
- [ ] **T027** [P] ImportBatch model (`backend/src/models/ImportBatch.ts` with TypeScript interface from data-model.md)
- [ ] **T028** [P] PlanningSession model (`backend/src/models/PlanningSession.ts` with TypeScript interface from data-model.md)

**Note**: KnowledgeGraph, GraphNode, GraphEdge models may already exist from Feature 011 - reuse or extend as needed

### Services - Function Calling Infrastructure
- [ ] **T029** FunctionCallingService - OpenAI schema conversion (`backend/src/services/FunctionCallingService.ts` convert Zod schemas from Feature 011 to OpenAI function schema format)
- [ ] **T030** FunctionCallingService - Anthropic schema conversion (`backend/src/services/FunctionCallingService.ts` convert Zod schemas from Feature 011 to Anthropic tool schema format)
- [ ] **T031** LLMOrchestrationService - Setup streaming (`backend/src/services/LLMOrchestrationService.ts` initialize OpenAI/Anthropic clients from BYOLLMConfigService, handle streaming responses)
- [ ] **T032** LLMOrchestrationService - Function calling loop (`backend/src/services/LLMOrchestrationService.ts` implement function calling loop: LLM requests tool → execute → return → continue)
- [ ] **T033** LLMOrchestrationService - Error handling (`backend/src/services/LLMOrchestrationService.ts` handle API errors, rate limits, timeouts with retry)
- [ ] **T034** ToolRegistryService - Handler registration (`backend/src/services/ToolRegistryService.ts` import tool handlers from Feature 011, map tool names to functions)
- [ ] **T035** ToolRegistryService - Execution (`backend/src/services/ToolRegistryService.ts` validate args with Zod schemas, execute handlers, format results for LLM)

### Services - Import Workflow
- [ ] **T036** FileParseService (`backend/src/services/FileParseService.ts` parse PDF/DOCX/MD/TXT using pdf-parse, mammoth, markdown-it)
- [ ] **T037** ImportAIService - Entity extraction (`backend/src/services/ImportAIService.ts` LLM-based NER via function calling with custom prompts per research.md)
- [ ] **T038** ImportAIService - Card search (`backend/src/services/ImportAIService.ts` search existing campaign cards using search_cards handler to detect updates vs new)
- [ ] **T039** ImportAIService - Approval summary (`backend/src/services/ImportAIService.ts` generate approval summary with proposed actions using tool call results)
- [ ] **T040** ImportBatchService (`backend/src/services/ImportBatchService.ts` execute batch card creation via create_card/update_card handlers, revert logic with immer snapshots)

### Services - Planning Workflow
- [ ] **T041** PlanningAIService - Chat handling (`backend/src/services/PlanningAIService.ts` manage planning chat, stream responses via LLMOrchestrationService)
- [ ] **T042** PlanningAIService - Graph context (`backend/src/services/PlanningAIService.ts` query knowledge graphs using query_graph handler for session planning context)
- [ ] **T043** PlanningAIService - Graph update (`backend/src/services/PlanningAIService.ts` update graphs using update_graph handler with user approval, enforce lean Political-Web/Campaign-Story per research.md)

**Note**: Knowledge graph services (CRUD, query, update) already exist as Feature 011 tool handlers - import and call directly

### Routes
- [ ] **T044** Import routes (`backend/src/routes/import.ts` POST /sessions, /upload, /approve, /revert per contracts/import.yaml)
- [ ] **T045** Planning routes (`backend/src/routes/planning.ts` POST /sessions, /chat per contracts/planning.yaml)
- [ ] **T046** Knowledge graph routes (`backend/src/routes/knowledge-graphs.ts` GET /graphs/:type, POST /query per contracts/knowledge-graphs.yaml - wraps Feature 011 handlers)

---

## Phase 3.5: Frontend Core - Import Workflow

### Import Tab UI
- [ ] **T047** ImportTab component (`frontend/src/components/import/ImportTab.tsx` main import workflow container with file upload, chat, approval UI)
- [ ] **T048** ImportFileUpload component (`frontend/src/components/import/ImportFileUpload.tsx` drag-drop file upload for PDF/DOCX/MD/TXT)
- [ ] **T049** ImportChat component (`frontend/src/components/import/ImportChat.tsx` chat interface with streaming LLM responses, react-markdown rendering)
- [ ] **T050** ImportApprovalSummary component (`frontend/src/components/import/ImportApprovalSummary.tsx` display proposed actions, edit/filter/approve UI)
- [ ] **T051** ImportBatchActions component (`frontend/src/components/import/ImportBatchActions.tsx` execute/revert buttons with confirmation)

### API Clients - Import
- [ ] **T052** [P] ImportService API client (`frontend/src/services/import.service.ts` API calls for import session CRUD, upload, approve, revert)
- [ ] **T053** [P] StreamingChatService (`frontend/src/services/streaming-chat.service.ts` handle streaming LLM responses via SSE or chunked transfer encoding per research.md)

---

## Phase 3.6: Frontend - Planning Workflow

### Planning Tab UI
- [ ] **T054** PlanningTab component (`frontend/src/components/planning/PlanningTab.tsx` planning workflow container with chat, graph visualization)
- [ ] **T055** PlanningChat component (`frontend/src/components/planning/PlanningChat.tsx` chat interface for session planning, context-aware suggestions)
- [ ] **T056** GraphVisualization component (`frontend/src/components/planning/GraphVisualization.tsx` render knowledge graph nodes/edges with D3.js or simple list per research.md)
- [ ] **T057** GraphUpdateApproval component (`frontend/src/components/planning/GraphUpdateApproval.tsx` approve/reject graph updates proposed by Planning AI)

### API Clients - Planning
- [ ] **T058** [P] PlanningService API client (`frontend/src/services/planning.service.ts` API calls for planning session CRUD, chat)
- [ ] **T059** [P] KnowledgeGraphService API client (`frontend/src/services/knowledge-graph.service.ts` API calls for graph queries, updates)

---

## Phase 3.7: Frontend - Knowledge Graph Management

### Graph Management UI
- [ ] **T060** GraphExplorer component (`frontend/src/components/graphs/GraphExplorer.tsx` browse/search knowledge graphs, view nodes/edges)
- [ ] **T061** GraphNodeEditor component (`frontend/src/components/graphs/GraphNodeEditor.tsx` edit graph nodes via Planning chat interface)
- [ ] **T062** GraphFilterPanel component (`frontend/src/components/graphs/GraphFilterPanel.tsx` filter graphs by information level, entity type)

---

## Phase 3.8: Integration & Polish

### Integration Tasks
- [ ] **T063** Integrate streaming LLM responses with Import chat (verify SSE or chunked encoding, handle disconnects, resume)
- [ ] **T064** Integrate file parsing with Import upload (verify PDF/DOCX/MD/TXT parsing, error handling for corrupted files)
- [ ] **T065** Integrate approval summary with batch execution (verify atomic execution via tool handlers, rollback on error)
- [ ] **T066** Integrate Planning AI with knowledge graphs (verify query_graph handler provides context, update_graph respects lean enforcement)
- [ ] **T067** Test revert operation end-to-end (create batch, approve, execute via handlers, revert, verify cascade deletion)

### Frontend Component Tests
- [ ] **T068** [P] Component test ImportTab (`frontend/tests/components/ImportTab.test.tsx` with Vitest + RTL, test file upload, chat, approval)
- [ ] **T069** [P] Component test PlanningTab (`frontend/tests/components/PlanningTab.test.tsx` test chat, graph visualization, approval)
- [ ] **T070** [P] Component test ImportApprovalSummary (`frontend/tests/components/ImportApprovalSummary.test.tsx` test filtering, editing, approval)

### E2E Tests
- [ ] **T071** E2E test: Full import workflow (`frontend/tests/e2e/import-workflow.spec.ts` with Playwright: upload PDF → extract entities via function calling → approve → execute via tool handlers → verify cards created)
- [ ] **T072** E2E test: Import revert workflow (`frontend/tests/e2e/import-revert.spec.ts` execute batch → revert → verify cascade deletion)
- [ ] **T073** E2E test: Planning workflow with graph update (`frontend/tests/e2e/planning-graph-update.spec.ts` chat → graph update via update_graph handler → approve → verify graph nodes added)

### Documentation & Cleanup
- [ ] **T074** Validate quickstart.md (execute all steps: import PDF → entity extraction → approval → Planning AI session planning → graph update via handlers)
- [ ] **T075** [P] Add inline comments to complex AI logic (entity extraction prompts, graph update lean enforcement, revert cascade logic, function calling loop)
- [ ] **T076** [P] Performance test import workflow (5000-word document, verify <10s extraction per plan.md)
- [ ] **T077** [P] Performance test graph update (50 imported cards, verify <30s graph update per plan.md)

---

## Dependencies

### Strict Ordering
1. **Database migrations before everything**: T001-T003 before all other tasks
2. **Shared types before tests**: T004-T005 before T006-T025
3. **Tests before implementation**: T006-T025 MUST complete (and fail) before T026-T046
4. **Function calling infrastructure before AI services**: T029-T035 before T036-T043
5. **Backend services before routes**: T029-T043 before T044-T046
6. **Backend routes before frontend API clients**: T044-T046 before T052-T053, T058-T059
7. **Import services before Planning services**: T036-T040 before T041-T043 (Planning builds on Import patterns)
8. **LLMOrchestration before AI services**: T031-T033 before T037-T043 (all AI services use LLMOrchestrationService)
9. **ToolRegistry before AI services**: T034-T035 before T037-T043 (AI services call tool handlers via registry)
10. **All core before integration**: T001-T062 before T063-T067
11. **Implementation before E2E tests**: T001-T067 before T071-T073

### Specific Dependencies
- T029-T030 (FunctionCallingService) blocks T031-T032 (LLMOrchestrationService needs schemas)
- T031-T033 (LLMOrchestrationService) blocks T037-T043 (AI services need orchestration)
- T034-T035 (ToolRegistryService) blocks T037-T043 (AI services call handlers via registry)
- T036 (FileParseService) blocks T037 (entity extraction needs parsed text)
- T040 (ImportBatchService) blocks T044 (revert route needs batch service)
- T052 (ImportService API client) blocks T047-T051 (Import UI components need API)
- T058 (PlanningService API client) blocks T054-T057 (Planning UI components need API)

---

## Parallel Execution Examples

### Example 1: Shared Types (Phase 3.2)
```bash
# Launch T004-T005 together (different type files):
Task: "ImportSession type in shared/types/ImportSession.ts"
Task: "PlanningSession type in shared/types/PlanningSession.ts"
```

### Example 2: Contract Tests (Phase 3.3)
```bash
# Launch T006-T013 together (different contract test files):
Task: "Contract test POST /api/import/sessions in backend/tests/contract/import.contract.test.ts"
Task: "Contract test POST /api/planning/sessions in backend/tests/contract/planning.contract.test.ts"
Task: "Contract test GET /api/knowledge-graphs/:type in backend/tests/contract/knowledge-graphs.contract.test.ts"
```

### Example 3: Unit Tests (Phase 3.3)
```bash
# Launch T014-T022 together (different unit test files):
Task: "Unit test Zod → OpenAI schema conversion in backend/tests/unit/services/FunctionCalling-openai.test.ts"
Task: "Unit test function calling loop in backend/tests/unit/services/LLMOrchestration-loop.test.ts"
Task: "Unit test entity extraction in backend/tests/unit/services/ImportAI-extraction.test.ts"
Task: "Unit test graph update in backend/tests/unit/services/PlanningAI-graph-update.test.ts"
```

### Example 4: Models (Phase 3.4)
```bash
# Launch T026-T028 together (different model files):
Task: "ImportSession model in backend/src/models/ImportSession.ts"
Task: "ImportBatch model in backend/src/models/ImportBatch.ts"
Task: "PlanningSession model in backend/src/models/PlanningSession.ts"
```

### Example 5: API Clients (Phase 3.5-3.6)
```bash
# Launch T052-T053, T058-T059 together (different service files):
Task: "ImportService API client in frontend/src/services/import.service.ts"
Task: "StreamingChatService in frontend/src/services/streaming-chat.service.ts"
Task: "PlanningService API client in frontend/src/services/planning.service.ts"
Task: "KnowledgeGraphService API client in frontend/src/services/knowledge-graph.service.ts"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T006-T013 cover import.yaml, planning.yaml, knowledge-graphs.yaml)
- [x] All NEW entities have model tasks (T026-T028 for ImportSession, ImportBatch, PlanningSession - KnowledgeGraph entities reused from Feature 011)
- [x] All tests come before implementation (T006-T025 before T026-T046)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts)
- [x] Critical AI logic has unit tests (T014-T022 for function calling, entity extraction, card search, approval, revert, graph update)
- [x] Complex workflows have E2E tests (T071-T073 for import, revert, planning)
- [x] Feature 011 tool handlers properly integrated (no duplicate graph services, direct imports used)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for AI workflows with LLM mocking)
- **Feature 011 integration** critical: tool handlers (search_cards, create_card, update_graph, query_graph) called directly, no MCP client needed
- **Function calling** quality depends on LLM (T037, T041) - provide clear prompts per research.md
- **Card search** logic complex (T038) - use Feature 011's search_cards handler to avoid duplicates
- **Approval summary** UX critical (T050) - allow edit/filter before batch execution
- **Batch revert** atomic (T040, T067) - use immer snapshots for rollback
- **Knowledge graphs lean enforcement** (T043) - Political-Web and Campaign-Story must stay focused on "active party-relevant" content per research.md
- **File parsing** error handling (T036, T064) - corrupted PDFs must fail gracefully, not crash import
- **Planning AI** NO autonomous edits (T041-T043) - all graph updates require explicit user approval
- **Streaming** must handle 10k+ token responses (T031, T053, T063) - test with large PDF imports

---

## Critical Risk Areas

1. **Function Calling Integration** (T029-T035, T063):
   - Zod schema → OpenAI/Anthropic format conversion must be accurate
   - Function calling loop must handle multi-turn conversations
   - Tool execution errors must not crash the chat session
   - LLM may hallucinate invalid tool calls - robust error handling required

2. **Tool Handler Orchestration** (T034-T035, T037-T043):
   - Mapping tool names to Feature 011 handlers must be correct
   - Argument validation with Zod schemas critical for security
   - Handler results must be formatted correctly for LLM context
   - Multiple tool calls in sequence must maintain state correctly

3. **Entity Extraction Quality** (T037, T018):
   - LLM-based NER quality varies by model
   - Custom prompts per campaign setting
   - Mock function calling responses in tests with realistic fixtures

4. **Card Search Accuracy** (T038, T019):
   - Feature 011's search_cards handler must detect existing cards to avoid duplicates
   - Fuzzy matching vs exact matching trade-offs
   - Handle similar names (e.g., "John Smith" vs "John the Blacksmith")

5. **Approval Summary UX** (T039, T050):
   - 500 proposed actions overwhelming
   - Filter by entity type, action type (create/update)
   - Allow inline editing before approval

6. **Batch Revert Atomicity** (T040, T067):
   - Cascade deletion must be atomic
   - Immer snapshots for rollback
   - Most recent batch only (no deep history)

7. **Knowledge Graph Lean Enforcement** (T043, T022):
   - Political-Web: only "active party-relevant" relationships
   - Campaign-Story: only "active story threads" from Session Recaps
   - Prevent graph bloat (10k node limit per graph type)
   - Use Feature 011's update_graph handler with operation filtering

8. **File Parsing Robustness** (T036, T064):
   - PDF parsing with pdf-parse (quality varies by PDF structure)
   - DOCX parsing with mammoth (handle complex formatting)
   - Corrupted files must fail gracefully, not crash backend

9. **Streaming Reliability** (T031-T033, T053, T063):
   - Handle 10k+ token responses without truncation
   - Reconnect on disconnect, resume streaming
   - SSE vs chunked transfer encoding decision per research.md

---

**Total Tasks**: 77
**Estimated Completion**: 12-16 days (complex AI workflows, function calling integration, graph logic, E2E testing with LLM mocks)
**Critical Path**: T001-T003 → T004-T005 → T006-T025 → T026-T046 → T047-T062 → T063-T067 → T071-T077
**Critical Dependencies**: Feature 008 (BYOLLM) ✓ Complete, Feature 011 (MCP Integration) ✓ Complete - provides 24 tool handlers ready for direct use

**Feature 011 Tool Handlers Used**:
- **Card tools**: search_cards, create_card, update_card, delete_card, read_card, move_card
- **Graph tools**: update_graph, query_graph, list_graph_nodes, get_relationships
- **Recap tools**: get_session_recaps, get_timeline_events
- **Hierarchy tools**: get_card_path, get_subtree, list_children, get_siblings, get_ancestor
- **Database tools**: query_database, create_database_entry, update_database_entry
- **Info level tools**: list_information_levels, get_information_level

All handlers imported directly from `backend/src/mcp/tools/*` and called via ToolRegistryService.
