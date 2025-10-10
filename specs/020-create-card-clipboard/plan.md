
# Implementation Plan: Card Clipboard Operations

**Branch**: `020-create-card-clipboard` | **Date**: 2025-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `C:/Users/zmanl/Projects/VVD-mimic/specs/020-create-card-clipboard/spec.md`

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
Multi-select clipboard functionality for wiki card tree reorganization. Game Masters can select multiple wiki cards using Ctrl+click/Shift+click, cut/copy them to clipboard, and paste them into new locations while preserving hierarchy and format. Includes keyboard shortcuts (Ctrl+X/C/V), context menu operations, undo/redo support, and session-only clipboard storage. Applies ONLY to old card architecture (Feature 003 wiki tree), NOT to new database-centric cards (Features 014+).

## Technical Context
**Language/Version**: TypeScript 5.0+ (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: React 18, TipTap 2.x (existing), existing CardTree components (Feature 003), sessionStorage API (browser), Radix UI (context menus), existing CardService
**Storage**: sessionStorage for clipboard state (browser session-only), existing SQLite/Better-SQLite3 for card persistence
**Testing**: Vitest + React Testing Library (frontend unit), Vitest + Supertest (backend contract), Playwright (E2E workflows)
**Target Platform**: Docker localhost (existing setup), Chrome/Firefox/Safari browsers
**Project Type**: web (frontend + backend detected)
**Performance Goals**: <100ms multi-select UI response, <2s paste for 100 cards, <500ms Shift+click range selection, 60fps visual feedback
**Constraints**: Session-only clipboard (cleared on refresh), wiki cards only (no database card mixing), cross-campaign paste blocked, circular hierarchy prevention required
**Scale/Scope**: Up to 500 cards multi-select support, 10 undo history operations, 100 card bulk paste operations

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I: Workflow-First Design** - ✅ PASS
This feature enhances workflow by enabling bulk card reorganization instead of tedious one-by-one moves. Multi-select and clipboard operations reduce manual effort for restructuring wiki content.

**Principle II: User Agency & Full Customization** - ✅ PASS
Users maintain full control through explicit actions (Ctrl+click, cut/paste) and undo/redo support. No automatic reorganization occurs.

**Principle III: Information Filtering & Access Control** - ✅ PASS
Clipboard operations respect existing card permissions. No new information filtering logic required (inherits from Feature 003).

**Principle IV: Knowledge Graph Architecture** - ✅ PASS
Not applicable - this feature operates on wiki card structure only, no graph interactions.

**Principle V: BYOLLM & Privacy** - ✅ PASS
Not applicable - no LLM integration in this feature.

**Principle VI: Local-Only & Prototype-First** - ✅ PASS
Session-only clipboard storage (sessionStorage API) aligns with local prototype architecture. Performance targets are prototype-appropriate (<2s for 100 cards).

**Principle VII: Transparency & User Approval** - ✅ PASS
All clipboard operations are user-initiated (keyboard shortcuts, context menu). Undo support provides recovery from mistakes. No autonomous changes.

**Overall Assessment**: PASS - No constitutional violations detected.

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
│   ├── services/
│   │   └── CardService.ts         # Existing - extend for bulk operations
│   └── routes/
│       └── cards.ts                # Existing - NO NEW ENDPOINTS (client-side only feature)
└── tests/
    ├── contract/
    │   └── cards.test.ts           # Existing - validate no regressions
    └── integration/
        └── card-clipboard.test.ts  # NEW - circular hierarchy, cross-campaign validation

frontend/
├── src/
│   ├── components/
│   │   ├── CardTree.tsx            # Existing - extend with multi-select, clipboard handlers
│   │   ├── CardTreeItem.tsx        # Existing - extend with selection state, visual indicators
│   │   ├── CardContextMenu.tsx     # NEW - Cut/Copy/Paste/Delete context menu (Radix UI)
│   │   └── SelectionIndicator.tsx  # NEW - "X cards selected" floating indicator
│   ├── contexts/
│   │   ├── CardSelectionContext.tsx # NEW - Multi-select state management
│   │   ├── ClipboardContext.tsx     # NEW - Clipboard state (cut/copy mode, card IDs)
│   │   └── UndoContext.tsx          # NEW - Undo/redo history stack
│   ├── hooks/
│   │   ├── useCardSelection.ts      # NEW - Ctrl+click, Shift+click logic
│   │   ├── useClipboard.ts          # NEW - Cut/copy/paste operations
│   │   ├── useKeyboardShortcuts.ts  # NEW - Ctrl+X/C/V/A/Z handlers
│   │   └── useCards.ts              # Existing - reuse for card operations
│   └── utils/
│       ├── clipboard.ts             # NEW - sessionStorage wrapper, validation
│       └── hierarchyValidation.ts   # NEW - circular hierarchy detection
└── tests/
    ├── components/
    │   ├── CardTree.test.tsx        # Extend - multi-select scenarios
    │   ├── CardContextMenu.test.tsx # NEW - context menu interactions
    │   └── SelectionIndicator.test.tsx # NEW - selection count display
    ├── hooks/
    │   ├── useCardSelection.test.ts # NEW - selection logic unit tests
    │   ├── useClipboard.test.ts     # NEW - clipboard operations unit tests
    │   └── useKeyboardShortcuts.test.ts # NEW - keyboard handler tests
    └── e2e/
        └── clipboard-workflow.spec.ts # NEW - Playwright E2E test (multi-select → cut → paste → undo)
```

**Structure Decision**: Web application structure (frontend + backend). This is a **frontend-heavy** feature with minimal backend changes. The clipboard state lives entirely in the browser (sessionStorage), and all multi-select/cut/copy/paste logic resides in React components and hooks. Backend only validates operations (e.g., circular hierarchy prevention during card move API calls that already exist from Feature 003).

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
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P]
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (none in Technical Context)
- [x] Complexity deviations documented (none - no violations)

**Artifacts Generated**:
- [x] research.md (Phase 0)
- [x] data-model.md (Phase 1)
- [x] contracts/ (existing-endpoints.yaml, validation-requirements.md, README.md) (Phase 1)
- [x] quickstart.md (Phase 1)
- [x] CLAUDE.md updated (Phase 1)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
