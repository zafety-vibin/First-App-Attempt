
# Implementation Plan: Stateless AI Import System

**Branch**: `017-create-a-stateless` | **Date**: 2025-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `C:/Users/zmanl/Projects/VVD-mimic/specs/017-create-a-stateless/spec.md`

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

Feature 017 implements a stateless AI import system that writes to 13 category database tables. User workflow: (1) Select import TYPE from dropdown (maps to database category), (2) Upload file or paste text, (3) Optional custom context, (4) Click Import for one-shot AI processing, (5) Preview displays proposed changes as editable table rows, (6) User edits fields directly, (7) Confirm to apply database changes. Key differentiator: NO conversational chat, NO knowledge graph population - pure database import with preview/edit workflow. Special handling for session recap sequential batch imports. Performance targets: <5s for 10-page document, <500ms preview rendering for 50 entities. Replaces Feature 005's conversational import with stateless type-selection approach for testing alternative UX patterns.

## Technical Context
**Language/Version**: TypeScript 5.0+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: Express 4.x, Better-SQLite3 with JSON1, React Router v6, React Hook Form, Zod validation, Axios, pdf-parse, mammoth (file parsing), TanStack Table v8 (preview editing), Radix UI Dialog
**Storage**: SQLite3 with JSON1 extension (reuse existing 13 category tables from Feature 014, new import_jobs and duplicate_candidates tables)
**Testing**: Vitest + Supertest (backend contract/integration), Vitest + React Testing Library (frontend component), Playwright (E2E wizard flow)
**Target Platform**: Docker localhost (Windows/Linux/macOS via Docker Compose)
**Project Type**: web (frontend + backend)
**Performance Goals**: <5s AI processing for 10-page document, <500ms preview render for 50 entities, <200ms database write on confirmation
**Constraints**: One-shot stateless processing (no session persistence), atomic transaction for database writes (rollback on failure), 50MB file size limit, 1000 char custom context limit
**Scale/Scope**: Single-user prototype, 13 import types (matching database categories), 100+ entity preview support with virtualized scrolling, fuzzy deduplication with Levenshtein distance

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Workflow-First Design (NON-NEGOTIABLE)**: ✅ PASS
Feature 017 directly addresses the "plan twice" problem by allowing users to import existing notes (PDF/DOCX/TXT/MD) into structured database with AI extraction. Users upload session notes or planning documents and system extracts entities automatically. This eliminates manual rewrite from external tools into database.

**II. User Agency & Full Customization**: ✅ PASS
Preview/edit workflow provides complete user control. Users can edit any extracted field, delete proposed entries, resolve duplicate conflicts, and assign information levels before confirmation. System suggests but user decides - no forced structure.

**III. Information Filtering & Access Control**: ✅ PASS
Integrates player_knowledge field in preview (FR-055 to FR-058). Users can assign Common Knowledge, Player Knowledge, or DM Secret to any entry during preview. Respects view mode filtering from Feature 004.

**IV. Knowledge Graph Architecture**: ✅ PASS
Feature explicitly does NOT auto-populate knowledge graphs (spec line 42: "NO knowledge graph population"). Writes to databases only. Graphs remain user-curated separately per constitution principles. This aligns with World-Foundations being optional and user-controlled.

**V. BYOLLM & Privacy (NON-NEGOTIABLE)**: ✅ PASS
Uses Feature 008 BYOLLM configuration for all LLM API calls (dependency documented in spec lines 327-329). No LLM provider credentials stored by system. User provides own API keys.

**VI. Local-Only & Prototype-First**: ✅ PASS
Docker localhost deployment. Functionality prioritized over optimization. Acceptable load times during prototype phase. Performance targets are reasonable for prototype (<5s processing, <500ms preview rendering).

**VII. Transparency & User Approval**: ✅ PASS
Core design principle: Stateless one-shot with preview/edit/confirm workflow. AI never autonomously writes to database. All AI extractions displayed in editable preview. User must explicitly click Confirm button to apply changes. Cancellation discards all changes (FR-046 to FR-048).

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
│   │   ├── ImportJob.ts                         # NEW: Import job entity (ephemeral workflow tracking)
│   │   └── DuplicateCandidate.ts                # NEW: Fuzzy duplicate match entity
│   ├── services/
│   │   ├── ImportService.ts                     # NEW: Stateless import processing orchestration
│   │   ├── ImportProcessingService.ts           # NEW: AI extraction with BYOLLM (Feature 008 integration)
│   │   ├── DeduplicationService.ts              # NEW: Levenshtein fuzzy matching (0.7 threshold)
│   │   ├── ImportConfirmService.ts              # NEW: Atomic DB writes with transaction rollback
│   │   └── FileParserService.ts                 # REUSE: Feature 005 (pdf-parse, mammoth)
│   ├── routes/
│   │   └── import.ts                            # NEW: 5 import endpoints (types, process, deduplicate, confirm, cancel)
│   ├── middleware/
│   │   └── multer.ts                            # REUSE: Feature 005 (50MB limit, PDF/DOCX/TXT/MD)
│   └── db/
│       └── migrations/
│           └── 017-import-jobs.sql              # NEW: import_jobs + duplicate_candidates tables
└── tests/
    ├── contract/
    │   └── import.test.ts                       # NEW: 5 endpoint contract tests
    ├── integration/
    │   ├── import-workflow.test.ts              # NEW: Full import flow (upload → preview → confirm)
    │   ├── sequential-batch.test.ts             # NEW: Session recap batch import timeline preservation
    │   └── deduplication.test.ts                # NEW: Fuzzy matching conflict resolution
    └── unit/
        ├── ImportService.test.ts                # NEW: Import orchestration unit tests
        └── DeduplicationService.test.ts         # NEW: Levenshtein algorithm tests

