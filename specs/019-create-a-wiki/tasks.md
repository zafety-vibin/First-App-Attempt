# Tasks: Wiki Portal

**Feature**: 019-create-a-wiki
**Branch**: `019-create-a-wiki`
**Estimated Time**: 36-44 hours

## Overview

This tasks.md implements Feature 019's Wiki Portal that preserves Feature 003's card-based architecture as optional GM organizational tool, separate from database-centric system (Features 014+). Wiki accessed via sidebar button → `/campaign/:id/wiki` route with "Back to Dashboard" state preservation. Reuses TipTap rich text, SlashCommandPalette, DatabaseView embeds, information level filtering from Features 003-004. New backend: 3 tables (wiki_cards, wiki_hierarchy, wiki_card_versions), WikiCardService, 7 API endpoints. New frontend: WikiPortal wrapper, WikiCardTree, WikiCardEditor, route navigation. Key differentiator: Wiki content explicitly excluded from AI context engineering (AI tools query databases only, NOT wiki).

**Key Components**:
- **Backend**: 3 tables, 2 models (WikiCard, WikiHierarchy), WikiCardService (separate from CardService), 7 API endpoints
- **Frontend**: 4 new components (WikiPortal, WikiCardTree, WikiCardEditor, WikiBreadcrumbs), 3 hooks (useWikiCards, useWikiHierarchy, usePortalState), route integration
- **Reuse**: TipTap 2.x, @dnd-kit, SlashCommandPalette, DatabaseView, InformationLevelContext, ViewModeContext
- **Performance**: <200ms card creation, <100ms rich text render (5000 words), <150ms hierarchy navigation

---

## Phase 3.1: Backend TDD - Contract Tests

### T001 [P]: Write contract test for GET /wiki/cards
**File**: `backend/tests/contract/wiki-cards.test.ts`
**Description**: Write contract test for GET /api/campaigns/:id/wiki/cards endpoint. Test scenarios: (1) Return all wiki cards for campaign with hierarchy array. (2) Filter by viewMode=dm_view returns all cards including dm_secret. (3) Filter by viewMode=player_view excludes dm_secret cards. (4) Empty campaign returns empty arrays. (5) 401 unauthorized without token. (6) 403 forbidden for non-owner. Use Vitest + Supertest. Tests MUST FAIL initially (no implementation yet). Match OpenAPI schema from contracts/wiki-cards.yaml lines 23-62.
**Dependencies**: None (first task)
**Success Criteria**: 6 test cases written, all tests fail with "endpoint not found", response schemas validated (cards array, hierarchy array)

---

### T002 [P]: Write contract tests for POST /wiki/cards and GET /wiki/cards/:cardId
**File**: `backend/tests/contract/wiki-cards.test.ts`
**Description**: Write contract tests for wiki card creation and single card retrieval. (1) POST: Create wiki card with title, content (TipTap JSON), player_knowledge, return 201 with auto-populated id/timestamps/version=1. (2) POST: Create card with parent_wiki_card_id, verify hierarchy entry created. (3) POST: 400 validation error for title > 500 chars. (4) POST: Default player_knowledge to common_knowledge if omitted. (5) GET single: Return card with breadcrumbs array showing ancestor path. (6) GET single: 404 for non-existent card. Use Vitest + Supertest. Tests MUST FAIL initially. Match OpenAPI schemas from contracts/wiki-cards.yaml lines 64-126.
**Dependencies**: None (parallel with T001)
**Success Criteria**: 6 test cases written, all fail, breadcrumbs structure validated, version=1 on creation

---

### T003 [P]: Write contract tests for PATCH /wiki/cards/:cardId and DELETE
**File**: `backend/tests/contract/wiki-cards.test.ts`
**Description**: Write contract tests for wiki card updates and deletion. (1) PATCH: Update title, verify updated_at timestamp changes, version increments. (2) PATCH: Update content (TipTap JSON), create backup in wiki_card_versions table. (3) PATCH: Update player_knowledge field. (4) PATCH: 400 for title > 500 chars. (5) DELETE with childAction=cascade: delete card + all descendants. (6) DELETE with childAction=orphan: delete card, children become root (parent=NULL). (7) DELETE: 204 No Content on success. Use Vitest + Supertest. Tests MUST FAIL initially. Match OpenAPI schemas from contracts/wiki-cards.yaml lines 128-197.
**Dependencies**: None (parallel with T001, T002)
**Success Criteria**: 7 test cases written, all fail, version backup validated, cascade vs orphan tested

---

### T004 [P]: Write contract tests for POST /wiki/cards/:cardId/move and POST /wiki/cards/reorder
**File**: `backend/tests/contract/wiki-cards.test.ts`
**Description**: Write contract tests for hierarchy operations. (1) POST move: Move card to new parent, verify hierarchy updated. (2) POST move: 400 circular reference detection (cannot move card under its own descendant). (3) POST move: Move to root (new_parent_wiki_card_id=null). (4) POST move: Update order_index for sibling position. (5) POST reorder: Reorder 3 siblings, verify all order_index values updated in single transaction. (6) POST reorder: 400 for non-sibling cards (different parents). Use Vitest + Supertest. Tests MUST FAIL initially. Match OpenAPI schemas from contracts/wiki-cards.yaml lines 199-295.
**Dependencies**: None (parallel with T001-T003)
**Success Criteria**: 6 test cases written, all fail, circular reference error validated, transaction rollback tested

