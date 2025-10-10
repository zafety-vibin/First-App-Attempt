# Tasks: Dashboard & Navigation UI

**Feature**: 015-create-the-dashboard
**Input**: Design documents from `/specs/015-create-the-dashboard/`
**Prerequisites**: Feature 014 (Database Foundation) complete, plan.md, research.md, data-model.md, contracts/component-contracts.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: React 18, TypeScript 5.0+, TanStack Table v8, React Hook Form + Zod, Radix UI, React Router v6
   → Structure: Frontend-only feature (frontend/src/)
2. Load design documents:
   → data-model.md: 8 UI state models, 40+ component interfaces, 13 validation schemas
   → contracts/component-contracts.md: 40+ component contracts with props, renders, API calls
   → quickstart.md: 11 test scenarios (7 E2E test files)
3. Generate tasks by layer:
   → Foundation: Contexts (2), Utilities (3), Schemas (13 in 1 file)
   → API Services: 13 category service modules
   → Hooks: 6 custom hooks
   → Common Components: 5 shared UI components
   → Form Inputs: 10 field components
   → Category Components: 16 components (landing, table, forms, detail)
   → Dashboard Widgets: 7 widget components
   → Sidebar: 4 navigation components
   → Pages: 6 route pages + route config
   → Tests: Component tests + E2E tests
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Implementation before tests (UI pattern, not TDD)
5. Number tasks sequentially (T001, T002...)
6. Estimated: 60 tasks total
```

## Path Conventions
- All paths relative to `frontend/` directory
- Components: `frontend/src/components/`
- Services: `frontend/src/services/`
- Hooks: `frontend/src/hooks/`
- Contexts: `frontend/src/contexts/`
- Utils: `frontend/src/utils/`
- Tests: `frontend/tests/`

---

## Phase 3.1: Foundation Layer (Contexts, Utilities, Schemas)

### T001 [P]: Create DashboardContext
**File**: `frontend/src/contexts/DashboardContext.tsx`
**Description**: Create React Context for dashboard state management. Provides widget data state (7 widgets), loading state, error state. Export DashboardProvider component and useDashboard hook. Context wraps dashboard page and all widget components.
**Dependencies**: None
**Success Criteria**: Context created with TypeScript interface DashboardState from data-model.md, provider component renders children, hook returns context value

### T002 [P]: Create SidebarContext
**File**: `frontend/src/contexts/SidebarContext.tsx`
**Description**: Create React Context for sidebar navigation state. Manages collapse state per type section (SETTING, LIVING WORLD, CAMPAIGN, EXTENDED), active category, enabled categories from campaign settings, thematic labels. Persist collapse state to localStorage with key `sidebarCollapse_{campaignId}`. Export SidebarProvider and useSidebar hook.
**Dependencies**: None
**Success Criteria**: Context created with SidebarState interface, localStorage persistence working, cross-tab sync via storage event listener

### T003 [P]: Create thematicNames.ts utility
**File**: `frontend/src/utils/thematicNames.ts`
**Description**: Create thematic naming utility with getCategoryLabel() function. Maps 13 categories × 4 themes = 52 labels (High Fantasy, Cyberpunk, Sci-Fi, Modern). Export theme type, category name type, and lookup function. Default to category name if theme not provided.
**Dependencies**: None
**Success Criteria**: Function returns themed label (e.g., 'factions' + 'cyberpunk' → 'Corporations'), defaults correctly, TypeScript types exported

### T004 [P]: Create relationshipHelpers.ts utility
**File**: `frontend/src/utils/relationshipHelpers.ts`
**Description**: Create helper functions for foreign key relationship traversal. Functions: extractRelationships(entity, category) returns array of relationship objects with label, category, entityIds; buildRelationshipLinks(relationships, entities) merges fetched entity data. Used by RelationshipLinks component.
**Dependencies**: None
**Success Criteria**: Functions extract foreign keys and JSON array relations, return typed relationship objects

### T005 [P]: Create validationSchemas.ts
**File**: `frontend/src/utils/validationSchemas.ts`
**Description**: Create Zod validation schemas for all 13 categories. Export UniversalFieldsSchema (name, description, core_status, player_knowledge, tags, custom_fields), plus 13 category-specific schemas extending universal: NPCSchema, LocationSchema, FactionSchema, SessionRecapSchema, QuestSchema, PlayerCharacterSchema, LoreEntrySchema, WorldRuleSchema, PlanarForceSchema, SessionPrepSchema, CustomMechanicSchema, ItemSchema, CreatureSchema. Match Feature 014 database schemas from data-model.md lines 678-898.
**Dependencies**: None
**Success Criteria**: 14 Zod schemas exported, each validates required/optional fields, min/max constraints enforced, TypeScript types inferred

---

## Phase 3.2: API Services Layer (13 Category Services)

### T006 [P]: Extend apiClient.ts with view mode interceptor
**File**: `frontend/src/services/apiClient.ts`
**Description**: Extend existing Axios apiClient from Feature 002 with X-View-Mode header interceptor. Read viewMode from localStorage key `viewMode_{campaignId}` (default dm_view). Add header to all requests: `config.headers['X-View-Mode'] = viewMode`. Preserve existing auth token interceptor from Feature 002.
**Dependencies**: Feature 002 apiClient exists
**Success Criteria**: X-View-Mode header added to all API requests, viewMode persisted in localStorage, interceptor doesn't break existing auth

### T007 [P]: Create npcService.ts
**File**: `frontend/src/services/npcService.ts`
**Description**: Create API service wrapping Feature 014 NPC endpoints. Export functions: listNPCs(campaignId, filters, pagination), getNPCById(id), createNPC(data), updateNPC(id, data), deleteNPC(id), getNPCStats(campaignId). Use apiClient from T006. Return typed promises with NPC interface from data-model.md.
**Dependencies**: T006 (apiClient with view mode)
**Success Criteria**: 6 functions exported, API calls use correct endpoints (GET/POST/PUT/DELETE /npcs), filters and pagination params serialized correctly

### T008 [P]: Create locationService.ts
**File**: `frontend/src/services/locationService.ts`
**Description**: Create API service for Location endpoints. Functions: listLocations, getLocationById, createLocation, updateLocation, deleteLocation, getLocationStats. Match pattern from T007.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /locations endpoints

### T009 [P]: Create factionService.ts
**File**: `frontend/src/services/factionService.ts`
**Description**: Create API service for Faction endpoints. Functions: listFactions, getFactionById, createFaction, updateFaction, deleteFaction, getFactionStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /factions endpoints

### T010 [P]: Create sessionRecapService.ts
**File**: `frontend/src/services/sessionRecapService.ts`
**Description**: Create API service for Session Recap endpoints. Functions: listSessionRecaps, getSessionRecapById, createSessionRecap, updateSessionRecap, deleteSessionRecap, getSessionRecapStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /session-recaps endpoints

### T011 [P]: Create questService.ts
**File**: `frontend/src/services/questService.ts`
**Description**: Create API service for Quest endpoints. Functions: listQuests, getQuestById, createQuest, updateQuest, deleteQuest, getQuestStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /quests endpoints

### T012 [P]: Create playerCharacterService.ts
**File**: `frontend/src/services/playerCharacterService.ts`
**Description**: Create API service for Player Character endpoints. Functions: listPlayerCharacters, getPlayerCharacterById, createPlayerCharacter, updatePlayerCharacter, deletePlayerCharacter, getPlayerCharacterStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /player-characters endpoints

### T013 [P]: Create loreEntryService.ts
**File**: `frontend/src/services/loreEntryService.ts`
**Description**: Create API service for Lore Entry endpoints. Functions: listLoreEntries, getLoreEntryById, createLoreEntry, updateLoreEntry, deleteLoreEntry, getLoreEntryStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /lore-entries endpoints

### T014 [P]: Create worldRuleService.ts
**File**: `frontend/src/services/worldRuleService.ts`
**Description**: Create API service for World Rule endpoints. Functions: listWorldRules, getWorldRuleById, createWorldRule, updateWorldRule, deleteWorldRule, getWorldRuleStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /world-rules endpoints

### T015 [P]: Create planarForceService.ts
**File**: `frontend/src/services/planarForceService.ts`
**Description**: Create API service for Planar Force endpoints. Functions: listPlanarForces, getPlanarForceById, createPlanarForce, updatePlanarForce, deletePlanarForce, getPlanarForceStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /planar-forces endpoints

### T016 [P]: Create sessionPrepService.ts
**File**: `frontend/src/services/sessionPrepService.ts`
**Description**: Create API service for Session Prep endpoints. Functions: listSessionPreps, getSessionPrepById, createSessionPrep, updateSessionPrep, deleteSessionPrep, getSessionPrepStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /session-prep endpoints

### T017 [P]: Create customMechanicService.ts
**File**: `frontend/src/services/customMechanicService.ts`
**Description**: Create API service for Custom Mechanic endpoints. Functions: listCustomMechanics, getCustomMechanicById, createCustomMechanic, updateCustomMechanic, deleteCustomMechanic, getCustomMechanicStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /custom-mechanics endpoints

### T018 [P]: Create itemService.ts
**File**: `frontend/src/services/itemService.ts`
**Description**: Create API service for Item endpoints. Functions: listItems, getItemById, createItem, updateItem, deleteItem, getItemStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /items endpoints

### T019 [P]: Create creatureService.ts
**File**: `frontend/src/services/creatureService.ts`
**Description**: Create API service for Creature endpoints. Functions: listCreatures, getCreatureById, createCreature, updateCreature, deleteCreature, getCreatureStats.
**Dependencies**: T006
**Success Criteria**: Service exports 6 functions, calls correct /creatures endpoints

---

## Phase 3.3: Custom Hooks Layer

### T020 [P]: Create useCategory hook
**File**: `frontend/src/hooks/useCategory.ts`
**Description**: Create generic hook for category CRUD operations. Hook signature: `useCategory<T>(category: CategoryName, campaignId: string)`. Returns: `{ entities, loading, error, create, update, delete, refresh }`. Uses appropriate service from T007-T019 based on category parameter. Wraps React Query or manual state management.
**Dependencies**: T007-T019 (all category services)
**Success Criteria**: Generic hook works with any category, returns typed data, CRUD operations trigger API calls and re-fetch

### T021 [P]: Create usePagination hook
**File**: `frontend/src/hooks/usePagination.ts`
**Description**: Create pagination state management hook. Hook signature: `usePagination(initialPageSize: number)`. Returns: `{ currentPage, pageSize, totalPages, totalCount, setPage, setPageSize, setTotalCount }`. Persist pageSize to sessionStorage key `tablePageSize`. Reset to page 1 when pageSize changes.
**Dependencies**: None
**Success Criteria**: Hook manages pagination state, pageSize persisted, totalPages calculated correctly

### T022 [P]: Create useSorting hook
**File**: `frontend/src/hooks/useSorting.ts`
**Description**: Create table sorting state hook. Hook signature: `useSorting(defaultColumn: string, defaultDirection: 'asc' | 'desc')`. Returns: `{ sortColumn, sortDirection, setSorting, toggleSort(column: string) }`. Toggle cycles: null → asc → desc → asc.
**Dependencies**: None
**Success Criteria**: Hook manages sort state, toggleSort cycles correctly, state can be serialized to URL params

### T023 [P]: Create useSearchFilter hook
**File**: `frontend/src/hooks/useSearchFilter.ts`
**Description**: Create search and filter state hook with debouncing. Hook signature: `useSearchFilter()`. Returns: `{ searchText, setSearchText (debounced 300ms), filters, setFilters, clearFilters, activeFilterCount }`. Filters include: coreStatus[], playerKnowledge[], tags[], customFilters{}. Debounce search input to reduce API calls.
**Dependencies**: None
**Success Criteria**: Hook debounces search input 300ms, filters state managed, clearFilters resets to defaults

### T024: Create useThematicLabels hook
**File**: `frontend/src/hooks/useThematicLabels.ts`
**Description**: Create thematic naming lookup hook. Hook signature: `useThematicLabels(campaignId: string)`. Fetches campaign settings (theme, category_labels) via GET /campaigns/{campaignId}/settings. Returns: `{ theme, categoryLabels: Record<CategoryName, string>, getCategoryLabel(category): string, loading, error }`. Cache response in React Query or state.
**Dependencies**: T003 (thematicNames utility), apiClient
**Success Criteria**: Hook fetches campaign theme, returns themed labels, getCategoryLabel function works, data cached

### T025: Create useSidebarState hook
**File**: `frontend/src/hooks/useSidebarState.ts`
**Description**: Create sidebar collapse state management hook with localStorage persistence. Hook signature: `useSidebarState(campaignId: string)`. Returns: `{ collapseState: Record<CategoryType, boolean>, toggleSection(type: CategoryType), activeCategory, setActiveCategory }`. Persist to localStorage key `sidebarCollapse_{campaignId}`. Cross-tab sync via storage event listener.
**Dependencies**: T002 (SidebarContext)
**Success Criteria**: Hook manages collapse state per type, persists to localStorage, cross-tab sync works, activeCategory tracks current route

---

## Phase 3.4: Common Components

### T026 [P]: Create LoadingSpinner component
**File**: `frontend/src/components/common/LoadingSpinner.tsx`
**Description**: Create loading spinner component. Props: `{ size?: 'sm' | 'md' | 'lg' }`. Renders animated spinning circle icon. Use CSS animation for smooth rotation. Default size 'md'.
**Dependencies**: None
**Success Criteria**: Component renders spinner, size prop changes dimensions, animation smooth 60fps

### T027 [P]: Create SkeletonLoader component
**File**: `frontend/src/components/common/SkeletonLoader.tsx`
**Description**: Create skeleton placeholder component. Props: `{ type: 'widget' | 'table' | 'form' | 'detail' }`. Renders animated gray rectangles matching layout of specified type. Use CSS shimmer animation. Widget: 3 rectangles (title, content, footer). Table: header + 5 rows. Form: 6 fields. Detail: title + 8 field rows.
**Dependencies**: None
**Success Criteria**: Component renders skeleton matching type, shimmer animation smooth, accessible (aria-busy="true")

### T028 [P]: Create EmptyState component
**File**: `frontend/src/components/common/EmptyState.tsx`
**Description**: Create empty state component. Props: `{ icon?: ReactNode, message: string, actionLabel?: string, onAction?: () => void }`. Renders centered layout with optional icon, message text, and optional action button. Use semantic HTML for accessibility.
**Dependencies**: None
**Success Criteria**: Component renders centered message, action button calls onAction, icon displayed if provided

### T029 [P]: Create ErrorBoundary component
**File**: `frontend/src/components/common/ErrorBoundary.tsx`
**Description**: Create React error boundary component. Props: `{ children: ReactNode, fallback?: ReactNode }`. Catches errors in child components. Displays fallback UI or default error message with "Refresh Page" button. Logs errors to console with componentDidCatch. Use class component (required for error boundaries).
**Dependencies**: None
**Success Criteria**: Component catches child errors, displays fallback UI, logs to console, refresh button reloads page

### T030 [P]: Create ConfirmDialog component
**File**: `frontend/src/components/common/ConfirmDialog.tsx`
**Description**: Create confirmation dialog component using Radix UI Dialog. Props: `{ open: boolean, title: string, message: string, confirmLabel?: string, cancelLabel?: string, onConfirm: () => void, onCancel: () => void }`. Renders modal with title, message, and two buttons. Default labels: "Confirm" and "Cancel". Close on Escape key or cancel button. Used for bulk delete, single entity delete, unsaved changes warnings.
**Dependencies**: @radix-ui/react-dialog (already in project from Features 004/005)
**Success Criteria**: Dialog renders as modal, buttons call handlers, Escape key closes, accessible (focus trap, aria labels)

---

## Phase 3.5: Form Input Components

### T031 [P]: Create TextInput component
**File**: `frontend/src/components/categories/forms/TextInput.tsx`
**Description**: Create text input field component. Props: `{ name: string, label: string, value: string, onChange: (value: string) => void, error?: string, required?: boolean }`. Renders label, input field, and error message (if present). Required indicator (*) if required. Accessible labels and error association.
**Dependencies**: None
**Success Criteria**: Component renders input, onChange fires on typing, error displays below input, required indicator visible

### T032 [P]: Create TextAreaInput component
**File**: `frontend/src/components/categories/forms/TextAreaInput.tsx`
**Description**: Create textarea input component for long text. Props match TextInput. Renders label, textarea (rows=5), and error message. Auto-resize or fixed height with scrollbar.
**Dependencies**: None
**Success Criteria**: Component renders textarea, onChange fires, error displays, accessible

### T033 [P]: Create SelectInput component
**File**: `frontend/src/components/categories/forms/SelectInput.tsx`
**Description**: Create single-select dropdown component. Props: `{ name, label, value: string, options: {value: string, label: string}[], onChange, error, required }`. Renders label, native select element, and error. Empty option for nullable fields.
**Dependencies**: None
**Success Criteria**: Component renders select with options, onChange fires on selection, error displays

### T034 [P]: Create MultiSelectInput component
**File**: `frontend/src/components/categories/forms/MultiSelectInput.tsx`
**Description**: Create multi-select dropdown component. Props: `{ name, label, values: string[], options: {value: string, label: string}[], onChange: (values: string[]) => void, error }`. Renders label, multi-select UI (checkboxes or Radix UI Dropdown with checkboxes), selected chips, and error. Allow adding/removing selections.
**Dependencies**: @radix-ui/react-dropdown-menu (optional for better UX)
**Success Criteria**: Component renders multi-select, onChange fires with array, selected values shown as chips, accessible

### T035 [P]: Create NumberInput component
**File**: `frontend/src/components/categories/forms/NumberInput.tsx`
**Description**: Create number input component. Props: `{ name, label, value: number | null, onChange: (value: number | null) => void, error, min?: number, max?: number }`. Renders label, number input, and error. Validate min/max client-side. Allow null for optional fields.
**Dependencies**: None
**Success Criteria**: Component renders number input, onChange fires with parsed number, min/max validation, error displays

### T036 [P]: Create DateInput component
**File**: `frontend/src/components/categories/forms/DateInput.tsx`
**Description**: Create date picker component. Props: `{ name, label, value: string | null (ISO date), onChange: (value: string | null) => void, error }`. Renders label, date input (type="date" or custom picker), and error. Store as ISO date string.
**Dependencies**: None (use native date input or lightweight picker library)
**Success Criteria**: Component renders date picker, onChange fires with ISO string, error displays, accessible

### T037 [P]: Create RelationInput component
**File**: `frontend/src/components/categories/forms/RelationInput.tsx`
**Description**: Create foreign key relation dropdown with search. Props: `{ name, label, value: string | null, category: CategoryName, campaignId: string, onChange, error, required }`. Fetches entities from related category API. Searchable dropdown (filter by name). Display entity name in dropdown, store entity ID as value. Use appropriate service (T007-T019) based on category prop.
**Dependencies**: T007-T019 (category services)
**Success Criteria**: Component fetches related entities, searchable dropdown works, onChange fires with entity ID, error displays

### T038 [P]: Create MultiRelationInput component
**File**: `frontend/src/components/categories/forms/MultiRelationInput.tsx`
**Description**: Create multi-relation input for JSON array relations. Props: `{ name, label, values: string[], category: CategoryName, campaignId: string, onChange: (values: string[]) => void, error }`. Fetches entities from related category. Multi-select searchable dropdown. Display selected entity names as chips. Allow adding/removing.
**Dependencies**: T007-T019 (category services)
**Success Criteria**: Component fetches related entities, multi-select works, onChange fires with array of IDs, selected shown as chips

### T039 [P]: Create TagInput component
**File**: `frontend/src/components/categories/forms/TagInput.tsx`
**Description**: Create tag input with autocomplete. Props: `{ name, label, values: string[], campaignId: string, onChange: (values: string[]) => void, error }`. Text input with autocomplete suggestions (fetch existing tags from campaign via API). Display selected tags as removable chips. Allow creating new tags (free text entry).
**Dependencies**: apiClient
**Success Criteria**: Component autocompletes existing tags, allows free text, onChange fires with array, chips removable

### T040 [P]: Create InformationLevelInput component
**File**: `frontend/src/components/categories/forms/InformationLevelInput.tsx`
**Description**: Create information level dropdown component. Props: `{ name, label, value: string | null, campaignId: string, onChange, error }`. Fetches information levels from /information-levels?campaign_id={id}. Dropdown with options: null (freely accessible), system levels (common_knowledge, player_knowledge, dm_only), custom levels. Display level name in dropdown, store level name (not ID) as value per Feature 004 pattern.
**Dependencies**: apiClient (reuse InformationLevelContext from Feature 004 if available)
**Success Criteria**: Component fetches levels, dropdown displays options, null option included, onChange fires with level name

---

## Phase 3.6: Category Landing Components

### T041: Create StatisticsPanel component
**File**: `frontend/src/components/categories/landing/StatisticsPanel.tsx`
**Description**: Create category statistics panel. Props: `{ totalCount: number, statusBreakdown: Record<CoreStatus, number>, lastUpdated: number | null }`. Renders total count badge, status breakdown chips (Active: X, Archived: Y, Draft: Z), and relative timestamp ("Updated 3 hours ago"). Use CSS grid for layout.
**Dependencies**: None
**Success Criteria**: Component renders stats, relative timestamp calculated correctly, status chips styled with colors

### T042: Create RecentItemsList component
**File**: `frontend/src/components/categories/landing/RecentItemsList.tsx`
**Description**: Create recent items list component. Props: `{ items: any[], category: CategoryName, onItemClick: (id: string) => void }`. Renders list of 10 recent entities. Each item shows: name, core_status badge, updated_at (relative time). Clicking item calls onItemClick (navigate to detail page). Empty state if items.length === 0.
**Dependencies**: T028 (EmptyState for zero items)
**Success Criteria**: Component renders item list, onClick navigates, empty state shown if no items, relative time displayed

### T043: Create SearchFilterBar component
**File**: `frontend/src/components/categories/landing/SearchFilterBar.tsx`
**Description**: Create search and filter bar. Props: `{ searchText, onSearchChange, filters, onFilterChange, onClearFilters, category }`. Renders search input (debounced via T023 hook), filter dropdowns (Core Status, Player Knowledge, Tags), active filter chips (removable), "Clear All" button. Category-specific filters rendered dynamically based on category schema (e.g., Race dropdown for NPCs).
**Dependencies**: T023 (useSearchFilter hook)
**Success Criteria**: Component renders search input, filter dropdowns, active chips, clearAll resets, category-specific filters display

### T044: Create CategoryLandingPage component
**File**: `frontend/src/components/categories/landing/CategoryLandingPage.tsx`
**Description**: Create category landing page container. Props: `{ campaignId, category }`. Renders page header with themed category label (from T024 hook), "Create New [Category]" button, StatisticsPanel (T041), SearchFilterBar (T043), RecentItemsList (T042), ViewModeButtons (placeholder, Gallery/Board disabled), and CategoryTable (T045). Fetches recent items and stats via API services (T007-T019). Handles loading and error states.
**Dependencies**: T007-T019 (services), T024 (thematic labels), T041-T043, T026-T027 (loading/skeleton)
**Success Criteria**: Page renders all child components, fetches data on mount, loading skeleton shown, error boundary catches errors, themed labels displayed

---

## Phase 3.7: Table Components

### T045: Create TableColumnHeader component
**File**: `frontend/src/components/categories/table/TableColumnHeader.tsx`
**Description**: Create sortable column header. Props: `{ column: ColumnDefinition, sorted: boolean, sortDirection: 'asc' | 'desc' | null, onSort: () => void }`. Renders column label, sort arrow icon (up/down/none), and click handler. Highlight sorted column. Accessible (aria-sort).
**Dependencies**: None
**Success Criteria**: Component renders label and arrow, onSort fires on click, sorted column highlighted, accessible

### T046: Create TableRow component
**File**: `frontend/src/components/categories/table/TableRow.tsx`
**Description**: Create table row component. Props: `{ entity: any, columns: ColumnDefinition[], selected: boolean, onSelect, onClick }`. Renders checkbox cell, cells per column (use column.render if provided, else plain text), hover highlight. Clicking row (not checkbox) calls onClick.
**Dependencies**: None
**Success Criteria**: Component renders row cells, checkbox selects, onClick fires, hover highlight works

### T047: Create PaginationControls component
**File**: `frontend/src/components/categories/table/PaginationControls.tsx`
**Description**: Create pagination controls. Props: `{ currentPage, totalPages, pageSize, onPageChange, onPageSizeChange }`. Renders "Page X of Y", Previous/Next buttons (disabled at bounds), jump to page input, page size dropdown (25/50/100). Accessible keyboard navigation.
**Dependencies**: None
**Success Criteria**: Component renders controls, buttons disabled at bounds, page size dropdown works, accessible

### T048: Create BulkActionsBar component
**File**: `frontend/src/components/categories/table/BulkActionsBar.tsx`
**Description**: Create bulk actions bar. Props: `{ selectedCount, onDelete, onArchive, onChangeStatus }`. Renders when selectedCount > 0. Shows "X items selected", Delete button (opens ConfirmDialog from T030), Archive button, Change Status dropdown. Fixed position at top of table.
**Dependencies**: T030 (ConfirmDialog)
**Success Criteria**: Component appears when items selected, buttons call handlers, confirmation dialog for delete, status dropdown works

### T049: Create ViewModeButtons component
**File**: `frontend/src/components/categories/table/ViewModeButtons.tsx`
**Description**: Create view mode toggle buttons. Props: `{ currentView, onViewChange }`. Renders 3 buttons: Table (icon: grid), Gallery (icon: image), Board (icon: columns). Gallery and Board disabled with tooltip "Coming Soon" (v1). Table always active.
**Dependencies**: @radix-ui/react-tooltip (for "Coming Soon")
**Success Criteria**: Component renders 3 buttons, Table active, Gallery/Board disabled with tooltip, onClick fires for Table only

### T050: Create CategoryTable component
**File**: `frontend/src/components/categories/table/CategoryTable.tsx`
**Description**: Create generic reusable table using TanStack Table v8. Props: `{ campaignId, category, entities, columns, sortColumn, sortDirection, onSort, selectedRows, onSelectRow, onSelectAll, onRowClick }`. Renders table with TableColumnHeader (T045) for each column, TableRow (T046) for each entity, and PaginationControls (T047) at bottom. Use TanStack Table useReactTable hook. Empty state if no entities (T028). Virtualization for 50+ rows via useVirtualizer.
**Dependencies**: T028 (EmptyState), T045-T047, @tanstack/react-table
**Success Criteria**: Table renders with dynamic columns, sorting works, row selection works, pagination works, virtualization enabled for large tables, generic across all 13 categories

### T051: Create column definitions utility
**File**: `frontend/src/utils/columnDefinitions.ts`
**Description**: Create column definition generator for all 13 categories. Export function `getColumnDefinitions(category: CategoryName): ColumnDefinition[]`. Returns TanStack Table column definitions with accessor, header, cell render functions. Universal columns (Name, Core Status, Player Knowledge, Tags, Updated At) + category-specific columns. DM-only columns (dm_secrets, dm_plot_relevance, etc.) conditionally included based on viewMode.
**Dependencies**: None
**Success Criteria**: Function returns typed column definitions per category, universal + category-specific columns included, render functions format data correctly (dates, tags, relations)

---

## Phase 3.8: Form Components

### T052: Create EntityCreateForm component
**File**: `frontend/src/components/categories/forms/EntityCreateForm.tsx`
**Description**: Create entity creation form using React Hook Form + Zod. Props: `{ campaignId, category, schema: FieldSchema[], onSubmit, onCancel }`. Dynamically generates form fields from schema (uses T031-T040 input components). Validates with Zod schema from T005. Displays inline errors. "Save" and "Cancel" buttons. Loading spinner during submission. Fetch custom field definitions via GET /custom-field-definitions?campaign_id={id}&category={category}.
**Dependencies**: T005 (validation schemas), T031-T040 (input components), react-hook-form, @hookform/resolvers, zod
**Success Criteria**: Form renders dynamic fields, validation works, inline errors display, onSubmit fires with validated data, onCancel navigates away

### T053: Create EntityEditForm component
**File**: `frontend/src/components/categories/forms/EntityEditForm.tsx`
**Description**: Create entity edit form. Props: `{ campaignId, category, entityId, initialData, schema, onSubmit, onCancel }`. Same as T052 but fields pre-filled with initialData. Dirty form detection: warns user if navigating away with unsaved changes (browser beforeunload event). "Save Changes" and "Cancel" buttons.
**Dependencies**: T005, T031-T040, react-hook-form
**Success Criteria**: Form renders with pre-filled data, validation works, dirty detection warns on navigation, onSubmit fires with updated data

---

## Phase 3.9: Detail Components

### T054: Create FieldDisplay component
**File**: `frontend/src/components/categories/detail/FieldDisplay.tsx`
**Description**: Create read-only field display. Props: `{ label, value, type, category? }`. Renders label + formatted value based on type. Text: plain string. Number: formatted with commas. Date: formatted as locale date. Tags: chips. Relation: clickable link (uses category prop). Multi_relation: list of links. JSON: formatted code block with syntax highlighting.
**Dependencies**: None
**Success Criteria**: Component renders label and value, formatting correct per type, relation links navigable

### T055: Create RelationshipLinks component
**File**: `frontend/src/components/categories/detail/RelationshipLinks.tsx`
**Description**: Create relationship links section. Props: `{ relationships: { label, category, entityIds, entities? }[] }`. Renders section per relationship type. Fetches entity names via batch API call GET /{category}?ids={id1,id2,id3}. Displays clickable links to related entities. "None" if relationship array empty.
**Dependencies**: T007-T019 (services for batch fetch), T004 (relationship helpers)
**Success Criteria**: Component fetches related entity names, displays links, batch fetch efficient, "None" shown for empty, links navigate to detail pages

### T056: Create EntityDetailPage component
**File**: `frontend/src/components/categories/detail/EntityDetailPage.tsx`
**Description**: Create entity detail page. Props: `{ campaignId, category, entityId }`. Renders breadcrumb (Campaign > Category > Entity Name), entity name as title, "Edit" and "Delete" buttons, FieldDisplay (T054) for all fields (universal + category-specific + custom), RelationshipLinks (T055) for related entities. Fetches entity via GET /{category}/{entityId} with X-View-Mode header. DM fields hidden in Player View. Loading skeleton (T027) during fetch. Error boundary (T029) for errors.
**Dependencies**: T007-T019 (services), T027 (skeleton), T029 (error boundary), T054-T055, InformationLevelContext (view mode)
**Success Criteria**: Page fetches entity, renders all fields, DM fields hidden in Player View, edit button navigates to form, delete button confirms and deletes

---

## Phase 3.10: Dashboard Widgets

### T057 [P]: Create NPCSummaryWidget component
**File**: `frontend/src/components/dashboard/NPCSummaryWidget.tsx`
**Description**: Create NPC summary widget. Props: `{ campaignId }`. Fetches NPC stats via GET /npcs/stats and recent NPCs via GET /npcs?limit=5. Renders total count, relationship breakdown pie chart (ally/hostile/neutral), 5 recent NPCs (name, race, class, updated_at), "View All NPCs" link. Use React.memo for performance.
**Dependencies**: T007 (npcService), T026 (loading spinner)
**Success Criteria**: Widget fetches data, renders stats and recent items, link navigates to NPCs landing page, loading spinner shown, memoized

### T058 [P]: Create LocationExplorerWidget component
**File**: `frontend/src/components/dashboard/LocationExplorerWidget.tsx`
**Description**: Create location explorer widget. Props: `{ campaignId }`. Fetches location stats and recent locations. Renders total count, type breakdown bar chart (city/dungeon/region), 5 recent locations, "View All Locations" link. Use React.memo.
**Dependencies**: T008 (locationService), T026
**Success Criteria**: Widget fetches data, renders stats and recent items, link navigates, memoized

### T059 [P]: Create FactionPowerWidget component
**File**: `frontend/src/components/dashboard/FactionPowerWidget.tsx`
**Description**: Create faction power widget. Props: `{ campaignId }`. Fetches faction stats and recent factions. Renders total count, power level distribution (local/regional/global), 5 recent factions, "View All Factions" link. Use React.memo.
**Dependencies**: T009 (factionService), T026
**Success Criteria**: Widget fetches data, renders stats and recent items, link navigates, memoized

### T060 [P]: Create QuestTrackerWidget component
**File**: `frontend/src/components/dashboard/QuestTrackerWidget.tsx`
**Description**: Create quest tracker widget. Props: `{ campaignId }`. Fetches quest stats (counts by status) and active quests. Renders active count, completed count, progress bar (completed / total), 5 active quests, "View All Quests" link. Use React.memo.
**Dependencies**: T011 (questService), T026
**Success Criteria**: Widget fetches data, renders stats and active quests, progress bar correct, link navigates, memoized

### T061 [P]: Create SessionTimelineWidget component
**File**: `frontend/src/components/dashboard/SessionTimelineWidget.tsx`
**Description**: Create session timeline widget. Props: `{ campaignId }`. Fetches last session recap (GET /session-recaps?limit=1&sort=session_date:desc) and next session prep (GET /session-prep?status=ready&limit=1&sort=planned_date:asc). Renders last recap summary (name, date, excerpt), next prep (name, date, status), current in-game date (from last recap in_game_date_end), "View Recaps" and "View Prep" links. Use React.memo.
**Dependencies**: T010 (sessionRecapService), T016 (sessionPrepService), T026
**Success Criteria**: Widget fetches recaps and prep, renders summary, dates formatted, links navigate, memoized

### T062 [P]: Create PlayerCharactersWidget component
**File**: `frontend/src/components/dashboard/PlayerCharactersWidget.tsx`
**Description**: Create player characters widget. Props: `{ campaignId }`. Fetches PC stats (active count, level range) and 5 active PCs. Renders active count, level range ("Level 3-7"), 5 PCs (name, player_name, class, level), "View All PCs" link. Use React.memo.
**Dependencies**: T012 (playerCharacterService), T026
**Success Criteria**: Widget fetches data, renders stats and PCs, level range calculated, link navigates, memoized

### T063 [P]: Create RecentActivityWidget component
**File**: `frontend/src/components/dashboard/RecentActivityWidget.tsx`
**Description**: Create recent activity widget. Props: `{ campaignId }`. Fetches 10 most recently updated entities across ALL categories via GET /activity/recent?campaign_id={id}&limit=10. Renders list with entity name, category icon, relative time ("2 hours ago"). Clicking item navigates to entity detail page. Use React.memo.
**Dependencies**: apiClient (cross-category endpoint), T026
**Success Criteria**: Widget fetches cross-category recent activity, renders list, relative time calculated, links navigate, memoized

### T064: Create DashboardPage component
**File**: `frontend/src/components/dashboard/DashboardPage.tsx`
**Description**: Create dashboard page container. Props: `{ campaignId }`. Renders 7 widgets (T057-T063) in responsive grid layout (2-3 columns desktop, 1 column mobile). Provides DashboardContext (T001) to child widgets. ViewModeToggle in page header. Loading state shows skeleton loaders (T027) for all widgets. Error boundary (T029) catches widget errors.
**Dependencies**: T001 (DashboardContext), T027 (skeleton), T029 (error boundary), T057-T063 (widgets), ViewModeToggle (reuse from Feature 004 or create)
**Success Criteria**: Page renders 7 widgets in grid, context provides campaign data, view mode toggle works, loading skeletons shown, error boundary catches errors

---

## Phase 3.11: Sidebar Components

### T065: Create CategoryLink component
**File**: `frontend/src/components/sidebar/CategoryLink.tsx`
**Description**: Create category navigation link. Props: `{ category, label, active, onClick }`. Renders link with category icon, themed label, and active highlight styling. Uses Link from react-router-dom for navigation.
**Dependencies**: react-router-dom
**Success Criteria**: Component renders link, icon and label displayed, active state highlighted, onClick navigates

### T066: Create TypeSection component
**File**: `frontend/src/components/sidebar/TypeSection.tsx`
**Description**: Create collapsible type section. Props: `{ type, categories, collapsed, onToggle, activeCategory }`. Renders section header (type icon, label, collapse arrow), CategoryLink (T065) for each enabled category (when expanded). Animate collapse/expand transition.
**Dependencies**: T065 (CategoryLink)
**Success Criteria**: Component renders section header and links, collapse/expand animation smooth, onToggle fires, active category highlighted

### T067: Create SidebarNavigation component
**File**: `frontend/src/components/sidebar/SidebarNavigation.tsx`
**Description**: Create main sidebar container. Props: `{ campaignId }`. Renders ViewModeToggle (reuse from Feature 004 or create), 4 TypeSection components (SETTING, LIVING WORLD, CAMPAIGN, EXTENDED), Wiki button at bottom. Fetches campaign settings (enabled categories, thematic labels) via GET /campaigns/{campaignId}/settings. Uses SidebarContext (T002) for collapse state. Uses useThematicLabels (T024) for themed labels.
**Dependencies**: T002 (SidebarContext), T024 (thematic labels hook), T066 (TypeSection), ViewModeToggle
**Success Criteria**: Sidebar renders 4 type sections, fetches settings, collapse state persisted, themed labels displayed, view mode toggle works

### T068: Create or extend ViewModeToggle component
**File**: `frontend/src/components/sidebar/ViewModeToggle.tsx`
**Description**: If ViewModeToggle doesn't exist from Feature 004, create it. Props: `{ viewMode, onChange }`. Renders Radix UI Dropdown with "DM View" and "Player View" options. Icon indicator (eye-open for DM, eye-closed for Player). Persists change to localStorage and triggers context update. If it exists from Feature 004, verify it works in sidebar and can be imported/reused.
**Dependencies**: @radix-ui/react-dropdown-menu, InformationLevelContext (from Feature 004)
**Success Criteria**: Toggle renders dropdown, options selectable, onChange fires, localStorage persisted, context updated, icon displayed

---

## Phase 3.12: Top-Level Pages

### T069: Create CategoryLandingPageRoute component
**File**: `frontend/src/pages/CategoryLandingPageRoute.tsx`
**Description**: Create route page wrapper for category landing. Extracts campaignId and category from URL params (useParams). Renders CategoryLandingPage component (T044). Wraps in ErrorBoundary (T029).
**Dependencies**: T044 (CategoryLandingPage), T029, react-router-dom
**Success Criteria**: Page extracts params, renders landing page, error boundary catches errors

### T070: Create CategoryTablePageRoute component
**File**: `frontend/src/pages/CategoryTablePageRoute.tsx`
**Description**: Create route page for table view. Extracts campaignId and category from URL. Renders SearchFilterBar (T043), CategoryTable (T050), and PaginationControls (T047). Manages filter, sort, pagination state from URL query params (useSearchParams). Wraps in ErrorBoundary.
**Dependencies**: T043, T047, T050, T051 (column definitions), T029, react-router-dom
**Success Criteria**: Page extracts params, renders table with filters, state synced with URL params, error boundary catches errors

### T071: Create CategoryDetailPageRoute component
**File**: `frontend/src/pages/CategoryDetailPageRoute.tsx`
**Description**: Create route page for entity detail. Extracts campaignId, category, entityId from URL. Renders EntityDetailPage component (T056). Wraps in ErrorBoundary (T029).
**Dependencies**: T056 (EntityDetailPage), T029, react-router-dom
**Success Criteria**: Page extracts params, renders detail page, error boundary catches errors

### T072: Create CategoryCreatePageRoute component
**File**: `frontend/src/pages/CategoryCreatePageRoute.tsx`
**Description**: Create route page for entity creation. Extracts campaignId and category from URL. Renders EntityCreateForm (T052). Handles onSubmit (calls API service, navigates to detail page on success), onCancel (navigates back). Wraps in ErrorBoundary.
**Dependencies**: T007-T019 (services), T052 (EntityCreateForm), T029, react-router-dom
**Success Criteria**: Page renders create form, onSubmit creates entity and navigates, onCancel navigates back, error boundary catches errors

### T073: Create CategoryEditPageRoute component
**File**: `frontend/src/pages/CategoryEditPageRoute.tsx`
**Description**: Create route page for entity editing. Extracts campaignId, category, entityId from URL. Fetches entity via API service. Renders EntityEditForm (T053) with initialData. Handles onSubmit (updates entity, navigates to detail page), onCancel (navigates back). Wraps in ErrorBoundary.
**Dependencies**: T007-T019 (services), T053 (EntityEditForm), T029, react-router-dom
**Success Criteria**: Page fetches entity, renders edit form, onSubmit updates and navigates, onCancel navigates back, error boundary catches errors

### T074: Create DashboardPageRoute component
**File**: `frontend/src/pages/DashboardPageRoute.tsx`
**Description**: Create route page for dashboard. Extracts campaignId from URL. Renders DashboardPage component (T064). Wraps in ErrorBoundary (T029).
**Dependencies**: T064 (DashboardPage), T029, react-router-dom
**Success Criteria**: Page extracts params, renders dashboard, error boundary catches errors

---

## Phase 3.13: Route Configuration

### T075: Update AppRoutes.tsx with new routes
**File**: `frontend/src/routes/AppRoutes.tsx`
**Description**: Add routes for Feature 015 to existing router config. Routes: `/campaigns/:campaignId/dashboard` → DashboardPageRoute (T074), `/campaigns/:campaignId/:category` → CategoryLandingPageRoute (T069), `/campaigns/:campaignId/:category/table` → CategoryTablePageRoute (T070), `/campaigns/:campaignId/:category/create` → CategoryCreatePageRoute (T072), `/campaigns/:campaignId/:category/:entityId` → CategoryDetailPageRoute (T071), `/campaigns/:campaignId/:category/:entityId/edit` → CategoryEditPageRoute (T073). All routes protected (require auth from Feature 002). Use React.lazy + Suspense for code splitting.
**Dependencies**: T069-T074 (page routes), existing AppRoutes.tsx from Feature 002
**Success Criteria**: Routes added, navigation works, protected routes redirect to login if not authenticated, code splitting via lazy loading, Suspense shows loading fallback

---

## Phase 3.14: Component Tests

### T076 [P]: Test DashboardPage component
**File**: `frontend/tests/components/DashboardPage.test.tsx`
**Description**: Unit test DashboardPage (T064). Test scenarios: renders 7 widgets, fetches data on mount, loading skeleton shown during fetch, error boundary catches widget errors, view mode toggle changes context. Use Vitest + React Testing Library. Mock API calls with MSW or vitest.mock.
**Dependencies**: T064, vitest, @testing-library/react
**Success Criteria**: 5 test cases pass, coverage >80%, mocks work

### T077 [P]: Test NPCSummaryWidget component
**File**: `frontend/tests/components/NPCSummaryWidget.test.tsx`
**Description**: Unit test NPCSummaryWidget (T057). Test: fetches NPC stats, renders count and breakdown, renders 5 recent NPCs, "View All" link navigates. Mock npcService.
**Dependencies**: T057, vitest, @testing-library/react
**Success Criteria**: 4 test cases pass, coverage >80%

### T078 [P]: Test SidebarNavigation component
**File**: `frontend/tests/components/SidebarNavigation.test.tsx`
**Description**: Unit test SidebarNavigation (T067). Test: fetches campaign settings, renders 4 type sections, collapse/expand toggles, themed labels displayed, active category highlighted. Mock API calls.
**Dependencies**: T067, vitest, @testing-library/react
**Success Criteria**: 5 test cases pass, coverage >80%

### T079 [P]: Test CategoryTable component
**File**: `frontend/tests/components/CategoryTable.test.tsx`
**Description**: Unit test CategoryTable (T050). Test: renders table with columns, sorting works, row selection works, pagination controls present, empty state shown if no data, virtualization enabled for 50+ rows. Mock entity data.
**Dependencies**: T050, vitest, @testing-library/react
**Success Criteria**: 6 test cases pass, coverage >80%

### T080 [P]: Test EntityCreateForm component
**File**: `frontend/tests/components/EntityCreateForm.test.tsx`
**Description**: Unit test EntityCreateForm (T052). Test: renders dynamic fields from schema, validation errors display inline, required fields enforced, onSubmit fires with validated data, onCancel navigates. Mock React Hook Form.
**Dependencies**: T052, vitest, @testing-library/react
**Success Criteria**: 5 test cases pass, coverage >80%

### T081 [P]: Test EntityDetailPage component
**File**: `frontend/tests/components/EntityDetailPage.test.tsx`
**Description**: Unit test EntityDetailPage (T056). Test: fetches entity, renders all fields, DM fields hidden in Player View, Edit button navigates, Delete button confirms and deletes. Mock API calls and InformationLevelContext.
**Dependencies**: T056, vitest, @testing-library/react
**Success Criteria**: 5 test cases pass, coverage >80%

### T082 [P]: Test SearchFilterBar component
**File**: `frontend/tests/components/SearchFilterBar.test.tsx`
**Description**: Unit test SearchFilterBar (T043). Test: search input debounces 300ms, filter dropdowns update state, active chips displayed and removable, clearAll resets filters. Use fake timers for debounce.
**Dependencies**: T043, vitest, @testing-library/react
**Success Criteria**: 4 test cases pass, debounce works with fake timers

### T083 [P]: Test ConfirmDialog component
**File**: `frontend/tests/components/ConfirmDialog.test.tsx`
**Description**: Unit test ConfirmDialog (T030). Test: renders modal when open, Confirm button calls onConfirm, Cancel button calls onCancel, Escape key closes, focus trapped inside dialog. Test accessibility with axe.
**Dependencies**: T030, vitest, @testing-library/react, jest-axe
**Success Criteria**: 5 test cases pass, accessibility audit passes

---

## Phase 3.15: E2E Tests

### T084 [P]: E2E test dashboard.spec.ts
**File**: `frontend/tests/e2e/dashboard.spec.ts`
**Description**: Playwright E2E test for Test Scenario 1 from quickstart.md (Dashboard Widget Display). Test: dashboard loads, all 7 widgets render, counts match API responses, recent items display, links navigate to category landing pages. Use Playwright page object model.
**Dependencies**: Feature 014 backend running, Playwright setup
**Success Criteria**: E2E test passes, 7 widgets validated, links work, screenshots captured

### T085 [P]: E2E test sidebar-navigation.spec.ts
**File**: `frontend/tests/e2e/sidebar-navigation.spec.ts`
**Description**: Playwright E2E test for Test Scenario 2 (Sidebar Navigation). Test: sidebar renders 4 type sections, collapse/expand works, navigation to NPCs landing page, collapse state persists across refresh, view mode toggle triggers re-fetch.
**Dependencies**: Feature 014 backend running, Playwright setup
**Success Criteria**: E2E test passes, sidebar navigation validated, persistence works

### T086 [P]: E2E test table-operations.spec.ts
**File**: `frontend/tests/e2e/table-operations.spec.ts`
**Description**: Playwright E2E test for Test Scenarios 3-4 (Table Sorting, Search and Filter). Test: table columns sortable, sort direction toggles, search filters table, combined filters work (AND logic), active filter chips removable, filters persist in URL.
**Dependencies**: Feature 014 backend running, Playwright setup
**Success Criteria**: E2E test passes, sorting and filtering validated, URL params correct

### T087 [P]: E2E test category-crud.spec.ts
**File**: `frontend/tests/e2e/category-crud.spec.ts`
**Description**: Playwright E2E test for Test Scenarios 5-7 (Create, Edit, Validation). Test: create NPC form renders, required validation works, successful creation redirects to detail page, edit form pre-fills data, update saves changes, dirty form warns on navigation.
**Dependencies**: Feature 014 backend running, Playwright setup
**Success Criteria**: E2E test passes, CRUD operations validated, validation works

### T088 [P]: E2E test thematic-naming.spec.ts
**File**: `frontend/tests/e2e/thematic-naming.spec.ts`
**Description**: Playwright E2E test for Test Scenario 9 (Thematic Naming). Test: campaign with Cyberpunk theme shows "Corporations" (not "Factions") in sidebar, page header, breadcrumbs, form labels. API still uses /factions endpoint.
**Dependencies**: Feature 014 backend running, test campaign with Cyberpunk theme, Playwright setup
**Success Criteria**: E2E test passes, themed labels validated, API uses internal names

### T089 [P]: E2E test information-filtering.spec.ts
**File**: `frontend/tests/e2e/information-filtering.spec.ts`
**Description**: Playwright E2E test for Test Scenario 11 (Information Level Filtering). Test: DM View shows all entities and fields, Player View hides dm_only entities, Player View hides dm_* fields, dashboard widgets respect view mode, view mode persists across navigation and refresh.
**Dependencies**: Feature 014 backend running, test NPCs with dm_only player_knowledge, Playwright setup
**Success Criteria**: E2E test passes, information filtering validated, persistence works

### T090 [P]: E2E test relationship-display.spec.ts
**File**: `frontend/tests/e2e/relationship-display.spec.ts`
**Description**: Playwright E2E test for Test Scenario 10 (Location Hierarchy Display). Test: create location hierarchy (Continent → Region → City), table shows parent relationships, detail page shows parent chain, reverse relationships (children) displayed, circular reference validation prevents invalid hierarchies.
**Dependencies**: Feature 014 backend running, Playwright setup
**Success Criteria**: E2E test passes, relationships validated, circular ref blocked

---

## Phase 3.16: Polish & Documentation

### T091: Run quickstart.md validation
**File**: `specs/015-create-the-dashboard/quickstart.md`
**Description**: Execute all 11 test scenarios from quickstart.md manually or with E2E tests (T084-T090). Verify all acceptance criteria pass. Document any deviations or issues. Capture screenshots for visual validation.
**Dependencies**: T001-T090 (all implementation and tests)
**Success Criteria**: All 11 scenarios pass, screenshots captured, deviations documented

### T092: Performance validation
**File**: N/A (manual testing)
**Description**: Validate performance goals from plan.md: Dashboard load <2s (1000 entities), category landing <1s (500 entities), table pagination <500ms, entity detail <500ms, search/filter <200ms. Use browser DevTools Performance tab. Record metrics and compare to goals. Optimize if needed (React.memo, virtualization, debouncing).
**Dependencies**: T001-T090 (all implementation)
**Success Criteria**: Performance goals met or exceeded, metrics documented

### T093: Accessibility audit
**File**: N/A (manual testing)
**Description**: Run accessibility audit using axe DevTools, Lighthouse, or WAVE. Verify WCAG 2.1 AA compliance: keyboard navigation, ARIA labels, focus management, color contrast, screen reader support. Fix critical and serious issues. Document minor issues for future.
**Dependencies**: T001-T090 (all implementation)
**Success Criteria**: Accessibility score >90, critical issues fixed, keyboard navigation works, screen reader compatible

### T094: Update CLAUDE.md with Feature 015
**File**: `CLAUDE.md`
**Description**: Run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md with Feature 015 technologies and recent changes. Add: TanStack Table v8, React Hook Form, Zod, thematic naming, information filtering, 13 category services, 40+ components. Keep under 150 lines.
**Dependencies**: T001-T093 (all implementation complete)
**Success Criteria**: CLAUDE.md updated, Feature 015 technologies added, recent changes section updated, file under 150 lines

---

## Dependencies Graph

```
Foundation Layer (T001-T005) → API Services (T006-T019) → Hooks (T020-T025)
                             ↓
