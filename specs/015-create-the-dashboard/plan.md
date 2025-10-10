
# Implementation Plan: Dashboard & Navigation UI

**Branch**: `015-create-the-dashboard` | **Date**: 2025-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-create-the-dashboard/spec.md`

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
Create comprehensive dashboard and navigation UI for campaign management system. Implements dashboard homepage with 7 widgets pulling from 13 structured category tables. Sidebar navigation organized by 4-type hierarchy (SETTING, LIVING WORLD, CAMPAIGN, EXTENDED) with collapsible sections. Category landing pages with statistics, recent items, and search/filter controls. Full CRUD functionality via table views, entity detail pages, and creation/edit forms. Supports thematic naming, information level filtering, and relationship display. Depends on Feature 014 REST APIs. Desktop-only for v1. Table view architecture prepares for future Gallery/Board toggles (disabled in v1).

## Technical Context
**Language/Version**: TypeScript 5.0+ (React 18)
**Primary Dependencies**: React 18, React Router v6, TanStack Table v8, React Hook Form, Zod (validation), Radix UI (components), Axios (API client)
**Storage**: Browser localStorage (UI state: sidebar collapse, view preferences, filter persistence), Session storage (view mode, pagination state)
**Testing**: Vitest + React Testing Library (component tests), Playwright (E2E tests)
**Target Platform**: Docker container, localhost:3000 (desktop browsers only for v1)
**Project Type**: web (frontend-only for this feature, backend exists in Feature 014)
**Performance Goals**: Dashboard load <2s (1000 entities), category landing <1s (500 entities), table pagination <500ms, entity detail <500ms, search/filter <200ms
**Constraints**: Desktop-only UI (mobile deferred), information level filtering (DM vs Player view), 4-type hierarchy navigation, all 13 category schemas from Feature 014, thematic naming support (13 categories × 4 themes = 52 labels)
**Scale/Scope**: 122 functional requirements, 13 category views, 7 dashboard widgets, ~40 React components, 500+ entity table support with virtualization

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Workflow-First Design (NON-NEGOTIABLE)**: ✅ PASS
- Provides UI for viewing and managing data from Feature 014 database
- CRUD operations enable efficient manual data entry when bulk import not needed
- Dashboard widgets surface recent activity for quick campaign status overview
- Table views with search/filter reduce time to find specific entities

**II. User Agency & Full Customization**: ✅ PASS
- Thematic naming support (13 categories × 4 themes = 52 labels) for campaign customization
- ALL prebuilt fields displayed in tables (FR-033) - no hidden/restricted fields
- Custom fields section display in forms and detail pages (FR-047, FR-063)
- Sidebar collapse state persisted per user preference
- View mode toggle gives user control over information visibility

**III. Information Filtering & Access Control**: ✅ PASS
- Comprehensive view mode support: DM view vs Player view (FR-101 to FR-108)
- Player View filters entities with player_knowledge = 'secret' or 'dm_only' (FR-102)
- DM-only fields stripped in Player View even if entity visible (FR-103)
- NULL information level handled as freely accessible (FR-104)
- Information filtering applied across dashboard widgets, tables, search, detail pages

**IV. Knowledge Graph Architecture**: ✅ N/A
- Feature explicitly excludes knowledge graph visualizations (FR-120)
- Graph integration scope is Feature 016
- This feature focuses on database management UI only

**V. BYOLLM & Privacy (NON-NEGOTIABLE)**: ✅ N/A
- No LLM integration in this feature
- Pure UI for manual CRUD operations on database
- BYOLLM features are Feature 017/018 scope

**VI. Local-Only & Prototype-First**: ✅ PASS
- Desktop-only v1 explicitly scoped (FR-020) - mobile deferred
- Docker localhost:3000 deployment target
- Performance goals appropriate for prototype (2s dashboard, 1s category landing)
- Feature functionality prioritized over optimization
- Acceptable to have pagination at 50 entities (FR-037) without premature optimization

**VII. Transparency & User Approval**: ✅ N/A
- No AI-generated content in this feature
- All operations are manual user-driven CRUD
- AI approval workflows are Feature 017/018 scope

**Result**: ✅ ALL CHECKS PASS - No violations, no complexity deviations

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
frontend/
├── src/
│   ├── components/
│   │   ├── dashboard/                          # NEW: Dashboard components
│   │   │   ├── DashboardPage.tsx               # Main dashboard page container
│   │   │   ├── NPCSummaryWidget.tsx            # NPC category summary widget
│   │   │   ├── LocationExplorerWidget.tsx      # Location hierarchy explorer widget
│   │   │   ├── FactionPowerWidget.tsx          # Faction influence display widget
│   │   │   ├── QuestTrackerWidget.tsx          # Active quests summary widget
│   │   │   ├── SessionTimelineWidget.tsx       # Recent sessions chronology widget
│   │   │   ├── PlayerCharactersWidget.tsx      # Party roster widget
│   │   │   └── RecentActivityWidget.tsx        # Cross-category recent changes widget
│   │   ├── sidebar/                            # NEW: Navigation components
│   │   │   ├── SidebarNavigation.tsx           # Main sidebar container with 4-type hierarchy
│   │   │   ├── TypeSection.tsx                 # Collapsible section (SETTING/LIVING WORLD/CAMPAIGN/EXTENDED)
│   │   │   ├── CategoryLink.tsx                # Individual category navigation link
│   │   │   └── ViewModeToggle.tsx              # MODIFIED: DM/Player view toggle (reuse from Feature 004)
│   │   ├── categories/                         # NEW: Category-specific components (13 categories)
│   │   │   ├── landing/                        # Category landing page components
│   │   │   │   ├── CategoryLandingPage.tsx     # Generic landing page template
│   │   │   │   ├── StatisticsPanel.tsx         # Entity count, last modified stats
│   │   │   │   ├── RecentItemsList.tsx         # Recently modified entities list
│   │   │   │   └── SearchFilterBar.tsx         # Search input, filter dropdowns
│   │   │   ├── table/                          # Table view components
│   │   │   │   ├── CategoryTable.tsx           # Generic table view with TanStack Table v8
│   │   │   │   ├── TableRow.tsx                # Entity row with inline actions
│   │   │   │   ├── PaginationControls.tsx      # Page size, page navigation
│   │   │   │   ├── BulkActionsBar.tsx          # Multi-select operations (disabled for v1)
│   │   │   │   ├── TableColumnHeader.tsx       # Sortable column header
│   │   │   │   └── ViewModeButtons.tsx         # Table/List/Gallery/Board toggle (Gallery/Board disabled v1)
│   │   │   ├── forms/                          # Create/Edit form components
│   │   │   │   ├── CategoryCreateForm.tsx      # Generic entity creation form
│   │   │   │   ├── CategoryEditForm.tsx        # Generic entity edit form
│   │   │   │   ├── TextInput.tsx               # Text field input
│   │   │   │   ├── TextAreaInput.tsx           # Long text/description input
│   │   │   │   ├── SelectInput.tsx             # Dropdown select (enums, foreign keys)
│   │   │   │   ├── NumberInput.tsx             # Numeric field input
│   │   │   │   ├── DateInput.tsx               # Date picker input
│   │   │   │   ├── RelationshipInput.tsx       # Foreign key selector with autocomplete
│   │   │   │   ├── CustomFieldsInput.tsx       # Dynamic custom fields editor
│   │   │   │   └── InformationLevelInput.tsx   # Information level dropdown (reuse from Feature 004)
│   │   │   └── detail/                         # Entity detail page components
│   │   │       ├── CategoryDetailPage.tsx      # Generic entity detail view
│   │   │       ├── RelationshipLinks.tsx       # Foreign key relationship display
│   │   │       └── FieldDisplay.tsx            # Read-only field display with labels
│   │   └── common/                             # NEW: Shared UI components
│   │       ├── LoadingSpinner.tsx              # Loading state indicator
│   │       ├── SkeletonLoader.tsx              # Skeleton placeholder for loading tables
│   │       ├── EmptyState.tsx                  # No data placeholder
│   │       ├── ErrorBoundary.tsx               # React error boundary wrapper
│   │       └── ConfirmDialog.tsx               # Radix UI confirmation dialog
│   ├── pages/                                  # NEW: Top-level route pages
│   │   ├── DashboardPage.tsx                   # /dashboard route
│   │   ├── CategoryLandingPage.tsx             # /:category route
│   │   ├── CategoryTablePage.tsx               # /:category/table route
│   │   ├── CategoryDetailPage.tsx              # /:category/:id route
│   │   ├── CategoryCreatePage.tsx              # /:category/create route
│   │   └── CategoryEditPage.tsx                # /:category/:id/edit route
│   ├── services/                               # NEW: API client services
│   │   ├── apiClient.ts                        # MODIFIED: Axios instance with auth + view mode interceptors (extend from Feature 002/004)
│   │   ├── npcService.ts                       # NEW: NPC API calls (wraps Feature 014 endpoints)
│   │   ├── locationService.ts                  # NEW: Location API calls
│   │   ├── factionService.ts                   # NEW: Faction API calls
│   │   ├── sessionRecapService.ts              # NEW: Session Recap API calls
│   │   ├── questService.ts                     # NEW: Quest API calls
│   │   ├── playerCharacterService.ts           # NEW: Player Character API calls
│   │   ├── loreEntryService.ts                 # NEW: Lore Entry API calls
│   │   ├── worldRuleService.ts                 # NEW: World Rule API calls
│   │   ├── planarForceService.ts               # NEW: Planar Force API calls
│   │   ├── sessionPrepService.ts               # NEW: Session Prep API calls
│   │   ├── customMechanicService.ts            # NEW: Custom Mechanic API calls
│   │   ├── itemService.ts                      # NEW: Item API calls
│   │   └── creatureService.ts                  # NEW: Creature API calls
│   ├── hooks/                                  # NEW: Custom React hooks
│   │   ├── useCategory.ts                      # Generic hook for category CRUD operations
│   │   ├── usePagination.ts                    # Pagination state management hook
│   │   ├── useSorting.ts                       # Table sorting state hook
│   │   ├── useSearchFilter.ts                  # Search and filter state hook (debounced)
│   │   ├── useThematicLabels.ts                # Thematic naming lookup hook (13×4 mapping)
│   │   └── useSidebarState.ts                  # Sidebar collapse state with localStorage persistence
│   ├── contexts/                               # NEW: React Context providers
│   │   ├── DashboardContext.tsx                # Dashboard widget data provider
│   │   └── SidebarContext.tsx                  # Sidebar navigation state provider
│   ├── utils/                                  # NEW: Helper functions
│   │   ├── thematicNames.ts                    # Thematic label mapping (13 categories × 4 themes = 52 labels)
│   │   ├── relationshipHelpers.ts              # Foreign key relationship traversal utilities
│   │   └── validationSchemas.ts                # 13 Zod validation schemas (one per category)
│   └── routes/                                 # MODIFIED: Add new routes to existing router config
│       └── AppRoutes.tsx                       # Add dashboard + 13 category routes
└── tests/
    ├── components/                             # NEW: Component unit tests
    │   ├── dashboard/                          # Dashboard widget tests
    │   │   ├── DashboardPage.test.tsx
    │   │   ├── NPCSummaryWidget.test.tsx
    │   │   └── [6 more widget test files]
    │   ├── sidebar/                            # Sidebar component tests
    │   │   ├── SidebarNavigation.test.tsx
    │   │   └── TypeSection.test.tsx
    │   ├── categories/                         # Category component tests
    │   │   ├── CategoryTable.test.tsx
    │   │   ├── CategoryCreateForm.test.tsx
    │   │   └── CategoryDetailPage.test.tsx
    │   └── common/                             # Common component tests
    │       └── ConfirmDialog.test.tsx
    └── e2e/                                    # NEW: Playwright E2E tests
        ├── dashboard.spec.ts                   # Dashboard widget display test
        ├── sidebar-navigation.spec.ts          # Sidebar navigation test
        ├── category-crud.spec.ts               # Create/Edit/Delete entity test
        ├── table-operations.spec.ts            # Table sorting, pagination, search test
        ├── thematic-naming.spec.ts             # Thematic label display test
        ├── information-filtering.spec.ts       # DM vs Player view filtering test
        └── relationship-display.spec.ts        # Foreign key relationship test
```

