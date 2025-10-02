# Tasks: Authentication Flow & Campaign Management

**Feature**: 002-create-the-authentication
**Input**: Design documents from `/specs/002-create-the-authentication/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: Docker Compose, Node.js/Express, React, Keycloak
2. Load design documents ✓
   → data-model.md: 3 entities (User, Campaign, Session)
   → contracts/: 3 files (auth.yaml, campaigns.yaml, sessions.yaml)
   → research.md: 8 technical decisions
3. Generate tasks by category ✓
   → Setup: Docker, Keycloak, dependencies
   → Tests: contract tests, integration tests
   → Core: models, services, routes
   → Integration: Keycloak middleware, CORS, DB
   → Polish: E2E tests, quickstart validation
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T039) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Infrastructure**: `keycloak/`, `docker-compose.yml`, `.env`
- **Shared**: `shared/types/`

---

## Phase 3.1: Infrastructure Setup

- [ ] **T001** Create Docker Compose infrastructure (`docker-compose.yml`, `.env`, `keycloak/Dockerfile.keycloak`, `keycloak/realm-export.json`)
- [ ] **T002** Initialize backend project (`backend/package.json` with Express 4.x, Better-SQLite3, keycloak-connect, TypeScript 5.0+)
- [ ] **T003** Initialize frontend project (`frontend/package.json` with React 18, Vite, keycloak-js, React Router v6, axios)
- [ ] **T004** [P] Configure backend linting and formatting (`backend/.eslintrc.js`, `backend/.prettierrc`)
- [ ] **T005** [P] Configure frontend linting and formatting (`frontend/.eslintrc.js`, `frontend/.prettierrc`)
- [ ] **T006** Setup shared types directory (`shared/types/User.ts`, `Campaign.ts`, `Session.ts`)

---

## Phase 3.2: Database & Schema

- [ ] **T007** Create SQLite schema (`backend/src/db/schema.sql` with users, campaigns, sessions tables per data-model.md)
- [ ] **T008** Create DatabaseService (`backend/src/services/DatabaseService.ts` with Better-SQLite3, WAL mode, migrations)
- [ ] **T009** Create migration system (`backend/src/db/migrations.ts` with version tracking)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (from contracts/)
- [ ] **T010** [P] Contract test POST /api/auth/login (`backend/tests/contract/auth.contract.test.ts` from contracts/auth.yaml)
- [ ] **T011** [P] Contract test POST /api/auth/logout (`backend/tests/contract/auth.contract.test.ts` from contracts/auth.yaml)
- [ ] **T012** [P] Contract test GET /api/auth/validate (`backend/tests/contract/auth.contract.test.ts` from contracts/auth.yaml)
- [ ] **T013** [P] Contract test GET /api/campaigns (`backend/tests/contract/campaigns.contract.test.ts` from contracts/campaigns.yaml)
- [ ] **T014** [P] Contract test POST /api/campaigns (`backend/tests/contract/campaigns.contract.test.ts` from contracts/campaigns.yaml)
- [ ] **T015** [P] Contract test DELETE /api/campaigns/:id (`backend/tests/contract/campaigns.contract.test.ts` from contracts/campaigns.yaml)
- [ ] **T016** [P] Contract test POST /api/sessions (`backend/tests/contract/sessions.contract.test.ts` from contracts/sessions.yaml)

### Backend Integration Tests (from quickstart.md scenarios)
- [ ] **T017** [P] Integration test: Keycloak auth flow (`backend/tests/integration/auth-flow.integration.test.ts`)
- [ ] **T018** [P] Integration test: Campaign CRUD with ownership (`backend/tests/integration/campaign-crud.integration.test.ts`)
- [ ] **T019** [P] Integration test: Public URL generation and access (`backend/tests/integration/public-url.integration.test.ts`)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Models
- [ ] **T020** [P] User model (`backend/src/models/User.ts` with TypeScript interface from data-model.md)
- [ ] **T021** [P] Campaign model (`backend/src/models/Campaign.ts` with TypeScript interface from data-model.md)
- [ ] **T022** [P] Session model (`backend/src/models/Session.ts` with TypeScript interface from data-model.md)

### Services
- [ ] **T023** AuthService (`backend/src/services/AuthService.ts` with Keycloak token validation)
- [ ] **T024** CampaignService (`backend/src/services/CampaignService.ts` with CRUD, ownership checks, public URL generation per research.md section 7)
- [ ] **T025** SessionService (`backend/src/services/SessionService.ts` with session lifecycle management)

### Middleware
- [ ] **T026** Keycloak middleware (`backend/src/middleware/keycloak.ts` with keycloak-connect per research.md section 5)
- [ ] **T027** CORS middleware (`backend/src/middleware/cors.ts` with localhost:3000 origin per research.md section 6)
- [ ] **T028** Error handler middleware (`backend/src/middleware/errorHandler.ts`)

### Routes
- [ ] **T029** Auth routes (`backend/src/routes/auth.ts` with POST /login, /logout, GET /validate per contracts/auth.yaml)
- [ ] **T030** Campaign routes (`backend/src/routes/campaigns.ts` with GET, POST, DELETE per contracts/campaigns.yaml)
- [ ] **T031** Health route (`backend/src/routes/health.ts` with GET /health checking Keycloak + DB)

### Server Setup
- [ ] **T032** Express server setup (`backend/src/server.ts` with middleware registration, route mounting)

---

## Phase 3.5: Frontend Core Implementation

### Services & Configuration
- [ ] **T033** [P] Keycloak service (`frontend/src/services/keycloakService.ts` with PKCE initialization per research.md section 4)
- [ ] **T034** [P] API client (`frontend/src/services/apiClient.ts` with axios interceptor for token injection)
- [ ] **T035** [P] Campaign service (`frontend/src/services/campaignService.ts` with API calls for CRUD)

### Context & Hooks
- [ ] **T036** AuthContext (`frontend/src/contexts/AuthContext.tsx` with login, logout, user state)
- [ ] **T037** [P] useAuth hook (`frontend/src/hooks/useAuth.ts`)
- [ ] **T038** [P] useCampaigns hook (`frontend/src/hooks/useCampaigns.ts`)

### Components
- [ ] **T039** [P] ProtectedRoute component (`frontend/src/components/shared/ProtectedRoute.tsx`)
- [ ] **T040** [P] LoginButton component (`frontend/src/components/shared/LoginButton.tsx`)
- [ ] **T041** [P] LogoutButton component (`frontend/src/components/shared/LogoutButton.tsx`)
- [ ] **T042** [P] NavBar component (`frontend/src/components/shared/NavBar.tsx`)
- [ ] **T043** PublicLanding component (`frontend/src/components/PublicLanding.tsx` with app info, login button)
- [ ] **T044** CampaignManagement component (`frontend/src/components/CampaignManagement.tsx` with list, create, delete)
- [ ] **T045** CampaignHomepage component (`frontend/src/components/CampaignHomepage.tsx` with wiki placeholder)

### Pages
- [ ] **T046** [P] LandingPage (`frontend/src/pages/LandingPage.tsx` wrapping PublicLanding)
- [ ] **T047** [P] CampaignsPage (`frontend/src/pages/CampaignsPage.tsx` wrapping CampaignManagement with ProtectedRoute)
- [ ] **T048** [P] CampaignPage (`frontend/src/pages/CampaignPage.tsx` wrapping CampaignHomepage with ProtectedRoute)

### Routing
- [ ] **T049** AppRoutes (`frontend/src/routes/AppRoutes.tsx` with React Router v6 configuration)
- [ ] **T050** App root component (`frontend/src/App.tsx` with AuthProvider wrapper)

---

## Phase 3.6: Integration

- [ ] **T051** Connect backend to Keycloak container (verify `http://keycloak:8080` connectivity in health check)
- [ ] **T052** Connect frontend to backend API (verify CORS, token injection)
- [ ] **T053** Test session persistence across page refreshes (verify Keycloak token refresh)
- [ ] **T054** Test public URL access without authentication (verify bypass of protect middleware)

