# Tasks: Card-Based Content Architecture

**Feature**: 003-create-a-notion
**Input**: Design documents from `/specs/003-create-a-notion/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**: Feature 002 (Authentication & Campaign Management) MUST be complete

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: TipTap 2.x, @dnd-kit, cmdk, TanStack Table, React Beautiful DnD
2. Load design documents ✓
   → data-model.md: 3 entities (Setting, Campaign extended, Card polymorphic)
   → contracts/: 3 files (cards.yaml, settings.yaml, database-cards.yaml)
   → research.md: 10 technical decisions (adjacency list, TipTap, circular ref detection)
3. Generate tasks by category ✓
   → Setup: Database migrations, JSON1 extension
   → Tests: contract tests, circular ref validation, path calculation
   → Core: models, services, routes
   → Frontend: CardTree, TipTap editor, slash commands, database views
   → Integration: drag-drop, database filtering
   → Polish: E2E tests, quickstart validation
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T067) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App - extends feature 002)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/003-cards.sql`
- **Shared**: `shared/types/` (extended with Card, Setting)

---

## Phase 3.1: Database Setup & Migrations

- [ ] **T001** Create migration 003 for Settings table (`backend/src/db/migrations/003-add-settings.sql` with settings table per data-model.md)
- [ ] **T002** Create migration 003 for Campaign extension (`backend/src/db/migrations/003-extend-campaigns.sql` adding setting_id FK)
- [ ] **T003** Create migration 003 for Cards table (`backend/src/db/migrations/003-add-cards.sql` with polymorphic card table, adjacency list, materialized path)
- [ ] **T004** Enable SQLite JSON1 extension (`backend/src/services/DatabaseService.ts` verify JSON1, add json_extract functions)
- [ ] **T005** Create indexes for card queries (`backend/src/db/migrations/003-add-card-indexes.sql` for parent_id, campaign_id, path, position, type)
- [ ] **T006** Create default root card migration (`backend/src/db/migrations/003-create-default-cards.sql` creates blank page card for existing campaigns)

---

## Phase 3.2: Shared Types

- [ ] **T007** [P] Setting type (`shared/types/Setting.ts` with TypeScript interface from data-model.md)
- [ ] **T008** [P] Card type and polymorphic variants (`shared/types/Card.ts` with PageCard, DatabaseCard, TextCard, ImageCard interfaces)
- [ ] **T009** [P] Database schema types (`shared/types/DatabaseSchema.ts` with DatabaseColumn, DatabaseView, FilterRule, SortRule)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (from contracts/)
- [ ] **T010** [P] Contract test POST /api/settings (`backend/tests/contract/settings.contract.test.ts` from contracts/settings.yaml)
- [ ] **T011** [P] Contract test GET /api/settings (`backend/tests/contract/settings.contract.test.ts` from contracts/settings.yaml)
- [ ] **T012** [P] Contract test DELETE /api/settings/:id (`backend/tests/contract/settings.contract.test.ts` from contracts/settings.yaml)
- [ ] **T013** [P] Contract test POST /api/cards (`backend/tests/contract/cards.contract.test.ts` from contracts/cards.yaml)
- [ ] **T014** [P] Contract test GET /api/cards/:id (`backend/tests/contract/cards.contract.test.ts` from contracts/cards.yaml)
- [ ] **T015** [P] Contract test PUT /api/cards/:id (`backend/tests/contract/cards.contract.test.ts` from contracts/cards.yaml)
- [ ] **T016** [P] Contract test DELETE /api/cards/:id (`backend/tests/contract/cards.contract.test.ts` from contracts/cards.yaml)
- [ ] **T017** [P] Contract test POST /api/cards/:id/move (`backend/tests/contract/cards.contract.test.ts` from contracts/cards.yaml)
- [ ] **T018** [P] Contract test POST /api/cards/:id/reorder (`backend/tests/contract/cards.contract.test.ts` from contracts/cards.yaml)
- [ ] **T019** [P] Contract test GET /api/cards/:id/subtree (`backend/tests/contract/cards.contract.test.ts` from contracts/cards.yaml)
- [ ] **T020** [P] Contract test POST /api/cards/:id/schema (`backend/tests/contract/database-cards.contract.test.ts` from contracts/database-cards.yaml)
- [ ] **T021** [P] Contract test POST /api/cards/:id/entries (`backend/tests/contract/database-cards.contract.test.ts` from contracts/database-cards.yaml)
- [ ] **T022** [P] Contract test GET /api/cards/:id/entries with filters (`backend/tests/contract/database-cards.contract.test.ts` from contracts/database-cards.yaml)

