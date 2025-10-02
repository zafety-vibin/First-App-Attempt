# Tasks: Player Question Portal

**Feature**: 009-create-player-question
**Input**: Design documents from `/specs/009-create-player-question/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓
**Dependencies**:
- Feature 003 (Card Architecture) MUST be complete
- Feature 004 (Information Filtering - ViewModeService) MUST be complete
- **Feature 008 (BYOLLM Configuration) MUST be complete** ⚠️ BLOCKING

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: express-session, uuid (portal URL), bcrypt (password), ViewModeService reuse
2. Load design documents ✓
   → data-model.md: 5 entities (PortalConfig, PortalPlayer, PortalConversation, PortalMessage, PortalTokenUsage)
   → contracts/: portal.yaml (10 endpoints per plan.md)
   → research.md: 8 technical decisions (express-session, ViewModeService integration, citation generation, token tracking)
3. Generate tasks by category ✓
   → Setup: Database migrations for portal tables
   → Tests: contract tests, information filtering validation, citation generation
   → Core: models, services (PortalConfig, PortalAI with filtering, Citations, TokenTracker), routes
   → Frontend: GM portal management UI, public player portal UI, DM Preview Mode
   → Integration: ViewModeService filtering, citation linking, token usage tracking
   → Polish: E2E tests, quickstart validation
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T075) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App - extends features 003-004)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/009-portal.sql`
- **Shared**: `shared/types/` (extended with PortalConfig, PortalPlayer, PortalConversation, PortalMessage)

---

## Phase 3.1: Database Setup & Migrations

- [ ] **T001** Create migration 009 for Portal tables (`backend/src/db/migrations/009-add-portal-tables.sql` with portal_configs, portal_players, portal_conversations, portal_messages, portal_token_usage per data-model.md)
- [ ] **T002** Create indexes for portal queries (`backend/src/db/migrations/009-add-portal-indexes.sql` for campaign_id, player_id, session_id, created_at)
- [ ] **T003** Create unique constraint for character names (`backend/src/db/migrations/009-add-unique-character-names.sql` UNIQUE(campaign_id, character_name) per clarifications)

---

## Phase 3.2: Shared Types

- [ ] **T004** [P] PortalConfig type (`shared/types/PortalConfig.ts` with TypeScript interface from data-model.md)
- [ ] **T005** [P] PortalPlayer type (`shared/types/PortalPlayer.ts` with TypeScript interface from data-model.md)
- [ ] **T006** [P] PortalConversation type (`shared/types/PortalConversation.ts` with TypeScript interface from data-model.md)
- [ ] **T007** [P] PortalMessage type (`shared/types/PortalMessage.ts` with TypeScript interface from data-model.md including citations array)
- [ ] **T008** [P] PortalTokenUsage type (`shared/types/PortalTokenUsage.ts` with TypeScript interface from data-model.md)
- [ ] **T009** [P] Citation type (`shared/types/Citation.ts` with number, cardId, cardTitle, url fields)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (from plan.md portal.yaml spec)
- [ ] **T010** [P] Contract test POST /api/portal/config (`backend/tests/contract/portal.contract.test.ts` create/update portal configuration)
- [ ] **T011** [P] Contract test GET /api/portal/config (`backend/tests/contract/portal.contract.test.ts` get portal config for campaign)
- [ ] **T012** [P] Contract test PUT /api/portal/config/enable (`backend/tests/contract/portal.contract.test.ts` enable/disable portal)
- [ ] **T013** [P] Contract test PUT /api/portal/config/password (`backend/tests/contract/portal.contract.test.ts` set/remove password)
- [ ] **T014** [P] Contract test PUT /api/portal/config/response-style (`backend/tests/contract/portal.contract.test.ts` set response style)
- [ ] **T015** [P] Contract test GET /api/portal/monitoring (`backend/tests/contract/portal.contract.test.ts` get per-player logs and token usage)
- [ ] **T016** [P] Contract test POST /api/portal/public/:campaignId/identify (`backend/tests/contract/portal.contract.test.ts` player identity creation)
- [ ] **T017** [P] Contract test POST /api/portal/public/:campaignId/ask (`backend/tests/contract/portal.contract.test.ts` player question)
- [ ] **T018** [P] Contract test GET /api/portal/public/:campaignId/history (`backend/tests/contract/portal.contract.test.ts` player conversation history)
- [ ] **T019** [P] Contract test POST /api/portal/preview (`backend/tests/contract/portal.contract.test.ts` DM Preview Mode test question)

