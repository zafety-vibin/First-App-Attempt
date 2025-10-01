
# Implementation Plan: BYOLLM Configuration and Account Connection

**Branch**: `008-create-byollm-configuration` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-create-byollm-configuration/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Feature 008 provides BYOLLM (Bring Your Own LLM) configuration system, enabling users to connect their own LLM provider accounts (OpenAI, Anthropic, Custom Endpoint) for Import and Planning AI workflows. Implements Constitution Principle V (BYOLLM & Privacy) by requiring user-provided credentials, storing them locally with encryption, and never transmitting to VVD-mimic servers. Users authenticate via OAuth 2.0 or API key, view remaining credits, select models with context info, test connections with bulk MCP validation, and optionally add custom system prompts. Settings support global (all campaigns) and per-campaign configuration scopes. Error handling includes blocking when unconfigured, graceful failure with retry on API errors, and automatic retry with notification on rate limits. All API calls go directly from user's machine to their chosen provider.

## Technical Context
**Language/Version**: Node.js 20 LTS, TypeScript 5.0+
**Primary Dependencies**: Express 4.x, Better-SQLite3, React 18, axios, jose (JWT handling), crypto (Node.js built-in encryption)
**Storage**: SQLite database with encrypted credentials table, separate global and per-campaign configuration
**Testing**: Vitest (backend services, frontend components), Supertest (API endpoints), Playwright (E2E OAuth flow)
**Target Platform**: Docker Compose localhost environment (Linux container, Windows/Mac host)
**Project Type**: web (frontend + backend)
**Performance Goals**: OAuth flow <3 seconds, connection test <5 seconds, credits refresh <2 seconds
**Constraints**: Credentials encrypted locally (prototype-level encryption, not production-grade), no credentials transmitted to VVD-mimic servers, all provider API calls direct from user machine
**Scale/Scope**: Support 3 providers (OpenAI, Anthropic, Custom), 2 auth methods (OAuth, API key), 2 scopes (global, per-campaign), unlimited custom system prompts

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Workflow-First Design
**Status**: ✅ PASS
**Rationale**: BYOLLM configuration is a prerequisite for Import and Planning AI workflows (Features 005+). Settings accessible from campaign page and global navigation. Blocking errors with direct links to Settings ensure users can't accidentally skip configuration. OAuth and API key flows integrate naturally into existing user journeys.

### II. User Agency & Control
**Status**: ✅ PASS
**Rationale**: Users have complete control over LLM provider choice (no defaults suggested, all presented neutrally). Users control credentials (OAuth authorization, API key entry, disconnect anytime). Users control model selection, custom system prompts, and per-campaign overrides. Test connection validates before saving. Users explicitly opt-in to provider connections.

### III. Information Filtering
**Status**: ✅ PASS (Not directly applicable)
**Rationale**: BYOLLM configuration is settings infrastructure, not content. No information filtering needed. Planning and Import AI workflows using BYOLLM will respect information filtering from Feature 004.

### IV. Knowledge Graph Architecture
**Status**: ✅ PASS (Not directly applicable)
**Rationale**: BYOLLM configuration provides API credentials for AI workflows that will populate knowledge graph (Feature 006). Configuration itself is not graph content. Indirectly supports knowledge graph by enabling Import AI to parse notes into entities.

### V. BYOLLM & Privacy
**Status**: ✅ PASS (CRITICAL - Core feature)
**Rationale**: **This feature directly implements Constitution Principle V (NON-NEGOTIABLE).**
- Users MUST provide their own LLM account credentials
- Credentials stored locally with encryption (prototype-level)
- Credentials NEVER transmitted to VVD-mimic servers
- All provider API calls go directly from user's machine to chosen provider
- Prominent privacy notices in UI
- Import and Planning AI completely blocked without valid BYOLLM configuration
- Supports offline local LLMs via Custom Endpoint (Ollama, LM Studio)

### VI. Local-Only Prototype
**Status**: ✅ PASS
**Rationale**: Docker Compose localhost deployment. SQLite local storage for credentials. No remote VVD-mimic servers to transmit credentials to. OAuth callbacks redirect to localhost. All provider API calls originate from user's machine. Custom Endpoint supports fully offline local LLM usage.

