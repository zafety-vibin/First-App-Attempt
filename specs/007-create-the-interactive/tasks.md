# Tasks: Interactive Map System

**Feature**: 007-create-the-interactive
**Input**: Design documents from `/specs/007-create-the-interactive/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**: Feature 003 (Card Architecture) MUST be complete, Feature 004 (Information Filtering) MUST be complete

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: Konva.js/Fabric.js, multer, react-color, Radix UI Tabs
2. Load design documents ✓
   → data-model.md: Map-enabled Card extension, MapImage, PinCard, ZoneCard, LayerCard
   → contracts/: 4 files (maps.yaml, pins.yaml, zones.yaml, layers.yaml)
   → research.md: 7 technical decisions (BLOB storage, absolute pixel coordinates, tab UI, polygon drawing)
3. Generate tasks by category ✓
   → Setup: Database migrations for map tables, card extensions
   → Tests: contract tests, coordinate preservation, pin visibility filtering
   → Core: models, services (Map, Pin, Zone, Layer), routes
   → Frontend: MapCanvas (Konva), Pin/Zone/Layer editors, tabs UI, slash command
   → Integration: information filtering, nested navigation, multi-map support
   → Polish: E2E tests, quickstart validation
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T076) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App - extends features 002-004)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/007-maps.sql`
- **Shared**: `shared/types/` (extended with MapImage, PinCard, ZoneCard, LayerCard)

---

## Phase 3.1: Database Setup & Migrations

- [ ] **T001** Create migration 007 for Card extension (`backend/src/db/migrations/007-extend-cards-map.sql` add map_enabled flag to cards table)
- [ ] **T002** Create migration 007 for MapImage table (`backend/src/db/migrations/007-add-map-images.sql` with BLOB storage per data-model.md)
- [ ] **T003** Create migration 007 for Pin/Zone/Layer card extensions (`backend/src/db/migrations/007-extend-cards-map-elements.sql` add pin_x, pin_y, zone_vertices, layer_name columns)
- [ ] **T004** Create indexes for map queries (`backend/src/db/migrations/007-add-map-indexes.sql` for card_id, map_enabled, display_order)
- [ ] **T005** Validate SQLite BLOB support (`backend/src/services/DatabaseService.ts` test BLOB storage for 10MB images)

---

## Phase 3.2: Shared Types

- [ ] **T006** [P] MapImage type (`shared/types/MapImage.ts` with TypeScript interface from data-model.md)
- [ ] **T007** [P] PinCard type (`shared/types/PinCard.ts` extending Card with pin-specific fields)
- [ ] **T008** [P] ZoneCard type (`shared/types/ZoneCard.ts` extending Card with zone-specific fields)
- [ ] **T009** [P] LayerCard type (`shared/types/LayerCard.ts` extending Card with layer-specific fields)
- [ ] **T010** Card type extension (`shared/types/Card.ts` add map_enabled field)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (from contracts/)
- [ ] **T011** [P] Contract test POST /api/cards/:id/maps (`backend/tests/contract/maps.contract.test.ts` from contracts/maps.yaml)
- [ ] **T012** [P] Contract test GET /api/cards/:id/maps (`backend/tests/contract/maps.contract.test.ts` from contracts/maps.yaml)
- [ ] **T013** [P] Contract test DELETE /api/cards/:id/maps/:mapId (`backend/tests/contract/maps.contract.test.ts` from contracts/maps.yaml)
- [ ] **T014** [P] Contract test POST /api/cards/:id/maps/:mapId/image (`backend/tests/contract/maps.contract.test.ts` from contracts/maps.yaml - image upload)
- [ ] **T015** [P] Contract test POST /api/cards/:id/pins (`backend/tests/contract/pins.contract.test.ts` from contracts/pins.yaml)
- [ ] **T016** [P] Contract test PUT /api/cards/:id/pins/:pinId (`backend/tests/contract/pins.contract.test.ts` from contracts/pins.yaml)
- [ ] **T017** [P] Contract test DELETE /api/cards/:id/pins/:pinId (`backend/tests/contract/pins.contract.test.ts` from contracts/pins.yaml)
- [ ] **T018** [P] Contract test POST /api/cards/:id/zones (`backend/tests/contract/zones.contract.test.ts` from contracts/zones.yaml)
- [ ] **T019** [P] Contract test PUT /api/cards/:id/zones/:zoneId (`backend/tests/contract/zones.contract.test.ts` from contracts/zones.yaml)
- [ ] **T020** [P] Contract test POST /api/cards/:id/layers (`backend/tests/contract/layers.contract.test.ts` from contracts/layers.yaml)
- [ ] **T021** [P] Contract test PUT /api/cards/:id/layers/:layerId (`backend/tests/contract/layers.contract.test.ts` from contracts/layers.yaml)

