# Tasks: Public Campaign Sharing

**Feature**: 010-create-public-campaign
**Input**: Design documents from `/specs/010-create-public-campaign/`
**Prerequisites**: data-model.md ✓, contracts/ ✓
**Dependencies**: Feature 002 (Campaign Management), Feature 003 (Card Architecture), Feature 004 (Information Filtering)

## Execution Flow (main)
```
1. Load data-model.md ✓
   → Extract: PublicSharingConfig, PublishedVersion entities
2. Load contracts ✓
   → contracts/: 3 files (public-sharing.yaml, publish.yaml, public-view.yaml)
3. Generate tasks by category ✓
   → Setup: Database migrations for public sharing tables
   → Tests: contract tests, publish workflow, draft mode, password protection
   → Core: models, services (PublicSharing, Publish, PublicView), routes
   → Frontend: Public sharing UI, publish button, draft preview, password entry
   → Integration: Information filtering, published version snapshots
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

## Path Conventions (Web App - extends features 002-004)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/010-public-sharing.sql`
- **Shared**: `shared/types/` (extended with PublicSharingConfig, PublishedVersion)

---

## Phase 3.1: Database Setup & Migrations

- [ ] **T001** Create migration 010 for PublicSharingConfig table (`backend/src/db/migrations/010-add-public-sharing-config.sql` per data-model.md)
- [ ] **T002** Create migration 010 for PublishedVersion table (`backend/src/db/migrations/010-add-published-versions.sql` with JSONB content_snapshot per data-model.md)
- [ ] **T003** Create indexes for public sharing (`backend/src/db/migrations/010-add-public-indexes.sql` unique index on random_id, campaign_id FK)
- [ ] **T004** Test random ID collision handling (`backend/src/db/migrations/010-test-random-id-uniqueness.sql` validate UNIQUE constraint enforced)

---

## Phase 3.2: Shared Types

- [ ] **T005** [P] PublicSharingConfig type (`shared/types/PublicSharingConfig.ts` with TypeScript interface from data-model.md)
- [ ] **T006** [P] PublishedVersion type (`shared/types/PublishedVersion.ts` with TypeScript interface from data-model.md, JSONB snapshot structure)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (from contracts/)
- [ ] **T007** [P] Contract test POST /api/campaigns/:id/public-sharing (`backend/tests/contract/public-sharing.contract.test.ts` from contracts/public-sharing.yaml - enable public sharing)
- [ ] **T008** [P] Contract test GET /api/campaigns/:id/public-sharing (`backend/tests/contract/public-sharing.contract.test.ts` from contracts/public-sharing.yaml - get config)
- [ ] **T009** [P] Contract test PUT /api/campaigns/:id/public-sharing/password (`backend/tests/contract/public-sharing.contract.test.ts` from contracts/public-sharing.yaml - set/remove password)
- [ ] **T010** [P] Contract test POST /api/campaigns/:id/publish (`backend/tests/contract/publish.contract.test.ts` from contracts/publish.yaml - publish changes)
- [ ] **T011** [P] Contract test GET /api/campaigns/:id/draft (`backend/tests/contract/publish.contract.test.ts` from contracts/publish.yaml - draft preview)
- [ ] **T012** [P] Contract test GET /c/:randomId (`backend/tests/contract/public-view.contract.test.ts` from contracts/public-view.yaml - public view access)
- [ ] **T013** [P] Contract test POST /c/:randomId/password (`backend/tests/contract/public-view.contract.test.ts` from contracts/public-view.yaml - password verification)

### Backend Unit Tests (Critical Public Sharing Logic)
- [ ] **T014** [P] Unit test random ID generation (`backend/tests/unit/services/PublicSharingService-random-id.test.ts` test 12+ character alphanumeric, collision retry)
- [ ] **T015** [P] Unit test publish snapshot creation (`backend/tests/unit/services/PublishService-snapshot.test.ts` test JSONB snapshot includes all cards, graphs per data-model.md)
- [ ] **T016** [P] Unit test draft vs published content filtering (`backend/tests/unit/services/PublicViewService-draft-published.test.ts` test draft shows unpublished edits, public shows published version)
- [ ] **T017** [P] Unit test password session validation (`backend/tests/unit/services/PublicViewService-password.test.ts` test 30min session TTL, invalidation on password change)
- [ ] **T018** [P] Unit test information level filtering for public view (`backend/tests/unit/services/PublicViewService-filtering.test.ts` test Common Knowledge + Player Knowledge only)

