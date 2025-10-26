# Tasks: Geographic Map System

**Feature**: 021-create-a-geographic
**Input**: Design documents from `/specs/021-create-a-geographic/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**: Feature 014 (Locations), Feature 015 (Dashboard), Feature 004 (Information Filtering)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: TypeScript 5.0+, React 18, Konva.js, Better-SQLite3, Express 4.x
2. Load design documents ✓
   → data-model.md: Location extension (map_images, map_pins, faction_regions JSON)
   → contracts/: 4 files (location-maps, location-pins, faction-regions, hierarchy-navigator)
   → research.md: 7 technical decisions (Konva.js, base64 storage, absolute pixels, etc.)
3. Generate tasks by category ✓
   → Setup: Migration, dependencies
   → Tests: 4 contract tests, 5 integration tests
   → Backend: Service extension, routes (4 endpoint groups)
   → Frontend: Widget, Maps tab, Navigator, canvas components
   → Integration: WidgetRegistry, routing, information filtering
   → Polish: E2E tests, quickstart validation
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T045) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/021-geographic-maps.sql`

---

## Phase 3.1: Setup & Dependencies

- [ ] **T001** Create database migration (`backend/src/db/migrations/021-geographic-maps.sql`) adding map_images, map_pins, faction_regions JSON columns to locations table
- [ ] **T002** [P] Install Konva.js dependencies (`npm install konva react-konva @types/react-konva` in frontend/)
- [ ] **T003** [P] Register migration in DatabaseService (`backend/src/services/DatabaseService.ts`) import and register migration 021

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)
- [ ] **T004** [P] Contract test POST /api/locations/:id/maps in `backend/tests/contract/location-maps.test.ts` (upload map image)
- [ ] **T005** [P] Contract test POST /api/locations/:id/maps/:map_id/pins in `backend/tests/contract/location-pins.test.ts` (create pin)
- [ ] **T006** [P] Contract test POST /api/locations/:id/maps/:map_id/regions in `backend/tests/contract/faction-regions.test.ts` (create faction region)
- [ ] **T007** [P] Contract test GET /api/locations/hierarchy in `backend/tests/contract/hierarchy-navigator.test.ts` (get location tree)

### Integration Tests (User Scenarios)
- [ ] **T008** [P] Integration test map upload workflow in `backend/tests/integration/map-upload.test.ts` (upload map to location, verify storage, retrieve map)
- [ ] **T009** [P] Integration test pin creation and navigation in `backend/tests/integration/pin-navigation.test.ts` (create pin, verify coordinates, test linked entity reference)
- [ ] **T010** [P] Integration test hierarchy tree construction in `backend/tests/integration/hierarchy-tree.test.ts` (build tree from parent_location_id, handle cycles, verify breadcrumb)
- [ ] **T011** [P] Integration test information filtering in `backend/tests/integration/map-filtering.test.ts` (dm_only pins hidden in player_view, faction regions filtered)
- [ ] **T012** [P] Integration test orphaned pin handling in `backend/tests/integration/orphaned-pins.test.ts` (delete linked entity, verify pin warning/removal)

---

## Phase 3.3: Backend Implementation (ONLY after tests are failing)

### Database & Models
- [ ] **T013** Extend LocationService (`backend/src/services/LocationService.ts`) with map methods: uploadMap(), deleteMap(), createPin(), updatePin(), deletePin(), createRegion(), updateRegion(), deleteRegion()
- [ ] **T014** [P] Add Zod validation schemas in `backend/src/validation/geographic-maps.ts` for MapImage, MapPin, FactionRegion structures

### API Routes
- [ ] **T015** Create location-maps routes (`backend/src/routes/location-maps.ts`) with POST upload, GET list, DELETE map endpoints
- [ ] **T016** Create location-pins routes (`backend/src/routes/location-pins.ts`) with POST create, PUT update, DELETE remove, GET list endpoints
- [ ] **T017** Create faction-regions routes (`backend/src/routes/faction-regions.ts`) with POST create, PUT update, DELETE remove, GET list endpoints
- [ ] **T018** Create hierarchy-navigator routes (`backend/src/routes/hierarchy-navigator.ts`) with GET tree, GET breadcrumb, GET children endpoints
- [ ] **T019** Register new routes in server.ts (`backend/src/server.ts`) mount location-maps, location-pins, faction-regions, hierarchy-navigator routes

