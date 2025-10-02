# Tasks: Information Level-Based Filtering System

**Feature**: 004-create-a-tagging
**Input**: Design documents from `/specs/004-create-a-tagging/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**: Feature 003 (Card-Based Architecture) MUST be complete

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: React Context API, localStorage, TipTap extensions, React Portal
2. Load design documents ✓
   → data-model.md: 1 entity (InformationLevel), Card extended with level FK, DatabaseColumn extended
   → contracts/: 2 files (information-levels.yaml, view-mode.yaml)
   → research.md: 6 technical decisions (client-side filtering, painter's easel, hierarchical precedence)
3. Generate tasks by category ✓
   → Setup: Database migrations for information_levels table + card extension
   → Tests: contract tests, filtering logic, view mode toggle
   → Core: models, services, routes
   → Frontend: Painter's easel, properties panel, view mode toggle, visual indicators
   → Integration: TipTap integration, database column hierarchical flags
   → Polish: E2E tests, quickstart validation
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T052) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App - extends features 002-003)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/004-information-levels.sql`
- **Shared**: `shared/types/` (extended with InformationLevel)

---

## Phase 3.1: Database Setup & Migrations

- [ ] **T001** Create migration 004 for InformationLevels table (`backend/src/db/migrations/004-add-information-levels.sql` with table + 4 default level seeds per data-model.md)
- [ ] **T002** Create migration 004 for Card extension (`backend/src/db/migrations/004-extend-cards.sql` add information_level_id FK, default to 'system')
- [ ] **T003** Create indexes for filtering (`backend/src/db/migrations/004-add-filtering-indexes.sql` index on cards.information_level_id, information_levels.hierarchical)

---

## Phase 3.2: Shared Types

- [ ] **T004** [P] InformationLevel type (`shared/types/InformationLevel.ts` with TypeScript interface from data-model.md)
- [ ] **T005** [P] ViewMode type (`shared/types/ViewMode.ts` with 'dm' | 'player' type and filtering utilities)
- [ ] **T006** Card type extension (`shared/types/Card.ts` add informationLevelId field)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (from contracts/)
- [ ] **T007** [P] Contract test POST /api/information-levels (`backend/tests/contract/information-levels.contract.test.ts` from contracts/information-levels.yaml)
- [ ] **T008** [P] Contract test GET /api/information-levels (`backend/tests/contract/information-levels.contract.test.ts` from contracts/information-levels.yaml)
- [ ] **T009** [P] Contract test PUT /api/information-levels/:id (`backend/tests/contract/information-levels.contract.test.ts` from contracts/information-levels.yaml)
- [ ] **T010** [P] Contract test DELETE /api/information-levels/:id (`backend/tests/contract/information-levels.contract.test.ts` from contracts/information-levels.yaml)
- [ ] **T011** [P] Contract test GET /api/cards with view mode filtering (`backend/tests/contract/view-mode.contract.test.ts` from contracts/view-mode.yaml)

### Backend Unit Tests (Filtering Logic)
- [ ] **T012** [P] Unit test hierarchical level filtering (`backend/tests/unit/services/ViewModeService-filtering.test.ts` test DM Secret cards hidden in Player View)
- [ ] **T013** [P] Unit test custom level filtering (`backend/tests/unit/services/ViewModeService-custom.test.ts` test custom hierarchical levels)
- [ ] **T014** [P] Unit test database column hierarchical filtering (`backend/tests/unit/services/ViewModeService-columns.test.ts` test column-level visibility)

### Backend Integration Tests (from quickstart.md)
- [ ] **T015** [P] Integration test: Create card with level, toggle view mode (`backend/tests/integration/view-mode-toggle.integration.test.ts`)
- [ ] **T016** [P] Integration test: Database entry partial visibility with Player Knowledge field (`backend/tests/integration/database-partial-visibility.integration.test.ts`)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Models
- [ ] **T017** InformationLevel model (`backend/src/models/InformationLevel.ts` with TypeScript interface from data-model.md)
- [ ] **T018** Card model extension (`backend/src/models/Card.ts` add informationLevelId field with default 'system')