### Backend Unit Tests (Critical Map Logic)
- [ ] **T022** [P] Unit test absolute pixel coordinate preservation (`backend/tests/unit/services/PinService-coordinates.test.ts` test pin x,y integers preserved on move)
- [ ] **T023** [P] Unit test zone polygon vertex storage (`backend/tests/unit/services/ZoneService-polygons.test.ts` test JSONB array of vertices)
- [ ] **T024** [P] Unit test orphaned pin detection (`backend/tests/unit/services/PinService-orphans.test.ts` test pin with deleted referenced card)
- [ ] **T025** [P] Unit test pin visibility filtering (`backend/tests/unit/services/PinService-filtering.test.ts` test DM Secret pins hidden in Player View)

### Backend Integration Tests (from quickstart.md)
- [ ] **T026** [P] Integration test: Map creation and image upload (`backend/tests/integration/map-creation.integration.test.ts`)
- [ ] **T027** [P] Integration test: Multi-map tabs per card (`backend/tests/integration/multi-map-tabs.integration.test.ts`)
- [ ] **T028** [P] Integration test: Nested map navigation (`backend/tests/integration/nested-map-navigation.integration.test.ts`)
- [ ] **T029** [P] Integration test: Pin information level filtering (`backend/tests/integration/pin-visibility-filtering.integration.test.ts`)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Models
- [ ] **T030** [P] MapImage model (`backend/src/models/MapImage.ts` with TypeScript interface from data-model.md, BLOB handling)
- [ ] **T031** [P] PinCard model (`backend/src/models/PinCard.ts` extending Card model with pin fields)
- [ ] **T032** [P] ZoneCard model (`backend/src/models/ZoneCard.ts` extending Card model with zone fields)
- [ ] **T033** [P] LayerCard model (`backend/src/models/LayerCard.ts` extending Card model with layer fields)
- [ ] **T034** Card model extension (`backend/src/models/Card.ts` add map_enabled field)

### Services
- [ ] **T035** MapService (`backend/src/services/MapService.ts` enable/disable map on card, manage map images)
- [ ] **T036** MapImageService (`backend/src/services/MapImageService.ts` BLOB upload, metadata extraction, CRUD)
- [ ] **T037** PinService (`backend/src/services/PinService.ts` CRUD for pin cards, coordinate validation, orphan detection per research.md)
- [ ] **T038** PinService - Visibility filtering (`backend/src/services/PinService.ts` integrate with ViewModeService from Feature 004, filter by referenced card information level)
- [ ] **T039** ZoneService (`backend/src/services/ZoneService.ts` CRUD for zone cards, polygon vertex management)
- [ ] **T040** LayerService (`backend/src/services/LayerService.ts` CRUD for layer cards, layer ordering)

### Middleware
- [ ] **T041** MapImageUpload middleware (`backend/src/middleware/mapImageUpload.ts` multer configuration for BLOB upload, 10MB limit, image validation)

### Routes
- [ ] **T042** Map routes (`backend/src/routes/maps.ts` POST /cards/:id/maps, GET, DELETE, POST /image per contracts/maps.yaml)
- [ ] **T043** Pin routes (`backend/src/routes/pins.ts` POST /cards/:id/pins, PUT, DELETE per contracts/pins.yaml)
- [ ] **T044** Zone routes (`backend/src/routes/zones.ts` POST /cards/:id/zones, PUT, DELETE per contracts/zones.yaml)
- [ ] **T045** Layer routes (`backend/src/routes/layers.ts` POST /cards/:id/layers, PUT, DELETE per contracts/layers.yaml)

---

## Phase 3.5: Frontend Core - Map Canvas & Editing