### Information Filtering Integration
- [ ] **T020** Add map filtering logic to ViewModeService (`backend/src/services/ViewModeService.ts`) filter map_pins and faction_regions by linked entity/faction visibility

---

## Phase 3.4: Frontend - Map Canvas Components

### Core Canvas (Konva.js)
- [ ] **T021** [P] Create MapCanvas component (`frontend/src/components/maps/MapCanvas.tsx`) Konva Stage with pan/zoom, image layer, pin layer, region layer
- [ ] **T022** [P] Create MapPin component (`frontend/src/components/maps/MapPin.tsx`) Konva Circle + icon, hover tooltip, click navigation
- [ ] **T023** [P] Create FactionRegion component (`frontend/src/components/maps/FactionRegion.tsx`) Konva Line polygon, hover tooltip, color fill
- [ ] **T024** [P] Create MapControls component (`frontend/src/components/maps/MapControls.tsx`) zoom in/out buttons, reset view, fit-to-viewport

### Map Editing
- [ ] **T025** [P] Create PinEditor modal (`frontend/src/components/maps/PinEditor.tsx`) entity search, icon picker, color picker, coordinate display
- [ ] **T026** [P] Create RegionEditor modal (`frontend/src/components/maps/RegionEditor.tsx`) faction selector, color picker, polygon vertex editor, label input
- [ ] **T027** [P] Create MapUploader component (`frontend/src/components/maps/MapUploader.tsx`) file input, preview, name entry, upload progress

---

## Phase 3.5: Frontend - Location Integration

- [ ] **T028** Add Maps tab to LocationDetailPage (`frontend/src/pages/LocationDetailPage.tsx`) add tab navigation, conditionally render maps interface
- [ ] **T029** Create LocationMapsTab component (`frontend/src/components/location/LocationMapsTab.tsx`) map selector, canvas wrapper, upload button, pin/region lists
- [ ] **T030** Create useLocationMaps hook (`frontend/src/hooks/useLocationMaps.ts`) fetch maps, upload map, create/update/delete pins, create/update/delete regions
- [ ] **T031** Add map service functions (`frontend/src/services/locationService.ts`) uploadMap(), deleteMap(), createPin(), updatePin(), deletePin(), createRegion(), updateRegion(), deleteRegion()

---

## Phase 3.6: Frontend - Dashboard Widget

- [ ] **T032** [P] Create MapViewportWidget component (`frontend/src/components/dashboard/widgets/MapViewportWidget.tsx`) canvas viewport, location/map selector, pan/zoom state
- [ ] **T033** Register MapViewportWidget in WidgetRegistry (`frontend/src/components/dashboard/WidgetRegistry.ts`) add widget definition with 2x2, 3x3, 4x4 sizes
- [ ] **T034** Create useMapViewportWidget hook (`frontend/src/hooks/useMapViewportWidget.ts`) load selected location's maps, persist pan/zoom state, handle widget config

---

## Phase 3.7: Frontend - Geographic Hierarchy Navigator

### Tree View
- [ ] **T035** [P] Create GeographicNavigatorPage (`frontend/src/pages/GeographicNavigatorPage.tsx`) two-panel layout (tree + canvas), breadcrumb, view mode toggle
- [ ] **T036** [P] Create LocationTree component (`frontend/src/components/navigator/LocationTree.tsx`) recursive tree rendering, expand/collapse, map indicator icons
- [ ] **T037** [P] Create LocationTreeNode component (`frontend/src/components/navigator/LocationTreeNode.tsx`) single tree node with expand button, select handler, depth indentation
- [ ] **T038** [P] Create HierarchyBreadcrumb component (`frontend/src/components/navigator/HierarchyBreadcrumb.tsx`) clickable breadcrumb path from root to current location