---

## Phase 3.2: Backend Implementation - Database Layer

### T005: Create migration 019-wiki-portal.sql
**File**: `backend/src/db/migrations/019-wiki-portal.sql`
**Description**: Create SQLite migration for 3 wiki tables. (1) **wiki_cards**: wiki_card_id (PK), campaign_id (FK CASCADE), user_id (FK SET NULL), title (TEXT, CHECK length<=500), content (TEXT nullable, TipTap JSON), player_knowledge (TEXT, CHECK enum), version (INTEGER default 1), created_at, updated_at. (2) **wiki_hierarchy**: wiki_hierarchy_id (PK), parent_wiki_card_id (FK CASCADE nullable), child_wiki_card_id (FK CASCADE NOT NULL), order_index (INTEGER), created_at. Add UNIQUE constraint (parent, child), CHECK constraint (parent != child). (3) **wiki_card_versions**: version_id (PK), wiki_card_id (FK CASCADE), title, content, player_knowledge, version, created_at. Create 7 indexes: wiki_cards(campaign_id), wiki_cards(campaign_id, player_knowledge), wiki_cards(user_id), wiki_cards(updated_at DESC), wiki_hierarchy(parent_wiki_card_id), wiki_hierarchy(child_wiki_card_id), wiki_hierarchy(parent_wiki_card_id, order_index). Copy SQL from data-model.md lines 487-546. Add BEGIN/COMMIT transaction wrapper.
**Dependencies**: T001-T004 (contract tests written)
**Success Criteria**: Migration creates 3 tables with correct schemas, CHECK constraints enforce enums and title length, UNIQUE/FK constraints applied, 7 indexes created, migration runs successfully

---

### T006 [P]: Create WikiCard model
**File**: `backend/src/models/WikiCard.ts`
**Description**: Create TypeScript model for WikiCard entity. Define WikiCard interface with wiki_card_id (number), campaign_id (number), user_id (string), title (string max 500), content (string | null for TipTap JSON), player_knowledge (enum 'dm_secret' | 'player_knowledge' | 'common_knowledge'), version (number), created_at (number), updated_at (number). Define CreateWikiCardPayload interface. Define UpdateWikiCardPayload interface. Add CRUD methods: create(), findById(), findByCampaignId(), updateContent(), delete(), createVersionBackup(). Copy TypeScript interfaces from data-model.md lines 135-176. Implement validation for title length (max 500) and player_knowledge enum.
**Dependencies**: T005 (migration created)
**Success Criteria**: Model file created, TypeScript types match database schema, validation methods implemented, no compilation errors

---

### T007 [P]: Create WikiHierarchy model
**File**: `backend/src/models/WikiHierarchy.ts`
**Description**: Create TypeScript model for WikiHierarchy entity. Define WikiHierarchy interface with wiki_hierarchy_id (number), parent_wiki_card_id (number | null), child_wiki_card_id (number), order_index (number), created_at (number). Define CreateWikiHierarchyPayload and MoveWikiCardPayload interfaces. Add CRUD methods: create(), findByParent(), findByChild(), move(), reorder(), delete(). Add helper method: getBreadcrumbs(childId): Promise<WikiCard[]> using recursive CTE to get ancestor chain. Copy TypeScript interfaces from data-model.md lines 183-218. Implement CASCADE delete behavior.
**Dependencies**: T005 (migration created), T006 (WikiCard model for type reference)
**Success Criteria**: Model file created, TypeScript types match database schema, getBreadcrumbs() recursive query implemented, CASCADE delete documented

---

## Phase 3.3: Backend Implementation - Services Layer

### T008: Create WikiCardService
**File**: `backend/src/services/WikiCardService.ts`
**Description**: Create service for wiki card operations separate from CardService (clean architectural boundary). Implement listCards(campaignId, viewMode): Promise<{cards, hierarchy}> method that queries wiki_cards + wiki_hierarchy tables with information level filtering (viewMode='player_view' excludes dm_secret). Implement createCard(campaignId, userId, payload): Promise<WikiCard> method that inserts card with version=1 and optionally creates hierarchy entry if parent_wiki_card_id provided. Implement updateCard(cardId, updates): Promise<WikiCard> method that creates version backup in wiki_card_versions before update (keep only 1 backup per card), increments version, refreshes updated_at. Implement deleteCard(cardId, childAction): Promise<void> method with cascade (delete descendants) vs orphan (set children parent=NULL) logic. Implement moveCard(cardId, newParentId): Promise<void> method with validateCircularReference() using recursive CTE from data-model.md lines 466-481. Implement reorderSiblings(parentId, cardOrders): Promise<void> with transaction. Add comment: `// IMPORTANT: WikiCardService is NEVER called by AI tools (Features 017/018) - wiki excluded from canon context`. Copy validation patterns from research.md decision 11.
**Dependencies**: T006 (WikiCard model), T007 (WikiHierarchy model)
**Success Criteria**: WikiCardService created, all 6 methods implemented, circular reference validation works, version backup creates 1-deep history, information filtering applied, comment about AI exclusion added

---

## Phase 3.4: Backend Implementation - API Layer

