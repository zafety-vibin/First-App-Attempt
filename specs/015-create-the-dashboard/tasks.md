# Tasks: Dashboard & Navigation UI (Canvas Transition)

**Feature**: 015-create-the-dashboard
**Input**: Design documents from `/specs/015-create-the-dashboard/`
**Prerequisites**: Feature 014 (Database Foundation) complete, plan.md, research.md, data-model.md

---

## Archive Note

**Previous Work**: 51 foundation tasks (T006-T056) completed before canvas transition.
- Foundation: Contexts, utilities, validation schemas ✅
- API Services: 13 category services + apiClient ✅
- Custom Hooks: 6 hooks (useCategory, usePagination, useSorting, useSearchFilter, useThematicLabels, useSidebarState) ✅
- Common Components: 5 components (LoadingSpinner, SkeletonLoader, EmptyState, ErrorBoundary, ConfirmDialog) ✅
- Form Inputs: 10 components (TextInput, TextArea, Select, Checkbox, DatePicker, TagInput, FileUpload, CustomFieldEditor, RelationshipSelector) ✅
- Category Landing: 4 components (NPCLandingCard, LocationLandingCard, QuestLandingCard, SessionTimelineCard) ✅
- Table Components: 7 components (SortableTableHeader, TableRow, PaginationControls, CategoryTable, SearchBar, FilterPanel, TableToolbar) ✅
- Form Components: 2 components (GenericEntityForm, DeleteConfirmation) ✅
- Detail Components: 3 components (FieldDisplay, RelationshipLinks, EntityDetailPage) ✅

**Details**: See `tasks-before-canvas.md` for completed task history.

---

## Current Scope: Canvas System Implementation

**Objective**: Transition from static dashboard to interactive canvas with drag-drop widgets using react-grid-layout.

**Completed Work** (25 tasks):
1. ✅ **Backend Canvas Support** (5 tasks): Migration, services, routes for configuration persistence
2. ✅ **Canvas Infrastructure** (4 tasks): Core canvas system components
3. ✅ **Canvas Services & Hooks** (3 tasks): Frontend API services and state management
4. ✅ **Dashboard Canvas Integration** (8 tasks): Update/create dashboard widgets and page
5. ✅ **Category Landing Canvas** (2 tasks): Add canvas to category landing pages
6. ✅ **Top-Level Pages** (3 tasks): Dashboard page route, category landing pages, App.tsx routing

**Remaining Work** (24 tasks):
7. **Sidebar & Navigation** (4 tasks): Navigation components (T023-T026, may already exist from foundation)
8. **Top-Level Pages** (3 tasks): Table/Detail/Create/Edit route pages (T028-T031, may use existing components)
9. **Testing** (12 tasks): Component tests + E2E tests (T034-T045)
10. **Polish** (4 tasks): Validation, performance, accessibility, documentation (T046-T049)

**Progress**: 25/49 tasks complete (51%)

---

## Path Conventions

**Frontend**:
- Components: `frontend/src/components/`
- Services: `frontend/src/services/`
- Hooks: `frontend/src/hooks/`
- Pages: `frontend/src/pages/`
- Tests: `frontend/tests/`

**Backend** (canvas configuration only):
- Migrations: `backend/src/db/migrations/`
- Services: `backend/src/services/`
- Routes: `backend/src/routes/`
- Tests: `backend/tests/`

---

## Phase 1: Backend Canvas Support

### T001 [P]: ✅ Create dashboard canvas migration
**File**: `backend/src/db/migrations/015-dashboard-canvas.sql`
**Description**: Create SQL migration for canvas configuration persistence. Create tables: `dashboard_configs` (id, campaign_id, user_id, layout JSON, created_at, updated_at, UNIQUE(campaign_id, user_id)) and `category_landing_configs` (id, campaign_id, user_id, category, layout JSON, title TEXT, description TEXT, created_at, updated_at, UNIQUE(campaign_id, user_id, category)). Foreign keys with CASCADE on campaign_id and user_id. Layout JSON stores react-grid-layout configuration (array of GridLayoutItem objects).
**Dependencies**: None
**Success Criteria**: Migration file created, tables defined with correct schema, foreign keys with CASCADE, unique constraints enforce one config per user+campaign(+category)

### T002 [P]: ✅ Create DashboardConfigService
**File**: `backend/src/services/DashboardConfigService.ts`
**Description**: Create service for dashboard_configs CRUD operations. Export functions: `getDashboardConfig(campaignId, userId)`, `createDashboardConfig(campaignId, userId, layout)`, `updateDashboardConfig(id, layout)`, `deleteDashboardConfig(id)`. Uses Better-SQLite3 prepared statements. Layout stored as JSON string. Returns typed DashboardConfig interface. Handle not found cases with null returns.
**Dependencies**: T001 (migration creates table)
**Success Criteria**: Service exports 4 functions, prepared statements prevent SQL injection, layout JSON serialized/deserialized correctly, UNIQUE constraint prevents duplicates