### Backend Unit Tests (Critical Portal Logic)
- [ ] **T020** [P] Unit test ViewModeService filtering integration (`backend/tests/unit/services/PortalAI-filtering.test.ts` test Common Knowledge + Player Knowledge ONLY access per research.md)
- [ ] **T021** [P] Unit test citation generation (`backend/tests/unit/services/CitationGenerator.test.ts` test clickable citation format with card linking)
- [ ] **T022** [P] Unit test token usage tracking (`backend/tests/unit/services/TokenTracker.test.ts` test per-player token aggregation)
- [ ] **T023** [P] Unit test unique character name validation (`backend/tests/unit/services/PortalPlayer-unique-names.test.ts` test duplicate rejection per clarifications)
- [ ] **T024** [P] Unit test Session Recap granular filtering (`backend/tests/unit/services/SessionRecapFilter.test.ts` test piece-by-piece DM Secret detection per research.md)

### Backend Integration Tests (from quickstart.md)
- [ ] **T025** [P] Integration test: Portal enable → URL generation → player access (`backend/tests/integration/portal-enable-access.integration.test.ts`)
- [ ] **T026** [P] Integration test: Player identity with unique name enforcement (`backend/tests/integration/player-identity.integration.test.ts`)
- [ ] **T027** [P] Integration test: Portal AI filtering (only Common + Player Knowledge accessible) (`backend/tests/integration/portal-filtering.integration.test.ts`)
- [ ] **T028** [P] Integration test: Citation generation with card links (`backend/tests/integration/citation-generation.integration.test.ts`)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Models
- [ ] **T029** [P] PortalConfig model (`backend/src/models/PortalConfig.ts` with TypeScript interface from data-model.md)
- [ ] **T030** [P] PortalPlayer model (`backend/src/models/PortalPlayer.ts` with TypeScript interface from data-model.md)
- [ ] **T031** [P] PortalConversation model (`backend/src/models/PortalConversation.ts` with TypeScript interface from data-model.md)
- [ ] **T032** [P] PortalMessage model (`backend/src/models/PortalMessage.ts` with TypeScript interface from data-model.md)
- [ ] **T033** [P] PortalTokenUsage model (`backend/src/models/PortalTokenUsage.ts` with TypeScript interface from data-model.md)

### Services - Portal Configuration
- [ ] **T034** PortalConfigService (`backend/src/services/PortalConfigService.ts` CRUD for portal configs, enable/disable, password hashing with bcrypt)
- [ ] **T035** PortalConfigService - URL generation (`backend/src/services/PortalConfigService.ts` generate public URL with uuid per research.md)

### Services - Player Identity
- [ ] **T036** PortalPlayerService (`backend/src/services/PortalPlayerService.ts` create player identity, unique character name validation per clarifications)
- [ ] **T037** PortalPlayerService - Session management (`backend/src/services/PortalPlayerService.ts` express-session integration, session_id FK per research.md)

### Services - Portal AI & Filtering
- [ ] **T038** InformationFilterService integration (`backend/src/services/InformationFilterService.ts` extend Feature 004 ViewModeService to filter Common Knowledge + Player Knowledge ONLY per research.md)
- [ ] **T039** PortalAIService (`backend/src/services/PortalAIService.ts` AI question answering with information filtering integration)
- [ ] **T040** PortalAIService - Context building (`backend/src/services/PortalAIService.ts` build LLM context from filtered cards, knowledge graphs, Session Recaps per research.md)
- [ ] **T041** SessionRecapFilterService (`backend/src/services/SessionRecapFilterService.ts` granular Session Recap filtering piece-by-piece for DM Secret content per research.md)

### Services - Citations & Token Tracking
- [ ] **T042** CitationGeneratorService (`backend/src/services/CitationGeneratorService.ts` generate clickable citations from AI response sources per research.md)
- [ ] **T043** TokenTrackerService (`backend/src/services/TokenTrackerService.ts` track token usage per player/campaign, aggregation for monitoring panel per research.md)

### Services - Conversations
- [ ] **T044** PortalConversationService (`backend/src/services/PortalConversationService.ts` CRUD for conversations, history retrieval, per-player conversation isolation)

### Routes
- [ ] **T045** Portal management routes (`backend/src/routes/portal-management.ts` POST /config, GET /config, PUT /enable, PUT /password, PUT /response-style, GET /monitoring per plan.md)
- [ ] **T046** Portal public routes (`backend/src/routes/portal-public.ts` POST /identify, POST /ask, GET /history per plan.md)
- [ ] **T047** Portal preview route (`backend/src/routes/portal-preview.ts` POST /preview for DM Preview Mode per plan.md)