### Navigation Logic
- [ ] **T039** Create useGeographicHierarchy hook (`frontend/src/hooks/useGeographicHierarchy.ts`) build tree from parent_location_id, detect cycles, compute breadcrumb, handle selection
- [ ] **T040** Create useMapNavigation hook (`frontend/src/hooks/useMapNavigation.ts`) handle pin click transitions, update tree selection, update breadcrumb, preload child maps
- [ ] **T041** Add hierarchy service functions (`frontend/src/services/hierarchyService.ts`) getLocationTree(), getBreadcrumb(), getChildLocations()

### Routing
- [ ] **T042** Add GeographicNavigatorPage route in AppRoutes (`frontend/src/routes/AppRoutes.tsx`) path: /campaigns/:id/locations/navigator
- [ ] **T043** Add Navigator link to Locations category sidebar (`frontend/src/contexts/SidebarContext.tsx`) add "Geographic Navigator" option under Locations

---

## Phase 3.8: Polish & Testing

### E2E Tests
- [ ] **T044** [P] E2E test map upload and pin creation (`frontend/tests/e2e/geographic-maps.spec.ts`) upload map to location, add pins, verify display
- [ ] **T045** [P] E2E test hierarchy navigation (`frontend/tests/e2e/hierarchy-navigator.spec.ts`) navigate tree, click pins, verify transitions, test breadcrumb
- [ ] **T046** [P] E2E test information filtering (`frontend/tests/e2e/map-filtering.spec.ts`) create dm_only pins/regions, toggle view mode, verify hiding

### Documentation & Validation
- [ ] **T047** Run quickstart validation (`specs/021-create-a-geographic/quickstart.md`) verify 5-minute workflow, check all test scenarios pass
- [ ] **T048** Update CLAUDE.md with Feature 021 summary

---

## Dependencies

### Critical Path
```
T001 (migration) → T013 (backend service) → T015-T018 (routes)
T002-T003 (setup) → T021-T027 (canvas components)
T004-T012 (all tests) MUST fail before T013+ (implementation)
T033 (register widget) depends on T032 (widget component)
T042-T043 (routing) depends on T035 (navigator page)
```

### Blocking Relationships
- **Tests** (T004-T012) MUST be written and failing before ANY implementation
- **T001** (migration) blocks all backend work
- **T013** (service extension) blocks T015-T018 (routes)
- **T021** (MapCanvas) blocks T028-T029 (Maps tab integration)
- **T032** (MapViewportWidget) blocks T033 (registration)
- **T035** (Navigator page) blocks T042-T043 (routing)

---

## Parallel Execution Examples

### Example 1: Contract Tests (T004-T007)
```bash
# All contract tests can run in parallel (different files, no dependencies)
npm test backend/tests/contract/location-maps.test.ts &
npm test backend/tests/contract/location-pins.test.ts &
npm test backend/tests/contract/faction-regions.test.ts &
npm test backend/tests/contract/hierarchy-navigator.test.ts &
wait
```

### Example 2: Integration Tests (T008-T012)
```bash
# All integration tests can run in parallel
npm test backend/tests/integration/map-upload.test.ts &
npm test backend/tests/integration/pin-navigation.test.ts &
npm test backend/tests/integration/hierarchy-tree.test.ts &
npm test backend/tests/integration/map-filtering.test.ts &
npm test backend/tests/integration/orphaned-pins.test.ts &
wait
```

### Example 3: Canvas Components (T021-T027)
```bash
# All canvas components can be built in parallel (different files)
# Task: Create MapCanvas component in frontend/src/components/maps/MapCanvas.tsx
# Task: Create MapPin component in frontend/src/components/maps/MapPin.tsx
# Task: Create FactionRegion component in frontend/src/components/maps/FactionRegion.tsx
# Task: Create MapControls component in frontend/src/components/maps/MapControls.tsx
# Task: Create PinEditor modal in frontend/src/components/maps/PinEditor.tsx
# Task: Create RegionEditor modal in frontend/src/components/maps/RegionEditor.tsx
# Task: Create MapUploader component in frontend/src/components/maps/MapUploader.tsx
```