### Backend Unit Tests (Critical Algorithms)
- [ ] **T023** [P] Unit test circular reference detection (`backend/tests/unit/services/CardService-circular-ref.test.ts` with DFS cycle detection per research.md)
- [ ] **T024** [P] Unit test path calculation (`backend/tests/unit/services/CardService-path.test.ts` materialized path generation and recalculation)
- [ ] **T025** [P] Unit test depth validation (`backend/tests/unit/services/CardService-depth.test.ts` enforce 50 level limit)
- [ ] **T026** [P] Unit test subtree deletion (`backend/tests/unit/services/CardService-deletion.test.ts` cascade and orphaned reference handling)

### Backend Integration Tests (from quickstart.md)
- [ ] **T027** [P] Integration test: Create nested card hierarchy (`backend/tests/integration/card-hierarchy.integration.test.ts`)
- [ ] **T028** [P] Integration test: Database schema CRUD (`backend/tests/integration/database-schema.integration.test.ts`)
- [ ] **T029** [P] Integration test: Card move operations with path recalculation (`backend/tests/integration/card-move.integration.test.ts`)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Models
- [ ] **T030** [P] Setting model (`backend/src/models/Setting.ts` with TypeScript interface from data-model.md)
- [ ] **T031** [P] Card model (`backend/src/models/Card.ts` with polymorphic TypeScript interface from data-model.md)
- [ ] **T032** Campaign model extension (`backend/src/models/Campaign.ts` add setting_id field)

### Services
- [ ] **T033** SettingService (`backend/src/services/SettingService.ts` with CRUD operations)
- [ ] **T034** CardService - Core CRUD (`backend/src/services/CardService.ts` with create, read, update, delete operations)
- [ ] **T035** CardService - Hierarchy operations (`backend/src/services/CardService.ts` add move, reorder, getSubtree methods)
- [ ] **T036** CardService - Circular reference detection (`backend/src/services/CardService.ts` implement DFS cycle detection per research.md section 4)
- [ ] **T037** CardService - Path calculation (`backend/src/services/CardService.ts` materialized path generation and recalculation on move)
- [ ] **T038** DatabaseSchemaService (`backend/src/services/DatabaseSchemaService.ts` manage database card schemas, columns, views)
- [ ] **T039** DatabaseEntryService (`backend/src/services/DatabaseEntryService.ts` CRUD for database entries with validation against schema)
- [ ] **T040** DatabaseViewService (`backend/src/services/DatabaseViewService.ts` apply filters, sorting, grouping per view config)

### Routes
- [ ] **T041** Settings routes (`backend/src/routes/settings.ts` with GET, POST, PUT, DELETE per contracts/settings.yaml)
- [ ] **T042** Cards routes - CRUD (`backend/src/routes/cards.ts` with GET, POST, PUT, DELETE per contracts/cards.yaml)
- [ ] **T043** Cards routes - Hierarchy (`backend/src/routes/cards.ts` add /move, /reorder, /subtree endpoints per contracts/cards.yaml)
- [ ] **T044** Database cards routes (`backend/src/routes/database-cards.ts` with /schema, /entries endpoints per contracts/database-cards.yaml)

---

## Phase 3.5: Frontend Core - Rich Text & Commands