### T009: Create wiki-cards.ts routes
**File**: `backend/src/routes/wiki-cards.ts`
**Description**: Create Express router for 7 wiki endpoints matching contracts/wiki-cards.yaml. (1) GET /campaigns/:id/wiki/cards: call WikiCardService.listCards() with viewMode query param, return {cards, hierarchy}. (2) POST /campaigns/:id/wiki/cards: validate request body (title required, max 500 chars), call WikiCardService.createCard(), return 201. (3) GET /campaigns/:id/wiki/cards/:cardId: call WikiCardService.findById() + WikiHierarchy.getBreadcrumbs(), return {card, breadcrumbs}. (4) PATCH /campaigns/:id/wiki/cards/:cardId: validate updates, call WikiCardService.updateCard(), return updated card. (5) DELETE /campaigns/:id/wiki/cards/:cardId: call WikiCardService.deleteCard() with childAction query param, return 204. (6) POST /campaigns/:id/wiki/cards/:cardId/move: validate new_parent_wiki_card_id, call WikiCardService.moveCard() with circular validation, return 200 or 400 circular error. (7) POST /campaigns/:id/wiki/cards/reorder: validate card_orders array, call WikiCardService.reorderSiblings(), return {updated_count}. Add Keycloak authentication middleware. Add campaign ownership validation. Register router in backend/src/server.ts. Copy error handling patterns from contracts/wiki-cards.yaml responses.
**Dependencies**: T008 (WikiCardService)
**Success Criteria**: 7 endpoints implemented, routes registered, request validation applied, error responses match OpenAPI schemas, Keycloak auth required, campaign ownership checked

---

### T010: Fix failing backend contract tests
**File**: `backend/tests/contract/wiki-cards.test.ts`
**Description**: Run backend contract tests from T001-T004 and verify all tests now pass with implemented routes. Fix any schema mismatches or response format issues. Test GET with viewMode=player_view filtering. Test POST creates hierarchy when parent_wiki_card_id provided. Test PATCH increments version and creates backup. Test DELETE cascade vs orphan behaviors. Test POST move circular reference detection. Test POST reorder transaction. Verify breadcrumbs structure in GET single card. Verify 401/403/404 error codes. Add test data cleanup (delete test wiki cards, CASCADE deletes hierarchy).
**Dependencies**: T009 (routes implemented)
**Success Criteria**: All 25+ contract tests pass, view mode filtering works, version backup validated, circular reference blocked, cascade/orphan tested, test cleanup successful

---

## Phase 3.5: Backend Integration Tests

### T011: Write integration test for AI context exclusion validation (Scenario 6)
**File**: `backend/tests/integration/wiki-ai-exclusion.test.ts`
**Description**: Write integration test for Scenario 6 from quickstart.md lines 227-265. (1) Create 10 wiki cards with detailed world-building content. (2) Create 15 database NPCs (via Feature 014 services). (3) Call Feature 018 ExternalAPIService (or Feature 011 MCPServer) query for "all NPCs". (4) Verify query executes against npcs table only. (5) Verify wiki_cards table NOT queried (check database query logs or service method calls). (6) Verify result returns 15 database NPCs, NOT wiki cards. (7) Use Feature 017 ImportService to upload session recap file. (8) Verify import writes to database tables (session_recaps, npcs, etc.), NOT wiki_cards. (9) Check MCP tool logs if Feature 011 implemented. (10) Verify service layer comments state "wiki excluded from AI context". Use Vitest + Supertest. Copy test steps from quickstart.md Scenario 6.
**Dependencies**: T010 (contract tests passing)
**Success Criteria**: Integration test passes, AI services query databases only, wiki_cards never queried, service-layer exclusion enforced

---

### T012: Write integration test for separate storage validation (Scenario 7)
**File**: `backend/tests/integration/wiki-separate-storage.test.ts`
**Description**: Write integration test for Scenario 7 from quickstart.md lines 268-317. (1) Create 8 wiki cards and 12 database NPCs. (2) Delete wiki card, verify wiki_cards count decrements, npcs unchanged. (3) Delete NPC, verify npcs count decrements, wiki_cards unchanged. (4) Verify FK constraints: wiki_cards.campaign_id → campaigns, npcs.campaign_id → campaigns. (5) Test campaign deletion CASCADE: delete campaign, verify all wiki_cards and all npcs deleted, no orphaned data. (6) Verify separate ID spaces: create wiki card and NPC with same name, verify different ID values (wiki_card_id vs npc_id), no conflicts. (7) Test backup/restore: export database file, verify includes both wiki_cards and npcs tables, restore and verify data integrity. Use Vitest + Supertest. Copy test steps from quickstart.md Scenario 7.
**Dependencies**: T010 (contract tests passing)
**Success Criteria**: Integration test passes, wiki and database operations independent, CASCADE works, ID spaces separate, backup includes both

---