### T003 [P]: ✅ Create CategoryLandingConfigService
**File**: `backend/src/services/CategoryLandingConfigService.ts`
**Description**: Create service for category_landing_configs CRUD operations. Export functions: `getCategoryLandingConfig(campaignId, userId, category)`, `createCategoryLandingConfig(campaignId, userId, category, layout, title, description)`, `updateCategoryLandingConfig(id, layout, title, description)`, `deleteCategoryLandingConfig(id)`. Layout, title, description all updatable. Returns typed CategoryLandingConfig interface. Title max 200 chars, description is TipTap JSON.
**Dependencies**: T001 (migration creates table)
**Success Criteria**: Service exports 4 functions, prepared statements used, layout JSON + TipTap JSON stored correctly, UNIQUE constraint on (campaign_id, user_id, category)

### T004 [P]: ✅ Create dashboardConfigs routes
**File**: `backend/src/routes/dashboardConfigs.ts`
**Description**: Create REST API routes for dashboard configs. Routes: `GET /api/dashboard-configs?campaign_id={id}` (get by campaign+user, returns 404 if not found), `POST /api/dashboard-configs` (create with {campaign_id, layout}), `PUT /api/dashboard-configs/:id` (update layout only), `DELETE /api/dashboard-configs/:id`. Extract user_id from Keycloak auth token middleware (Feature 002). Validate layout JSON schema with Zod (array of GridLayoutItem: {i, x, y, w, h, minW?, minH?, widgetId}).
**Dependencies**: T002 (DashboardConfigService)
**Success Criteria**: 4 routes created, authentication required, layout validated with Zod, user_id extracted from token, 404 handling, CRUD operations work

### T005 [P]: ✅ Create categoryLandingConfigs routes
**File**: `backend/src/routes/categoryLandingConfigs.ts`
**Description**: Create REST API routes for category landing configs. Routes: `GET /api/category-landing-configs?campaign_id={id}&category={category}`, `POST /api/category-landing-configs` (create), `PUT /api/category-landing-configs/:id` (update layout/title/description), `DELETE /api/category-landing-configs/:id`. Validate category enum (13 valid categories from Feature 014), layout JSON (GridLayoutItem array), title max length 200, description is TipTap JSON object.
**Dependencies**: T003 (CategoryLandingConfigService)
**Success Criteria**: 4 routes created, authentication required, all fields validated, category enum enforced (reject invalid categories), CRUD operations work

---

## Phase 2: Canvas Infrastructure

### T006: ✅ Install react-grid-layout dependency
**File**: `frontend/package.json`
**Description**: Install react-grid-layout and @types/react-grid-layout via npm. Version: latest stable (~1.4.x). Verify no conflicts with existing dependencies (React 18, @dnd-kit). Add to package.json dependencies. Import CSS in main app file: `import 'react-grid-layout/css/styles.css'` and `import 'react-resizable/css/styles.css'`.
**Dependencies**: None
**Success Criteria**: Package installed, TypeScript types available, CSS imported, no build errors, react-grid-layout imported successfully in test file

### T007: ✅ Create WidgetRegistry
**File**: `frontend/src/components/dashboard/WidgetRegistry.ts`
**Description**: Create centralized widget registry for extensibility. Export class WidgetRegistry with static methods: `register(widget: WidgetDefinition)`, `get(id: string): WidgetDefinition | undefined`, `getAll(): WidgetDefinition[]`, `getAllByCategory(category?: CategoryName): WidgetDefinition[]`. WidgetDefinition interface: `{id, type, name, description, component, supportedSizes, defaultSize, minSize, categories?}`. Register 7 initial widgets in registry initialization block at bottom of file.
**Dependencies**: None (types from data-model.md)
**Success Criteria**: Registry exports static class, register/get/getAll methods work, 7 widgets registered (NPCSummary, LocationExplorer, FactionPower, QuestTracker, SessionTimeline, PlayerCharacters, RecentActivity), category filtering works

### T008: ✅ Create BaseWidget wrapper
**File**: `frontend/src/components/dashboard/BaseWidget.tsx`
**Description**: Create wrapper component for all dashboard widgets. Props: `{widgetId, instanceId, size, viewMode, campaignId, onRemove, onConfigure?}`. Renders widget header (title, remove button, optional configure button), widget content (from WidgetRegistry.get(widgetId).component), error boundary wrapper. Header has drag handle class for react-grid-layout. Size prop passed to child widget component. Apply size-adaptive CSS classes (widget-2x2, widget-3x3, etc).
**Dependencies**: T007 (WidgetRegistry), ErrorBoundary from completed tasks
**Success Criteria**: BaseWidget renders widget with header, drag handle works with react-grid-layout, onRemove callback fires, error boundary catches widget errors, size CSS classes applied