---

## Phase 3.7: Polish & Validation

### Unit Tests
- [ ] **T055** [P] Unit test AuthService token validation (`backend/tests/unit/services/AuthService.test.ts`)
- [ ] **T056** [P] Unit test CampaignService CRUD (`backend/tests/unit/services/CampaignService.test.ts`)
- [ ] **T057** [P] Unit test public URL generation collision handling (`backend/tests/unit/utils/generatePublicId.test.ts`)

### Frontend Tests
- [ ] **T058** [P] Component test PublicLanding (`frontend/tests/components/PublicLanding.test.tsx` with Vitest + RTL)
- [ ] **T059** [P] Component test CampaignManagement (`frontend/tests/components/CampaignManagement.test.tsx`)

### E2E Tests
- [ ] **T060** E2E test: Complete auth flow with Playwright (`frontend/tests/e2e/auth-flow.spec.ts` per quickstart.md primary user flow)

### Documentation & Cleanup
- [ ] **T061** Validate quickstart.md (execute all 12 steps from "Primary User Flow Test")
- [ ] **T062** [P] Remove code duplication and add inline comments
- [ ] **T063** [P] Verify Docker hot reload works (backend nodemon, frontend Vite HMR per research.md section 8)

---

## Dependencies

### Strict Ordering
1. **Infrastructure before everything**: T001-T006 before all other tasks
2. **Database before tests**: T007-T009 before T010-T019
3. **Tests before implementation**: T010-T019 MUST complete (and fail) before T020-T032
4. **Backend before frontend integration**: T020-T032 before T051-T052
5. **Implementation before polish**: T020-T050 before T055-T063