### VII. Transparency & No Autonomous AI
**Status**: ✅ PASS
**Rationale**: BYOLLM configuration is transparent infrastructure. Users explicitly connect accounts, see credits/usage, test connections, configure models. No autonomous behavior. API calls only happen when user triggers Import or Planning workflows. Error messages actionable and clear. Privacy notices explain local-only storage.

## Project Structure

### Documentation (this feature)
```
specs/008-create-byollm-configuration/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/
│   │   └── byollm-config.model.ts         # BYOLLM configuration entity, encryption
│   ├── services/
│   │   ├── byollm-config.service.ts       # Configuration CRUD, scope resolution
│   │   ├── oauth-flow.service.ts          # OAuth 2.0 authorization flow (OpenAI, Anthropic)
│   │   ├── provider-client.service.ts     # Generic provider API client (credits, models, test)
│   │   ├── encryption.service.ts          # Credential encryption/decryption (prototype-level)
│   │   └── mcp-config.service.ts          # Automatic MCP settings (streaming, timeout, retry)
│   └── api/
│       └── byollm-config.routes.ts        # Settings endpoints, OAuth callback
└── tests/
    ├── contract/
    │   └── byollm-config.contract.test.ts # API contract tests from OpenAPI
    ├── integration/
    │   └── oauth-flow.integration.test.ts # OAuth flow E2E test
    └── unit/
        ├── byollm-config.service.test.ts
        ├── encryption.service.test.ts
        └── provider-client.service.test.ts

frontend/
├── src/
│   ├── components/
│   │   ├── settings/
│   │   │   ├── BYOLLMSettings.tsx         # Main settings page component
│   │   │   ├── ProviderSelector.tsx       # Provider choice UI (OpenAI/Anthropic/Custom)
│   │   │   ├── OAuthButton.tsx            # OAuth authorization trigger
│   │   │   ├── APIKeyInput.tsx            # Manual API key entry (masked)
│   │   │   ├── CreditsDisplay.tsx         # Remaining credits/usage display
│   │   │   ├── ModelSelector.tsx          # Model dropdown with context window info
│   │   │   ├── CustomEndpointConfig.tsx   # Custom endpoint URL/auth configuration
│   │   │   ├── ConnectionTest.tsx         # Test connection button and results
│   │   │   ├── CustomSystemPrompt.tsx     # Custom prompt text input or file upload
│   │   │   ├── ScopeSelector.tsx          # Global vs per-campaign toggle
│   │   │   └── PrivacyNotice.tsx          # Privacy messaging component
│   │   └── errors/
│   │       └── BYOLLMBlockingError.tsx    # Blocking error when no config (Import/Planning)
│   ├── pages/
│   │   └── SettingsPage.tsx               # Settings page with BYOLLM section
│   └── services/
│       └── byollm.service.ts              # Frontend API client for BYOLLM endpoints
└── tests/
    ├── integration/
    │   └── byollm-settings.integration.test.tsx # Settings page flow test
    └── unit/
        ├── BYOLLMSettings.test.tsx
        ├── ProviderSelector.test.tsx
        └── ConnectionTest.test.tsx
```

**Structure Decision**: Web application structure selected. Backend provides BYOLLM configuration API, OAuth callback endpoint, provider client for credits/models/test, and encryption service. Frontend provides Settings UI with provider selection, OAuth flow initiation, API key entry, model selection, connection test, and blocking error components for Import/Planning features.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - OAuth 2.0 implementation for OpenAI and Anthropic providers
   - Credential encryption appropriate for local prototype (not production-grade)
   - MCP (Model Context Protocol) automatic configuration for bulk operations
   - Provider API client patterns (credits fetching, model listing, connection validation)
   - Rate limit detection and automatic retry strategy
   - Custom Endpoint configuration for local LLMs (Ollama, LM Studio)