**Structure Decision**: Web application structure (frontend-only for this feature). Backend exists from Feature 014 and is not modified. All new files in `frontend/` directory. This feature adds:

- **40+ React components** across 5 architectural layers (dashboard, sidebar, categories, pages, common)
- **13 API service modules** (one per category, wrapping Feature 014 REST endpoints)
- **6 custom React hooks** for state management (pagination, sorting, search, thematic labels, sidebar)
- **2 React Context providers** for global state (dashboard, sidebar)
- **13 Zod validation schemas** reusing Feature 014 database schemas
- **15+ test files** (component unit tests + E2E tests)

Frontend integration with Feature 014's backend via Axios API client with auth and view mode interceptors

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
- Generate tasks from Phase 1 design docs (data-model.md, contracts/component-contracts.md, quickstart.md)
- Map each component from contracts → implementation task + test task
- Map each hook from data-model.md → implementation task + test task
- Map each acceptance scenario from quickstart.md → E2E test task
- Group tasks by architectural layer (foundation → UI)

**Task Categories** (from data-model.md and contracts):
1. **Foundation Layer** [P]: Contexts (2), Utilities (3), Validation Schemas (1 file with 13 schemas)
2. **API Services Layer** [P]: 13 category service modules wrapping Feature 014 REST endpoints
3. **Custom Hooks Layer**: 6 hooks (depend on contexts and services, some [P])
4. **Common Components** [P]: 5 shared UI components (LoadingSpinner, SkeletonLoader, EmptyState, ErrorBoundary, ConfirmDialog)
5. **Form Input Components** [P]: 10 input field components (TextInput, TextAreaInput, SelectInput, NumberInput, DateInput, RelationshipInput, CustomFieldsInput, InformationLevelInput, etc.)
6. **Category Components**: Landing (4), Table (7), Forms (2), Detail (3) - depend on common components and hooks
7. **Dashboard Widgets** [P]: 7 widget components pulling from API services
8. **Sidebar Components**: 4 navigation components (depend on SidebarContext)
9. **Top-Level Pages**: 6 route pages (depend on all lower layers)
10. **Route Configuration**: Update AppRoutes.tsx with dashboard + 13 category routes
11. **Component Tests** [P]: Test files for each component (~25 test files)
12. **E2E Tests**: 11 scenarios from quickstart.md (7 E2E test files)

