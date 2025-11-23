# Tasks: Player Question Portal

**Feature**: 009-create-player-question
**Input**: Design documents from `/specs/009-create-player-question/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓
**Dependencies**:
- Feature 003 (Card Architecture) MUST be complete
- Feature 004 (ViewMode System - viewMode.ts middleware) MUST be complete
- Feature 006 (Knowledge Graphs) MUST be complete
- **Feature 008 (BYOLLM Configuration) MUST be complete** ⚠️ BLOCKING

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: Express 4.x, Better-SQLite3, React 18, bcrypt, crypto
2. Load design documents ✓
   → research.md: 6 technical decisions (crypto tokens, viewMode reuse, citations, token tracking, WAL concurrency)
   → data-model.md: 5 entities (PortalConfig, PortalPlayer, PortalConversation, PortalMessage, PortalTokenUsage)
3. Generate tasks by category ✓
   → Setup: Database migration (5 tables + indexes)
   → Models: 5 TypeScript interfaces
   → Tests: Unit tests for services, integration tests for filtering
   → Core: 6 services (Config, Player, Conversation, AI, Citations, TokenTracker)
   → Routes: 2 route files (management, public)
   → Frontend: 13 components (7 GM management + 6 player portal)
   → Integration: viewMode middleware integration, E2E tests
   → Polish: Documentation, security audit
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T055) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App - extends features 003-008)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/029-portal.sql`

---

## Phase 3.1: Database Setup & Migration

- [x] **T001** Create migration 029 for portal tables (`backend/src/db/migrations/029-add-portal-tables.sql` with 5 tables per data-model.md: portal_configs, portal_players, portal_conversations, portal_messages, portal_token_usage)
- [x] **T002** Verify migration runs successfully (`npm run migrate` or equivalent, check all tables + indexes created)

---

## Phase 3.2: Backend Models

- [x] **T003** [P] PortalConfig model (`backend/src/models/PortalConfig.ts` with TypeScript interface from data-model.md Entity 1)
- [x] **T004** [P] PortalPlayer model (`backend/src/models/PortalPlayer.ts` with TypeScript interface from data-model.md Entity 2)
- [x] **T005** [P] PortalConversation model (`backend/src/models/PortalConversation.ts` with TypeScript interface from data-model.md Entity 3)
- [x] **T006** [P] PortalMessage model (`backend/src/models/PortalMessage.ts` with TypeScript interface from data-model.md Entity 4, citations as JSON array)
- [x] **T007** [P] PortalTokenUsage model (`backend/src/models/PortalTokenUsage.ts` with TypeScript interface from data-model.md Entity 5)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Unit Tests
- [x] **T008** [P] Unit test crypto random token generation (`backend/tests/unit/PortalPlayerService-tokens.test.ts` test sessionToken is 64-char hex per research.md Topic 1)
- [x] **T009** [P] Unit test unique character name validation (`backend/tests/unit/PortalPlayerService-unique-names.test.ts` test UNIQUE(campaign_id, character_name) rejects duplicates)
- [x] **T010** [P] Unit test bcrypt password hashing (`backend/tests/unit/PortalConfigService-password.test.ts` test setPassword hashes, verifyPassword compares)
- [x] **T011** [P] Unit test citation generation (`backend/tests/unit/CitationGeneratorService.test.ts` test numbered [1][2] format with card linking per research.md Topic 4)
- [x] **T012** [P] Unit test token tracking aggregation (`backend/tests/unit/PortalTokenTrackerService.test.ts` test SQL SUM queries for per-player totals per research.md Topic 5)