### Backend Integration Tests
- [ ] **T019** [P] Integration test: Enable public sharing → random ID generation → URL creation (`backend/tests/integration/public-sharing-enable.integration.test.ts`)
- [ ] **T020** [P] Integration test: Publish workflow → snapshot creation → public view update (`backend/tests/integration/publish-workflow.integration.test.ts`)
- [ ] **T021** [P] Integration test: Draft mode → GM edits → verify not visible on public URL until publish (`backend/tests/integration/draft-mode.integration.test.ts`)
- [ ] **T022** [P] Integration test: Password protection → session creation → 30min TTL (`backend/tests/integration/password-protection.integration.test.ts`)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Models
- [ ] **T023** [P] PublicSharingConfig model (`backend/src/models/PublicSharingConfig.ts` with TypeScript interface from data-model.md)
- [ ] **T024** [P] PublishedVersion model (`backend/src/models/PublishedVersion.ts` with TypeScript interface from data-model.md)

### Services - Public Sharing Configuration
- [ ] **T025** PublicSharingService (`backend/src/services/PublicSharingService.ts` enable/disable public sharing, random ID generation with collision retry)
- [ ] **T026** PublicSharingService - Random ID generation (`backend/src/services/PublicSharingService.ts` generate 12+ character alphanumeric, ensure uniqueness)
- [ ] **T027** PublicSharingService - Password management (`backend/src/services/PublicSharingService.ts` set/remove password, invalidate sessions on password change)

### Services - Publish Workflow
- [ ] **T028** PublishService (`backend/src/services/PublishService.ts` create published version snapshot, update PublicSharingConfig.published_version_id)
- [ ] **T029** PublishService - Snapshot creation (`backend/src/services/PublishService.ts` JSONB snapshot of cards, graphs, metadata per data-model.md)
- [ ] **T030** DraftService (`backend/src/services/DraftService.ts` fetch unpublished campaign content for GM draft preview)

### Services - Public View
- [ ] **T031** PublicViewService (`backend/src/services/PublicViewService.ts` serve published version content on public URL)
- [ ] **T032** PublicViewService - Information filtering (`backend/src/services/PublicViewService.ts` filter Common Knowledge + Player Knowledge only, integrate with ViewModeService from Feature 004)
- [ ] **T033** PublicViewService - Password session (`backend/src/services/PublicViewService.ts` validate password, create 30min session, invalidate on password change)

### Routes
- [ ] **T034** Public sharing routes (`backend/src/routes/public-sharing.ts` POST /public-sharing, GET, PUT /password per contracts/public-sharing.yaml)
- [ ] **T035** Publish routes (`backend/src/routes/publish.ts` POST /publish, GET /draft per contracts/publish.yaml)
- [ ] **T036** Public view routes (`backend/src/routes/public-view.ts` GET /c/:randomId, POST /c/:randomId/password per contracts/public-view.yaml)

---

## Phase 3.5: Frontend - GM Public Sharing UI