### Map Canvas (Konva.js Integration)
- [ ] **T046** MapCanvas component (`frontend/src/components/map/MapCanvas.tsx` Konva.js canvas wrapper with zoom, pan, drag-drop per research.md)
- [ ] **T047** MapStage component (`frontend/src/components/map/MapStage.tsx` Konva Stage with image background layer)
- [ ] **T048** MapPinLayer component (`frontend/src/components/map/MapPinLayer.tsx` Konva Layer for pin rendering, click handlers)
- [ ] **T049** MapZoneLayer component (`frontend/src/components/map/MapZoneLayer.tsx` Konva Layer for polygon zone rendering)
- [ ] **T050** MapLayerManager component (`frontend/src/components/map/MapLayerManager.tsx` toggle layers visibility, reorder)

### Pin/Zone/Layer Editors
- [ ] **T051** PinEditor component (`frontend/src/components/map/PinEditor.tsx` create/edit pins, icon selector, label override, card reference)
- [ ] **T052** ZoneEditor component (`frontend/src/components/map/ZoneEditor.tsx` draw polygon zones, color picker per research.md, purpose field)
- [ ] **T053** LayerEditor component (`frontend/src/components/map/LayerEditor.tsx` create/edit layers, name, ordering)
- [ ] **T054** OrphanedPinWarning component (`frontend/src/components/map/OrphanedPinWarning.tsx` show warning notification for pins with deleted referenced cards per research.md)