---

## Phase 3.5: Frontend - GM Portal Management

### Portal Management UI
- [ ] **T048** PortalManagementPage (`frontend/src/pages/PortalManagementPage.tsx` main GM portal management page)
- [ ] **T049** PortalSettings component (`frontend/src/components/portal/PortalSettings.tsx` enable/disable portal, password protection, response style selector)
- [ ] **T050** PortalMonitoring component (`frontend/src/components/portal/PortalMonitoring.tsx` per-player question logs, token usage display)
- [ ] **T051** DMPreviewMode component (`frontend/src/components/portal/DMPreviewMode.tsx` test portal with filtered view before sharing)
- [ ] **T052** ResponseStyleSelector component (`frontend/src/components/portal/ResponseStyleSelector.tsx` Friendly Sage, Scholarly Tome, Tavern Gossip, Factual, Custom dropdown)
- [ ] **T053** PasswordProtection component (`frontend/src/components/portal/PasswordProtection.tsx` set/remove password, bcrypt strength indicator)
- [ ] **T054** PublicURLDisplay component (`frontend/src/components/portal/PublicURLDisplay.tsx` display portal URL with copy button)

---

## Phase 3.6: Frontend - Public Player Portal

### Player Portal UI
- [ ] **T055** PlayerPortalPage (`frontend/src/pages/PlayerPortalPage.tsx` public player Q&A interface)
- [ ] **T056** PlayerIdentity component (`frontend/src/components/portal/PlayerIdentity.tsx` "Who are you in-game?" prompt with character name input)
- [ ] **T057** PortalChat component (`frontend/src/components/portal/PortalChat.tsx` chat interface with AI responses, streaming support)
- [ ] **T058** CitationLink component (`frontend/src/components/portal/CitationLink.tsx` clickable citation linking to source card)
- [ ] **T059** PasswordEntry component (`frontend/src/components/portal/PasswordEntry.tsx` password entry UI for password-protected portals)
- [ ] **T060** PortalWarning component (`frontend/src/components/portal/PortalWarning.tsx` prominent warning about GM's token usage)

### API Clients
- [ ] **T061** [P] PortalService API client (`frontend/src/services/portal.service.ts` API calls for GM portal management endpoints)
- [ ] **T062** [P] PortalPublicService API client (`frontend/src/services/portal-public.service.ts` API calls for public player endpoints)

---

## Phase 3.7: Integration & Polish

### Integration Tasks
- [ ] **T063** Integrate ViewModeService filtering with PortalAI (verify only Common Knowledge + Player Knowledge cards accessible per research.md)
- [ ] **T064** Integrate citation generation with card linking (verify citations link to source cards, clickable navigation)
- [ ] **T065** Integrate token tracking with monitoring panel (verify per-player token aggregation, display in GM monitoring UI)
- [ ] **T066** Integrate unique character name validation (verify duplicate rejection with error message per clarifications)
- [ ] **T067** Integrate Session Recap granular filtering (verify piece-by-piece DM Secret detection, exclude from portal AI context)
- [ ] **T068** Integrate express-session with player identity (verify session_id persistence, player identification across page refreshes)
- [ ] **T069** Test DM Preview Mode (verify filtered view shows exact player experience before portal enabled)

### Frontend Component Tests
- [ ] **T070** [P] Component test PortalSettings (`frontend/tests/components/PortalSettings.test.tsx` with Vitest + RTL)
- [ ] **T071** [P] Component test PlayerIdentity (`frontend/tests/components/PlayerIdentity.test.tsx` test unique name validation)
- [ ] **T072** [P] Component test CitationLink (`frontend/tests/components/CitationLink.test.tsx` test card navigation)

### E2E Tests
- [ ] **T073** E2E test: Portal enable → player access → Q&A workflow (`frontend/tests/e2e/portal-flow.spec.ts` with Playwright per quickstart.md)
- [ ] **T074** E2E test: Player identity with duplicate name rejection (`frontend/tests/e2e/player-identity.spec.ts`)
- [ ] **T075** E2E test: Portal AI filtering validation (`frontend/tests/e2e/portal-filtering.spec.ts` verify DM Secrets NOT accessible to player)
- [ ] **T076** E2E test: Citation click navigation (`frontend/tests/e2e/citation-navigation.spec.ts`)

### Documentation & Cleanup
- [ ] **T077** Validate quickstart.md (execute all steps: enable portal → set password → test DM Preview → player access → Q&A → monitor token usage)
- [ ] **T078** [P] Add inline comments to filtering logic (ViewModeService integration, Session Recap granular filtering per research.md)
- [ ] **T079** [P] Security audit: Verify DM Secrets NEVER accessible to portal AI (audit filtered context, test with various secret cards)
- [ ] **T080** [P] Performance test portal response (<3s per plan.md)
- [ ] **T081** [P] Performance test citation generation (<100ms per plan.md)

---

## Dependencies

### Strict Ordering
1. **Database migrations before everything**: T001-T003 before all other tasks
2. **Shared types before tests**: T004-T009 before T010-T028
3. **Tests before implementation**: T010-T028 MUST complete (and fail) before T029-T047
4. **Backend services before routes**: T034-T044 before T045-T047
5. **Backend routes before frontend API clients**: T045-T047 before T061-T062
6. **ViewModeService integration before PortalAI**: T038 before T039-T041 (filtering prerequisite)
7. **API clients before UI components**: T061-T062 before T048-T060 (components need API)
8. **All core before integration**: T001-T062 before T063-T069
9. **Implementation before E2E tests**: T001-T069 before T073-T076

### Specific Dependencies
- T003 (Unique character names constraint) blocks T023, T066 (unique name tests need constraint)
- T034 (PortalConfigService) blocks T045 (management routes need service)
- T036-T037 (PortalPlayerService) blocks T046 (public routes need player service)
- T038 (InformationFilterService) blocks T039-T041 (PortalAI needs filtering service)
- T039-T041 (PortalAIService) blocks T046, T047 (routes need AI service)
- T042 (CitationGeneratorService) blocks T039 (PortalAI uses citations)
- T043 (TokenTrackerService) blocks T045 (monitoring route needs tracker)
- T061-T062 (API clients) block T048-T060 (UI components need API)

---

## Parallel Execution Examples

### Example 1: Shared Types (Phase 3.2)
```bash
# Launch T004-T009 together (different type files):
Task: "PortalConfig type in shared/types/PortalConfig.ts"
Task: "PortalPlayer type in shared/types/PortalPlayer.ts"
Task: "PortalConversation type in shared/types/PortalConversation.ts"
Task: "PortalMessage type in shared/types/PortalMessage.ts"
Task: "PortalTokenUsage type in shared/types/PortalTokenUsage.ts"
Task: "Citation type in shared/types/Citation.ts"
```

### Example 2: Contract Tests (Phase 3.3)
```bash
# Launch T010-T019 together (same contract test file, different describe blocks):
Task: "Contract test POST /api/portal/config in backend/tests/contract/portal.contract.test.ts"
Task: "Contract test GET /api/portal/config in backend/tests/contract/portal.contract.test.ts"
Task: "Contract test PUT /api/portal/config/enable in backend/tests/contract/portal.contract.test.ts"
Task: "Contract test PUT /api/portal/config/password in backend/tests/contract/portal.contract.test.ts"
Task: "Contract test PUT /api/portal/config/response-style in backend/tests/contract/portal.contract.test.ts"
Task: "Contract test GET /api/portal/monitoring in backend/tests/contract/portal.contract.test.ts"
Task: "Contract test POST /api/portal/public/:campaignId/identify in backend/tests/contract/portal.contract.test.ts"
Task: "Contract test POST /api/portal/public/:campaignId/ask in backend/tests/contract/portal.contract.test.ts"
Task: "Contract test GET /api/portal/public/:campaignId/history in backend/tests/contract/portal.contract.test.ts"
Task: "Contract test POST /api/portal/preview in backend/tests/contract/portal.contract.test.ts"
```

### Example 3: Unit Tests (Phase 3.3)
```bash
# Launch T020-T024 together (different unit test files):
Task: "Unit test ViewModeService filtering integration in backend/tests/unit/services/PortalAI-filtering.test.ts"
Task: "Unit test citation generation in backend/tests/unit/services/CitationGenerator.test.ts"
Task: "Unit test token usage tracking in backend/tests/unit/services/TokenTracker.test.ts"
Task: "Unit test unique character name validation in backend/tests/unit/services/PortalPlayer-unique-names.test.ts"
Task: "Unit test Session Recap granular filtering in backend/tests/unit/services/SessionRecapFilter.test.ts"
```

### Example 4: Models (Phase 3.4)
```bash
# Launch T029-T033 together (different model files):
Task: "PortalConfig model in backend/src/models/PortalConfig.ts"
Task: "PortalPlayer model in backend/src/models/PortalPlayer.ts"
Task: "PortalConversation model in backend/src/models/PortalConversation.ts"
Task: "PortalMessage model in backend/src/models/PortalMessage.ts"
Task: "PortalTokenUsage model in backend/src/models/PortalTokenUsage.ts"
```

### Example 5: API Clients (Phase 3.6)
```bash
# Launch T061-T062 together (different service files):
Task: "PortalService API client in frontend/src/services/portal.service.ts"
Task: "PortalPublicService API client in frontend/src/services/portal-public.service.ts"
```

### Example 6: Component Tests (Phase 3.7)
```bash
# Launch T070-T072 together (different component test files):
Task: "Component test PortalSettings in frontend/tests/components/PortalSettings.test.tsx"
Task: "Component test PlayerIdentity in frontend/tests/components/PlayerIdentity.test.tsx"
Task: "Component test CitationLink in frontend/tests/components/CitationLink.test.tsx"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T010-T019 cover portal.yaml 10 endpoints)
- [x] All entities have model tasks (T029-T033 for PortalConfig, PortalPlayer, PortalConversation, PortalMessage, PortalTokenUsage)
- [x] All tests come before implementation (T010-T028 before T029-T047)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts except T010-T019 same file but different test cases)
- [x] Critical filtering logic has unit tests (T020, T024, T027, T063, T067, T075, T079 for information filtering security)
- [x] Portal workflow has E2E validation (T073-T076)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for information filtering security)
- **ViewModeService integration** (T020, T038, T063) - reuse Feature 004 filtering for Common Knowledge + Player Knowledge ONLY per research.md
- **express-session** (T037, T068) - lightweight player identity, session_id FK, survives page refresh
- **Unique character names** (T003, T023, T066) - UNIQUE(campaign_id, character_name) constraint, reject duplicates per clarifications
- **Citation generation** (T021, T042, T064) - clickable citations with card links, <100ms generation per plan.md
- **Token tracking** (T022, T043, T065) - per-player aggregation, display in GM monitoring panel
- **Session Recap filtering** (T024, T041, T067) - granular piece-by-piece DM Secret detection per research.md
- **DM Preview Mode** (T051, T069) - test portal with filtered view before sharing
- **Password protection** (T053, T059) - bcrypt hashing, optional per portal config
- **Response styles** (T052) - Friendly Sage, Scholarly Tome, Tavern Gossip, Factual, Custom
- **BYOLLM credentials** (Feature 008 dependency) - Portal AI uses GM's LLM credentials with prominent token usage warning
- **Performance** (T080-T081) - Portal response <3s, citation generation <100ms per plan.md

---

## Critical Risk Areas

1. **Information Filtering Security** (T020, T038, T063, T079):
   - Portal AI MUST access ONLY Common Knowledge + Player Knowledge
   - System and DM Secret cards completely filtered out
   - ViewModeService integration from Feature 004
   - Security audit critical (T079) - manually verify no DM Secrets accessible

2. **Unique Character Name Enforcement** (T003, T023, T066):
   - UNIQUE constraint on (campaign_id, character_name)
   - Reject duplicate names with clear error message per clarifications
   - Prevents confusion in monitoring panel and conversation tracking

3. **Session Recap Granular Filtering** (T024, T041, T067):
   - Session Recaps verified piece-by-piece for DM Secret content
   - Can't just filter entire recap - must parse and filter individual elements
   - Complex logic per research.md

4. **Citation Generation & Linking** (T021, T042, T064):
   - Citations link to source cards with cardId
   - Clickable navigation to card detail page
   - <100ms generation per plan.md

5. **Token Tracking & Aggregation** (T022, T043, T065):
   - Track tokens per player per campaign
   - Aggregate for monitoring panel display
   - Prominent warning about GM's token usage

6. **express-session Player Identity** (T037, T068):
   - session_id FK to express-session
   - Lightweight account linkage (no password, just character name)
   - Persists across page refreshes

7. **DM Preview Mode** (T051, T069):
   - Shows exact filtered view players will see
   - Allows GM to test before enabling portal
   - Must use same filtering logic as player view (ViewModeService)

---

**Total Tasks**: 81
**Estimated Completion**: 8-12 days (ViewModeService integration complex, citation generation, Session Recap filtering, express-session, BYOLLM integration)
**Critical Path**: T001-T003 → T004-T009 → T010-T028 → T029-T047 → T048-T062 → T063-T069 → T073-T081
**Security Priority**: Information filtering (T020, T038, T063, T079) is CRITICAL - DM Secrets must NEVER be accessible to player portal AI