### Public Sharing Settings
- [ ] **T037** PublicSharingPage (`frontend/src/pages/PublicSharingPage.tsx` public sharing management page)
- [ ] **T038** PublicSharingToggle component (`frontend/src/components/public-sharing/PublicSharingToggle.tsx` enable/disable public access toggle)
- [ ] **T039** PublicURLDisplay component (`frontend/src/components/public-sharing/PublicURLDisplay.tsx` display public URL with copy button, format: http://localhost:3000/c/{randomId})
- [ ] **T040** PasswordProtectionSettings component (`frontend/src/components/public-sharing/PasswordProtectionSettings.tsx` set/remove password input)
- [ ] **T041** PublishButton component (`frontend/src/components/public-sharing/PublishButton.tsx` "Publish Changes" button with confirmation modal)
- [ ] **T042** DraftPreview component (`frontend/src/components/public-sharing/DraftPreview.tsx` GM draft preview showing unpublished edits)
- [ ] **T043** PublishedVersionInfo component (`frontend/src/components/public-sharing/PublishedVersionInfo.tsx` show last published timestamp, content summary)

---

## Phase 3.6: Frontend - Public View UI

### Public Campaign View
- [ ] **T044** PublicCampaignPage (`frontend/src/pages/PublicCampaignPage.tsx` public campaign view page at /c/:randomId)
- [ ] **T045** PasswordEntryModal component (`frontend/src/components/public-view/PasswordEntryModal.tsx` password entry modal for password-protected campaigns)
- [ ] **T046** PublicCampaignHeader component (`frontend/src/components/public-view/PublicCampaignHeader.tsx` campaign name, public view indicator)
- [ ] **T047** PublicCardList component (`frontend/src/components/public-view/PublicCardList.tsx` filtered card list, Common Knowledge + Player Knowledge only)

### API Clients
- [ ] **T048** [P] PublicSharingService API client (`frontend/src/services/public-sharing.service.ts` API calls for public sharing config, publish, draft)
- [ ] **T049** [P] PublicViewService API client (`frontend/src/services/public-view.service.ts` API calls for public view access, password verification)

---

## Phase 3.7: Integration & Polish

### Integration Tasks
- [ ] **T050** Integrate random ID generation with URL creation (verify unique ID, persistent across toggle, format URL correctly)
- [ ] **T051** Integrate publish workflow with snapshot creation (verify JSONB snapshot includes all cards, graphs, metadata)
- [ ] **T052** Integrate draft preview with unpublished content (verify GM sees unpublished edits, public URL shows published version only)
- [ ] **T053** Integrate password protection with session management (verify 30min TTL, invalidation on password change)
- [ ] **T054** Integrate information filtering with public view (verify Common Knowledge + Player Knowledge only, DM Secrets hidden)
- [ ] **T055** Test public access toggle persistence (disable → re-enable → verify same random ID)

### Frontend Component Tests
- [ ] **T056** [P] Component test PublicSharingToggle (`frontend/tests/components/PublicSharingToggle.test.tsx` with Vitest + RTL)
- [ ] **T057** [P] Component test PublishButton (`frontend/tests/components/PublishButton.test.tsx` test confirmation modal, publish action)
- [ ] **T058** [P] Component test PasswordEntryModal (`frontend/tests/components/PasswordEntryModal.test.tsx` test password input, session creation)

### E2E Tests
- [ ] **T059** E2E test: Enable public sharing → generate URL → access public view (`frontend/tests/e2e/public-sharing-enable.spec.ts` with Playwright)
- [ ] **T060** E2E test: Publish workflow (`frontend/tests/e2e/publish-workflow.spec.ts` GM edits → publish → verify public view updated)
- [ ] **T061** E2E test: Draft mode (`frontend/tests/e2e/draft-mode.spec.ts` GM edits → verify not on public URL → publish → verify visible)
- [ ] **T062** E2E test: Password protection (`frontend/tests/e2e/password-protection.spec.ts` set password → access public URL → enter password → verify content)

### Documentation & Cleanup
- [ ] **T063** Validate quickstart.md (execute steps: enable public sharing → set password → draft preview → publish → access public URL)
- [ ] **T064** [P] Add inline comments to snapshot creation logic (JSONB structure, cards/graphs serialization)
- [ ] **T065** [P] Performance test publish operation (250 cards snapshot creation, verify <2s)
- [ ] **T066** [P] Security audit: Verify DM Secrets filtered from public view (manually inspect published snapshot, test with various secret cards)
- [ ] **T067** [P] Test random ID collision handling (generate 10,000 IDs, verify no duplicates, retry logic works)

---

## Dependencies

### Strict Ordering
1. **Database migrations before everything**: T001-T004 before all other tasks
2. **Shared types before tests**: T005-T006 before T007-T022
3. **Tests before implementation**: T007-T022 MUST complete (and fail) before T023-T036
4. **Backend services before routes**: T025-T033 before T034-T036
5. **Backend routes before frontend API clients**: T034-T036 before T048-T049
6. **API clients before UI components**: T048-T049 before T037-T047 (components need API)
7. **All core before integration**: T001-T049 before T050-T055
8. **Implementation before E2E tests**: T001-T055 before T059-T062

### Specific Dependencies
- T001 (PublicSharingConfig table) blocks T007-T009 (public sharing contract tests need table)
- T002 (PublishedVersion table) blocks T010-T011 (publish contract tests need table)
- T025-T026 (PublicSharingService with random ID) blocks T034 (routes need service)
- T028-T029 (PublishService with snapshot) blocks T035 (publish routes need service)
- T031-T033 (PublicViewService) blocks T036 (public view routes need service)
- T048-T049 (API clients) block T037-T047 (UI components need API)

---

## Parallel Execution Examples

### Example 1: Shared Types (Phase 3.2)
```bash
# Launch T005-T006 together (different type files):
Task: "PublicSharingConfig type in shared/types/PublicSharingConfig.ts"
Task: "PublishedVersion type in shared/types/PublishedVersion.ts"
```

### Example 2: Contract Tests (Phase 3.3)
```bash
# Launch T007-T013 together (different contract test files):
Task: "Contract test POST /api/campaigns/:id/public-sharing in backend/tests/contract/public-sharing.contract.test.ts"
Task: "Contract test POST /api/campaigns/:id/publish in backend/tests/contract/publish.contract.test.ts"
Task: "Contract test GET /c/:randomId in backend/tests/contract/public-view.contract.test.ts"
```

### Example 3: Unit Tests (Phase 3.3)
```bash
# Launch T014-T018 together (different unit test files):
Task: "Unit test random ID generation in backend/tests/unit/services/PublicSharingService-random-id.test.ts"
Task: "Unit test publish snapshot creation in backend/tests/unit/services/PublishService-snapshot.test.ts"
Task: "Unit test draft vs published content filtering in backend/tests/unit/services/PublicViewService-draft-published.test.ts"
Task: "Unit test password session validation in backend/tests/unit/services/PublicViewService-password.test.ts"
Task: "Unit test information level filtering for public view in backend/tests/unit/services/PublicViewService-filtering.test.ts"
```

### Example 4: Models (Phase 3.4)
```bash
# Launch T023-T024 together (different model files):
Task: "PublicSharingConfig model in backend/src/models/PublicSharingConfig.ts"
Task: "PublishedVersion model in backend/src/models/PublishedVersion.ts"
```

### Example 5: API Clients (Phase 3.6)
```bash
# Launch T048-T049 together (different service files):
Task: "PublicSharingService API client in frontend/src/services/public-sharing.service.ts"
Task: "PublicViewService API client in frontend/src/services/public-view.service.ts"
```

### Example 6: Component Tests (Phase 3.7)
```bash
# Launch T056-T058 together (different component test files):
Task: "Component test PublicSharingToggle in frontend/tests/components/PublicSharingToggle.test.tsx"
Task: "Component test PublishButton in frontend/tests/components/PublishButton.test.tsx"
Task: "Component test PasswordEntryModal in frontend/tests/components/PasswordEntryModal.test.tsx"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T007-T013 cover public-sharing.yaml, publish.yaml, public-view.yaml)
- [x] All entities have model tasks (T023-T024 for PublicSharingConfig, PublishedVersion)
- [x] All tests come before implementation (T007-T022 before T023-T036)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts)
- [x] Critical public sharing logic has unit tests (T014-T018 for random ID, snapshot, draft/published, password, filtering)
- [x] Publish workflow has E2E validation (T059-T062)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for publish workflow)
- **Random ID generation** (T014, T026) - 12+ character alphanumeric, UNIQUE constraint, collision retry
- **JSONB snapshot** (T015, T029) - includes all cards, graphs, metadata per data-model.md
- **Draft vs Published** (T016, T030, T052, T061) - GM sees unpublished edits, public URL shows published version only
- **Password session** (T017, T027, T033, T053) - 30min TTL, invalidate on password change
- **Information filtering** (T018, T032, T054, T066) - Common Knowledge + Player Knowledge only, ViewModeService integration
- **Random ID persistence** (T026, T050, T055) - immutable after creation, persists across toggle
- **Publish workflow** (T028-T029, T051, T060) - atomic snapshot creation, update published_version_id FK
- **Public URL format** (T039) - http://localhost:3000/c/{randomId} (localhost for prototype)
- **Performance** (T065) - publish operation <2s for 250 cards

---

## Critical Risk Areas

1. **Random ID Uniqueness** (T014, T026, T067):
   - UNIQUE constraint enforced in DB
   - Collision retry logic (generate new ID if duplicate)
   - Test with 10,000 IDs to ensure no collisions

2. **JSONB Snapshot Integrity** (T015, T029, T051, T064):
   - Must include ALL cards, graphs, metadata
   - JSONB serialization of complex entities (Card polymorphism)
   - Snapshot immutable after creation (append-only published_versions table)

3. **Draft vs Published Filtering** (T016, T030, T052):
   - Draft API shows unpublished edits (current campaign state)
   - Public view API shows published version ONLY (PublishedVersion.content_snapshot)
   - GM can preview draft before publishing

4. **Password Session Management** (T017, T027, T033, T053):
   - 30-minute session TTL for password-protected campaigns
   - Invalidate all sessions when password changed
   - Store session_id in cookie or sessionStorage

5. **Information Filtering Integration** (T018, T032, T054, T066):
   - ViewModeService from Feature 004 filters Common Knowledge + Player Knowledge
   - DM Secrets NEVER included in published snapshot or public view
   - Manual security audit (T066) critical

6. **Random ID Immutability** (T026, T050, T055):
   - random_id generated once, never changes
   - Persists across public_access_enabled toggle (0↔1)
   - Public URL stable even when temporarily disabled

7. **Publish Workflow Atomicity** (T028-T029, T051, T060):
   - Create PublishedVersion snapshot atomically
   - Update PublicSharingConfig.published_version_id FK in same transaction
   - Rollback on error (no partial publish)

---

**Total Tasks**: 67
**Estimated Completion**: 6-10 days (JSONB snapshot logic, draft/published filtering, password sessions, information filtering integration)
**Critical Path**: T001-T004 → T005-T006 → T007-T022 → T023-T036 → T037-T049 → T050-T055 → T059-T067
**Security Priority**: Information filtering (T018, T032, T054, T066) critical - DM Secrets must NOT appear in published snapshots or public view