### T009: ✅ Create WidgetPicker modal
**File**: `frontend/src/components/dashboard/WidgetPicker.tsx`
**Description**: Create modal for selecting widgets to add. Props: `{open, onClose, onSelect: (widgetId: string) => void, existingWidgets: string[], categoryFilter?: CategoryName}`. Uses Radix UI Dialog. Fetches available widgets from WidgetRegistry.getAll() or getAll ByCategory(). Displays grid of widget cards (icon, name, description, "Add" button). Disables widgets already on canvas (check existingWidgets array). Close on Escape or Cancel button. onSelect fires with widgetId when "Add" clicked.
**Dependencies**: T007 (WidgetRegistry), @radix-ui/react-dialog (already installed)
**Success Criteria**: Modal renders widget grid, "Add" button fires onSelect with widgetId, existing widgets disabled, Escape/Cancel closes modal, accessible (focus trap, aria labels), category filter works if provided

---

## Phase 3: Canvas Services & Hooks

### T010 [P]: ✅ Create dashboardConfigService (frontend)
**File**: `frontend/src/services/dashboardConfigService.ts`
**Description**: Create frontend API service wrapping backend dashboard config endpoints (T004). Export functions: `getDashboardConfig(campaignId)`, `createDashboardConfig(campaignId, layout)`, `updateDashboardConfig(id, layout)`, `deleteDashboardConfig(id)`. Use apiClient from completed tasks (includes auth + view mode headers). Handle 404 responses (return null for getDashboardConfig). Return typed promises with DashboardConfig interface from data-model.md.
**Dependencies**: T004 (backend routes), apiClient from completed tasks
**Success Criteria**: 4 functions exported, API calls use correct endpoints, auth headers included, 404 handled gracefully, typed returns

### T011 [P]: ✅ Create categoryLandingConfigService (frontend)
**File**: `frontend/src/services/categoryLandingConfigService.ts`
**Description**: Create frontend API service wrapping backend category landing config endpoints (T005). Export functions: `getCategoryLandingConfig(campaignId, category)`, `createCategoryLandingConfig(campaignId, category, layout, title, description)`, `updateCategoryLandingConfig(id, layout, title, description)`, `deleteCategoryLandingConfig(id)`. Match pattern from T010.
**Dependencies**: T005 (backend routes), apiClient from completed tasks
**Success Criteria**: 4 functions exported, API calls correct, category parameter validated, typed returns

### T012: ✅ Create useDashboardCanvas hook
**File**: `frontend/src/hooks/useDashboardCanvas.ts`
**Description**: Create dashboard canvas state management hook. Hook signature: `useDashboardCanvas(campaignId: string)`. Manages: layout state (GridLayoutItem[]), widgets (WidgetInstance[]), loading, saving, error. Fetches config via dashboardConfigService.getDashboardConfig() on mount. Debounces layout changes (500ms) before calling updateDashboardConfig(). Returns: `{layout, widgets, addWidget(widgetId), removeWidget(instanceId), onLayoutChange(newLayout), pickerOpen, setPickerOpen, loading, saving, error, refresh}`. Creates default empty config if none exists.
**Dependencies**: T010 (dashboardConfigService), T007 (WidgetRegistry)
**Success Criteria**: Hook fetches config, manages layout state, debounces saves (500ms), addWidget generates unique instanceId, removeWidget updates layout, onLayoutChange triggers debounced save, default empty config created if needed

---

## Phase 4: Dashboard Canvas Integration

### T013: ✅ Rewrite DashboardPage with canvas
**File**: `frontend/src/components/dashboard/DashboardPage.tsx`
**Description**: **COMPLETE REWRITE** of dashboard page for canvas system. Props: `{campaignId}`. Uses useDashboardCanvas hook (T012). Renders: page header with "Add Widget" button (opens WidgetPicker), react-grid-layout GridLayout component (12 columns, 10px row height, draggable, resizable), BaseWidget (T008) for each widget in layout. ViewModeToggle in header (reuse from Feature 004). Loading state shows skeleton loaders. Empty state shows "Add Widget" prompt. Error boundary wrapper. Pass viewMode from localStorage to each BaseWidget. Responsive: 1 column mobile, 2-3 columns desktop.
**Dependencies**: T008 (BaseWidget), T009 (WidgetPicker), T012 (useDashboardCanvas hook), react-grid-layout, DashboardContext from completed tasks, ViewModeToggle from Feature 004
**Success Criteria**: Page renders canvas with react-grid-layout, widgets draggable/resizable, "Add Widget" button opens picker, widgets added/removed dynamically, layout auto-saves (debounced), view mode toggle works, responsive layout, loading/empty/error states