2. **Generate and dispatch research agents**:
   ```
   Task: "Research OAuth 2.0 implementation for LLM providers (OpenAI, Anthropic) with localhost redirect"
   Task: "Research credential encryption for local SQLite storage (prototype-level, Node.js crypto)"
   Task: "Research MCP (Model Context Protocol) configuration for bulk operations (streaming, timeout, retry)"
   Task: "Research OpenAI and Anthropic API patterns for credits/usage, model listing, connection test"
   Task: "Research rate limit handling and automatic retry with exponential backoff"
   Task: "Research local LLM endpoint configuration (Ollama, LM Studio) for Custom Endpoint"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - BYOLLMConfig entity (provider, auth method, model, scope, custom prompts, encrypted credentials)
   - OAuthToken entity (access token, refresh token, expiry, provider)
   - ProviderCredits entity (cached credits/usage, organization name, last fetched)
   - MCPConfig entity (streaming, timeout, retry - automatic, hidden from user)
   - CustomSystemPrompt entity (Import AI prompt, Planning AI prompt, scope)

2. **Generate API contracts** from functional requirements:
   - POST /api/byollm/config (create/update configuration)
   - GET /api/byollm/config (get configuration for scope)
   - DELETE /api/byollm/config (delete per-campaign configuration)
   - POST /api/byollm/oauth/initiate (start OAuth flow)
   - GET /api/byollm/oauth/callback (OAuth provider callback)
   - GET /api/byollm/credits (fetch current credits/usage)
   - GET /api/byollm/models (list available models for provider)
   - POST /api/byollm/test-connection (validate credentials with bulk MCP test)
   - Output OpenAPI 3.0 schema to `/contracts/byollm.yaml`

3. **Generate contract tests** from contracts:
   - One test file per endpoint group (config, oauth, provider)
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Primary user story → integration test scenario in quickstart.md
   - 20 acceptance scenarios → validation steps
   - Edge cases → error handling validation

5. **Update CLAUDE.md incrementally** (O(1) operation):
   - Add Frontend (008): BYOLLMSettings components, OAuth flow, provider selection, connection test
   - Add Backend (008): Configuration service, OAuth service, provider client, encryption, MCP config
   - Add Testing (008): Vitest, Supertest, Playwright OAuth flow
   - Add Recent Changes entry for Feature 008

**Output**: data-model.md, /contracts/byollm.yaml, failing tests, quickstart.md, CLAUDE.md updates

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract endpoint → contract test task [P]
- Each entity (BYOLLMConfig, OAuthToken, ProviderCredits, MCPConfig, CustomSystemPrompt) → model creation task [P]
- Encryption service → implementation task (prerequisite for config service)
- OAuth flow service → implementation task
- Provider client service → implementation task (OpenAI, Anthropic, Custom Endpoint)
- MCP config service → implementation task (automatic, hidden configuration)
- Backend API routes → implementation tasks (depends on services)
- Frontend components → implementation tasks [P] (11 components: BYOLLMSettings, ProviderSelector, OAuthButton, APIKeyInput, CreditsDisplay, ModelSelector, CustomEndpointConfig, ConnectionTest, CustomSystemPrompt, ScopeSelector, PrivacyNotice, BYOLLMBlockingError)
- Frontend service → implementation task (byollm.service.ts)
- Integration tests → test tasks (OAuth flow E2E, Settings page flow)
- Quickstart validation → final validation task

**Ordering Strategy**:
- TDD order: Contract tests before implementation
- Dependency order:
  1. Models (BYOLLMConfig entity with encrypted fields)
  2. Encryption service (prerequisite for config service)
  3. Provider client service (credits, models, test)
  4. OAuth flow service (depends on provider client)
  5. MCP config service (independent, parallel)
  6. BYOLLM config service (depends on encryption, provider client)
  7. Backend API routes (depends on all services)
  8. Frontend components [P] (many can be parallel)
  9. Frontend service (depends on backend routes)
  10. Integration tests (depends on frontend + backend)
  11. Quickstart validation (depends on everything)
- Mark [P] for parallel execution (independent components)

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, OAuth flow validation, connection test validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. All constitutional principles pass for Feature 008.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