frontend/
├── src/
│   ├── components/
│   │   └── import/                              # NEW: Import component directory
│   │       ├── ImportDialog.tsx                 # NEW: Radix UI Dialog (type selection → upload → preview)
│   │       ├── TypeSelector.tsx                 # NEW: Dropdown for 13 import types
│   │       ├── FileUploadArea.tsx               # NEW: File upload + text paste tabs
│   │       ├── CustomContextInput.tsx           # NEW: Optional system prompt (1000 char limit)
│   │       ├── PreviewTable.tsx                 # NEW: TanStack Table v8 editable preview (100+ rows virtualized)
│   │       ├── PreviewRow.tsx                   # NEW: Inline editable row with validation
│   │       ├── DuplicateWarning.tsx             # NEW: Highlight duplicate conflicts with merge/delete options
│   │       ├── SequentialBatchUpload.tsx        # NEW: Multi-file upload with drag-reorder for Session Recaps
│   │       └── ImportConfirmation.tsx           # NEW: Confirm/Cancel buttons with row count summary
│   ├── hooks/
│   │   ├── useImportDialog.tsx                  # NEW: React Context + useReducer for import workflow state
│   │   ├── useImportProcessing.tsx              # NEW: Hook for stateless AI processing (axios POST)
│   │   ├── usePreviewTable.tsx                  # NEW: TanStack Table config + validation
│   │   └── useDeduplication.tsx                 # NEW: Fuzzy match warning display
│   ├── contexts/
│   │   └── ImportContext.tsx                    # NEW: Import dialog state (type, file, preview, confirmation)
│   └── utils/
│       ├── importValidation.ts                  # NEW: Zod schemas for 13 import types (mirrors Feature 014)
│       └── levenshtein.ts                       # NEW: Client-side Levenshtein for duplicate highlighting
└── tests/
    ├── components/
    │   ├── ImportDialog.test.tsx                # NEW: Dialog workflow state machine tests
    │   ├── PreviewTable.test.tsx                # NEW: Inline editing + validation tests
    │   └── DuplicateWarning.test.tsx            # NEW: Conflict resolution UI tests
    └── e2e/
        ├── import-location-notes.spec.ts        # NEW: Scenario 1 (type selection + upload + preview + confirm)
        ├── edit-preview-fields.spec.ts          # NEW: Scenario 2 (inline editing before confirmation)
        ├── resolve-duplicates.spec.ts           # NEW: Scenario 3 (fuzzy match merge/delete)
        ├── sequential-batch.spec.ts             # NEW: Scenario 4 (session recap batch import)
        ├── cancel-import.spec.ts                # NEW: Scenario 5 (cancel before confirmation)
        └── text-paste.spec.ts                   # NEW: Scenario 6 (text paste vs file upload)
```

**Structure Decision**: Web application (Option 2) - Feature 017 requires both backend (stateless AI processing, fuzzy deduplication, atomic DB writes) and frontend (import dialog, preview table, duplicate conflict resolution). Backend extends Feature 005 file parsing patterns and Feature 008 BYOLLM integration. Frontend uses Radix UI Dialog (Feature 008 patterns) and TanStack Table v8 (Feature 015 patterns) for editable preview workflow. 2 new backend models, 5 new backend services, 1 new route, 2 new tables. 9 new frontend components, 4 new hooks, 1 new context. 6 E2E test scenarios matching spec acceptance scenarios.

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
- Generate tasks from contracts/import.yaml (5 endpoints), data-model.md (2 entities, 13 Zod schemas, 3 state models), and quickstart.md (6 test scenarios)
- Backend tasks (TDD order):
  * Database layer: Migration 017-import-jobs.sql → ImportJob model [P] → DuplicateCandidate model [P]
  * Services layer: FileParserService (reuse Feature 005) → DeduplicationService (Levenshtein) [P] → ImportProcessingService (BYOLLM) [P] → ImportConfirmService (atomic transaction) [P] → ImportService (orchestration)
  * API layer: import.ts routes (5 endpoints) → 5 contract tests [P]
  * Unit tests: ImportService tests [P] → DeduplicationService tests [P]
  * Integration tests: import-workflow test → sequential-batch test → deduplication test
- Frontend tasks (implementation-first order):
  * Utils layer: importValidation.ts (13 Zod schemas) [P] → levenshtein.ts [P]
  * Contexts layer: ImportContext.tsx (state machine)
  * Hooks layer: useImportDialog (state management) → useImportProcessing (axios) [P] → usePreviewTable (TanStack) [P] → useDeduplication [P]
  * Components layer: ImportDialog → TypeSelector [P] → FileUploadArea [P] → CustomContextInput [P] → PreviewTable → PreviewRow → DuplicateWarning → SequentialBatchUpload [P] → ImportConfirmation [P]
  * Component tests: ImportDialog tests [P] → PreviewTable tests [P] → DuplicateWarning tests [P]
  * E2E tests: 6 Playwright scenarios matching quickstart.md scenarios 1-6

**Ordering Strategy**:
- Backend: TDD order (tests before implementation), database → services → API → integration
- Frontend: Implementation-first (utils → contexts → hooks → components → tests)
- Parallelize independent files within same layer (marked [P])
- Integration/E2E tests last (require working backend + frontend)

**Estimated Output**: 48-52 numbered, ordered tasks in tasks.md
- Backend: 18 tasks (3 database, 7 services, 3 API, 3 unit, 2 integration)
- Frontend: 28 tasks (2 utils, 1 context, 4 hooks, 9 components, 3 component tests, 6 E2E, 3 integration with backend)
- Dependencies: Feature 005 FileParserService reuse, Feature 008 BYOLLM integration, Feature 014 schema alignment

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