### T014 [P]: ✅ Update NPCSummaryWidget for size-adaptive rendering
**File**: `frontend/src/components/dashboard/NPCSummaryWidget.tsx`
**Description**: Update existing NPCSummaryWidget (completed task) to support size-adaptive rendering. Add `size: WidgetSize` prop to component signature. Conditional rendering: `size === '2x2'` shows compact view (total count, "View All" link), `size === '3x3'` or larger shows detailed view (count, relationship breakdown chart, 5 recent NPCs, link). Use React.memo for performance. Remove campaignId from props (gets from context or BaseWidget).
**Dependencies**: Existing NPCSummaryWidget from completed tasks, BaseWidgetProps interface from data-model.md
**Success Criteria**: Widget accepts size prop, renders compact view for 2x2, renders detailed view for 3x3+, memoized, no prop drilling of campaignId

### T015 [P]: ✅ Update LocationExplorerWidget for size-adaptive rendering
**File**: `frontend/src/components/dashboard/LocationExplorerWidget.tsx`
**Description**: Update existing LocationExplorerWidget for size-adaptive rendering. Same pattern as T014: add size prop, compact view (2x2) shows count + link, detailed view (3x3+) shows count + type breakdown chart + 5 recent + link. React.memo.
**Dependencies**: Existing LocationExplorerWidget from completed tasks
**Success Criteria**: Size-adaptive rendering works, memoized

### T016 [P]: ✅ Update FactionPowerWidget for size-adaptive rendering
**File**: `frontend/src/components/dashboard/FactionPowerWidget.tsx`
**Description**: Update existing FactionPowerWidget for size-adaptive rendering. Same pattern: add size prop, compact (2x2) shows count + link, detailed (3x3+) shows count + power level distribution + 5 recent + link. React.memo.
**Dependencies**: Existing FactionPowerWidget from completed tasks
**Success Criteria**: Size-adaptive rendering works, memoized

### T017 [P]: ✅ Update QuestTrackerWidget for size-adaptive rendering
**File**: `frontend/src/components/dashboard/QuestTrackerWidget.tsx`
**Description**: Update existing QuestTrackerWidget for size-adaptive rendering. Compact (2x2): active count + "View All" link. Detailed (3x3+): active/completed counts + progress bar + 5 active quests + link. React.memo.
**Dependencies**: Existing QuestTrackerWidget from completed tasks
**Success Criteria**: Size-adaptive rendering works, memoized

### T018 [P]: ✅ Update SessionTimelineWidget for size-adaptive rendering
**File**: `frontend/src/components/dashboard/SessionTimelineWidget.tsx`
**Description**: Update existing SessionTimelineWidget for size-adaptive rendering. Compact (2x2): last recap title + date + link. Detailed (3x3+): last recap (excerpt) + next prep + in-game date + 2 links. React.memo.
**Dependencies**: Existing SessionTimelineWidget from completed tasks
**Success Criteria**: Size-adaptive rendering works, memoized

### T019 [P]: ✅ Update PlayerCharactersWidget for size-adaptive rendering
**File**: `frontend/src/components/dashboard/PlayerCharactersWidget.tsx`
**Description**: Update existing PlayerCharactersWidget for size-adaptive rendering. Compact (2x2): active PC count + level range + link. Detailed (3x3+): count + level range + 5 PCs (name, player, class, level) + link. React.memo.
**Dependencies**: Existing PlayerCharactersWidget from completed tasks
**Success Criteria**: Size-adaptive rendering works, memoized

### T020 [P]: ✅ Update RecentActivityWidget for size-adaptive rendering
**File**: `frontend/src/components/dashboard/RecentActivityWidget.tsx`
**Description**: Update existing RecentActivityWidget for size-adaptive rendering. Compact (2x2): 3 most recent items + "View All" link. Detailed (3x3+): 10 most recent items with category icons + relative time. React.memo.
**Dependencies**: Existing RecentActivityWidget from completed tasks
**Success Criteria**: Size-adaptive rendering works, memoized

---

## Phase 5: Category Landing Canvas

### T021: ✅ Create CategoryLandingCanvas component
**File**: `frontend/src/components/categories/landing/CategoryLandingCanvas.tsx`
**Description**: Create constrained canvas for category landing pages (reuses dashboard canvas patterns). Props: `{campaignId, category}`. Uses useCategoryLandingCanvas hook (similar to useDashboardCanvas but for category configs). Renders react-grid-layout constrained to max-height: 50vh. BaseWidget wrapper for each widget. "Add Widget" button. WidgetPicker filters by category (WidgetRegistry.getAllByCategory(category)). Same drag/resize functionality as dashboard. Auto-saves layout via categoryLandingConfigService.
**Dependencies**: T008 (BaseWidget), T009 (WidgetPicker with category filter), T011 (categoryLandingConfigService), react-grid-layout
**Success Criteria**: Canvas renders with 50vh max height, widgets draggable/resizable, "Add Widget" opens picker filtered by category, layout auto-saves, empty state shows "Add Widget" prompt