### T013: Write integration test for hierarchy operations (Scenario 3)
**File**: `backend/tests/integration/wiki-hierarchy.test.ts`
**Description**: Write integration test for Scenario 3 from quickstart.md lines 97-140. (1) Create 3 root wiki cards: "World Building", "Geography", "History". (2) Nest "Geography" under "World Building" via POST /move, verify wiki_hierarchy entry created. (3) Create "Regions" card, nest under "Geography", verify 2-level hierarchy. (4) Attempt to move "World Building" under "Regions" (circular reference), verify 400 error "Circular reference detected", hierarchy unchanged. (5) Reorder siblings: drag "History" above "Geography" via POST /reorder, verify order_index values updated. (6) Delete "World Building" with childAction=cascade, verify all descendants deleted ("Geography", "Regions"). (7) Delete "History" with childAction=orphan, verify children become root (parent=NULL). (8) Test breadcrumb navigation: create A → B → C hierarchy, call GET /wiki/cards/:cId, verify breadcrumbs array shows ["A", "B", "C"]. Use Vitest + Supertest. Copy test steps from quickstart.md Scenario 3.
**Dependencies**: T010 (contract tests passing)
**Success Criteria**: Integration test passes, circular reference blocked, cascade delete works, orphan works, breadcrumbs correct

---

## Phase 3.6: Frontend Foundation - Services & Hooks

### T014 [P]: Create wikiCardService API client
**File**: `frontend/src/services/wikiCardService.ts`
**Description**: Create frontend API client for wiki endpoints. Implement listWikiCards(campaignId, viewMode): Promise<{cards, hierarchy}> method that calls GET /wiki/cards. Implement createWikiCard(campaignId, payload): Promise<WikiCard> method that calls POST /wiki/cards. Implement getWikiCard(campaignId, cardId): Promise<{card, breadcrumbs}> method that calls GET /wiki/cards/:id. Implement updateWikiCard(campaignId, cardId, updates): Promise<WikiCard> method that calls PATCH /wiki/cards/:id. Implement deleteWikiCard(campaignId, cardId, childAction): Promise<void> method that calls DELETE /wiki/cards/:id. Implement moveWikiCard(campaignId, cardId, newParentId, orderIndex?): Promise<void> method that calls POST /wiki/cards/:id/move. Implement reorderWikiCards(campaignId, parentId, cardOrders): Promise<void> method that calls POST /wiki/cards/reorder. Use axios with Keycloak token injection from existing apiClient. Handle 400/401/403/404 errors with user-friendly messages.
**Dependencies**: T009 (routes implemented)
**Success Criteria**: wikiCardService created, all 7 API methods implemented, token injection works, error handling added

---

### T015 [P]: Create useWikiCards hook
**File**: `frontend/src/hooks/useWikiCards.ts`
**Description**: Create React hook for wiki card state management. Implement useWikiCards(campaignId) hook that fetches wiki cards with useQuery, stores {cards, hierarchy} state. Expose methods: createCard(payload), updateCard(cardId, updates), deleteCard(cardId, childAction), refreshCards(). Integrate with ViewModeContext to pass viewMode parameter to listWikiCards API call. Handle loading states, error states. Use React Query or useState + useEffect for data fetching. Cache wiki cards by campaignId. Return {cards, hierarchy, isLoading, error, createCard, updateCard, deleteCard, refreshCards}.
**Dependencies**: T014 (wikiCardService)
**Success Criteria**: useWikiCards hook created, fetches wiki cards, integrates viewMode filtering, CRUD methods exposed, loading/error states handled

---

### T016 [P]: Create useWikiHierarchy hook
**File**: `frontend/src/hooks/useWikiHierarchy.ts`
**Description**: Create React hook for wiki hierarchy operations. Implement useWikiHierarchy(campaignId) hook that manages hierarchy state. Expose methods: moveCard(cardId, newParentId, orderIndex), reorderSiblings(parentId, cardOrders), buildTree(cards, hierarchy): WikiCardTreeNode[] to construct hierarchical tree from flat arrays. Implement getBreadcrumbs(cardId): WikiCard[] helper that traverses hierarchy to build ancestor path. Use optimistic updates for drag-and-drop (update UI immediately, revert on API error). Handle circular reference errors with user-friendly toast notification. Return {moveCard, reorderSiblings, buildTree, getBreadcrumbs, isMoving}.
**Dependencies**: T014 (wikiCardService)
**Success Criteria**: useWikiHierarchy hook created, buildTree() constructs nested structure, moveCard() with optimistic updates, circular error handling

---

### T017 [P]: Create usePortalState hook
**File**: `frontend/src/hooks/usePortalState.ts`
**Description**: Create React hook for dashboard state preservation using sessionStorage. Implement usePortalState() hook that saves/restores dashboard scroll position, filters, active category when navigating to wiki. Expose methods: saveDashboardState(state: {scrollY, filters, categoryId}), restoreDashboardState(): {scrollY, filters, categoryId} | null. Use sessionStorage API: sessionStorage.setItem('dashboardState', JSON.stringify(state)). Handle session expiry (cleared on refresh). Add cleanup on unmount. Return {saveDashboardState, restoreDashboardState, clearPortalState}.
**Dependencies**: None (independent hook)
**Success Criteria**: usePortalState hook created, sessionStorage read/write works, dashboard state preserved across wiki navigation, cleared on refresh

---

## Phase 3.7: Frontend Components

