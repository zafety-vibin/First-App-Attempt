# Implementation Plan: AI Import and Planning Workflows

**Branch**: `005-create-the-ai` | **Date**: 2025-10-01 (Updated 2025-10-03 post-Feature 011) | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-create-the-ai/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context ✓
3. Fill Constitution Check section ✓
4. Evaluate Constitution Check → Document violations if any
5. Execute Phase 0 → research.md
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update
7. Re-evaluate Constitution Check
8. Plan Phase 2 → Describe task generation approach
9. STOP - Ready for /tasks command
```

## Summary

AI Import and Planning Workflows provide Game Masters with AI-assisted bulk note transformation and session planning tools. The Import workflow analyzes unstructured notes (text, files, PDFs), extracts entities, searches existing campaign content to distinguish updates from new additions, and presents approval summary for atomic batch execution with revert capability. The Planning workflow uses four knowledge graphs (Geographical, Political-Web, World-Foundations, Campaign-Story) to provide context-aware session planning assistance, maintaining strict distinction between established canon (Session Recaps timeline) and hypothetical scenarios. Both workflows use **OpenAI/Anthropic function calling** with **shared tool handlers from Feature 011** for streaming responses, require BYOLLM configuration, and enforce transparency with user approval for all AI-generated changes.

**Critical Dependencies**:
- Feature 002 (Authentication & Campaigns) ✓ Implemented
- Feature 003 (Card Architecture) ✓ Implemented
- Feature 004 (Information Filtering) ✓ Implemented - AI respects information levels
- Feature 008 (BYOLLM Configuration) ✓ Implemented - Provides user API credentials
- **Feature 011 (MCP Integration) ✓ Implemented** - Provides 24 reusable tool handlers (search_cards, create_card, update_graph, etc.) that Import/Planning AI call via function calling

## Technical Context

**Language/Version**:
- Backend: Node.js 20 LTS + TypeScript 5.0+
- Frontend: React 18 + TypeScript 5.0+

**Primary Dependencies**:
- **Shared MCP Tool Handlers (Feature 011)**: 24 tool handlers in `backend/src/mcp/tools/*` callable via direct imports
- **LLM Providers**: OpenAI SDK, Anthropic SDK (user-provided credentials via Feature 008)
- **Function Calling**: OpenAI function calling API, Anthropic tool use API
- **Entity Extraction**: LLM-based NER with custom prompts via function calling
- **Graph Storage**: SQLite JSON1 extension for graph JSONB storage (Feature 011 provides update_graph handler)
- **File Parsing**: pdf-parse (PDF), mammoth (DOCX), markdown-it (MD)
- **Diff/Revert**: immer for immutable state snapshots
- **UI**: Radix UI for pull-down tabs, react-markdown for chat rendering

**Storage**:
- SQLite3 (extends features 002-004 schema, Feature 011 adds knowledge_graphs tables)
- New tables: `import_sessions`, `planning_sessions`, `import_batches`
- Reuse Feature 011 tables: `knowledge_graphs`, `graph_nodes`, `graph_edges`
- JSONB columns for: chat history, approval summaries

**Testing**:
- Backend: Vitest + Supertest (API contract tests for import/planning endpoints)
- Frontend: Vitest + React Testing Library (ImportTab, PlanningTab components)
- E2E: Playwright (full Import workflow → approval → execution → revert, Planning workflow → graph update → query)
- LLM Testing: Mock OpenAI/Anthropic function calling responses with fixtures

**Target Platform**:
- Docker Compose local deployment (localhost:3000 frontend, localhost:3001 backend)
- Browser: Chrome/Firefox/Safari (latest 2 versions)

**Project Type**: Web application (frontend + backend)

**Performance Goals**:
- Import entity extraction: <10s for 5000 words (LLM-dependent)
- Planning graph update: <30s for 50 imported cards (LLM-dependent)
- Client-side filtering of approval summary: <100ms for 500 proposed actions
- Revert operation: <500ms for batch of 100 cards

**Constraints**:
- Local prototype only (no cloud deployment)
- Single-user concurrent session (no multi-user import conflicts)
- LLM function calling must handle 10k+ token responses with streaming
- Knowledge graph nodes limited to 10k per graph type (Political-Web/Campaign-Story stay lean)
- Import batch revert limited to most recent batch within session (no deep history)

**Scale/Scope**:
- 50 pages of unstructured notes per import session
- 500 cards per campaign (Import AI must search all)
- 4 knowledge graph types with 1000-10k nodes each
- 100 concurrent chat messages per Planning session
- 6 default template databases (Session Recaps, Characters/NPCs, Locations, Factions, Plot Threads, Lore)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Workflow-First Design (NON-NEGOTIABLE) - ✓ PASS

**Requirement**: Users MUST NOT have to "plan twice". AI-assisted bulk import must eliminate manual re-entry.

**Feature Alignment**:
- Import workflow directly addresses "plan twice" problem (FR-015 to FR-048)
- Accepts paste, file upload (.txt/.md/.docx/.pdf), URL input (FR-015)
- Bulk entity extraction and batch approval (FR-023 to FR-029)
- Atomic batch execution with revert (FR-030 to FR-034)
- Fast feedback loop: clarifications → approval → execution in single session

**Compliance**: ✓ Core feature implements constitution's primary mission

---

### II. User Agency & Full Customization - ✓ PASS

**Requirement**: Users have complete control over data structure. System adapts to custom layouts, not vice versa.

**Feature Alignment**:
- Import AI searches existing campaign structure before proposing placement (FR-019)
- Adapts to user's custom structure, uses default template as fallback (FR-020, FR-074)
- System prompt injection allows customization per campaign (FR-048)
- Users can edit/delete/move cards after import (FR-034, FR-035)
- Planning AI provides suggestions but makes NO autonomous edits (FR-065 to FR-069)
- Knowledge graphs editable by GM via chat interface (FR-081)

**Compliance**: ✓ AI adapts to user structure, not enforces rigid schema

---

### III. Information Filtering & Access Control - ✓ PASS

**Requirement**: Tiered visibility system (Common Knowledge, Player Knowledge, DM Secret). AI respects tiers.

**Feature Alignment**:
- Import AI accesses full campaign content to determine placement (requires Feature 004)
- Planning AI queries scoped to information levels (feature 009 player portal will use tier-filtered context)
- Session Recaps database is authoritative timeline (FR-071, FR-042)
- Knowledge graphs include information level metadata for future tier-scoped queries
- Both workflows are GM-only tools (no player access to Import/Planning tabs)

**Integration**: Depends on Feature 004 (Information Filtering) for tier metadata. Planning workflow will filter context by tier when invoked from player portal (Feature 009).

**Compliance**: ✓ AI workflows respect information levels, foundation for player-facing AI (Feature 009)

---

### IV. Knowledge Graph Architecture - ✓ PASS (CORE FEATURE)

**Requirement**: Support specialized knowledge graphs for AI context. All graphs optional per query.

**Feature Alignment**:
- Implements all 4 required graph types (FR-075 to FR-079):
  - **Geographical**: Locations, regions, spatial relationships (FR-076)
  - **Political-Web**: Active party-relevant political relationships (FR-077, lean by design)
  - **World-Foundations**: Core world-building, magic systems, lore (FR-078)
  - **Campaign-Story**: Active story threads from Session Recaps timeline (FR-079, lean by design)
- Political-Web and Campaign-Story designed to stay lean (FR-053, FR-054, FR-057)
- Graphs updated only by Planning AI with explicit user approval (FR-049 to FR-051, FR-080)
- GM can inspect/edit graphs via Planning chat (FR-081)
- Session Recaps database is authoritative source for Campaign-Story graph (FR-055)
- **Feature 011 provides graph infrastructure**: update_graph, query_graph, list_graph_nodes tool handlers

**Compliance**: ✓ Core constitutional feature fully implemented. Political-Web and Campaign-Story leanness enforced through "active party-relevant" filtering logic.

---

### V. BYOLLM & Privacy (NON-NEGOTIABLE) - ✓ PASS (DEPENDENCY)

**Requirement**: Users provide own LLM API credentials. No system-provided LLM usage.

**Feature Alignment**:
- Both Import and Planning workflows require BYOLLM configuration (FR-005)
- Clear error message when attempted without credentials (FR-006)
- OpenAI/Anthropic function calling uses user-provided API keys via Feature 008 (FR-010)
- Feature 008 (BYOLLM Configuration) is hard dependency for Feature 005

**Compliance**: ✓ BYOLLM dependency correctly identified. No system LLM usage.

---

### VI. Local-Only & Prototype-First - ✓ PASS

**Requirement**: Feature functionality over optimization. Local single-user deployment acceptable.

**Feature Alignment**:
- Import batch revert limited to current session (FR-033) - acceptable for prototype
- Knowledge graph size limits (10k nodes) acceptable for local single-user (Constraints)
- Performance goals LLM-dependent (10s for entity extraction) - acceptable, no optimization required
- No learning/preference memory (FR-047) - simpler stateless approach
- Acceptable to have Import workflow clarification phase take minutes for complex notes
- Focus on correctness (timeline consistency FR-040, entity deduplication FR-018) over speed

**Compliance**: ✓ Prioritizes functionality (correct entity extraction, timeline consistency) over optimization

---

### VII. Transparency & User Approval - ✓ PASS (CRITICAL)

**Requirement**: AI MUST NOT autonomously change content. All changes require explicit approval.

**Feature Alignment**:
- **Import workflow**:
  - Clarifications before approval summary (FR-023, FR-024)
  - Approval summary shows all proposed changes (FR-025)
  - Wording changes require explicit approval (FR-027)
  - Users can review/modify before approval (FR-028)
  - NO cards created/updated without approval (FR-026)
  - Atomic batch execution with revert (FR-030 to FR-033)

- **Planning workflow**:
  - NO autonomous edits to cards (FR-065, FR-066)
  - Suggestions clearly marked as suggestions (FR-068)
  - Creates/updates cards only with explicit approval (FR-067, FR-069)
  - Graph updates require explicit permission (FR-051)
  - Distinguishes canon (Session Recaps) from hypotheticals (FR-060, FR-061)

**Compliance**: ✓ Strongest user approval enforcement of all features. Both workflows are pure assistants, zero autonomous changes.

---

**Constitution Check Result**: ✓ **PASS** - No violations. Feature 005 is a core constitutional feature implementing Principles I, IV, and VII.

**Critical Dependencies**: Feature 008 (BYOLLM) ✓ Complete, Feature 011 (MCP Integration) ✓ Complete

## Project Structure

### Documentation (this feature)
```
specs/005-create-the-ai/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── import.yaml      # Import workflow API (upload, clarify, approve, execute, revert)
│   ├── planning.yaml    # Planning workflow API (chat, graph updates, suggestions)
│   └── knowledge-graphs.yaml  # Graph CRUD, node/edge operations, inspection
├── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
└── FEATURE_011_INTEGRATION_NOTES.md  # Architecture clarification (created 2025-10-03)
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── mcp/                         # (Feature 011) - Shared tool handlers
│   │   ├── tools/
│   │   │   ├── card-tools.ts        # search_cards, create_card, update_card handlers
│   │   │   ├── graph-tools.ts       # query_graph, update_graph, list_graph_nodes handlers
│   │   │   ├── hierarchy-tools.ts   # get_card_path, get_subtree handlers
│   │   │   ├── recap-tools.ts       # get_session_recaps, get_timeline_events handlers
│   │   │   ├── database-tools.ts    # query_database, create_database_entry handlers
│   │   │   └── info-level-tools.ts  # list_information_levels handler
│   │   └── schemas/                 # Zod schemas for tool validation
│   │       ├── card-schemas.ts
│   │       ├── graph-schemas.ts
│   │       └── ... (other schemas)
│   ├── models/
│   │   ├── User.ts                  # (Feature 002)
│   │   ├── Campaign.ts              # (Feature 002)
│   │   ├── Card.ts                  # (Feature 003)
│   │   ├── InformationLevel.ts      # (Feature 004)
│   │   ├── ImportSession.ts         # NEW: Active import workflow session
│   │   ├── PlanningSession.ts       # NEW: Active planning workflow session
│   │   ├── ImportBatch.ts           # NEW: Atomic import operation with revert state
│   │   └── AIApprovalSummary.ts     # NEW: Approval interface before import execution
│   ├── services/
│   │   ├── AuthService.ts           # (Feature 002)
│   │   ├── CampaignService.ts       # (Feature 002)
│   │   ├── CardService.ts           # (Feature 003)
│   │   ├── InformationLevelService.ts  # (Feature 004)
│   │   ├── BYOLLMConfigService.ts   # (Feature 008) - User LLM credentials
│   │   ├── FunctionCallingService.ts  # NEW: Convert Zod schemas to OpenAI/Anthropic function schemas
│   │   ├── LLMOrchestrationService.ts  # NEW: Streaming chat completions, function calling loop
│   │   ├── ToolRegistryService.ts   # NEW: Map tool names to handlers, execute tool calls
│   │   ├── ImportAIService.ts       # NEW: Entity extraction via function calling, placement logic
│   │   ├── PlanningAIService.ts     # NEW: Graph updates via function calling, context assembly
│   │   ├── ImportBatchService.ts    # NEW: Execute batch card creation, revert logic
│   │   ├── TimelineService.ts       # NEW: Session Recaps timeline validation
│   │   └── FileParseService.ts      # NEW: PDF/DOCX/MD parsing
│   ├── middleware/
│   │   ├── keycloak.ts              # (Feature 002)
│   │   ├── viewModeFilter.ts        # (Feature 004)
│   │   └── byollmRequired.ts        # NEW: Check BYOLLM config before Import/Planning
│   ├── routes/
│   │   ├── auth.ts                  # (Feature 002)
│   │   ├── campaigns.ts             # (Feature 002)
│   │   ├── cards.ts                 # (Feature 003)
│   │   ├── information-levels.ts    # (Feature 004)
│   │   ├── import.ts                # NEW: POST /import/upload, /import/chat, /import/approve, /import/revert
│   │   ├── planning.ts              # NEW: POST /planning/chat, /planning/update-graphs
│   │   └── knowledge-graphs.ts      # NEW: GET /graphs/:type, PATCH /graphs/:type/nodes/:id
│   └── db/
│       ├── schema.sql               # Extended: import_sessions, planning_sessions, import_batches
│       └── migrations.ts            # Version tracking (migration 005)
└── tests/
    ├── contract/
    │   ├── import.test.ts           # NEW: Import workflow API contracts
    │   ├── planning.test.ts         # NEW: Planning workflow API contracts
    │   └── knowledge-graphs.test.ts  # NEW: Graph API contracts
    ├── integration/
    │   ├── import-workflow.test.ts   # NEW: Full Import flow with mocked LLM function calling
    │   ├── planning-workflow.test.ts # NEW: Full Planning flow with graph updates
    │   └── timeline-consistency.test.ts  # NEW: Session Recaps timeline validation
    └── unit/
        ├── entity-extraction.test.ts  # NEW: Entity deduplication, classification
        ├── graph-filtering.test.ts    # NEW: Political-Web "active party-relevant" logic
        ├── function-calling.test.ts   # NEW: Zod → OpenAI/Anthropic schema conversion
        └── llm-orchestration.test.ts  # NEW: Function calling loop, streaming

frontend/
├── src/
│   ├── components/
│   │   ├── PublicLanding.tsx        # (Feature 002)
│   │   ├── CampaignManagement.tsx   # (Feature 002)
│   │   ├── CardTree.tsx             # (Feature 003)
│   │   ├── PaintersEaselPalette.tsx # (Feature 004)
│   │   ├── ViewModeToggle.tsx       # (Feature 004)
│   │   ├── ImportTab.tsx            # NEW: Pull-down overlay with chat interface
│   │   ├── PlanningTab.tsx          # NEW: Pull-down overlay with Planning chat
│   │   ├── ApprovalSummary.tsx      # NEW: Batch approval UI (review proposed changes)
│   │   ├── ImportChatMessage.tsx    # NEW: Chat message renderer for Import workflow
│   │   ├── PlanningChatMessage.tsx  # NEW: Chat message renderer for Planning workflow
│   │   ├── GraphViewer.tsx          # NEW: Simple list view of graph nodes/edges (future: canvas)
│   │   └── RevertButton.tsx         # NEW: Revert most recent import batch
│   ├── pages/
│   │   ├── LandingPage.tsx          # (Feature 002)
│   │   ├── CampaignPage.tsx         # (Feature 003)
│   │   └── SettingsPage.tsx         # (Feature 004, 008)
│   ├── services/
│   │   ├── apiClient.ts             # (Feature 002)
│   │   ├── campaignService.ts       # (Feature 002)
│   │   ├── cardService.ts           # (Feature 003)
│   │   ├── importService.ts         # NEW: POST import/upload, chat, approve, revert
│   │   ├── planningService.ts       # NEW: POST planning/chat, update-graphs
│   │   └── graphService.ts          # NEW: GET graphs, PATCH nodes/edges
│   ├── hooks/
│   │   ├── useAuth.ts               # (Feature 002)
│   │   ├── useCards.ts              # (Feature 003)
│   │   ├── useViewMode.ts           # (Feature 004)
│   │   ├── useImportSession.ts      # NEW: Manage import chat state, upload, approval
│   │   ├── usePlanningSession.ts    # NEW: Manage planning chat state, graph updates
│   │   ├── useGraphs.ts             # NEW: Fetch/update knowledge graphs
│   │   └── useStreamingChat.ts      # NEW: Handle streaming LLM responses (SSE or chunks)
│   ├── contexts/
│   │   ├── AuthContext.tsx          # (Feature 002)
│   │   ├── CardContext.tsx          # (Feature 003)
│   │   ├── ViewModeContext.tsx      # (Feature 004)
│   │   ├── ImportContext.tsx        # NEW: Import session state (messages, approval summary)
│   │   └── PlanningContext.tsx      # NEW: Planning session state (messages, graph status)
│   ├── routes/
│   │   └── AppRoutes.tsx            # (Feature 002-004)
│   └── config/
│       ├── keycloak.ts              # (Feature 002)
│       └── tiptap.ts                # (Feature 003)
└── tests/
    ├── components/
    │   ├── ImportTab.test.tsx       # NEW: Upload, chat, approval UI tests
    │   ├── PlanningTab.test.tsx     # NEW: Planning chat, graph viewer tests
    │   └── ApprovalSummary.test.tsx # NEW: Review/modify/approve actions tests
    └── e2e/
        ├── import-workflow.spec.ts   # NEW: Paste notes → clarify → approve → execute → verify cards created
        ├── planning-workflow.spec.ts # NEW: Ask question → update graphs → receive context-aware response
        └── import-revert.spec.ts     # NEW: Execute import → revert → verify cards restored
```

**Structure Decision**: Web application (frontend + backend). Extends existing VVD-mimic architecture from features 002-004. Import/Planning workflows are frontend pull-down tabs that communicate with backend REST API. Backend calls Feature 011 tool handlers directly via imports (NOT MCP protocol). Knowledge graphs managed by Feature 011 handlers, exposed via REST API for frontend inspection/editing.

## Phase 0: Outline & Research

**Research Areas** (to be expanded in research.md):

1. **OpenAI/Anthropic Function Calling Integration**
   - Research OpenAI function calling API (tools parameter in chat completions)
   - Research Anthropic tool use API (tools parameter in messages)
   - Converting Zod schemas from Feature 011 to function schemas
   - Function calling loop pattern (LLM requests tool → execute → return result → LLM continues)
   - Streaming chat completions with function calls
   - Decision: Server-Sent Events (SSE) vs chunked transfer encoding for streaming

2. **Tool Handler Registry Pattern**
   - Mapping tool names to handler functions from Feature 011
   - Validating function call arguments with Zod schemas
   - Executing handlers and formatting results for LLM context
   - Error handling when tool execution fails
   - Decision: Dynamic imports vs static registry vs reflection

3. **Pull-Down Tab UI Pattern**
   - Research overlay UI patterns (Gmail-style vs Notion sidebar vs Slack command palette)
   - State management for tab visibility and content
   - Z-index layering with existing canvas
   - Accessibility (keyboard nav, focus trap, screen readers)
   - Decision: Radix UI Dialog vs custom overlay vs react-tabs

4. **Entity Extraction & Deduplication**
   - LLM prompt engineering for NER (characters, locations, factions, events)
   - Fuzzy matching for entity deduplication ("Dagult Neverember" vs "Lord Neverember")
   - Multi-pass extraction vs single-pass comprehensive
   - Confidence scoring for uncertain extractions
   - Decision: Custom prompt templates vs LangChain vs LlamaIndex

5. **Knowledge Graph Updates via Function Calling**
   - Using Feature 011's update_graph handler (add_node, update_node, delete_node, add_edge, delete_edge operations)
   - LLM prompt engineering for graph update requests
   - Batching multiple graph operations in single function call
   - Political-Web "active party-relevant" filtering algorithm
   - Decision: One operation per function call vs batch operations

6. **Timeline Consistency Validation**
   - Session Recaps database as authoritative source
   - Detecting contradictions (event A happened after B, but B references A)
   - Date/day count parsing from unstructured text
   - LLM-based consistency checking prompts
   - Decision: Rule-based validation vs LLM-based vs hybrid

7. **Diff & Revert Mechanism**
   - Immutable state snapshots with immer
   - Storing "before" state for most recent batch
   - Atomic rollback (all cards reverted or none)
   - Session-scoped revert (lost on page refresh acceptable for prototype)
   - Decision: immer patches vs full state snapshot vs database transactions

8. **File Parsing (PDF, DOCX, MD)**
   - pdf-parse for PDF text extraction (no OCR needed for prototype)
   - mammoth for DOCX conversion to HTML/Markdown
   - markdown-it for MD parsing (already used in Feature 003)
   - Handling large files (10+ MB PDFs) - chunking vs memory limits
   - Decision: Server-side parsing vs client-side (WebAssembly) vs hybrid

9. **Default Template Structure**
   - Session Recaps database schema (session number, date, timeline, events)
   - Characters/NPCs database schema (name, description, faction, location)
   - Locations, Factions, Plot Threads, Lore schemas
   - Template instantiation on campaign creation
   - Decision: Hardcoded SQL inserts vs YAML config vs admin UI

10. **LLM Prompt Engineering**
    - System prompts for Import vs Planning contexts
    - Context assembly (include Session Recaps, information levels, custom instructions)
    - Few-shot examples for entity extraction
    - Consistency prompts (timeline validation, wording preservation)
    - Decision: Prompt templates with variable substitution vs dynamic generation

**Output**: `research.md` with decisions, rationale, code examples for all 10 areas

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### Artifacts to Generate:

1. **data-model.md**:
   - ImportSession entity (chat history, uploaded files, approval state, batch ID)
   - PlanningSession entity (chat history, graph update status, last processed import ID)
   - ImportBatch entity (created_card_ids, updated_card_ids, revert snapshot JSONB)
   - AIApprovalSummary entity (proposed updates, proposed creates, user approval status)
   - SessionRecapEntry schema (extends Card metadata for database entries)
   - Default template schemas (6 databases: Session Recaps, Characters/NPCs, Locations, Factions, Plot Threads, Lore)
   - **Note**: KnowledgeGraph, GraphNode, GraphEdge entities already exist from Feature 011

2. **contracts/** (OpenAPI 3.0):
   - `import.yaml`:
     - POST /import/upload (file/text → session_id)
     - POST /import/chat (session_id, message → clarification response via streaming)
     - GET /import/approval-summary (session_id → proposed actions)
     - POST /import/approve (session_id → batch_id, created/updated card IDs)
     - POST /import/revert (session_id, batch_id → reverted card count)

   - `planning.yaml`:
     - POST /planning/chat (session_id, message, graph_context_flags → streaming response)
     - POST /planning/update-graphs (session_id, import_ids → updated graph types, node/edge counts)
     - GET /planning/session-status (session_id → graph update status, last processed import)

   - `knowledge-graphs.yaml`:
     - GET /graphs (campaign_id → list of 4 graph types with metadata)
     - GET /graphs/:type (type, campaign_id → nodes, edges, last_updated)
     - PATCH /graphs/:type/nodes/:id (node updates → updated node)
     - DELETE /graphs/:type/nodes/:id (cascades edge deletion)
     - POST /graphs/:type/nodes (create node with relationships)
     - **Note**: Backend calls Feature 011's update_graph handler internally

3. **quickstart.md**:
   - Workflow 1: Import session recap (paste text → clarify "Council" reference → approve → verify Session Recaps entry created)
   - Workflow 2: Import character notes (upload DOCX → approve NPC database updates → verify 3 characters updated)
   - Workflow 3: Planning session with graph update (ask "What plots are active?" → approve graph update → receive context-aware response)
   - Workflow 4: Import batch revert (execute import → immediately revert → verify cards restored)
   - Workflow 5: Knowledge graph inspection (view Political-Web nodes → edit relationship via chat → verify change persisted)
   - Workflow 6: Custom AI instructions (set system prompt "Always ask for dates" → verify Import AI requests dates during clarification)

4. **CLAUDE.md update**:
   - Add OpenAI SDK, Anthropic SDK, pdf-parse, mammoth to dependencies
   - Update project structure with new models/services/routes
   - Add Import/Planning workflows to Recent Changes
   - Add API contract paths for import.yaml, planning.yaml, knowledge-graphs.yaml
   - Note shared architecture with Feature 011 tool handlers

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **From Contracts** (import.yaml, planning.yaml, knowledge-graphs.yaml):
   - Each endpoint → contract test task [P]
   - Each endpoint → route handler task (after tests)
   - Import workflow: 5 endpoints → 10 tasks
   - Planning workflow: 3 endpoints → 6 tasks
   - Knowledge graphs: 5 endpoints → 10 tasks

2. **From Data Model** (data-model.md):
   - Each entity → model creation task [P]
   - Each entity → database migration task (sequential, not parallel)
   - 4 new entities (ImportSession, PlanningSession, ImportBatch, AIApprovalSummary) → 4 model tasks + 1 migration task
   - Default template schemas → template SQL generation task
   - Note: KnowledgeGraph entities reused from Feature 011

3. **From Services** (research.md decisions):
   - FunctionCallingService (Zod → OpenAI/Anthropic schemas) → 2 tasks
   - LLMOrchestrationService (streaming, function calling loop) → 3 tasks
   - ToolRegistryService (map handlers, execute calls) → 2 tasks
   - ImportAIService (entity extraction, deduplication, placement) → 4 tasks
   - PlanningAIService (graph updates via function calling, context assembly) → 3 tasks
   - ImportBatchService (batch execution, revert) → 2 tasks
   - TimelineService (Session Recaps validation) → 1 task
   - FileParseService (PDF, DOCX, MD) → 1 task

4. **From Frontend Components** (quickstart workflows):
   - ImportTab (pull-down overlay, chat UI) → 2 tasks (layout, chat integration)
   - PlanningTab (pull-down overlay, chat UI) → 2 tasks
   - ApprovalSummary (review interface, modify actions) → 2 tasks (display, interaction)
   - GraphViewer (list view of nodes/edges) → 1 task
   - RevertButton (revert logic, confirmation dialog) → 1 task
   - ImportContext/PlanningContext (state management) → 2 tasks

5. **From Integration Tests** (quickstart workflows map to E2E tests):
   - Workflow 1 (Import session recap) → import-session-recap.spec.ts
   - Workflow 2 (Import character notes) → import-character-notes.spec.ts
   - Workflow 3 (Planning graph update) → planning-graph-update.spec.ts
   - Workflow 4 (Revert) → import-revert.spec.ts
   - Workflow 5 (Graph inspection) → graph-viewer.spec.ts
   - Workflow 6 (Custom instructions) → custom-ai-instructions.spec.ts

**Ordering Strategy**:

1. **Database layer first** (enables all other work):
   - Migration 005 (create import/planning tables) → MUST be task #1
   - Model creation tasks [P] → Tasks #2-5 (parallel)
   - Default template SQL generation → Task #6

2. **Backend services** (TDD: tests before implementation):
   - Contract tests [P] → Tasks #7-32 (parallel, one per endpoint + service method)
   - FunctionCallingService → Tasks #33-34 (Zod conversion)
   - LLMOrchestrationService → Tasks #35-37 (streaming, function calling loop)
   - ToolRegistryService → Tasks #38-39 (registry setup, execution)
   - FileParseService → Task #40 (PDF/DOCX/MD parsing)
   - TimelineService → Task #41 (Session Recaps validation)
   - ImportBatchService → Tasks #42-43 (batch execution, revert)
   - ImportAIService → Tasks #44-47 (entity extraction via function calling, placement, approval, execution)
   - PlanningAIService → Tasks #48-50 (graph update detection, context assembly via query_graph, graph updates via update_graph)

3. **Backend routes** (implement after services):
   - import.ts routes → Tasks #51-55 (upload, chat, approval-summary, approve, revert)
   - planning.ts routes → Tasks #56-58 (chat, update-graphs, session-status)
   - knowledge-graphs.ts routes → Tasks #59-63 (list graphs, get graph, PATCH node, DELETE node, POST node)

4. **Frontend core** (contexts, hooks, services):
   - ImportContext, PlanningContext → Tasks #64-65 [P]
   - useImportSession, usePlanningSession, useGraphs, useStreamingChat hooks → Tasks #66-69 [P]
   - importService, planningService, graphService API clients → Tasks #70-72 [P]

5. **Frontend components** (UI implementation):
   - ImportTab layout → Task #73
   - ImportTab chat integration → Task #74
   - PlanningTab layout → Task #75
   - PlanningTab chat integration → Task #76
   - ApprovalSummary display → Task #77
   - ApprovalSummary interaction (modify, approve) → Task #78
   - GraphViewer (list view) → Task #79
   - RevertButton → Task #80

6. **Integration & E2E tests** (validate full workflows):
   - Import session recap E2E → Task #81
   - Import character notes E2E → Task #82
   - Planning graph update E2E → Task #83
   - Import revert E2E → Task #84
   - Graph viewer E2E → Task #85
   - Custom AI instructions E2E → Task #86

**Estimated Output**: ~86 numbered, dependency-ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

**Post-Implementation Integration**:
- Feature 011 (MCP Integration) ✓ Complete - tool handlers ready for reuse
- Feature 009 (Player Question Portal) will use Planning AI with tier-filtered context
- Feature 006 (Knowledge Graph Visualization) will enhance GraphViewer with canvas UI

## Complexity Tracking

*No constitutional violations detected. This section left empty per template instructions.*

## Dependencies

**Hard Dependencies** (must be implemented first):
- ✓ Feature 002 (Authentication & Campaigns) - Import/Planning sessions scoped to campaign
- ✓ Feature 003 (Card Architecture) - Import creates/updates cards
- ✓ Feature 004 (Information Filtering) - AI respects information levels for tier-scoped queries
- ✓ Feature 008 (BYOLLM Configuration) - User API credentials required for LLM calls
- ✓ **Feature 011 (MCP Integration)** - Provides 24 reusable tool handlers (search_cards, create_card, update_graph, query_graph, etc.)

**Soft Dependencies** (can implement in parallel):
- Feature 006 (Knowledge Graph Visualization) - Enhances GraphViewer with canvas (not blocking)
- Feature 009 (Player Question Portal) - Uses Planning AI with tier-filtered context (not blocking)

**Implementation Order Recommendation**:
1. Features 002-004, 008, 011 already complete ✓
2. Implement Feature 005 (AI Import & Planning) - now unblocked
3. Implement Features 006-007 (can parallelize)
4. Implement Features 009-010 (depend on 005 Planning AI)

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✓
- [ ] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (FR-048, FR-072, FR-081) ✓
- [x] Complexity deviations documented (none) ✓

---

*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