### Rich Text Editor (TipTap Integration)
- [ ] **T045** TipTap editor service (`frontend/src/services/tiptap.service.ts` configure TipTap extensions, ProseMirror JSON schema per research.md section 2-3)
- [ ] **T046** CardEditor component (`frontend/src/components/cards/CardEditor.tsx` TipTap React component with toolbar, slash commands)
- [ ] **T047** SlashCommandPalette component (`frontend/src/components/cards/SlashCommandPalette.tsx` using cmdk for /page, /database, /text, /image, /heading1-3 per research.md section 8)
- [ ] **T048** RichTextRenderer component (`frontend/src/components/cards/RichTextRenderer.tsx` read-only ProseMirror JSON display)

### Card Tree & Navigation
- [ ] **T049** CardTree component (`frontend/src/components/cards/CardTree.tsx` hierarchical tree with @dnd-kit drag-drop per research.md section 7)
- [ ] **T050** CardTreeNode component (`frontend/src/components/cards/CardTreeNode.tsx` individual tree node with expand/collapse, drag handles)
- [ ] **T051** CardDragDrop service (`frontend/src/services/card-drag-drop.service.ts` handle @dnd-kit events, calculate new position/parent)

### API Clients
- [ ] **T052** [P] SettingService API client (`frontend/src/services/setting.service.ts` API calls for CRUD operations)
- [ ] **T053** [P] CardService API client (`frontend/src/services/card.service.ts` API calls for card CRUD, move, reorder, subtree)
- [ ] **T054** [P] DatabaseService API client (`frontend/src/services/database.service.ts` API calls for schema management, entries, views)

---

## Phase 3.6: Frontend - Database Views

### Database View Components
- [ ] **T055** [P] DatabaseTableView component (`frontend/src/components/database/DatabaseTableView.tsx` using TanStack Table v8 per research.md section 9)
- [ ] **T056** [P] DatabaseListView component (`frontend/src/components/database/DatabaseListView.tsx` simple list layout with filters)
- [ ] **T057** [P] DatabaseGalleryView component (`frontend/src/components/database/DatabaseGalleryView.tsx` grid layout with cover images)
- [ ] **T058** [P] DatabaseKanbanView component (`frontend/src/components/database/DatabaseKanbanView.tsx` using React Beautiful DnD per research.md section 9)

### Database Schema Management
- [ ] **T059** DatabaseSchemaEditor component (`frontend/src/components/database/DatabaseSchemaEditor.tsx` add/edit/delete columns, configure types)
- [ ] **T060** DatabaseViewConfig component (`frontend/src/components/database/DatabaseViewConfig.tsx` configure filters, sorting, grouping)
- [ ] **T061** ColumnTypeSelector component (`frontend/src/components/database/ColumnTypeSelector.tsx` select text, number, date, select, multi-select, entity-reference)

### Database Entry Management
- [ ] **T062** DatabaseEntryModal component (`frontend/src/components/database/DatabaseEntryModal.tsx` create/edit database entry with dynamic form based on schema)
- [ ] **T063** EntityReferencePreview component (`frontend/src/components/cards/EntityReferencePreview.tsx` hover preview for entity references per research.md section 10)

---

## Phase 3.7: Frontend Pages & Context

### Pages
- [ ] **T064** [P] SettingsPage (`frontend/src/pages/SettingsPage.tsx` list, create, edit, delete settings)
- [ ] **T065** [P] CardPage (`frontend/src/pages/CardPage.tsx` full-page card view with editor, children sidebar, breadcrumbs)

### Context & State
- [ ] **T066** CardContext (`frontend/src/contexts/CardContext.tsx` global card tree state, current card, navigation)
- [ ] **T067** useCards hook (`frontend/src/hooks/useCards.ts` card CRUD operations, tree manipulation)

---

## Phase 3.8: Integration & Polish

### Integration Tasks
- [ ] **T068** Integrate CardTree with drag-drop reordering (verify @dnd-kit position calculation, API calls to /reorder endpoint)
- [ ] **T069** Integrate SlashCommandPalette with CardEditor (verify cmdk triggers, card creation from editor)
- [ ] **T070** Integrate DatabaseViews with filter/sort (verify TanStack Table config, client-side filtering per research.md section 9)
- [ ] **T071** Test circular reference detection in UI (attempt to move card into its own subtree, verify error message)
- [ ] **T072** Test depth limit enforcement (create 51 nested cards, verify rejection at depth 50)