### T022: ✅ Create CategoryLandingTextEditor component
**File**: `frontend/src/components/categories/landing/CategoryLandingTextEditor.tsx`
**Description**: Create editable title + description section for category landing pages (below canvas). Props: `{campaignId, category, initialTitle, initialDescription, onSave}`. Renders: editable title (input field, max 200 chars), TipTap editor for description (reuse from Feature 003), "Save" button (debounced 1s). Calls onSave(title, description) with TipTap JSON. Displays save indicator ("Saving...", "Saved", error message). Empty state: "Add a title and description for this category."
**Dependencies**: TipTap components from Feature 003, T011 (categoryLandingConfigService for saves)
**Success Criteria**: Title input works (max 200 chars), TipTap editor renders, saves debounced (1s), onSave callback fires with title + TipTap JSON, save indicator shows state, empty state displayed

---

## Phase 6: Sidebar & Navigation (Unchanged)

**4 tasks from original plan** - These remain unchanged from the original Feature 015 plan:

### T023: Create CategoryLink component
**File**: `frontend/src/components/sidebar/CategoryLink.tsx`
**Description**: Create category navigation link. Props: `{category, label, active, onClick}`. Renders link with category icon, themed label, and active highlight styling. Uses Link from react-router-dom for navigation.
**Dependencies**: react-router-dom
**Success Criteria**: Component renders link, icon and label displayed, active state highlighted, onClick navigates

### T024: Create TypeSection component
**File**: `frontend/src/components/sidebar/TypeSection.tsx`
**Description**: Create collapsible type section. Props: `{type, categories, collapsed, onToggle, activeCategory}`. Renders section header (type icon, label, collapse arrow), CategoryLink (T023) for each enabled category (when expanded). Animate collapse/expand transition.
**Dependencies**: T023 (CategoryLink)
**Success Criteria**: Component renders section header and links, collapse/expand animation smooth, onToggle fires, active category highlighted

### T025: Create SidebarNavigation component
**File**: `frontend/src/components/sidebar/SidebarNavigation.tsx`
**Description**: Create main sidebar container. Props: `{campaignId}`. Renders ViewModeToggle (reuse from Feature 004 or create), 4 TypeSection components (SETTING, LIVING WORLD, CAMPAIGN, EXTENDED), Wiki button at bottom. Fetches campaign settings (enabled categories, thematic labels) via GET /campaigns/{campaignId}/settings. Uses SidebarContext from completed tasks for collapse state. Uses useThematicLabels hook from completed tasks for themed labels.
**Dependencies**: SidebarContext from completed tasks, useThematicLabels from completed tasks, T024 (TypeSection), ViewModeToggle from Feature 004
**Success Criteria**: Sidebar renders 4 type sections, fetches settings, collapse state persisted, themed labels displayed, view mode toggle works

### T026: Create or extend ViewModeToggle component
**File**: `frontend/src/components/sidebar/ViewModeToggle.tsx`
**Description**: If ViewModeToggle doesn't exist from Feature 004, create it. Props: `{viewMode, onChange}`. Renders Radix UI Dropdown with "DM View" and "Player View" options. Icon indicator (eye-open for DM, eye-closed for Player). Persists change to localStorage and triggers context update. If it exists from Feature 004, verify it works in sidebar and can be imported/reused.
**Dependencies**: @radix-ui/react-dropdown-menu, InformationLevelContext from Feature 004
**Success Criteria**: Toggle renders dropdown, options selectable, onChange fires, localStorage persisted, context updated, icon displayed

---

## Phase 7: Top-Level Pages (Mostly Unchanged)

**6 tasks from original plan** - Minor updates for canvas integration:

### T027: ✅ Update CategoryLandingPageRoute component (13 category landing pages created)
**File**: `frontend/src/pages/CategoryLandingPageRoute.tsx`
**Description**: Create route page wrapper for category landing with canvas. Extracts campaignId and category from URL params (useParams). Renders: CategoryLandingCanvas (T021) at top, CategoryLandingTextEditor (T022) below canvas, SearchFilterBar + "View Table" button at bottom. Wraps in ErrorBoundary. Fetches category landing config for initial title/description.
**Dependencies**: T021 (CategoryLandingCanvas), T022 (CategoryLandingTextEditor), SearchFilterBar from completed tasks, ErrorBoundary from completed tasks, react-router-dom
**Success Criteria**: Page extracts params, renders canvas + text editor + search bar, "View Table" navigates to table view, error boundary catches errors