### T018: Create WikiPortal wrapper component
**File**: `frontend/src/components/WikiPortal.tsx`
**Description**: Create portal wrapper component with "Back to Dashboard" navigation. Render layout: header with "Back to Dashboard" button, breadcrumbs (if viewing specific card), main content area (Outlet for nested routes). On mount, call usePortalState().saveDashboardState() to preserve dashboard scroll/filters. On "Back to Dashboard" click, call restoreDashboardState() and navigate to /campaign/:id/dashboard with scroll restoration. Apply portal-specific styling (different background color, distinct header). Integrate with existing sidebar (highlight "Wiki" button when in wiki routes). Use React Router Outlet for nested routes (/wiki, /wiki/:cardId). Copy layout patterns from Feature 015 dashboard components.
**Dependencies**: T017 (usePortalState hook)
**Success Criteria**: WikiPortal renders, "Back to Dashboard" button works, state preservation works, nested routes supported

---

### T019 [P]: Create WikiCardTree component
**File**: `frontend/src/components/WikiCardTree.tsx`
**Description**: Create hierarchical wiki card tree component reusing CardTree patterns from Feature 003. Use useWikiCards hook to fetch cards and hierarchy. Use useWikiHierarchy().buildTree() to construct nested tree structure. Render tree with expand/collapse for nodes, drag-and-drop reordering using @dnd-kit (reuse from Feature 003). On drop, call useWikiHierarchy().moveCard() with circular reference error handling. Display card title, information level badge (dm_secret/player_knowledge/common_knowledge). Filter cards by ViewModeContext (player_view hides dm_secret). Add "New Card" button at root level. Show loading skeleton while fetching. Copy tree rendering patterns from Feature 003 CardTree component. Integrate Radix UI context menu for right-click actions (Edit, Delete, Change Information Level). Performance: virtualize tree for 100+ cards using react-window.
**Dependencies**: T015 (useWikiCards hook), T016 (useWikiHierarchy hook)
**Success Criteria**: WikiCardTree renders, drag-and-drop works, view mode filtering works, context menu functional, circular reference errors show toast

---

### T020 [P]: Create WikiCardEditor component
**File**: `frontend/src/components/WikiCardEditor.tsx`
**Description**: Create rich text editor component for wiki cards using TipTap 2.x. Reuse tiptapConfig.ts from Feature 003 (all extensions: headings, lists, tables, bold, italic, slash commands, database embeds). Load card content on mount via GET /wiki/cards/:cardId. Parse TipTap JSON and initialize editor. Implement auto-save with 30s debounce using useAutoSave hook (call updateWikiCard() in background). Show save indicator: "Saving..." / "Saved" / "Error saving". Integrate SlashCommandPalette component from Feature 003 for slash commands (/heading, /list, /table, /database). Support database embeds via custom TipTap node `databaseEmbed` that renders Feature 003 DatabaseView component. Handle information level changes via dropdown (dm_secret/player_knowledge/common_knowledge). Display version number and last updated timestamp. Add "Undo to previous version" button (load from wiki_card_versions). Copy TipTap editor patterns from Feature 003. Performance target: <100ms render for 5000 words (FR-054).
**Dependencies**: T014 (wikiCardService), Feature 003 TipTap config
**Success Criteria**: WikiCardEditor renders, TipTap loads content, auto-save works (30s debounce), slash commands work, database embeds render, version restore works

---

### T021 [P]: Create WikiBreadcrumbs component
**File**: `frontend/src/components/WikiBreadcrumbs.tsx`
**Description**: Create breadcrumb navigation component for wiki card hierarchy. Use useWikiHierarchy().getBreadcrumbs(cardId) to fetch ancestor chain. Render breadcrumbs as clickable links: "Root / Parent Card / Current Card". On breadcrumb click, navigate to /campaign/:id/wiki/:ancestorId. Show separator (/) between breadcrumb items. Highlight current card (not clickable). Use Radix UI or plain links for accessibility. Handle root cards (no breadcrumbs). Performance: <50ms render for 20-level deep hierarchy.
**Dependencies**: T016 (useWikiHierarchy hook)
**Success Criteria**: WikiBreadcrumbs renders, ancestor chain displays correctly, navigation works, root cards handled

---

## Phase 3.8: Frontend Routes & Pages

### T022: Create WikiHomePage
**File**: `frontend/src/pages/WikiHomePage.tsx`
**Description**: Create wiki root page component. Render WikiCardTree showing all root cards (parent_wiki_card_id=NULL). Add "New Wiki Card" button at top that opens card creation form. Show empty state if no wiki cards: "No wiki cards yet. Create your first card to get started." Integrate ViewModeContext for DM View / Player View toggle (reuse from Feature 015 dashboard). Display card count: "X cards in wiki". Add search/filter bar for card titles (client-side filtering). Use WikiPortal wrapper for layout. Performance: <300ms initial load for 100 cards (FR-057).
**Dependencies**: T018 (WikiPortal), T019 (WikiCardTree)
**Success Criteria**: WikiHomePage renders, WikiCardTree displays root cards, "New Card" button works, empty state shows, view mode toggle works

---

### T023: Create WikiCardPage
**File**: `frontend/src/pages/WikiCardPage.tsx`
**Description**: Create individual wiki card view/edit page. Use useParams() to get :cardId from route. Render WikiBreadcrumbs at top showing hierarchy path. Render WikiCardEditor for content editing. Show card metadata: created by user, created date, last updated, version number. Add "Delete Card" button with confirmation dialog (Radix UI). Show child cards list below editor (nested cards). Use WikiPortal wrapper for layout. Performance: <150ms navigation to card page (FR-055).
**Dependencies**: T018 (WikiPortal), T020 (WikiCardEditor), T021 (WikiBreadcrumbs)
**Success Criteria**: WikiCardPage renders, breadcrumbs display, editor loads card, delete works, child cards shown