### Specific Dependencies
- T008 (DatabaseService) blocks T017, T018, T019 (integration tests need DB)
- T026 (Keycloak middleware) blocks T029-T030 (routes need protection)
- T033 (Keycloak service) blocks T036 (AuthContext needs keycloak.init)
- T036 (AuthContext) blocks T037, T039-T050 (components need useAuth)
- T034 (API client) blocks T035, T044 (services need axios instance)

---

## Parallel Execution Examples

### Example 1: Contract Tests (Phase 3.3)
```bash
# Launch T010-T016 together (different test files):
Task: "Contract test POST /api/auth/login in backend/tests/contract/auth.contract.test.ts"
Task: "Contract test GET /api/campaigns in backend/tests/contract/campaigns.contract.test.ts"
Task: "Contract test POST /api/sessions in backend/tests/contract/sessions.contract.test.ts"
```

### Example 2: Models (Phase 3.4)
```bash
# Launch T020-T022 together (different model files):
Task: "User model in backend/src/models/User.ts"
Task: "Campaign model in backend/src/models/Campaign.ts"
Task: "Session model in backend/src/models/Session.ts"
```

### Example 3: Frontend Services (Phase 3.5)
```bash
# Launch T033-T035 together (different service files):
Task: "Keycloak service in frontend/src/services/keycloakService.ts"
Task: "API client in frontend/src/services/apiClient.ts"
Task: "Campaign service in frontend/src/services/campaignService.ts"
```

### Example 4: Frontend Components (Phase 3.5)
```bash
# Launch T039-T042 together (different component files):
Task: "ProtectedRoute component in frontend/src/components/shared/ProtectedRoute.tsx"
Task: "LoginButton component in frontend/src/components/shared/LoginButton.tsx"
Task: "LogoutButton component in frontend/src/components/shared/LogoutButton.tsx"
Task: "NavBar component in frontend/src/components/shared/NavBar.tsx"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T010-T016 cover auth.yaml, campaigns.yaml, sessions.yaml)
- [x] All entities have model tasks (T020-T022 for User, Campaign, Session)
- [x] All tests come before implementation (T010-T019 before T020-T032)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for auth security)
- **Commit after each task** for incremental progress
- **Docker Compose startup**: `docker-compose up --build` (30-60s for health checks)
- **Hot reload enabled**: Nodemon (backend) + Vite HMR (frontend) per research.md
- **Keycloak admin**: http://localhost:8080/admin (admin/admin) for debugging

---

**Total Tasks**: 63
**Estimated Completion**: 3-5 days (with TDD, includes Docker setup, full auth flow, frontend integration)
**Critical Path**: T001 → T007-T009 → T010-T019 → T020-T032 → T033-T050 → T051-T054 → T060-T061