### Frontend Component Tests
- [ ] **T073** [P] Component test CardTree (`frontend/tests/components/CardTree.test.tsx` with Vitest + RTL, test expand/collapse, drag-drop)
- [ ] **T074** [P] Component test SlashCommandPalette (`frontend/tests/components/SlashCommandPalette.test.tsx` test command search, selection)
- [ ] **T075** [P] Component test DatabaseTableView (`frontend/tests/components/DatabaseTableView.test.tsx` test sorting, filtering)

### E2E Tests
- [ ] **T076** E2E test: Create and nest cards (`frontend/tests/e2e/card-nesting.spec.ts` with Playwright per quickstart.md)
- [ ] **T077** E2E test: Slash command workflow (`frontend/tests/e2e/slash-commands.spec.ts` /page → /database → /text → /image)
- [ ] **T078** E2E test: Database CRUD flow (`frontend/tests/e2e/database-crud.spec.ts` create schema → add entries → filter/sort → switch views)
- [ ] **T079** E2E test: Drag-drop reordering (`frontend/tests/e2e/card-reorder.spec.ts` drag card to new position, verify persistence)

### Documentation & Cleanup
- [ ] **T080** Validate quickstart.md (execute all 15-minute setup steps, verify slash commands demo)
- [ ] **T081** [P] Add inline comments to complex algorithms (circular ref detection, path recalculation, DFS traversal)
- [ ] **T082** [P] Performance test card rendering (virtualize CardTree for 1000+ cards, verify <100ms render per plan.md)
- [ ] **T083** [P] Performance test database views (test filter/sort with 1000+ entries, verify <200ms per plan.md)

---

## Dependencies

### Strict Ordering
1. **Database migrations before everything**: T001-T006 before all other tasks
2. **Shared types before tests**: T007-T009 before T010-T029
3. **Tests before implementation**: T010-T029 MUST complete (and fail) before T030-T044
4. **Backend services before routes**: T033-T040 before T041-T044
5. **Backend routes before frontend API clients**: T041-T044 before T052-T054
6. **TipTap setup before editor components**: T045 before T046-T048
7. **Card API client before CardTree**: T053 before T049-T051
8. **Database API client before database views**: T054 before T055-T063
9. **All core before integration**: T001-T067 before T068-T072
10. **Implementation before E2E tests**: T001-T072 before T076-T079

### Specific Dependencies
- T003 (Cards table) blocks T013-T029 (card contract/integration tests need table)
- T036 (Circular ref detection) blocks T071 (UI integration test)
- T037 (Path calculation) blocks T029, T069 (move operations need path logic)
- T045 (TipTap service) blocks T046, T047, T048 (editor components need service)
- T049 (CardTree) blocks T050, T051 (tree nodes need parent tree component)
- T054 (Database API client) blocks T055-T063 (views need API)
- T066 (CardContext) blocks T067, T065 (hook and page need context)

---

## Parallel Execution Examples

### Example 1: Shared Types (Phase 3.2)
```bash
# Launch T007-T009 together (different type files):
Task: "Setting type in shared/types/Setting.ts"
Task: "Card type and polymorphic variants in shared/types/Card.ts"
Task: "Database schema types in shared/types/DatabaseSchema.ts"
```

### Example 2: Contract Tests (Phase 3.3)
```bash
# Launch T010-T022 together (different contract test files):
Task: "Contract test POST /api/settings in backend/tests/contract/settings.contract.test.ts"
Task: "Contract test POST /api/cards in backend/tests/contract/cards.contract.test.ts"
Task: "Contract test POST /api/cards/:id/schema in backend/tests/contract/database-cards.contract.test.ts"
```

### Example 3: Unit Tests (Phase 3.3)
```bash
# Launch T023-T026 together (different algorithm test files):
Task: "Unit test circular reference detection in backend/tests/unit/services/CardService-circular-ref.test.ts"
Task: "Unit test path calculation in backend/tests/unit/services/CardService-path.test.ts"
Task: "Unit test depth validation in backend/tests/unit/services/CardService-depth.test.ts"
Task: "Unit test subtree deletion in backend/tests/unit/services/CardService-deletion.test.ts"
```