---

### T024: Add wiki routes to AppRoutes
**File**: `frontend/src/routes/AppRoutes.tsx`
**Description**: Extend React Router configuration with wiki routes. Add nested routes under /campaign/:id: (1) /campaign/:id/wiki → WikiHomePage (root cards), (2) /campaign/:id/wiki/:cardId → WikiCardPage (individual card). Wrap wiki routes in WikiPortal layout component. Add route protection (require authentication via Keycloak). Add route guards to verify campaign ownership. Lazy load wiki pages for code splitting: const WikiHomePage = lazy(() => import('../pages/WikiHomePage')). Update sidebar navigation to highlight "Wiki" button when on wiki routes (useLocation() hook). Add "Wiki" button to sidebar with onClick navigation to /campaign/:id/wiki. Copy route protection patterns from Feature 002/015.
**Dependencies**: T022 (WikiHomePage), T023 (WikiCardPage)
**Success Criteria**: Wiki routes added to AppRoutes, nested routing works, sidebar "Wiki" button navigates correctly, route protection applied, lazy loading works

---

## Phase 3.9: Frontend Unit Tests

### T025 [P]: Write component tests for WikiCardTree
**File**: `frontend/tests/components/WikiCardTree.test.tsx`
**Description**: Write component tests for WikiCardTree. Test rendering: (1) Mock useWikiCards with 5 cards + hierarchy, verify tree renders with correct structure. (2) Test expand/collapse: click on parent card, verify children shown/hidden. (3) Test view mode filtering: mock ViewModeContext with player_view, verify dm_secret cards hidden. (4) Test drag-and-drop: simulate drag card onto new parent, verify moveCard() called. (5) Test context menu: right-click card, verify Edit/Delete/Change Level options appear. (6) Test empty state: mock empty cards array, verify "No wiki cards" message. Use Vitest + React Testing Library + @testing-library/user-event. Mock useWikiCards and useWikiHierarchy hooks.
**Dependencies**: T019 (WikiCardTree component)
**Success Criteria**: Component tests pass, tree rendering tested, drag-drop tested, view mode filtering tested, context menu tested

---

### T026 [P]: Write component tests for WikiCardEditor
**File**: `frontend/tests/components/WikiCardEditor.test.tsx`
**Description**: Write component tests for WikiCardEditor. Test rendering: (1) Mock card data with TipTap JSON content, verify editor loads content. (2) Test typing: simulate text input, verify content changes (use TipTap testing utils). (3) Test auto-save: type text, wait 30s (mock timer), verify updateWikiCard() called. (4) Test save indicator: verify "Saving..." shown during save, "Saved" after success. (5) Test slash commands: type "/", verify SlashCommandPalette appears. (6) Test version restore: click "Undo to previous version", verify content reverts. Use Vitest + React Testing Library + TipTap test utils. Mock wikiCardService and timers (vi.useFakeTimers()).
**Dependencies**: T020 (WikiCardEditor component)
**Success Criteria**: Component tests pass, editor loads content, auto-save tested, slash commands tested, version restore tested

---

### T027 [P]: Write component tests for WikiPortal
**File**: `frontend/tests/components/WikiPortal.test.tsx`
**Description**: Write component tests for WikiPortal wrapper. Test navigation: (1) Mock usePortalState hook, render WikiPortal, verify layout renders with "Back to Dashboard" button. (2) Click "Back to Dashboard", verify restoreDashboardState() called and navigate() called with /campaign/:id/dashboard. (3) Test state preservation: mock saveDashboardState() called on mount. (4) Test breadcrumbs integration: render WikiPortal with breadcrumbs prop, verify breadcrumbs display. (5) Test nested routes: render with Outlet, verify child route content appears. Use Vitest + React Testing Library. Mock usePortalState and React Router hooks (useNavigate).
**Dependencies**: T018 (WikiPortal component)
**Success Criteria**: Component tests pass, "Back to Dashboard" navigation tested, state preservation tested, nested routes tested

---

## Phase 3.10: Frontend E2E Tests

### T028: Write E2E test for portal navigation & state preservation (Scenario 1)
**File**: `frontend/tests/e2e/wiki-portal-navigation.spec.ts`
**Description**: Write Playwright E2E test for Scenario 1 from quickstart.md lines 21-53. (1) Login as GM user. (2) Navigate to campaign dashboard. (3) Scroll to specific position, apply filter. (4) Click "Wiki" button in sidebar, verify URL changes to /campaign/:id/wiki. (5) Verify "Back to Dashboard" button visible. (6) Verify wiki root cards displayed. (7) Click on wiki card, verify editor loads. (8) Click "Back to Dashboard", verify returns to dashboard with scroll position restored and filters preserved. (9) Check sessionStorage for 'dashboardState' key via page.evaluate(). Use Playwright. Copy test steps from quickstart.md Scenario 1.
**Dependencies**: T024 (routes configured), T022 (WikiHomePage)
**Success Criteria**: E2E test passes, portal navigation works, state preservation verified, sessionStorage checked