### T028: Create CategoryTablePageRoute component
**File**: `frontend/src/pages/CategoryTablePageRoute.tsx`
**Description**: Create route page for table view. Extracts campaignId and category from URL. Renders TableToolbar (SearchBar + FilterPanel), CategoryTable, and PaginationControls. Manages filter, sort, pagination state from URL query params (useSearchParams). Wraps in ErrorBoundary.
**Dependencies**: CategoryTable from completed tasks, TableToolbar from completed tasks, PaginationControls from completed tasks, ErrorBoundary from completed tasks, react-router-dom
**Success Criteria**: Page extracts params, renders table with filters, state synced with URL params, error boundary catches errors

### T029: Create CategoryDetailPageRoute component
**File**: `frontend/src/pages/CategoryDetailPageRoute.tsx`
**Description**: Create route page for entity detail. Extracts campaignId, category, entityId from URL. Renders EntityDetailPage component (completed tasks). Wraps in ErrorBoundary.
**Dependencies**: EntityDetailPage from completed tasks, ErrorBoundary from completed tasks, react-router-dom
**Success Criteria**: Page extracts params, renders detail page, error boundary catches errors

### T030: Create CategoryCreatePageRoute component
**File**: `frontend/src/pages/CategoryCreatePageRoute.tsx`
**Description**: Create route page for entity creation. Extracts campaignId and category from URL. Renders GenericEntityForm (completed tasks). Handles onSubmit (calls API service, navigates to detail page on success), onCancel (navigates back). Wraps in ErrorBoundary.
**Dependencies**: Category services from completed tasks, GenericEntityForm from completed tasks, ErrorBoundary from completed tasks, react-router-dom
**Success Criteria**: Page renders create form, onSubmit creates entity and navigates, onCancel navigates back, error boundary catches errors

### T031: Create CategoryEditPageRoute component
**File**: `frontend/src/pages/CategoryEditPageRoute.tsx`
**Description**: Create route page for entity editing. Extracts campaignId, category, entityId from URL. Fetches entity via API service. Renders GenericEntityForm with initialData. Handles onSubmit (updates entity, navigates to detail page), onCancel (navigates back). Wraps in ErrorBoundary.
**Dependencies**: Category services from completed tasks, GenericEntityForm from completed tasks, ErrorBoundary from completed tasks, react-router-dom
**Success Criteria**: Page fetches entity, renders edit form, onSubmit updates and navigates, onCancel navigates back, error boundary catches errors

### T032: ✅ Create DashboardPageRoute component
**File**: `frontend/src/pages/DashboardPageRoute.tsx`
**Description**: Create route page for dashboard. Extracts campaignId from URL. Renders DashboardPage component (T013 with canvas). Wraps in ErrorBoundary.
**Dependencies**: T013 (DashboardPage with canvas), ErrorBoundary from completed tasks, react-router-dom
**Success Criteria**: Page extracts params, renders dashboard with canvas, error boundary catches errors

---

## Phase 8: Route Configuration

### T033: ✅ Update AppRoutes.tsx with new routes (via App.tsx)
**File**: `frontend/src/routes/AppRoutes.tsx`
**Description**: Add routes for Feature 015 to existing router config. Routes: `/campaigns/:campaignId/dashboard` → DashboardPageRoute (T032), `/campaigns/:campaignId/:category` → CategoryLandingPageRoute (T027), `/campaigns/:campaignId/:category/table` → CategoryTablePageRoute (T028), `/campaigns/:campaignId/:category/create` → CategoryCreatePageRoute (T030), `/campaigns/:campaignId/:category/:entityId` → CategoryDetailPageRoute (T029), `/campaigns/:campaignId/:category/:entityId/edit` → CategoryEditPageRoute (T031). All routes protected (require auth from Feature 002). Use React.lazy + Suspense for code splitting.
**Dependencies**: T027-T032 (page routes), existing AppRoutes.tsx from Feature 002
**Success Criteria**: Routes added, navigation works, protected routes redirect to login if not authenticated, code splitting via lazy loading, Suspense shows loading fallback

---

## Phase 9: Testing

### T034 [P]: Test DashboardPage with canvas
**File**: `frontend/tests/components/DashboardPage.test.tsx`
**Description**: Unit test DashboardPage with canvas (T013). Test scenarios: renders canvas with react-grid-layout, "Add Widget" button opens picker, adding widget creates BaseWidget, removing widget updates layout, drag/resize updates layout, layout auto-saves (debounced), view mode toggle works, loading/empty states. Use Vitest + React Testing Library. Mock dashboardConfigService and react-grid-layout.
**Dependencies**: T013, vitest, @testing-library/react
**Success Criteria**: 8 test cases pass, coverage >80%, mocks work, debounce tested with fake timers

### T035 [P]: Test BaseWidget component
**File**: `frontend/tests/components/BaseWidget.test.tsx`
**Description**: Unit test BaseWidget (T008). Test: renders widget from registry, drag handle present, remove button calls onRemove, error boundary catches child widget errors, size CSS classes applied. Mock WidgetRegistry.
**Dependencies**: T008, vitest, @testing-library/react
**Success Criteria**: 5 test cases pass, coverage >80%