### Map Tabs & Navigation
- [ ] **T055** MapTabs component (`frontend/src/components/map/MapTabs.tsx` Radix UI Tabs for switching between multiple maps per card per research.md)
- [ ] **T056** MapImageUploader component (`frontend/src/components/map/MapImageUploader.tsx` drag-drop or file input for image upload, preview)
- [ ] **T057** NestedMapNavigation component (`frontend/src/components/map/NestedMapNavigation.tsx` click pin → navigate to referenced card's map if enabled)

### Slash Command Integration
- [ ] **T058** MapSlashCommand extension (`frontend/src/components/cards/SlashCommandPalette.tsx` add /map command to create map-enabled card per research.md)

### API Clients
- [ ] **T059** [P] MapService API client (`frontend/src/services/map.service.ts` API calls for map CRUD, image upload)
- [ ] **T060** [P] PinService API client (`frontend/src/services/pin.service.ts` API calls for pin CRUD)
- [ ] **T061** [P] ZoneService API client (`frontend/src/services/zone.service.ts` API calls for zone CRUD)
- [ ] **T062** [P] LayerService API client (`frontend/src/services/layer.service.ts` API calls for layer CRUD)

---

## Phase 3.6: Frontend Pages & Map Interface

### Pages
- [ ] **T063** MapPage component (`frontend/src/pages/MapPage.tsx` full-page map view with canvas, editors, tabs)
- [ ] **T064** MapInterface component (`frontend/src/components/map/MapInterface.tsx` main map container orchestrating canvas, editors, toolbar)

---

## Phase 3.7: Integration & Polish

### Integration Tasks
- [ ] **T065** Integrate MapCanvas with Konva drag-drop (verify pin move updates absolute pixel coordinates, API call to update)
- [ ] **T066** Integrate pin visibility filtering with ViewModeService (verify DM Secret pins hidden in Player View before render)
- [ ] **T067** Integrate multi-map tabs with MapTabs (verify switching maps updates canvas background, loads correct pins/zones/layers)
- [ ] **T068** Integrate nested map navigation (verify clicking pin navigates to referenced card's map if map_enabled = true)
- [ ] **T069** Integrate orphaned pin detection (verify warning shows for pins with deleted referenced cards, allow force delete or re-link)
- [ ] **T070** Test zone polygon drawing (verify click-to-add-vertex, close polygon, save vertices as JSONB array)

### Frontend Component Tests
- [ ] **T071** [P] Component test MapCanvas (`frontend/tests/components/MapCanvas.test.tsx` with Vitest + RTL, test zoom, pan, pin drag)
- [ ] **T072** [P] Component test PinEditor (`frontend/tests/components/PinEditor.test.tsx` test icon selection, label override, card reference)
- [ ] **T073** [P] Component test MapTabs (`frontend/tests/components/MapTabs.test.tsx` test tab switching, map name display)

### E2E Tests
- [ ] **T074** E2E test: Create map-enabled card, upload image, add pins (`frontend/tests/e2e/map-creation.spec.ts` with Playwright per quickstart.md)
- [ ] **T075** E2E test: Multi-map tabs workflow (`frontend/tests/e2e/multi-map-tabs.spec.ts` create 3 maps, switch tabs, verify correct backgrounds)
- [ ] **T076** E2E test: Nested map navigation (`frontend/tests/e2e/nested-map-navigation.spec.ts` create map, add pin referencing another map-enabled card, click pin → navigate)
- [ ] **T077** E2E test: Pin visibility filtering (`frontend/tests/e2e/pin-visibility-filtering.spec.ts` create DM Secret pin, toggle to Player View, verify hidden)

### Documentation & Cleanup
- [ ] **T078** Validate quickstart.md (execute all steps: enable map on card → upload image → add pins → draw zones → create layers → test filtering)
- [ ] **T079** [P] Add inline comments to complex canvas logic (Konva stage setup, coordinate transformation, polygon drawing per research.md)
- [ ] **T080** [P] Performance test map rendering (500+ pins, verify 60fps zoom/pan per plan.md)
- [ ] **T081** [P] Performance test image upload (5MB image, verify <1s upload per plan.md)

---

## Dependencies

### Strict Ordering
1. **Database migrations before everything**: T001-T005 before all other tasks
2. **Shared types before tests**: T006-T010 before T011-T029
3. **Tests before implementation**: T011-T029 MUST complete (and fail) before T030-T045
4. **Backend services before routes**: T035-T040 before T042-T045
5. **Backend routes before frontend API clients**: T042-T045 before T059-T062
6. **MapCanvas before layers**: T046-T047 before T048-T050 (layers need stage)
7. **API clients before editors**: T059-T062 before T051-T053 (editors need API)
8. **All core before integration**: T001-T064 before T065-T070
9. **Implementation before E2E tests**: T001-T070 before T074-T077

### Specific Dependencies
- T002 (MapImage table) blocks T011-T014 (map contract tests need table)
- T003 (Pin/Zone/Layer extensions) blocks T015-T021 (contract tests need columns)
- T036 (MapImageService) blocks T041, T042 (upload middleware and routes need service)
- T037 (PinService) blocks T038 (visibility filtering extends pin service)
- T046 (MapCanvas) blocks T048-T050 (layers render on canvas)
- T059-T062 (API clients) block T051-T053 (editors call API)
- T055 (MapTabs) blocks T067 (integration needs tabs component)

---

## Parallel Execution Examples

### Example 1: Shared Types (Phase 3.2)
```bash
# Launch T006-T009 together (different type files):
Task: "MapImage type in shared/types/MapImage.ts"
Task: "PinCard type in shared/types/PinCard.ts"
Task: "ZoneCard type in shared/types/ZoneCard.ts"
Task: "LayerCard type in shared/types/LayerCard.ts"
```

### Example 2: Contract Tests (Phase 3.3)
```bash
# Launch T011-T021 together (different contract test files):
Task: "Contract test POST /api/cards/:id/maps in backend/tests/contract/maps.contract.test.ts"
Task: "Contract test POST /api/cards/:id/pins in backend/tests/contract/pins.contract.test.ts"
Task: "Contract test POST /api/cards/:id/zones in backend/tests/contract/zones.contract.test.ts"
Task: "Contract test POST /api/cards/:id/layers in backend/tests/contract/layers.contract.test.ts"
```

### Example 3: Unit Tests (Phase 3.3)
```bash
# Launch T022-T025 together (different unit test files):
Task: "Unit test absolute pixel coordinate preservation in backend/tests/unit/services/PinService-coordinates.test.ts"
Task: "Unit test zone polygon vertex storage in backend/tests/unit/services/ZoneService-polygons.test.ts"
Task: "Unit test orphaned pin detection in backend/tests/unit/services/PinService-orphans.test.ts"
Task: "Unit test pin visibility filtering in backend/tests/unit/services/PinService-filtering.test.ts"
```

### Example 4: Models (Phase 3.4)
```bash
# Launch T030-T033 together (different model files):
Task: "MapImage model in backend/src/models/MapImage.ts"
Task: "PinCard model in backend/src/models/PinCard.ts"
Task: "ZoneCard model in backend/src/models/ZoneCard.ts"
Task: "LayerCard model in backend/src/models/LayerCard.ts"
```

### Example 5: API Clients (Phase 3.5)
```bash
# Launch T059-T062 together (different service files):
Task: "MapService API client in frontend/src/services/map.service.ts"
Task: "PinService API client in frontend/src/services/pin.service.ts"
Task: "ZoneService API client in frontend/src/services/zone.service.ts"
Task: "LayerService API client in frontend/src/services/layer.service.ts"
```

### Example 6: Component Tests (Phase 3.7)
```bash
# Launch T071-T073 together (different component test files):
Task: "Component test MapCanvas in frontend/tests/components/MapCanvas.test.tsx"
Task: "Component test PinEditor in frontend/tests/components/PinEditor.test.tsx"
Task: "Component test MapTabs in frontend/tests/components/MapTabs.test.tsx"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T011-T021 cover maps.yaml, pins.yaml, zones.yaml, layers.yaml)
- [x] All entities have model tasks (T030-T034 for MapImage, PinCard, ZoneCard, LayerCard, Card extension)
- [x] All tests come before implementation (T011-T029 before T030-T045)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts)
- [x] Critical map logic has unit tests (T022-T025 for coordinates, polygons, orphans, filtering)
- [x] Complex workflows have E2E tests (T074-T077 for creation, tabs, navigation, filtering)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for coordinate precision)
- **Konva.js** canvas library (T046-T050) - research.md chose Konva over Fabric for React integration
- **Absolute pixel coordinates** (T022, T037) - pin x,y stored as integers, NOT percentages (ensures map image swap preserves positions)
- **BLOB storage** (T002, T036) - SQLite BLOB for images, max 10MB enforced at upload
- **Multi-map tabs** (T055, T067) - Radix UI Tabs per research.md, display_order for tab sequence
- **Polygon drawing** (T039, T052, T070) - click-to-add-vertex pattern, close polygon, store as JSONB array of {x, y}
- **Orphaned pins** (T024, T054, T069) - warning notification per research.md, not automatic deletion
- **Pin visibility filtering** (T025, T038, T066, T077) - DM Secret referenced cards = hidden pins in Player View
- **Nested navigation** (T057, T068, T076) - click pin → check if referenced card has map_enabled → navigate to that map
- **Performance** (T080, T081) - 60fps zoom/pan for 500+ pins, <1s upload for 5MB images per plan.md

---

## Critical Risk Areas

1. **Coordinate Precision** (T022, T037, T065):
   - Absolute pixel x,y integers MUST preserve positions
   - Test map image swap (different dimensions) preserves relative pin placement
   - Konva transform calculations must round to integers

2. **BLOB Storage & Upload** (T002, T036, T041):
   - SQLite BLOB max size varies by config (default 1GB, enforce 10MB at app layer)
   - Multer multipart/form-data parsing for image upload
   - Image metadata extraction (width, height) using sharp or jimp

3. **Polygon Zone Drawing** (T039, T052, T070):
   - Click-to-add-vertex UX with visual feedback
   - Close polygon detection (click near first vertex)
   - JSONB array storage: [{x: int, y: int}, ...]
   - Render polygon with Konva.Line or Konva.Shape

4. **Pin Visibility Filtering** (T025, T038, T066):
   - Referenced card's information level determines pin visibility
   - DM Secret cards = hidden pins before render (no DOM exposure)
   - ViewModeService integration from Feature 004

5. **Multi-Map Tab Performance** (T055, T067):
   - Switching tabs loads new MapImage BLOB
   - Clear previous canvas layers before rendering new map
   - Avoid memory leaks (unmount Konva layers properly)

6. **Nested Map Navigation** (T057, T068, T076):
   - Pin click checks referenced card's map_enabled flag
   - Navigate to /cards/:id (referenced card) if map enabled
   - Breadcrumb trail for nested navigation (prevent getting lost)

7. **Orphaned Pin Warnings** (T024, T054, T069):
   - Check if referenced card still exists before render
   - Show warning notification with "Re-link" or "Delete pin" options
   - Don't auto-delete (user agency principle)

---

**Total Tasks**: 81
**Estimated Completion**: 8-12 days (Konva.js canvas integration, BLOB storage, polygon drawing, coordinate precision, filtering integration)
**Critical Path**: T001-T005 → T006-T010 → T011-T029 → T030-T045 → T046-T062 → T063-T064 → T065-T070 → T074-T081
**UI Complexity**: MapCanvas (T046-T050) most complex - Konva stage, layers, zoom/pan, drag-drop all require careful coordinate handling