---

### T029: Write E2E test for wiki card creation & rich text editing (Scenario 2)
**File**: `frontend/tests/e2e/wiki-card-operations.spec.ts`
**Description**: Write Playwright E2E test for Scenario 2 from quickstart.md lines 58-92. (1) Navigate to wiki view. (2) Click "New Card" button. (3) Enter title "Session Planning Notes" (max 500 chars validation). (4) Open rich text editor, add H1 heading, bold text, bullet list. (5) Use slash command "/table" to insert table. (6) Wait 30s for auto-save trigger. (7) Verify save indicator shows "Saved". (8) Check database for wiki_cards row with version=1. (9) Edit content again, wait 30s. (10) Verify version increments to 2. (11) Verify wiki_card_versions table has 1 backup. Use Playwright with database queries. Copy test steps from quickstart.md Scenario 2.
**Dependencies**: T024 (routes configured), T020 (WikiCardEditor)
**Success Criteria**: E2E test passes, card creation works, rich text editing works, auto-save works, version backup created

---

### T030: Write E2E test for hierarchy operations (Scenario 3)
**File**: `frontend/tests/e2e/wiki-hierarchy-operations.spec.ts`
**Description**: Write Playwright E2E test for Scenario 3 from quickstart.md lines 97-140. (1) Create 3 root cards: "World Building", "Geography", "History". (2) Drag "Geography" onto "World Building", verify hierarchy updated. (3) Create "Regions" card, nest under "Geography", verify 2-level hierarchy. (4) Attempt to drag "World Building" under "Regions" (circular reference), verify error toast "Circular reference detected", hierarchy unchanged. (5) Reorder siblings: drag "History" above "Geography", verify order changed. (6) Delete "World Building" with cascade option, verify all descendants deleted. (7) Delete "History" with orphan option, verify children become root. (8) Test breadcrumb navigation: create A → B → C, click C, verify breadcrumbs show "A / B / C". Use Playwright with drag-and-drop API. Copy test steps from quickstart.md Scenario 3.
**Dependencies**: T024 (routes configured), T019 (WikiCardTree drag-drop)
**Success Criteria**: E2E test passes, drag-drop works, circular reference blocked, cascade/orphan tested, breadcrumbs correct

---

### T031: Write E2E test for information level filtering (Scenario 4)
**File**: `frontend/tests/e2e/wiki-information-filtering.spec.ts`
**Description**: Write Playwright E2E test for Scenario 4 from quickstart.md lines 145-187. (1) Create 5 wiki cards: "Public Lore" (common_knowledge), "Player Handout" (player_knowledge), "Secret Plot" (dm_secret), "Hidden NPC" (dm_secret), "Campaign Notes" (dm_secret). (2) View wiki in DM View mode, verify all 5 cards visible. (3) Toggle to Player View mode, verify only 2 cards visible ("Public Lore", "Player Handout"), 3 dm_secret cards hidden. (4) Select "Secret Plot" and "Hidden NPC", bulk update to player_knowledge. (5) Toggle back to Player View, verify 4 cards now visible. (6) Create new card without specifying level, verify defaults to common_knowledge. (7) Change "Campaign Notes" level with recursive option, verify parent and children updated. (8) Check database query performance: SELECT with player_knowledge filter completes <300ms for 100 cards. Use Playwright. Copy test steps from quickstart.md Scenario 4.
**Dependencies**: T024 (routes configured), T019 (WikiCardTree filtering)
**Success Criteria**: E2E test passes, view mode filtering works, bulk update works, recursive update works, performance target met

---

### T032: Write E2E test for slash commands & database embeds (Scenario 5)
**File**: `frontend/tests/e2e/wiki-slash-commands.spec.ts`
**Description**: Write Playwright E2E test for Scenario 5 from quickstart.md lines 190-224. (1) Create wiki card "NPC Reference". (2) Type "/" in editor, verify slash command palette appears <50ms (FR-056). (3) Type "database", verify palette filters to "/database". (4) Select "/database", choose "table" view. (5) Verify embedded table interface appears with "Add Column" and "Add Row" buttons. (6) Add 3 columns: Name, Role, Location. (7) Add 5 NPC rows. (8) Switch view to "kanban", verify same data renders as kanban board. (9) Add 100+ rows, verify pagination appears (FR-039). (10) Check database: verify wiki_cards.content field contains JSONB with databaseEmbed node. Use Playwright with performance timing API. Copy test steps from quickstart.md Scenario 5.
**Dependencies**: T024 (routes configured), T020 (WikiCardEditor with slash commands)
**Success Criteria**: E2E test passes, slash commands work <50ms, database embeds render, view switching works, pagination for 100+ rows

---

## Phase 3.11: Documentation & Polish