### T036 [P]: Test WidgetPicker modal
**File**: `frontend/tests/components/WidgetPicker.test.tsx`
**Description**: Unit test WidgetPicker (T009). Test: renders widget grid, "Add" button fires onSelect, existing widgets disabled, Escape closes, category filter works. Mock WidgetRegistry.
**Dependencies**: T009, vitest, @testing-library/react
**Success Criteria**: 5 test cases pass, coverage >80%

### T037 [P]: Test size-adaptive widget rendering
**File**: `frontend/tests/components/SizeAdaptiveWidgets.test.tsx`
**Description**: Unit test all 7 widgets (T014-T020) for size-adaptive rendering. For each widget: test compact view (size='2x2') shows limited content, detailed view (size='3x3') shows full content, memoization works. Mock API services.
**Dependencies**: T014-T020, vitest, @testing-library/react
**Success Criteria**: 21 test cases pass (3 per widget), coverage >80%, memoization verified

### T038 [P]: Test CategoryLandingCanvas component
**File**: `frontend/tests/components/CategoryLandingCanvas.test.tsx`
**Description**: Unit test CategoryLandingCanvas (T021). Test: renders canvas with 50vh constraint, "Add Widget" opens filtered picker, widgets draggable/resizable, layout auto-saves, category filter works. Mock categoryLandingConfigService.
**Dependencies**: T021, vitest, @testing-library/react
**Success Criteria**: 5 test cases pass, coverage >80%

### T039 [P]: Test CategoryLandingTextEditor component
**File**: `frontend/tests/components/CategoryLandingTextEditor.test.tsx`
**Description**: Unit test CategoryLandingTextEditor (T022). Test: title input works (max 200 chars), TipTap editor renders, save debounced (1s), onSave fires with title + TipTap JSON, save indicator updates. Use fake timers for debounce.
**Dependencies**: T022, vitest, @testing-library/react
**Success Criteria**: 5 test cases pass, debounce tested with fake timers

### T040 [P]: Test SidebarNavigation component
**File**: `frontend/tests/components/SidebarNavigation.test.tsx`
**Description**: Unit test SidebarNavigation (T025). Test: fetches campaign settings, renders 4 type sections, collapse/expand toggles, themed labels displayed, active category highlighted. Mock API calls.
**Dependencies**: T025, vitest, @testing-library/react
**Success Criteria**: 5 test cases pass, coverage >80%

### T041 [P]: E2E test dashboard canvas
**File**: `frontend/tests/e2e/dashboard-canvas.spec.ts`
**Description**: Playwright E2E test for dashboard canvas. Test: dashboard loads with canvas, "Add Widget" opens picker, select widget adds to canvas, drag widget updates position, resize widget updates size, remove widget, layout persists after refresh, view mode toggle hides dm_* content in widgets.
**Dependencies**: Feature 014 backend running, T001-T005 backend routes, T013 DashboardPage, Playwright setup
**Success Criteria**: E2E test passes, canvas interactions work, persistence validated, screenshots captured

### T042 [P]: E2E test category landing canvas
**File**: `frontend/tests/e2e/category-landing-canvas.spec.ts`
**Description**: Playwright E2E test for category landing canvas. Test: navigate to NPCs category, canvas renders (50vh height), add widget (category-filtered picker), edit title and description, save, verify persistence after refresh, navigate to table view.
**Dependencies**: Feature 014 backend running, T001-T005 backend routes, T021-T022 components, Playwright setup
**Success Criteria**: E2E test passes, canvas + text editor work, persistence validated

### T043 [P]: E2E test sidebar-navigation.spec.ts
**File**: `frontend/tests/e2e/sidebar-navigation.spec.ts`
**Description**: Playwright E2E test for Sidebar Navigation (reuse from original plan). Test: sidebar renders 4 type sections, collapse/expand works, navigation to NPCs landing page (now with canvas), collapse state persists across refresh, view mode toggle triggers re-fetch.
**Dependencies**: Feature 014 backend running, T023-T026 sidebar components, Playwright setup
**Success Criteria**: E2E test passes, sidebar navigation validated, persistence works

### T044 [P]: E2E test table-operations.spec.ts
**File**: `frontend/tests/e2e/table-operations.spec.ts`
**Description**: Playwright E2E test for Table Operations (reuse from original plan). Test: table columns sortable, sort direction toggles, search filters table, combined filters work (AND logic), active filter chips removable, filters persist in URL.
**Dependencies**: Feature 014 backend running, CategoryTable from completed tasks, Playwright setup
**Success Criteria**: E2E test passes, sorting and filtering validated, URL params correct