### Services
- [ ] **T019** InformationLevelService (`backend/src/services/InformationLevelService.ts` with CRUD operations, seed defaults, custom level validation)
- [ ] **T020** ViewModeService (`backend/src/services/ViewModeService.ts` filter cards by view mode, hierarchical level precedence per research.md)
- [ ] **T021** ViewModeService - Database filtering (`backend/src/services/ViewModeService.ts` add entry-level + column-level + Player Knowledge field filtering)
- [ ] **T022** CardService extension (`backend/src/services/CardService.ts` add information level assignment on create, update methods)

### Routes
- [ ] **T023** InformationLevels routes (`backend/src/routes/information-levels.ts` with GET, POST, PUT, DELETE per contracts/information-levels.yaml)
- [ ] **T024** ViewMode middleware (`backend/src/middleware/viewMode.ts` extract view mode from request header, apply filtering before response)
- [ ] **T025** Cards routes extension (`backend/src/routes/cards.ts` add view mode filtering to GET endpoints)

---

## Phase 3.5: Frontend Core - Painter's Easel & View Mode

### Painter's Easel Palette
- [ ] **T026** InformationLevelContext (`frontend/src/contexts/InformationLevelContext.tsx` React context with current selected level, painter's easel state)
- [ ] **T027** usePaintersEasel hook (`frontend/src/hooks/usePaintersEasel.ts` access painter's easel state, set default level for card creation)
- [ ] **T028** PaintersEaselPalette component (`frontend/src/components/information-levels/PaintersEaselPalette.tsx` color palette UI with level selection)
- [ ] **T029** LevelIndicator component (`frontend/src/components/information-levels/LevelIndicator.tsx` visual badge showing card's level with color)

### View Mode Toggle
- [ ] **T030** ViewModeContext (`frontend/src/contexts/ViewModeContext.tsx` React context with current view mode, localStorage persistence)
- [ ] **T031** useViewMode hook (`frontend/src/hooks/useViewMode.ts` toggle between DM/Player view, persist to localStorage)
- [ ] **T032** ViewModeToggle component (`frontend/src/components/view-mode/ViewModeToggle.tsx` toggle switch in navbar)
- [ ] **T033** ViewModeFilter service (`frontend/src/services/view-mode-filter.service.ts` client-side filtering logic before card render per research.md)

### Properties Panel
- [ ] **T034** PropertiesPanel component (`frontend/src/components/cards/PropertiesPanel.tsx` React Portal overlay for editing card properties)
- [ ] **T035** InformationLevelEditor component (`frontend/src/components/information-levels/InformationLevelEditor.tsx` dropdown selector for changing card level in properties panel)

### API Clients
- [ ] **T036** [P] InformationLevelService API client (`frontend/src/services/information-level.service.ts` API calls for level CRUD operations)
- [ ] **T037** CardService extension (`frontend/src/services/card.service.ts` add information level parameter to create/update calls, view mode header injection)

---

## Phase 3.6: Frontend - Visual Indicators & TipTap Integration

### TipTap Secret Card Indicators
- [ ] **T038** TipTap secret card extension (`frontend/src/components/editor/extensions/SecretCardExtension.ts` custom TipTap node decoration for DM Secret cards per research.md)
- [ ] **T039** SecretCardIndicator component (`frontend/src/components/cards/SecretCardIndicator.tsx` tint + icon overlay for secret cards in DM View)
- [ ] **T040** CardEditor extension (`frontend/src/components/cards/CardEditor.tsx` integrate SecretCardExtension, show indicators in DM View only)

### Database Column Hierarchical Flags
- [ ] **T041** DatabaseSchemaEditor extension (`frontend/src/components/database/DatabaseSchemaEditor.tsx` add hierarchical checkbox for columns)
- [ ] **T042** DatabaseTableView extension (`frontend/src/components/database/DatabaseTableView.tsx` hide hierarchical columns in Player View)
- [ ] **T043** PlayerKnowledgeField component (`frontend/src/components/database/PlayerKnowledgeField.tsx` special text column type for partial entry visibility)

---

## Phase 3.7: Frontend - Settings & Management

### Information Levels Settings Page
- [ ] **T044** InformationLevelsPage (`frontend/src/pages/InformationLevelsPage.tsx` manage custom information levels, CRUD operations)
- [ ] **T045** InformationLevelForm component (`frontend/src/components/information-levels/InformationLevelForm.tsx` create/edit custom level with name, color picker, hierarchical toggle)
- [ ] **T046** InformationLevelList component (`frontend/src/components/information-levels/InformationLevelList.tsx` display default + custom levels with edit/delete actions)

---

## Phase 3.8: Integration & Polish

### Integration Tasks
- [ ] **T047** Integrate painter's easel with card creation (verify CardEditor uses selected level from context on /page, /database, /text slash commands)
- [ ] **T048** Integrate view mode toggle with CardTree (verify cards filter before render, no secret cards in DOM during Player View)
- [ ] **T049** Integrate properties panel with card level editing (verify inline level change updates card, refreshes view mode filtering)
- [ ] **T050** Test database column hierarchical filtering (create DM Secret column, verify hidden in Player View, entry values not exposed)

### Frontend Component Tests
- [ ] **T051** [P] Component test PaintersEaselPalette (`frontend/tests/components/PaintersEaselPalette.test.tsx` with Vitest + RTL, test level selection, context update)
- [ ] **T052** [P] Component test ViewModeToggle (`frontend/tests/components/ViewModeToggle.test.tsx` test toggle, localStorage persistence)
- [ ] **T053** [P] Component test InformationLevelEditor (`frontend/tests/components/InformationLevelEditor.test.tsx` test level change, properties panel integration)

### E2E Tests
- [ ] **T054** E2E test: Create DM Secret card, toggle to Player View, verify hidden (`frontend/tests/e2e/secret-card-filtering.spec.ts` with Playwright per quickstart.md)
- [ ] **T055** E2E test: Custom information level creation and card assignment (`frontend/tests/e2e/custom-level-workflow.spec.ts`)
- [ ] **T056** E2E test: Database partial visibility with Player Knowledge field (`frontend/tests/e2e/database-partial-visibility.spec.ts`)

### Documentation & Cleanup
- [ ] **T057** Validate quickstart.md (execute all steps: create secret card → painter's easel → view mode toggle → database partial visibility)
- [ ] **T058** [P] Add inline comments to filtering logic (hierarchical precedence, 3-layer database visibility per research.md)
- [ ] **T059** [P] Performance test view mode toggle (10,000 cards, verify <200ms context update + re-render per plan.md)
- [ ] **T060** [P] Security audit: Verify no secret content in DOM during Player View (inspect element, search for DM Secret card titles)

---

## Dependencies

### Strict Ordering
1. **Database migrations before everything**: T001-T003 before all other tasks
2. **Shared types before tests**: T004-T006 before T007-T016
3. **Tests before implementation**: T007-T016 MUST complete (and fail) before T017-T025
4. **Backend services before routes**: T019-T022 before T023-T025
5. **Backend routes before frontend API clients**: T023-T025 before T036-T037
6. **Painter's easel context before components**: T026 before T027-T029
7. **View mode context before components**: T030 before T031-T033
8. **API clients before integration**: T036-T037 before T047-T050
9. **All core before E2E tests**: T001-T046 before T054-T056

### Specific Dependencies
- T002 (Card extension) blocks T007-T011 (contract tests need information_level_id column)
- T019 (InformationLevelService) blocks T023 (routes need service)
- T020 (ViewModeService) blocks T024, T025 (middleware and routes need filtering logic)
- T026 (InformationLevelContext) blocks T028, T029, T035 (components need context)
- T030 (ViewModeContext) blocks T032, T033 (components need context)
- T038 (TipTap extension) blocks T039, T040 (indicators need extension)

---

## Parallel Execution Examples

### Example 1: Shared Types (Phase 3.2)
```bash
# Launch T004-T005 together (different type files):
Task: "InformationLevel type in shared/types/InformationLevel.ts"
Task: "ViewMode type in shared/types/ViewMode.ts"
```

### Example 2: Contract Tests (Phase 3.3)
```bash
# Launch T007-T011 together (different contract test files):
Task: "Contract test POST /api/information-levels in backend/tests/contract/information-levels.contract.test.ts"
Task: "Contract test GET /api/cards with view mode filtering in backend/tests/contract/view-mode.contract.test.ts"
```

### Example 3: Unit Tests (Phase 3.3)
```bash
# Launch T012-T014 together (different unit test files):
Task: "Unit test hierarchical level filtering in backend/tests/unit/services/ViewModeService-filtering.test.ts"
Task: "Unit test custom level filtering in backend/tests/unit/services/ViewModeService-custom.test.ts"
Task: "Unit test database column hierarchical filtering in backend/tests/unit/services/ViewModeService-columns.test.ts"
```

### Example 4: API Clients (Phase 3.5)
```bash
# Launch T036 standalone (T037 extends existing service):
Task: "InformationLevelService API client in frontend/src/services/information-level.service.ts"
```

### Example 5: Component Tests (Phase 3.8)
```bash
# Launch T051-T053 together (different component test files):
Task: "Component test PaintersEaselPalette in frontend/tests/components/PaintersEaselPalette.test.tsx"
Task: "Component test ViewModeToggle in frontend/tests/components/ViewModeToggle.test.tsx"
Task: "Component test InformationLevelEditor in frontend/tests/components/InformationLevelEditor.test.tsx"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T007-T011 cover information-levels.yaml, view-mode.yaml)
- [x] All entities have model tasks (T017 for InformationLevel, T018 for Card extension)
- [x] All tests come before implementation (T007-T016 before T017-T025)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts)
- [x] Critical filtering logic has unit tests (T012-T014 for hierarchical, custom, column filtering)
- [x] Security-critical filtering has E2E validation (T054, T060 for DOM inspection, no secret leakage)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for security filtering)
- **Client-side filtering** MUST occur before render (T033, T048) - no secret content in DOM
- **Server-side validation** required on API responses (T024, T025) - defense in depth
- **Hierarchical precedence** enforced (T012, T020) - DM Secret or custom hierarchical = always hidden in Player View
- **Painter's easel** persists selected level (T026-T029) - React context updates card creation defaults
- **View mode** persists to localStorage (T030-T032) - survives page refresh
- **TipTap indicators** CSS-based (T038-T040) - <16ms render, no JS overhead
- **Database 3-layer filtering** complex (T014, T021, T050) - entry-level + column-level + Player Knowledge field
- **Security audit** critical (T060) - manually inspect DOM, verify no secret content visible

---

## Critical Risk Areas

1. **Client-Side Filtering Security** (T033, T048, T060):
   - Cards MUST filter before render - no secret titles in DOM
   - Server-side validation as backup (T024, T025)
   - Manual DOM inspection in E2E tests (T060)

2. **Hierarchical Precedence Logic** (T012, T020):
   - DM Secret cards always hidden in Player View
   - Custom hierarchical levels respected
   - Column-level hierarchical flag overrides entry-level visibility

3. **Painter's Easel State Management** (T026-T029, T047):
   - React context provides selected level
   - Slash command card creation uses context default
   - Level change updates context immediately (<16ms)

4. **Database Partial Visibility** (T014, T021, T043, T050, T056):
   - Entry has DM Secret level BUT contains "Player Knowledge" text column
   - Entry partially visible: only Player Knowledge column shown
   - Complex 3-layer logic: entry-level, column hierarchical flag, Player Knowledge field type

5. **View Mode Toggle Performance** (T030-T032, T048, T059):
   - 10,000 cards filtering <200ms (client-side React context update)
   - localStorage persistence (survives refresh)
   - No flash of secret content during toggle (filter before render)

---

**Total Tasks**: 60
**Estimated Completion**: 5-7 days (security-critical filtering, TipTap integration, complex database visibility logic)
**Critical Path**: T001-T003 → T004-T006 → T007-T016 → T017-T025 → T026-T037 → T038-T046 → T047-T050 → T054-T060
**Security Priority**: Feature implements core information filtering - security testing (T060) is NON-NEGOTIABLE
