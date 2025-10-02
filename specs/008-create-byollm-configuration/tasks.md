# Tasks: BYOLLM Configuration System

**Feature**: 008-create-byollm-configuration
**Input**: Design documents from `/specs/008-create-byollm-configuration/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓
**Dependencies**: Feature 002 (Authentication & Campaign Management) MUST be complete

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: Node.js crypto (AES-256-GCM), OAuth 2.0 + PKCE, axios, jose (JWT)
2. Load design documents ✓
   → data-model.md: 5 entities (BYOLLMConfig, ProviderCredits, OAuthSession, MCPConfig, CustomEndpointConfig)
   → contracts/: 1 file (byollm.yaml)
   → research.md: 6 technical decisions (OAuth + PKCE, AES-256-GCM encryption, MCP integration)
3. Generate tasks by category ✓
   → Setup: Database migrations for BYOLLM tables
   → Tests: contract tests, OAuth flow, encryption, connection testing
   → Core: models, services (OAuth, Encryption, Provider clients), routes
   → Frontend: Settings pages, OAuth callback, connection test UI, model selection
   → Integration: OAuth flow, MCP validation, rate limit handling
   → Polish: E2E tests, quickstart validation
4. Apply task rules ✓
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T070) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Path Conventions (Web App - extends feature 002)
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `backend/src/db/migrations/008-byollm.sql`
- **Shared**: `shared/types/` (extended with BYOLLMConfig, ProviderCredits)

---

## Phase 3.1: Database Setup & Migrations

- [ ] **T001** Create migration 008 for BYOLLM tables (`backend/src/db/migrations/008-add-byollm-tables.sql` with byollm_configs, provider_credits, oauth_sessions, mcp_configs, custom_endpoint_configs per data-model.md)
- [ ] **T002** Create indexes for BYOLLM queries (`backend/src/db/migrations/008-add-byollm-indexes.sql` for scope, campaign_id, provider)
- [ ] **T003** Test encrypted credentials storage (`backend/src/db/migrations/008-test-encryption.sql` validate TEXT column can store AES-256-GCM ciphertext)

---

## Phase 3.2: Shared Types

- [ ] **T004** [P] BYOLLMConfig type (`shared/types/BYOLLMConfig.ts` with TypeScript interface from data-model.md)
- [ ] **T005** [P] ProviderCredits type (`shared/types/ProviderCredits.ts` with TypeScript interface from data-model.md)
- [ ] **T006** [P] OAuthSession type (`shared/types/OAuthSession.ts` with TypeScript interface from data-model.md)
- [ ] **T007** [P] MCPConfig type (`shared/types/MCPConfig.ts` with TypeScript interface from data-model.md)
- [ ] **T008** [P] CustomEndpointConfig type (`shared/types/CustomEndpointConfig.ts` with TypeScript interface from data-model.md)

---

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (from contracts/)
- [ ] **T009** [P] Contract test POST /api/byollm/oauth/initiate (`backend/tests/contract/byollm.contract.test.ts` from contracts/byollm.yaml)
- [ ] **T010** [P] Contract test GET /api/byollm/oauth/callback (`backend/tests/contract/byollm.contract.test.ts` from contracts/byollm.yaml)
- [ ] **T011** [P] Contract test POST /api/byollm/config (`backend/tests/contract/byollm.contract.test.ts` from contracts/byollm.yaml)
- [ ] **T012** [P] Contract test GET /api/byollm/config (`backend/tests/contract/byollm.contract.test.ts` from contracts/byollm.yaml)
- [ ] **T013** [P] Contract test POST /api/byollm/test-connection (`backend/tests/contract/byollm.contract.test.ts` from contracts/byollm.yaml - MCP validation)
- [ ] **T014** [P] Contract test GET /api/byollm/credits (`backend/tests/contract/byollm.contract.test.ts` from contracts/byollm.yaml)

### Backend Unit Tests (Critical Security & OAuth Logic)
- [ ] **T015** [P] Unit test AES-256-GCM encryption (`backend/tests/unit/services/EncryptionService.test.ts` test encrypt/decrypt with passphrase per research.md)
- [ ] **T016** [P] Unit test PKCE code verifier generation (`backend/tests/unit/services/OAuthFlowService-pkce.test.ts` test SHA-256 challenge generation)
- [ ] **T017** [P] Unit test OAuth state validation (`backend/tests/unit/services/OAuthFlowService-state.test.ts` test CSRF protection)
- [ ] **T018** [P] Unit test rate limit handling (`backend/tests/unit/services/ProviderClient-rate-limits.test.ts` test exponential backoff, Retry-After header)
- [ ] **T019** [P] Unit test MCP bulk operation validation (`backend/tests/unit/services/MCPConfigService-validation.test.ts` test MCP protocol compliance)

### Backend Integration Tests (from quickstart.md)
- [ ] **T020** [P] Integration test: OAuth 2.0 Authorization Code Flow + PKCE (`backend/tests/integration/oauth-flow.integration.test.ts` initiate → callback → token exchange)
- [ ] **T021** [P] Integration test: API key configuration (`backend/tests/integration/api-key-config.integration.test.ts` Anthropic API key auth)
- [ ] **T022** [P] Integration test: Connection test with MCP validation (`backend/tests/integration/connection-test-mcp.integration.test.ts`)
- [ ] **T023** [P] Integration test: Per-campaign override (`backend/tests/integration/campaign-override.integration.test.ts` global config + campaign override)

---

## Phase 3.4: Backend Core Implementation (ONLY after tests are failing)

### Models
- [ ] **T024** [P] BYOLLMConfig model (`backend/src/models/BYOLLMConfig.ts` with TypeScript interface from data-model.md)
- [ ] **T025** [P] ProviderCredits model (`backend/src/models/ProviderCredits.ts` with TypeScript interface from data-model.md)
- [ ] **T026** [P] OAuthSession model (`backend/src/models/OAuthSession.ts` with TypeScript interface from data-model.md)
- [ ] **T027** [P] MCPConfig model (`backend/src/models/MCPConfig.ts` with TypeScript interface from data-model.md)
- [ ] **T028** [P] CustomEndpointConfig model (`backend/src/models/CustomEndpointConfig.ts` with TypeScript interface from data-model.md)

### Services - Security & Encryption
- [ ] **T029** EncryptionService (`backend/src/services/EncryptionService.ts` AES-256-GCM encryption with passphrase per research.md section 2)
- [ ] **T030** EncryptionService - Key derivation (`backend/src/services/EncryptionService.ts` PBKDF2 key derivation with salt)

### Services - OAuth Flow
- [ ] **T031** OAuthFlowService - PKCE generation (`backend/src/services/OAuthFlowService.ts` generate code_verifier and code_challenge per research.md section 1)
- [ ] **T032** OAuthFlowService - State validation (`backend/src/services/OAuthFlowService.ts` CSRF state token generation and validation)
- [ ] **T033** OAuthFlowService - Authorization URL (`backend/src/services/OAuthFlowService.ts` construct OAuth authorization URL with PKCE params)
- [ ] **T034** OAuthFlowService - Token exchange (`backend/src/services/OAuthFlowService.ts` exchange authorization code for access token, verify code_verifier)

### Services - Provider Clients
- [ ] **T035** ProviderClientService - OpenAI (`backend/src/services/ProviderClientService-OpenAI.ts` OpenAI API client with OAuth token per research.md section 4)
- [ ] **T036** ProviderClientService - Anthropic (`backend/src/services/ProviderClientService-Anthropic.ts` Anthropic API client with API key or OAuth per research.md section 4)
- [ ] **T037** ProviderClientService - Custom Endpoint (`backend/src/services/ProviderClientService-Custom.ts` custom endpoint client with OpenAI-compatible format)
- [ ] **T038** ProviderClientService - Rate limit handling (`backend/src/services/ProviderClientService.ts` exponential backoff with jitter, Retry-After header per research.md section 5)

### Services - Configuration & Validation
- [ ] **T039** BYOLLMConfigService (`backend/src/services/BYOLLMConfigService.ts` CRUD for BYOLLM configs, scope resolution global vs campaign)
- [ ] **T040** MCPConfigService (`backend/src/services/MCPConfigService.ts` validate MCP bulk operations, test connection per research.md section 3)
- [ ] **T041** CreditsService (`backend/src/services/CreditsService.ts` fetch/cache provider credits with 5min TTL per data-model.md)

### Routes
- [ ] **T042** OAuth routes (`backend/src/routes/byollm-oauth.ts` POST /initiate, GET /callback per contracts/byollm.yaml)
- [ ] **T043** BYOLLM config routes (`backend/src/routes/byollm-config.ts` POST /config, GET /config per contracts/byollm.yaml)
- [ ] **T044** Connection test route (`backend/src/routes/byollm-test.ts` POST /test-connection with MCP validation per contracts/byollm.yaml)
- [ ] **T045** Credits route (`backend/src/routes/byollm-credits.ts` GET /credits with TTL caching per contracts/byollm.yaml)

---

## Phase 3.5: Frontend Core - Settings & OAuth Flow

### Settings Pages
- [ ] **T046** BYOLLMSettingsPage (`frontend/src/pages/BYOLLMSettingsPage.tsx` main BYOLLM configuration page with global and campaign tabs)
- [ ] **T047** ProviderSelector component (`frontend/src/components/byollm/ProviderSelector.tsx` select OpenAI, Anthropic, or Custom Endpoint)
- [ ] **T048** AuthMethodSelector component (`frontend/src/components/byollm/AuthMethodSelector.tsx` select OAuth 2.0 or API Key for Anthropic)
- [ ] **T049** OAuthInitiateButton component (`frontend/src/components/byollm/OAuthInitiateButton.tsx` trigger OAuth flow, handle redirect)
- [ ] **T050** APIKeyInput component (`frontend/src/components/byollm/APIKeyInput.tsx` masked input for API key entry)

### OAuth Callback & Flow
- [ ] **T051** OAuthCallbackPage (`frontend/src/pages/OAuthCallbackPage.tsx` handle OAuth callback, extract authorization code, exchange for token)
- [ ] **T052** OAuthFlowHandler service (`frontend/src/services/oauth-flow.service.ts` manage OAuth state, PKCE verifier storage in sessionStorage)

### Configuration UI
- [ ] **T053** ModelSelector component (`frontend/src/components/byollm/ModelSelector.tsx` dropdown for model selection with context window info)
- [ ] **T054** CustomEndpointConfig component (`frontend/src/components/byollm/CustomEndpointConfig.tsx` URL input, headers, format selection)
- [ ] **T055** CustomSystemPromptEditor component (`frontend/src/components/byollm/CustomSystemPromptEditor.tsx` text area or file upload for custom prompts)
- [ ] **T056** ConnectionTestButton component (`frontend/src/components/byollm/ConnectionTestButton.tsx` test connection with MCP validation, show result)
- [ ] **T057** CreditsDisplay component (`frontend/src/components/byollm/CreditsDisplay.tsx` show remaining credits, usage, org name)

### Campaign Override UI
- [ ] **T058** CampaignOverrideToggle component (`frontend/src/components/byollm/CampaignOverrideToggle.tsx` enable per-campaign config override)
- [ ] **T059** BlockingErrorNotification component (`frontend/src/components/byollm/BlockingErrorNotification.tsx` show error when no valid config for Import/Planning AI)

### API Clients
- [ ] **T060** [P] BYOLLMService API client (`frontend/src/services/byollm.service.ts` API calls for config CRUD, OAuth, connection test, credits)

---

## Phase 3.6: Integration & Polish

### Integration Tasks
- [ ] **T061** Integrate OAuth flow end-to-end (initiate → callback → token exchange → encrypted storage → connection test)
- [ ] **T062** Integrate PKCE with OAuth (verify code_verifier persists in sessionStorage, code_challenge sent to authorization URL)
- [ ] **T063** Integrate AES-256-GCM encryption (verify credentials encrypted before storage, decrypted before API calls)
- [ ] **T064** Integrate MCP connection test (verify bulk operation test, timeout handling, error messages)
- [ ] **T065** Integrate rate limit handling (trigger rate limit, verify exponential backoff, Retry-After header respect)
- [ ] **T066** Test campaign override logic (set global config, override in campaign, verify correct config used)

### Frontend Component Tests
- [ ] **T067** [P] Component test ProviderSelector (`frontend/tests/components/ProviderSelector.test.tsx` with Vitest + RTL)
- [ ] **T068** [P] Component test OAuthInitiateButton (`frontend/tests/components/OAuthInitiateButton.test.tsx` test redirect to authorization URL)
- [ ] **T069** [P] Component test ConnectionTestButton (`frontend/tests/components/ConnectionTestButton.test.tsx` test loading state, success/error display)

### E2E Tests
- [ ] **T070** E2E test: OAuth 2.0 Authorization Code Flow + PKCE (`frontend/tests/e2e/oauth-flow.spec.ts` with Playwright per quickstart.md)
- [ ] **T071** E2E test: API key configuration (`frontend/tests/e2e/api-key-config.spec.ts` configure Anthropic with API key)
- [ ] **T072** E2E test: Connection test workflow (`frontend/tests/e2e/connection-test.spec.ts` configure → test connection → validate MCP)
- [ ] **T073** E2E test: Per-campaign override (`frontend/tests/e2e/campaign-override.spec.ts` global config → campaign override → verify correct config)

### Documentation & Cleanup
- [ ] **T074** Validate quickstart.md (execute all 20 steps: OAuth flow → connection test → credits display → campaign override)
- [ ] **T075** [P] Add inline comments to encryption logic (AES-256-GCM, PBKDF2 key derivation per research.md)
- [ ] **T076** [P] Security audit: Verify credentials NEVER transmitted to VVD-mimic servers (all API calls direct from user machine)
- [ ] **T077** [P] Performance test OAuth flow (<3s per plan.md)
- [ ] **T078** [P] Performance test connection test (<5s per plan.md)

---

## Dependencies

### Strict Ordering
1. **Database migrations before everything**: T001-T003 before all other tasks
2. **Shared types before tests**: T004-T008 before T009-T023
3. **Tests before implementation**: T009-T023 MUST complete (and fail) before T024-T045
4. **Encryption service before OAuth service**: T029-T030 before T031-T034 (OAuth stores encrypted tokens)
5. **OAuth service before provider clients**: T031-T034 before T035-T037 (clients use OAuth tokens)
6. **Backend routes before frontend API client**: T042-T045 before T060
7. **OAuth flow handler before callback page**: T052 before T051 (page uses handler service)
8. **All core before integration**: T001-T060 before T061-T066
9. **Implementation before E2E tests**: T001-T066 before T070-T073

### Specific Dependencies
- T029 (EncryptionService) blocks T039 (BYOLLMConfigService uses encryption)
- T031-T034 (OAuthFlowService) blocks T042 (OAuth routes need service)
- T035-T037 (ProviderClientService) blocks T040 (MCPConfigService tests provider connections)
- T052 (OAuthFlowHandler) blocks T049, T051 (OAuth components need handler)
- T060 (BYOLLMService API client) blocks T046-T059 (UI components need API)

---

## Parallel Execution Examples

### Example 1: Shared Types (Phase 3.2)
```bash
# Launch T004-T008 together (different type files):
Task: "BYOLLMConfig type in shared/types/BYOLLMConfig.ts"
Task: "ProviderCredits type in shared/types/ProviderCredits.ts"
Task: "OAuthSession type in shared/types/OAuthSession.ts"
Task: "MCPConfig type in shared/types/MCPConfig.ts"
Task: "CustomEndpointConfig type in shared/types/CustomEndpointConfig.ts"
```

### Example 2: Contract Tests (Phase 3.3)
```bash
# Launch T009-T014 together (same contract test file, but different describe blocks):
Task: "Contract test POST /api/byollm/oauth/initiate in backend/tests/contract/byollm.contract.test.ts"
Task: "Contract test GET /api/byollm/oauth/callback in backend/tests/contract/byollm.contract.test.ts"
Task: "Contract test POST /api/byollm/config in backend/tests/contract/byollm.contract.test.ts"
Task: "Contract test GET /api/byollm/config in backend/tests/contract/byollm.contract.test.ts"
Task: "Contract test POST /api/byollm/test-connection in backend/tests/contract/byollm.contract.test.ts"
Task: "Contract test GET /api/byollm/credits in backend/tests/contract/byollm.contract.test.ts"
```

### Example 3: Unit Tests (Phase 3.3)
```bash
# Launch T015-T019 together (different unit test files):
Task: "Unit test AES-256-GCM encryption in backend/tests/unit/services/EncryptionService.test.ts"
Task: "Unit test PKCE code verifier generation in backend/tests/unit/services/OAuthFlowService-pkce.test.ts"
Task: "Unit test OAuth state validation in backend/tests/unit/services/OAuthFlowService-state.test.ts"
Task: "Unit test rate limit handling in backend/tests/unit/services/ProviderClient-rate-limits.test.ts"
Task: "Unit test MCP bulk operation validation in backend/tests/unit/services/MCPConfigService-validation.test.ts"
```

### Example 4: Models (Phase 3.4)
```bash
# Launch T024-T028 together (different model files):
Task: "BYOLLMConfig model in backend/src/models/BYOLLMConfig.ts"
Task: "ProviderCredits model in backend/src/models/ProviderCredits.ts"
Task: "OAuthSession model in backend/src/models/OAuthSession.ts"
Task: "MCPConfig model in backend/src/models/MCPConfig.ts"
Task: "CustomEndpointConfig model in backend/src/models/CustomEndpointConfig.ts"
```

### Example 5: Provider Clients (Phase 3.4)
```bash
# Launch T035-T037 together (different provider client files):
Task: "ProviderClientService - OpenAI in backend/src/services/ProviderClientService-OpenAI.ts"
Task: "ProviderClientService - Anthropic in backend/src/services/ProviderClientService-Anthropic.ts"
Task: "ProviderClientService - Custom Endpoint in backend/src/services/ProviderClientService-Custom.ts"
```

### Example 6: Component Tests (Phase 3.6)
```bash
# Launch T067-T069 together (different component test files):
Task: "Component test ProviderSelector in frontend/tests/components/ProviderSelector.test.tsx"
Task: "Component test OAuthInitiateButton in frontend/tests/components/OAuthInitiateButton.test.tsx"
Task: "Component test ConnectionTestButton in frontend/tests/components/ConnectionTestButton.test.tsx"
```

---

## Validation Checklist
*GATE: Must pass before marking Phase 3 complete*

- [x] All contracts have corresponding tests (T009-T014 cover byollm.yaml)
- [x] All entities have model tasks (T024-T028 for BYOLLMConfig, ProviderCredits, OAuthSession, MCPConfig, CustomEndpointConfig)
- [x] All tests come before implementation (T009-T023 before T024-T045)
- [x] Parallel tasks truly independent (verified: different files, no shared dependencies)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts except T009-T014 same file but different test cases)
- [x] Critical security logic has unit tests (T015-T019 for encryption, PKCE, OAuth state, rate limits, MCP)
- [x] OAuth flow has E2E validation (T070-T073)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD critical for security)
- **AES-256-GCM encryption** (T015, T029-T030, T075) - prototype-level encryption per research.md, PBKDF2 key derivation with salt
- **OAuth 2.0 + PKCE** (T016-T017, T031-T034, T061-T062) - code_verifier in sessionStorage, code_challenge in authorization URL, CSRF state validation
- **NEVER transmit credentials** (T076) - all provider API calls direct from user machine, not proxied through VVD-mimic servers
- **MCP bulk operation test** (T013, T019, T040, T064) - validates LLM supports MCP protocol before saving config
- **Rate limit handling** (T018, T038, T065) - exponential backoff with jitter, respect Retry-After header, max 3 retries
- **Credits display** (T041, T057) - cached with 5min TTL per data-model.md, prevent surprise costs
- **Per-campaign override** (T023, T058, T066, T073) - campaign config overrides global, scope resolution
- **Blocking errors** (T059) - prevent Import/Planning AI usage without valid BYOLLM config
- **Performance** (T077-T078) - OAuth flow <3s, connection test <5s per plan.md

---

## Critical Risk Areas

1. **Encryption Security** (T015, T029-T030, T075, T076):
   - AES-256-GCM is prototype-level encryption (not production-grade HSM)
   - Passphrase stored in environment variable (acceptable for local prototype)
   - PBKDF2 key derivation with random salt
   - NEVER log or transmit encrypted credentials

2. **OAuth 2.0 + PKCE Flow** (T016-T017, T031-T034, T061-T062, T070):
   - code_verifier MUST persist in sessionStorage (survives redirect)
   - code_challenge = SHA-256(code_verifier) sent to authorization URL
   - CSRF state token validated on callback
   - Authorization code exchanged for access token with code_verifier

3. **MCP Validation** (T013, T019, T040, T064, T072):
   - Test bulk MCP operation (e.g., import 50 cards) before saving config
   - Timeout handling (default 30s)
   - Validate LLM supports MCP protocol version
   - Show clear error if MCP validation fails

4. **Rate Limit Handling** (T018, T038, T065):
   - Exponential backoff: 1s, 2s, 4s, 8s, 16s (with jitter)
   - Respect Retry-After header from provider
   - Max 3 retries before showing error
   - User notification when rate limited

5. **Provider API Direct Calls** (T035-T037, T076):
   - All OpenAI/Anthropic/Custom API calls from user's browser/machine
   - NOT proxied through VVD-mimic backend
   - Credentials decrypted in backend, passed to frontend securely
   - No credential logging or persistence outside encrypted storage

6. **Credits Caching** (T041, T057):
   - 5-minute TTL to prevent excessive API calls
   - Display: balance, org name, usage
   - Prevent surprise costs by showing before Import/Planning AI use

---

**Total Tasks**: 78
**Estimated Completion**: 8-12 days (OAuth 2.0 + PKCE complex, encryption security-critical, MCP validation, multi-provider support)
**Critical Path**: T001-T003 → T004-T008 → T009-T023 → T024-T045 → T046-T060 → T061-T066 → T070-T078
**Blocking Feature**: This is BLOCKING for Feature 005 (AI Import/Planning) and Feature 009 (Player Portal) - both require BYOLLM credentials