Common Components (T026-T030) → Form Inputs (T031-T040)
                             ↓
Category Landing (T041-T044) ← Hooks (T020-T025)
                             ↓
Table Components (T045-T051) ← Hooks (T020-T025)
                             ↓
Form Components (T052-T053) ← Form Inputs (T031-T040)
                             ↓
Detail Components (T054-T056) ← API Services (T007-T019)
                             ↓
Dashboard Widgets (T057-T064) ← API Services (T007-T019)
                             ↓
Sidebar (T065-T068) ← Contexts (T001-T002), Hooks (T024-T025)
                             ↓
Pages (T069-T074) ← All Components
                             ↓
Routes (T075) ← Pages (T069-T074)
                             ↓
Tests (T076-T090) ← All Implementation (T001-T075)
                             ↓
Polish (T091-T094) ← Tests Complete
```

**Critical Path**: T001-T005 → T006-T019 → T020-T025 → T031-T040 → T052-T053 → T069-T075 → T076-T090 → T091-T094

---

## Parallel Execution Examples

```bash
# Phase 3.1: Foundation (all parallel)
Task: "Create DashboardContext in frontend/src/contexts/DashboardContext.tsx"
Task: "Create SidebarContext in frontend/src/contexts/SidebarContext.tsx"
Task: "Create thematicNames.ts utility in frontend/src/utils/thematicNames.ts"
Task: "Create relationshipHelpers.ts utility in frontend/src/utils/relationshipHelpers.ts"
Task: "Create validationSchemas.ts in frontend/src/utils/validationSchemas.ts"