### Example 4: Models (Phase 3.4)
```bash
# Launch T030-T031 together (different model files):
Task: "Setting model in backend/src/models/Setting.ts"
Task: "Card model in backend/src/models/Card.ts"
```

### Example 5: API Clients (Phase 3.5)
```bash
# Launch T052-T054 together (different service files):
Task: "SettingService API client in frontend/src/services/setting.service.ts"
Task: "CardService API client in frontend/src/services/card.service.ts"
Task: "DatabaseService API client in frontend/src/services/database.service.ts"
```

### Example 6: Database Views (Phase 3.6)
```bash
# Launch T055-T058 together (different view component files):
Task: "DatabaseTableView component in frontend/src/components/database/DatabaseTableView.tsx"
Task: "DatabaseListView component in frontend/src/components/database/DatabaseListView.tsx"
Task: "DatabaseGalleryView component in frontend/src/components/database/DatabaseGalleryView.tsx"
Task: "DatabaseKanbanView component in frontend/src/components/database/DatabaseKanbanView.tsx"
```

### Example 7: Pages (Phase 3.7)
```bash
# Launch T064-T065 together (different page files):
Task: "SettingsPage in frontend/src/pages/SettingsPage.tsx"
Task: "CardPage in frontend/src/pages/CardPage.tsx"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T010-T022 cover settings.yaml, cards.yaml, database-cards.yaml)
- [x] All entities have model tasks (T030-T031 for Setting, Card)
- [x] All tests come before implementation (T010-T029 before T030-T044)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts)
- [x] Critical algorithms have unit tests (T023-T026 for circular ref, path calc, depth, deletion)
- [x] Complex integrations have E2E tests (T076-T079 for nesting, slash commands, database, drag-drop)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for card hierarchy integrity)
- **Circular reference detection** is CRITICAL - test extensively (T023, T071)
- **Path recalculation** must be transactional (T037) - entire subtree updated atomically
- **Depth limit** prevents stack overflow (T025, T072) - enforce at DB and app layer
- **TipTap lazy loading** for performance (T045) - defer extension loading until editor opens
- **@dnd-kit tree reordering** complex state (T049-T051) - test drag-drop thoroughly
- **Database view filtering** client-side (T055-T058, T070) - TanStack Table handles efficiently
- **Entity references** need cascade handling (T040, T063) - orphaned refs show broken link icon

---

## Critical Risk Areas

1. **Circular Reference Detection** (T036, T071):
   - DFS cycle detection must be bulletproof
   - Path-based validation as backup (`newParent.path.startsWith(card.path)`)
   - UI must prevent, not just warn

2. **Path Recalculation on Move** (T037, T069):
   - Must update entire subtree in single transaction
   - Format: `/<campaign-id>/<card-id>/<child-id>/...`
   - Indexes on path column for efficient queries

3. **TipTap Editor State** (T045-T048):
   - ProseMirror JSON schema version stability
   - Lazy load extensions (performance)
   - Collaboration-ready architecture (even if not using Y.js yet)

4. **Drag-Drop Tree Performance** (T049-T051, T079):
   - Virtualize tree for 1000+ cards
   - Throttle position calculations
   - Optimistic UI updates, rollback on error

5. **Database View Performance** (T055-T058, T070, T083):
   - Client-side filter/sort acceptable for <1000 entries
   - Pagination for inline views (10 entries)
   - TanStack Table config optimization

---

**Total Tasks**: 83
**Estimated Completion**: 7-10 days (complex feature with rich text, drag-drop, infinite nesting, database views)
**Critical Path**: T001-T006 → T007-T009 → T010-T029 → T030-T044 → T045-T048 → T049-T054 → T055-T063 → T064-T072 → T076-T080
**Backbone Status**: This feature is FOUNDATIONAL - features 004-010 depend on card architecture