**Ordering Strategy**:
- **Dependency-First Order**: Foundation → Services → Hooks → Common → Inputs → Category → Dashboard → Sidebar → Pages → Routes → Tests
- **Within Each Layer**: Mark independent components/hooks as [P] for parallel execution
- **Testing Strategy**: Component tests after implementation, E2E tests after all implementations complete
- **No TDD for UI components**: Frontend component implementation comes before tests (different from backend API TDD pattern)

**Dependency Examples**:
- `useCategory` hook depends on `apiClient` and category services → services must be implemented first
- `CategoryTable` depends on `useCategory`, `usePagination`, `useSorting` → hooks must be implemented first
- `CategoryCreateForm` depends on `TextInput`, `SelectInput`, etc. → input components must be implemented first
- Dashboard widgets depend on API services and hooks → services/hooks must be implemented first
- E2E tests depend on complete implementation → run last

**Estimated Output**: 55-65 numbered, ordered tasks in tasks.md
- ~6 foundation tasks (contexts, utilities, schemas)
- ~13 API service tasks
- ~6 hook tasks
- ~40 component implementation tasks (5 common + 10 inputs + 16 category + 7 dashboard + 4 sidebar + 6 pages + route config)
- ~25 component test tasks
- ~7 E2E test tasks

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
- [x] Initial Constitution Check: PASS - ✅ All 7 principles validated
- [x] Post-Design Constitution Check: PASS - ✅ No violations introduced
- [x] All NEEDS CLARIFICATION resolved - ✅ No unknowns remain
- [x] Complexity deviations documented - ✅ No deviations (Complexity Tracking table empty)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