### Example 4: Navigator Components (T035-T038)
```bash
# All navigator components can be built in parallel
# Task: Create GeographicNavigatorPage in frontend/src/pages/GeographicNavigatorPage.tsx
# Task: Create LocationTree component in frontend/src/components/navigator/LocationTree.tsx
# Task: Create LocationTreeNode component in frontend/src/components/navigator/LocationTreeNode.tsx
# Task: Create HierarchyBreadcrumb component in frontend/src/components/navigator/HierarchyBreadcrumb.tsx
```

### Example 5: E2E Tests (T044-T046)
```bash
# All E2E tests can run in parallel
npx playwright test frontend/tests/e2e/geographic-maps.spec.ts &
npx playwright test frontend/tests/e2e/hierarchy-navigator.spec.ts &
npx playwright test frontend/tests/e2e/map-filtering.spec.ts &
wait
```

---

## Notes

**Parallelization**:
- Tasks marked [P] can run concurrently (different files, no shared dependencies)
- Sequential tasks modify the same file or have direct dependencies
- Contract tests (T004-T007) MUST fail before proceeding to T013+

**Testing Strategy**:
- TDD approach: Write failing tests first (T004-T012)
- Contract tests validate API contracts (request/response schemas)
- Integration tests validate workflows (upload → pin → navigation)
- E2E tests validate full user journeys (Playwright browser automation)

**Backend Scope**:
- Extend LocationService (no new service files)
- 4 new route files (maps, pins, regions, hierarchy)
- 1 migration file
- JSON operations only (no new tables)

**Frontend Scope**:
- 7 canvas components (MapCanvas, MapPin, FactionRegion, MapControls, PinEditor, RegionEditor, MapUploader)
- 1 dashboard widget (MapViewportWidget)
- 1 navigator page (GeographicNavigatorPage)
- 4 navigator components (LocationTree, LocationTreeNode, HierarchyBreadcrumb, canvas wrapper)
- 3 hooks (useLocationMaps, useMapViewportWidget, useGeographicHierarchy, useMapNavigation)
- Service function additions (locationService, hierarchyService)

**Integration Points**:
- WidgetRegistry (Feature 015)
- AppRoutes (routing)
- SidebarContext (navigator link)
- Information filtering (Feature 004)
- Existing parent_location_id relationships (Feature 014)

---

## Validation Checklist

- [x] All contracts have corresponding tests (T004-T007)
- [x] All entities have model tasks (Location extended in T001, validation in T014)
- [x] All tests come before implementation (T004-T012 before T013+)
- [x] Parallel tasks truly independent (different files, verified)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Quickstart scenarios covered in integration tests

---

## Estimated Effort

**Total Tasks**: 48 tasks
**Estimated Duration**: 2-3 weeks

**Breakdown**:
- Setup (3 tasks): 2 hours
- Tests (9 tasks): 1-2 days
- Backend (8 tasks): 3-4 days
- Frontend Canvas (7 tasks): 4-5 days (Konva.js complexity)
- Frontend Integration (4 tasks): 2-3 days
- Frontend Widget (3 tasks): 1-2 days
- Frontend Navigator (7 tasks): 3-4 days
- Polish (7 tasks): 2-3 days

**Critical Path**: T001 → T004-T012 (tests) → T013 (service) → T021 (canvas) → T028 (Maps tab) → T044-T046 (E2E)

**Risk Areas**:
- Konva.js canvas performance with 100+ pins (mitigation: layer optimization, virtualization)
- Base64 storage size (10MB maps = 13MB base64, may hit payload limits)
- Circular parent_location_id detection (mitigation: cycle detection in T010)
- Deep hierarchy rendering (20+ levels, mitigation: virtual scrolling in tree)