# Phase 3.2: API Services (13 parallel after T006)
Task: "Create npcService.ts in frontend/src/services/npcService.ts"
Task: "Create locationService.ts in frontend/src/services/locationService.ts"
Task: "Create factionService.ts in frontend/src/services/factionService.ts"
# ... (all 13 services T007-T019)

# Phase 3.4: Common Components (5 parallel)
Task: "Create LoadingSpinner component in frontend/src/components/common/LoadingSpinner.tsx"
Task: "Create SkeletonLoader component in frontend/src/components/common/SkeletonLoader.tsx"
Task: "Create EmptyState component in frontend/src/components/common/EmptyState.tsx"
Task: "Create ErrorBoundary component in frontend/src/components/common/ErrorBoundary.tsx"
Task: "Create ConfirmDialog component in frontend/src/components/common/ConfirmDialog.tsx"

# Phase 3.5: Form Inputs (10 parallel)
Task: "Create TextInput component in frontend/src/components/categories/forms/TextInput.tsx"
Task: "Create TextAreaInput component in frontend/src/components/categories/forms/TextAreaInput.tsx"
# ... (all 10 inputs T031-T040)

# Phase 3.10: Dashboard Widgets (7 parallel)
Task: "Create NPCSummaryWidget component in frontend/src/components/dashboard/NPCSummaryWidget.tsx"
Task: "Create LocationExplorerWidget component in frontend/src/components/dashboard/LocationExplorerWidget.tsx"
# ... (all 7 widgets T057-T063)