### Backend Integration Tests
- [x] **T013** [P] Integration test: Portal enable → player access with password (`backend/tests/integration/portal-enable-password.integration.test.ts` test password verification flow)
- [x] **T014** [P] Integration test: Player identity with crypto token persistence (`backend/tests/integration/player-identity-token.integration.test.ts` test sessionToken lookup works)
- [x] **T015** [P] Integration test: Portal AI filtering with viewMode middleware (`backend/tests/integration/portal-filtering.integration.test.ts` test only common-knowledge + player-knowledge accessible via BaseCategoryService.list() per research.md Topic 3)
- [x] **T016** [P] Integration test: Citation links to existing card routes (`backend/tests/integration/citation-card-links.integration.test.ts` test /cards/{cardId} navigation)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Services - Portal Configuration
- [x] **T017** PortalConfigService - CRUD operations (`backend/src/services/PortalConfigService.ts` create/read/update portal configs per data-model.md Entity 1)
- [x] **T018** PortalConfigService - Password management (`backend/src/services/PortalConfigService.ts` add setPassword with bcrypt, verifyPassword methods per research.md Topic 2)
- [x] **T019** PortalConfigService - Response style configuration (`backend/src/services/PortalConfigService.ts` add setResponseStyle method with 5 options from data-model.md)

### Services - Player Identity
- [x] **T020** PortalPlayerService - Player creation with crypto tokens (`backend/src/services/PortalPlayerService.ts` generate sessionToken with crypto.randomBytes(32), check UNIQUE constraint per research.md Topic 1)
- [x] **T021** PortalPlayerService - Token lookup (`backend/src/services/PortalPlayerService.ts` add getPlayerByToken method for session verification)

### Services - Portal AI & Filtering
- [x] **T022** CitationGeneratorService (`backend/src/services/CitationGeneratorService.ts` generate() and formatResponse() methods per research.md Topic 4)
- [x] **T023** PortalTokenTrackerService (`backend/src/services/PortalTokenTrackerService.ts` record(), getPlayerUsage(), getCampaignUsage(), getPerPlayerUsage() per research.md Topic 5)
- [x] **T024** PortalAIService - Context building (`backend/src/services/PortalAIService.ts` buildContext() using SessionRecapService.list(), ItemService.list(), KnowledgeGraphService.getFilteredNodes() per research.md Topic 3. NOTE: All services use batch fetching - no N+1 risk, see backend/docs/BATCH-FETCH-TEMPLATE.md)
- [x] **T025** PortalAIService - Question answering (`backend/src/services/PortalAIService.ts` answerQuestion() integrating viewMode filtering, BYOLLMConfigService credentials, CitationGeneratorService, PortalTokenTrackerService per research.md Topic 3. BYOLLM is EXCLUSIVE to Player Portal as of 2025-11-05)

### Services - Conversations
- [x] **T026** PortalConversationService (`backend/src/services/PortalConversationService.ts` CRUD for conversations and messages, history retrieval per data-model.md Entities 3-4)

### Routes
- [x] **T027** Portal management routes (`backend/src/routes/portal-management.ts` POST /config, GET /config, PUT /enable, PUT /password, PUT /response-style, GET /monitoring)
- [x] **T028** Portal public routes (`backend/src/routes/portal-public.ts` POST /identify with sessionToken cookie, POST /ask, GET /history per research.md Topic 1)

---

## Phase 3.5: Frontend - GM Portal Management