### T033: Update CLAUDE.md with Feature 019 documentation
**File**: `C:/Users/zmanl/projects/VVD-mimic/CLAUDE.md`
**Description**: Update project documentation with Feature 019 context. Add to "Active Technologies" section: "Feature 019: Wiki Portal - TipTap 2.x (reused), @dnd-kit (reused), React Router v6 (portal navigation), sessionStorage (dashboard state preservation), Better-SQLite3 (wiki_cards, wiki_hierarchy, wiki_card_versions tables), Radix UI (context menus), SlashCommandPalette (reused from Feature 003), DatabaseView embeds (reused), InformationLevelContext/ViewModeContext (reused from Feature 004)". Add to "Project Structure" section: backend tables (wiki_cards, wiki_hierarchy, wiki_card_versions), models (WikiCard, WikiHierarchy), service (WikiCardService separate from CardService), routes (wiki-cards.ts with 7 endpoints), frontend components (WikiPortal, WikiCardTree, WikiCardEditor, WikiBreadcrumbs), hooks (useWikiCards, useWikiHierarchy, usePortalState), routes (/campaign/:id/wiki). Add to "Commands" section: Navigation via sidebar "Wiki" button, "Back to Dashboard" for state restoration. Add to "Recent Changes" section: "Feature 019 (2025-01-10): Wiki Portal preserves Feature 003 card architecture as optional GM organizational tool, separate from database-centric system. Portal navigation via routes with sessionStorage state preservation. Reuses TipTap rich text, SlashCommandPalette, DatabaseView embeds, information filtering. 3 new tables (wiki_cards, wiki_hierarchy, wiki_card_versions), WikiCardService (separate from CardService), 7 API endpoints. Performance: <200ms card creation, <100ms rich text render (5000 words), <150ms hierarchy navigation. IMPORTANT: Wiki content excluded from AI context engineering - AI tools (Features 017/018) query databases only, NOT wiki."
**Dependencies**: All tasks complete
**Success Criteria**: CLAUDE.md updated with Feature 019 sections, tech stack documented, portal navigation explained, AI exclusion emphasized

---

## Parallel Execution Groups

**Maximum Parallelization**: 16 tasks can run concurrently in optimal scenario.

### Group 1: Backend Contract Tests (T001, T002, T003, T004) - 4 parallel
All contract test files for different endpoint groups are independent.

### Group 2: Backend Models (T006, T007) - 2 parallel
After T005 (migration), both models can be created in parallel.

### Group 3: Frontend Services & Hooks (T014, T015, T016, T017) - 4 parallel
All frontend service/hook files are independent.

### Group 4: Frontend Components (T019, T020, T021) - 3 parallel
After T015-T017 (hooks), WikiCardTree, WikiCardEditor, WikiBreadcrumbs are independent files.

### Group 5: Frontend Component Tests (T025, T026, T027) - 3 parallel
After components complete, all test files are independent.

---

## Task Dependency Graph

```
T001, T002, T003, T004 (contract tests) [P]
  ↓
T005 (migration)
  ↓
T006, T007 (models) [P]
  ↓
T008 (WikiCardService)
  ↓
T009 (routes)
  ↓
T010 (fix contract tests)
  ↓
T011, T012, T013 (integration tests) [P]

// Frontend parallel track
T014, T015, T016, T017 (services + hooks) [P]
  ↓
T018 (WikiPortal layout)
  ↓
T019, T020, T021 (components) [P]
  ↓
T022, T023 (pages)
  ↓
T024 (routes)
  ↓
T025, T026, T027 (component tests) [P]

// E2E tests depend on both tracks complete
T010 + T024 complete
  ↓
T028, T029, T030, T031, T032 (E2E tests) [could be parallel but sequential for stability]
  ↓
T033 (CLAUDE.md update)
```

---

## Estimated Time Breakdown

**Backend**: 18-22 hours
- Contract tests: 4 hours (T001-T004)
- Database layer: 3 hours (T005-T007)
- Services layer: 4 hours (T008)
- API layer: 2 hours (T009-T010)
- Integration tests: 5 hours (T011-T013)

**Frontend**: 16-20 hours
- Services & hooks: 4 hours (T014-T017)
- Components: 5 hours (T018-T021)
- Pages & routes: 2 hours (T022-T024)
- Component tests: 3 hours (T025-T027)
- E2E tests: 6 hours (T028-T032)

**Documentation**: 2 hours
- CLAUDE.md update: 2 hours (T033)

**Total**: 36-44 hours for complete implementation

---

## Success Criteria

✅ **All 33 tasks completed**
✅ **All tests passing**: 25+ contract tests (7 endpoint groups), 3 integration tests (AI exclusion, separate storage, hierarchy), 3 component test suites, 5 E2E scenarios
✅ **Feature workflow validated**: Portal navigation with state preservation, wiki card CRUD, hierarchy operations, information filtering, slash commands, database embeds
✅ **Performance targets met**: <200ms card creation, <100ms rich text render (5000 words), <150ms hierarchy navigation, <300ms view mode toggle (100 cards), <50ms slash command palette
✅ **Dependencies integrated**: Feature 003 TipTap/SlashCommandPalette/DatabaseView reused, Feature 004 InformationLevelContext/ViewModeContext reused, Feature 015 sidebar navigation extended
✅ **AI context exclusion enforced**: Wiki content NOT queried by Features 017/018 AI tools, service-layer comments added, integration test validates exclusion
✅ **Separate storage validated**: wiki_cards and database tables independent, CASCADE deletes work, ID spaces separate, backup includes both
✅ **Documentation updated**: CLAUDE.md with Feature 019 context, portal navigation explained, AI exclusion emphasized

---

**Status**: ✅ Tasks.md generated - 33 tasks, 36-44 hour estimate, ready for implementation