### T045 [P]: E2E test category-crud.spec.ts
**File**: `frontend/tests/e2e/category-crud.spec.ts`
**Description**: Playwright E2E test for CRUD operations (reuse from original plan). Test: create NPC form renders, required validation works, successful creation redirects to detail page, edit form pre-fills data, update saves changes, delete confirmation works.
**Dependencies**: Feature 014 backend running, GenericEntityForm from completed tasks, Playwright setup
**Success Criteria**: E2E test passes, CRUD operations validated, validation works

---

## Phase 10: Polish & Documentation

### T046: Run quickstart.md validation
**File**: `specs/015-create-the-dashboard/quickstart.md`
**Description**: Execute all test scenarios from quickstart.md (updated with canvas scenarios). Verify all acceptance criteria pass. Document any deviations or issues. Capture screenshots for visual validation of canvas interactions.
**Dependencies**: T001-T045 (all implementation and tests)
**Success Criteria**: All scenarios pass, canvas interactions validated, screenshots captured, deviations documented

### T047: Performance validation
**File**: N/A (manual testing)
**Description**: Validate performance goals from plan.md: Dashboard canvas load <2s (with 7 widgets), category landing canvas <1s, widget drag/resize <16ms (60fps), auto-save debounce works (500ms), table pagination <500ms. Use browser DevTools Performance tab. Record metrics. Optimize if needed (React.memo verified on widgets, debouncing confirmed).
**Dependencies**: T001-T045 (all implementation)
**Success Criteria**: Performance goals met, canvas interactions smooth (60fps), debouncing prevents excessive API calls, metrics documented

### T048: Accessibility audit
**File**: N/A (manual testing)
**Description**: Run accessibility audit using axe DevTools, Lighthouse, or WAVE. Verify WCAG 2.1 AA compliance: keyboard navigation (canvas focus management, widget picker keyboard nav), ARIA labels (widgets, drag handles, remove buttons), focus management (modal traps), color contrast, screen reader support (announce widget add/remove). Fix critical and serious issues.
**Dependencies**: T001-T045 (all implementation)
**Success Criteria**: Accessibility score >90, critical issues fixed, keyboard navigation works (Tab through widgets, Enter to remove), screen reader announces changes, focus trap in modals

### T049: Update CLAUDE.md with Feature 015 canvas
**File**: `CLAUDE.md`
**Description**: Run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md with Feature 015 canvas technologies and recent changes. Add: react-grid-layout, dashboard canvas with drag/drop, size-adaptive widgets, category landing canvas, TanStack Table v8, React Hook Form, Zod, 13 category services, 45+ components. Keep under 150 lines.
**Dependencies**: T001-T048 (all implementation complete)
**Success Criteria**: CLAUDE.md updated, Feature 015 technologies added (including canvas), recent changes section updated, file under 150 lines

---

## Task Summary

**Total Tasks**: 49 (canvas transition only)

**By Phase**:
- **Backend Canvas Support**: 5 tasks (T001-T005) [5 parallel]
- **Canvas Infrastructure**: 4 tasks (T006-T009) [T007-T009 parallel after T006]
- **Canvas Services & Hooks**: 3 tasks (T010-T012) [T010-T011 parallel, T012 depends on T010]
- **Dashboard Canvas Integration**: 8 tasks (T013-T020) [T013 sequential, T014-T020 parallel widget updates]
- **Category Landing Canvas**: 2 tasks (T021-T022) [sequential]
- **Sidebar & Navigation**: 4 tasks (T023-T026) [T023 parallel, rest sequential]
- **Top-Level Pages**: 6 tasks (T027-T032) [can be parallel after dependencies]
- **Route Configuration**: 1 task (T033) [sequential]
- **Testing**: 12 tasks (T034-T045) [8 unit tests parallel, 4 E2E tests parallel]
- **Polish**: 4 tasks (T046-T049) [sequential]

**Maximum Parallelization**: 23 tasks can run in parallel (5 backend + 3 canvas infra + 2 services + 7 widget updates + 8 unit tests + 4 E2E tests)

**Estimated Time**: 25-35 hours (10-15 hours implementation, 8-10 hours testing, 5-10 hours polish)

---

## Dependencies Graph

```
Backend Canvas (T001-T005) → Canvas Infrastructure (T006-T009)
                           ↓
         Canvas Services & Hooks (T010-T012)
                           ↓
    Dashboard Canvas Integration (T013-T020)
                           ↓
        Category Landing Canvas (T021-T022)
                           ↓
         Sidebar & Navigation (T023-T026)
                           ↓
            Top-Level Pages (T027-T032)
                           ↓
          Route Configuration (T033)
                           ↓
               Testing (T034-T045)
                           ↓
              Polish (T046-T049)
```

**Critical Path**: T001-T005 → T006-T009 → T010-T012 → T013 → T021 → T027-T033 → T034-T045 → T046-T049

---

**Status**: ✅ Tasks ready for canvas implementation - 49 focused tasks, dependency order validated, parallel execution optimized