- [ ] **T029** [P] PortalManagementPage (`frontend/src/pages/PortalManagementPage.tsx` main GM portal management page with tabs: Settings, Monitoring, Preview. Route: /campaigns/:campaignId/portal/management)
- [ ] **T030** [P] PortalSettings component (`frontend/src/components/portal/PortalSettings.tsx` enable/disable toggle, password input with show/hide, response style dropdown)
- [ ] **T031** [P] PortalMonitoring component (`frontend/src/components/portal/PortalMonitoring.tsx` display per-player token usage from getPerPlayerUsage() query)
- [ ] **T032** [P] DMPreviewMode component (`frontend/src/components/portal/DMPreviewMode.tsx` test portal with player_view filtering, shows exact filtered view)
- [ ] **T033** [P] ResponseStyleSelector component (`frontend/src/components/portal/ResponseStyleSelector.tsx` dropdown with 5 styles: friendly-sage, scholarly-tome, tavern-gossip, factual, custom + textarea)
- [ ] **T034** [P] PasswordProtection component (`frontend/src/components/portal/PasswordProtection.tsx` password set/remove UI, bcrypt strength indicator)
- [ ] **T035** [P] PublicURLDisplay component (`frontend/src/components/portal/PublicURLDisplay.tsx` display http://localhost:3000/portal/{campaign-id} with copy button)

---

## Phase 3.6: Frontend - Public Player Portal

- [x] **T036** [P] PlayerPortalPage (`frontend/src/pages/PlayerPortalPage.tsx` public player Q&A interface. Route: /portal/:campaignId - NO authentication required)
- [x] **T037** [P] PlayerIdentity component (`frontend/src/components/portal/PlayerIdentity.tsx` "Who are you in-game?" prompt, unique name validation error display)
- [x] **T038** [P] PortalChat component (`frontend/src/components/portal/PortalChat.tsx` chat interface with messages, citations display, scroll to bottom)
- [x] **T039** [P] CitationLink component (`frontend/src/components/portal/CitationLink.tsx` clickable [1] button navigating to /cards/{cardId} per research.md Topic 4)
- [x] **T040** [P] PasswordEntry component (`frontend/src/components/portal/PasswordEntry.tsx` password entry before identity prompt if portal password-protected)
- [x] **T041** [P] PortalWarning component (`frontend/src/components/portal/PortalWarning.tsx` warning: "This portal uses your GM's LLM credentials...")
- [x] **T042** [P] portalService API client (`frontend/src/services/portalService.ts` GM management endpoints: getConfig, enable, setPassword, setResponseStyle, getMonitoring)
- [x] **T043** [P] portalPublicService API client (`frontend/src/services/portalPublicService.ts` player endpoints: identify, ask, getHistory)
- [x] **T043a** Add App.tsx routing (`frontend/src/App.tsx` add 2 routes: GM management /campaigns/:campaignId/portal/management with ProtectedRoute + CampaignLayoutWrapper, public player portal /portal/:campaignId with NO auth)
- [x] **T043b** Add Sidebar tab (`frontend/src/components/navigation/Sidebar.tsx` add "Player Portal" tab under campaign sections linking to /campaigns/:campaignId/portal/management)

---

## Phase 3.7: Integration & Polish

### Integration Tasks
- [x] **T044** Integrate viewMode middleware with PortalAI (verify BaseCategoryService.list() with player_view filters correctly per research.md Topic 3)
- [x] **T045** Integrate BYOLLMConfigService credentials (verify PortalAIService uses getConfig() to get GM's LLM credentials, not separate portal credentials)
- [x] **T046** Integrate citation card linking (verify CitationLink navigates to existing /cards/{cardId} route from Feature 003)
- [x] **T047** Integrate token tracking with monitoring (verify PortalMonitoring displays getPerPlayerUsage() data)
- [x] **T048** Test unique character name enforcement (verify UNIQUE constraint error caught and displayed properly)
- [x] **T049** Test crypto sessionToken persistence (verify player sessionToken in HTTP-only cookie works across page refreshes)
- [x] **T050** Test DM Preview Mode filtering (verify shows exact player_view, no dm-secret content visible)

### Frontend Component Tests
- [x] **T051** [P] Component test PortalSettings (`frontend/tests/unit/PortalSettings.test.tsx` with Vitest + RTL, test enable toggle, password input, style selector)
- [x] **T052** [P] Component test PlayerIdentity (`frontend/tests/unit/PlayerIdentity.test.tsx` test unique name error display when UNIQUE constraint fails)
- [x] **T053** [P] Component test CitationLink (`frontend/tests/unit/CitationLink.test.tsx` test onClick navigates to /cards/{cardId})

### E2E Tests
- [x] **T054** E2E test: Complete portal flow (`frontend/tests/e2e/portal-complete-flow.spec.ts` GM enables → player identifies → asks question → receives AI response with citations)
- [x] **T055** E2E test: Password protection flow (`frontend/tests/e2e/portal-password.spec.ts` player enters correct password → access granted, wrong password → denied)
- [x] **T056** E2E test: Information filtering validation (`frontend/tests/e2e/portal-filtering.spec.ts` verify dm-secret cards NOT in portal responses, only common-knowledge + player-knowledge)
- [x] **T057** E2E test: Citation click navigation (`frontend/tests/e2e/citation-navigation.spec.ts` click [1] → navigate to card detail page)

### Documentation & Security
- [x] **T058** Update CLAUDE.md (`run .specify/scripts/bash/update-agent-context.sh claude` to add Feature 009: portal services, viewMode reuse, crypto tokens, citations, token tracking)
- [x] **T059** [P] Add inline comments to PortalAIService (document viewMode filtering integration, BaseCategoryService usage, BYOLLM integration per research.md)
- [x] **T060** [P] Security audit - DM Secrets verification (manually verify no dm-secret cards accessible via PortalAIService.buildContext(), test with various secret cards in different categories)

---

## Dependencies

### Strict Ordering
1. **Database migration before everything**: T001-T002 before all other tasks
2. **Models before tests**: T003-T007 before T008-T016
3. **Tests before implementation**: T008-T016 MUST complete (and fail) before T017-T028
4. **Services before routes**: T017-T026 before T027-T028
5. **Backend routes before frontend API clients**: T027-T028 before T042-T043
6. **API clients before UI components**: T042-T043 before T029-T041 (components need API)
7. **All core before integration**: T001-T043 before T044-T050
8. **Implementation before E2E tests**: T001-T050 before T054-T057

### Specific Dependencies
- T001 (Migration) blocks everything (all services need tables)
- T017-T019 (PortalConfigService) blocks T027 (management routes)
- T020-T021 (PortalPlayerService) blocks T028 (public routes)
- T022 (CitationGeneratorService) blocks T025 (PortalAI needs citations)
- T023 (PortalTokenTrackerService) blocks T025, T027 (AI and monitoring need tracker)
- T024-T025 (PortalAIService) blocks T028 (public routes need AI)
- T027-T028 (Backend routes) block T042-T043 (API clients need routes)
- T042-T043 (API clients) block T029-T041 (UI components need API)
- T029 (PortalManagementPage) blocks T043b (Sidebar needs page route)
- T036 (PlayerPortalPage) blocks T043a (App.tsx needs page component)
- T043a, T043b (Routing) must complete before E2E tests (T054-T057)
- T045 (BYOLLM integration) blocks T025 (PortalAI needs credentials)

---

## Parallel Execution Examples

### Example 1: Models (Phase 3.2)
```bash
# Launch T003-T007 together (different model files):
Task: "PortalConfig model in backend/src/models/PortalConfig.ts"
Task: "PortalPlayer model in backend/src/models/PortalPlayer.ts"
Task: "PortalConversation model in backend/src/models/PortalConversation.ts"
Task: "PortalMessage model in backend/src/models/PortalMessage.ts"
Task: "PortalTokenUsage model in backend/src/models/PortalTokenUsage.ts"
```

### Example 2: Unit Tests (Phase 3.3)
```bash
# Launch T008-T012 together (different unit test files):
Task: "Unit test crypto tokens in backend/tests/unit/PortalPlayerService-tokens.test.ts"
Task: "Unit test unique names in backend/tests/unit/PortalPlayerService-unique-names.test.ts"
Task: "Unit test bcrypt passwords in backend/tests/unit/PortalConfigService-password.test.ts"
Task: "Unit test citations in backend/tests/unit/CitationGeneratorService.test.ts"
Task: "Unit test token aggregation in backend/tests/unit/PortalTokenTrackerService.test.ts"
```

### Example 3: Integration Tests (Phase 3.3)
```bash
# Launch T013-T016 together (different integration test files):
Task: "Integration test password in backend/tests/integration/portal-enable-password.integration.test.ts"
Task: "Integration test tokens in backend/tests/integration/player-identity-token.integration.test.ts"
Task: "Integration test filtering in backend/tests/integration/portal-filtering.integration.test.ts"
Task: "Integration test citations in backend/tests/integration/citation-card-links.integration.test.ts"
```

### Example 4: GM Components (Phase 3.5)
```bash
# Launch T029-T035 together (different component files):
Task: "PortalManagementPage in frontend/src/pages/PortalManagementPage.tsx"
Task: "PortalSettings in frontend/src/components/portal/PortalSettings.tsx"
Task: "PortalMonitoring in frontend/src/components/portal/PortalMonitoring.tsx"
Task: "DMPreviewMode in frontend/src/components/portal/DMPreviewMode.tsx"
Task: "ResponseStyleSelector in frontend/src/components/portal/ResponseStyleSelector.tsx"
Task: "PasswordProtection in frontend/src/components/portal/PasswordProtection.tsx"
Task: "PublicURLDisplay in frontend/src/components/portal/PublicURLDisplay.tsx"
```

### Example 5: Player Portal (Phase 3.6)
```bash
# Launch T036-T043 together (different files):
Task: "PlayerPortalPage in frontend/src/pages/PlayerPortalPage.tsx"
Task: "PlayerIdentity in frontend/src/components/portal/PlayerIdentity.tsx"
Task: "PortalChat in frontend/src/components/portal/PortalChat.tsx"
Task: "CitationLink in frontend/src/components/portal/CitationLink.tsx"
Task: "PasswordEntry in frontend/src/components/portal/PasswordEntry.tsx"
Task: "PortalWarning in frontend/src/components/portal/PortalWarning.tsx"
Task: "portalService in frontend/src/services/portalService.ts"
Task: "portalPublicService in frontend/src/services/portalPublicService.ts"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All entities have model tasks (T003-T007 for 5 entities)
- [x] All tests come before implementation (T008-T016 before T017-T028)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts)
- [x] Critical filtering logic has tests (T015, T044, T050, T056, T060 for information filtering security)
- [x] Portal workflow has E2E validation (T054-T057)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for security)
- **crypto tokens** (T008, T014, T020, T049) - crypto.randomBytes(32).toString('hex') produces 64-char hex, stored in portal_players.session_token, sent as HTTP-only cookie per research.md Topic 1
- **viewMode middleware reuse** (T015, T044) - use existing `getPlayerKnowledgeFilter()` with BaseCategoryService.list(), no new filtering service per research.md Topic 3
- **Unique character names** (T009, T048) - UNIQUE(campaign_id, character_name) constraint, SQL error rejected with clear message per data-model.md Entity 2
- **Citations** (T011, T022, T046) - numbered [1][2] format linking to /cards/{cardId} per research.md Topic 4
- **Token tracking** (T012, T023, T047) - SQL SUM aggregation per research.md Topic 5
- **BYOLLM integration** (T045) - BYOLLMConfigService.getConfig() provides GM's credentials per research.md Topic 3
- **Password protection** (T010, T018, T055) - bcrypt hashing, optional per portal config per research.md Topic 2
- **Response styles** (T019, T033) - 5 options from data-model.md Entity 1
- **WAL concurrency** (research.md Topic 6) - already enabled, no additional tasks needed

---

## Critical Risk Areas

1. **Information Filtering Security** (T015, T044, T060):
   - Portal AI MUST use viewMode.getPlayerKnowledgeFilter()
   - BaseCategoryService.list() with player_view mode
   - Security audit critical - manually verify no dm-secret accessible

2. **Unique Character Name Enforcement** (T009, T048):
   - UNIQUE(campaign_id, character_name) SQL constraint
   - Clear error message when rejected

3. **Citation Card Linking** (T011, T022, T046):
   - Link to existing /cards/{cardId} route from Feature 003
   - Numbered format [1][2]

4. **Token Tracking Aggregation** (T012, T023, T047):
   - SQL SUM queries per research.md Topic 5
   - Display in PortalMonitoring

5. **Crypto Session Tokens** (T008, T020, T049):
   - crypto.randomBytes(32).toString('hex')
   - HTTP-only cookie
   - Persists across page refreshes

6. **BYOLLM Integration** (T045):
   - BYOLLMConfigService.getConfig() for credentials
   - No separate portal credentials

7. **DM Preview Mode** (T032, T050):
   - Uses same viewMode filtering as player view
   - Allows GM to test before enabling

---

**Total Tasks**: 62
**Estimated Completion**: 7-10 days
**Critical Path**: T001-T002 → T003-T007 → T008-T016 → T017-T028 → T029-T043b → T044-T050 → T054-T060
**Security Priority**: Information filtering (T015, T044, T060) is CRITICAL - dm-secret must NEVER be accessible to player portal AI