# Phase 3.14: Component Tests (8 parallel)
Task: "Test DashboardPage component in frontend/tests/components/DashboardPage.test.tsx"
Task: "Test NPCSummaryWidget component in frontend/tests/components/NPCSummaryWidget.test.tsx"
# ... (all 8 test files T076-T083)

# Phase 3.15: E2E Tests (7 parallel)
Task: "E2E test dashboard.spec.ts in frontend/tests/e2e/dashboard.spec.ts"
Task: "E2E test sidebar-navigation.spec.ts in frontend/tests/e2e/sidebar-navigation.spec.ts"
# ... (all 7 E2E files T084-T090)
```

---

## Task Summary

**Total Tasks**: 94
- **Foundation**: 5 tasks (T001-T005) [5 parallel]
- **API Services**: 14 tasks (T006-T019) [13 parallel after T006]
- **Hooks**: 6 tasks (T020-T025) [4 parallel, 2 sequential]
- **Common Components**: 5 tasks (T026-T030) [5 parallel]
- **Form Inputs**: 10 tasks (T031-T040) [10 parallel]
- **Category Landing**: 4 tasks (T041-T044) [sequential, depend on hooks]
- **Table Components**: 7 tasks (T045-T051) [sequential, depend on hooks]
- **Form Components**: 2 tasks (T052-T053) [sequential]
- **Detail Components**: 3 tasks (T054-T056) [sequential]
- **Dashboard Widgets**: 8 tasks (T057-T064) [7 parallel widgets + 1 page container]
- **Sidebar**: 4 tasks (T065-T068) [sequential]
- **Pages**: 6 tasks (T069-T074) [can be parallel]
- **Routes**: 1 task (T075) [sequential]
- **Component Tests**: 8 tasks (T076-T083) [8 parallel]
- **E2E Tests**: 7 tasks (T084-T090) [7 parallel]
- **Polish**: 4 tasks (T091-T094) [sequential]

**Estimated Time**: 45-55 hours (15-20 hours for implementation, 10-15 hours for testing, 5-10 hours for E2E tests, 5-10 hours for polish)

**Maximum Parallelization**: 42 tasks can run in parallel (5 foundation + 13 services + 4 hooks + 5 common + 10 inputs + 7 widgets + 8 component tests + 7 E2E tests)

---

## Validation Checklist
*GATE: Checked before implementation*

- [x] All component contracts have implementation tasks (40+ components)
- [x] All 13 API services have tasks
- [x] All 6 hooks have tasks
- [x] Component tests for critical components (8 test files)
- [x] E2E tests for all acceptance scenarios (7 E2E files covering 11 scenarios)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Dependencies clearly documented
- [x] Performance goals addressed (React.memo, virtualization, debouncing)
- [x] Accessibility addressed (T093 audit task)

---

**Status**: ✅ Tasks ready for implementation - 94 tasks generated, dependency order validated, parallel execution optimized, ready for Feature 015 execution
