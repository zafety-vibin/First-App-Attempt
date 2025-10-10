# Implementation Plan: Campaign Setup Wizard

**Branch**: `016-create-a-campaign` | **Date**: 2025-10-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `C:/Users/zmanl/Projects/VVD-mimic/specs/016-create-a-campaign/spec.md`

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
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

4-step Campaign Setup Wizard for configuring new campaigns through guided UI flow. Game Masters select a visual theme (High Fantasy, Cyberpunk, Sci-Fi, Modern, or Custom), toggle optional category visibility, choose whether to set up World-Foundations knowledge graph immediately, and optionally answer 4 questionnaire questions to create initial world rules. Wizard persists campaign_settings (theme + category_labels JSON) and optionally creates knowledge_graph + world_rules entries in atomic transaction. Uses React Context + useReducer for transient wizard state, Radix UI for accessible components, Zod + React Hook Form for multi-step validation, and SQLite JSON1 extension for flexible label storage.

## Technical Context

**Language/Version**: TypeScript 5.0+ (Node.js 20 LTS backend, React 18 frontend)

**Primary Dependencies**:
- **Frontend**: React 18, Radix UI (Dialog, Tabs, Switch primitives), React Hook Form, Zod, React Context API + useReducer, React Router v6 (loaders)
- **Backend**: Express 4.x, Better-SQLite3 (SQLite JSON1 extension), Zod (server-side validation)

**Storage**:
- `campaign_settings` table with JSON columns (theme, category_labels, enabled_categories)
- Existing `knowledge_graphs` and `world_rules` tables (Feature 014/015)
- No persistent wizard state (session-only client state)

**Testing**: Vitest + React Testing Library (frontend unit), Vitest + Supertest (backend contract), Playwright (E2E wizard flow)

**Target Platform**: Docker localhost (existing setup), Chrome/Firefox/Safari browsers

**Project Type**: web (frontend + backend detected)

**Performance Goals**:
- <100ms wizard step transitions
- <2s wizard completion transaction (settings + graph + world rules)
- <500ms theme data retrieval

**Constraints**:
- Wizard state is transient (cleared on refresh)
- Wizard only displays once per campaign (campaign_settings acts as completion flag)
- Atomic transaction required (settings + graph + world rules succeed or rollback)
- 5 preset themes hardcoded (TypeScript constants for type safety)

**Scale/Scope**:
- 5 preset themes + 1 custom theme option
- 13 category labels per campaign
- 4 World-Foundations questions (optional)
- 11 mandatory + 2 optional categories

**Research Decisions** (from research.md):

1. **UI Component Library**: Radix UI
   - **Decision**: Use existing Radix UI primitives (Dialog, Tabs, Switch)
   - **Rationale**: Already established in project (Feature 003, 004), accessible by default
   - **Implementation**: WizardDialog (Radix Dialog), StepTabs (Radix Tabs), CategoryToggle (Radix Switch)

2. **Wizard State Management**: React Context + useReducer
   - **Decision**: Context API with useReducer pattern for wizard state
   - **Rationale**: Consistent with existing patterns (InformationLevelContext, ViewModeContext), avoids global state library
   - **Implementation**: WizardContext with reducer actions (SET_THEME, TOGGLE_CATEGORY, SET_GRAPH_CHOICE, SET_ANSWER)

3. **Theme Data Storage**: TypeScript Constants
   - **Decision**: Hardcode theme configurations as TypeScript constants
   - **Rationale**: Static data, compile-time type safety, no database queries needed
   - **Implementation**: THEME_DESCRIPTORS array with HIGH_FANTASY_LABELS, CYBERPUNK_LABELS, SCI_FI_LABELS, MODERN_LABELS, CUSTOM_LABELS_DEFAULT

4. **Form Validation**: React Hook Form + Zod
   - **Decision**: Use React Hook Form with Zod resolver for multi-step validation
   - **Rationale**: Existing dependency (Feature 008), type-safe schemas, step-by-step validation
   - **Implementation**: Separate Zod schemas per step (styleSelectionSchema, categoryToggleSchema, graphSelectionSchema, worldFoundationsSchema)

5. **Category Storage**: Single Table with JSON Columns
   - **Decision**: campaign_settings table with category_labels (JSON object) and enabled_categories (JSON array)
   - **Rationale**: Simpler schema than 13 separate columns, SQLite JSON1 extension already enabled, flexible for future category additions
   - **Implementation**: SQLite JSON1 functions for querying, TypeScript CategoryLabelsMap interface for type safety

6. **Wizard Trigger Detection**: React Router Loader
   - **Decision**: Use React Router loader to check wizard status before rendering campaign page
   - **Rationale**: Existing routing pattern (Feature 002), server-side data fetching, prevents flash of homepage
   - **Implementation**: campaignLoader queries campaign_settings, returns shouldShowWizard flag

7. **Back Navigation State**: WizardContext Preservation
   - **Decision**: Preserve all step state in WizardContext during back navigation
   - **Rationale**: User expectation for wizard back buttons, avoids re-validation on revisit
   - **Implementation**: Reducer maintains step1-4 state, only currentStep changes on navigation

8. **World-Foundations Questionnaire**: Simple Form Fields
   - **Decision**: Static questionnaire with 4 hardcoded questions and theme-specific placeholders
   - **Rationale**: Prototype simplicity, avoids dynamic question generation, sufficient for initial launch
   - **Implementation**: WORLD_FOUNDATIONS_QUESTIONS constant array, Map<questionId, answer> state

9. **Category Toggles UI**: Radix Switch Components
   - **Decision**: Use Radix Switch with disabled state for mandatory categories
   - **Rationale**: Accessible toggle pattern, visual distinction for disabled state, tooltip support
   - **Implementation**: Optional categories (planar_forces, creatures) have enabled switches, mandatory categories show disabled switch with tooltip

10. **Validation Strategy**: Client + Server Zod Validation
    - **Decision**: Identical Zod schemas on client and server
    - **Rationale**: DRY principle, type safety across stack, prevents client-side bypass
    - **Implementation**: Shared validation schemas in backend/src/validation/wizard.ts, imported by frontend via type-only import

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I: Workflow-First Design** - ✅ PASS
Wizard streamlines first-time campaign setup by guiding users through essential configuration (theme, categories, initial world rules) in single flow. Prevents "plan twice" by creating World-Foundations graph with GM's initial setting answers during setup.

**Principle II: User Agency & Full Customization** - ✅ PASS
Users have full control over theme selection (including custom naming), category visibility, and whether to set up World-Foundations immediately or defer. All questionnaire questions are optional. No forced defaults beyond mandatory categories.

**Principle III: Information Filtering & Access Control** - ✅ PASS
Not directly applicable - wizard configures category labels only. World rules created from questionnaire default to `common_knowledge` visibility (can be changed later via existing Feature 004 information level system).

**Principle IV: Knowledge Graph Architecture** - ✅ PASS
Wizard creates World-Foundations graph with toggle state `enabled` if user chooses "Set up now". Graph follows existing architecture from Feature 006. User can defer graph setup without blocking wizard completion.

**Principle V: BYOLLM & Privacy** - ✅ PASS
Not applicable - wizard has no LLM integration.

**Principle VI: Local-Only & Prototype-First** - ✅ PASS
Session-only wizard state (no persistence until completion) aligns with prototype architecture. Atomic transaction ensures clean rollback on failure. Performance targets are prototype-appropriate (<2s completion).

**Principle VII: Transparency & User Approval** - ✅ PASS
All wizard actions are user-initiated with explicit "Next" and "Finish" buttons. Questionnaire summary shows "X world rules will be created" preview before submission. Undo not required (wizard can be abandoned without persisting).

**Overall Assessment**: PASS - No constitutional violations detected.

## Project Structure

### Documentation (this feature)
```
specs/016-create-a-campaign/
├── plan.md              # This file (manually reconstructed from artifacts)
├── spec.md              # Feature specification (51 FRs, 4 acceptance scenarios)
├── research.md          # Phase 0 output (10 technical decisions)
├── data-model.md        # Phase 1 output (entities, TypeScript interfaces, Zod schemas)
├── quickstart.md        # Phase 1 output (5 test scenarios, API testing, troubleshooting)
└── contracts/           # Phase 1 output (API contract)
    └── campaign-wizard.yaml  # OpenAPI 3.0 spec (3 endpoints)
```

### Source Code (repository root)
```
backend/
├── src/
│   ├── models/
│   │   └── CampaignSettings.ts      # NEW - campaign_settings table model
│   ├── services/
│   │   └── CampaignSettingsService.ts # NEW - wizard status, completion, theme retrieval
│   ├── validation/
│   │   └── wizard.ts                 # NEW - Shared Zod schemas (client + server)
│   ├── routes/
│   │   └── campaign-wizard.ts        # NEW - 3 wizard endpoints
│   └── db/
│       └── migrations/
│           └── 016-campaign-settings.sql  # NEW - campaign_settings table creation
└── tests/
    ├── contract/
    │   └── campaign-wizard.test.ts   # NEW - 3 endpoint contract tests
    └── integration/
        └── wizard-transaction.test.ts # NEW - atomic transaction rollback test

frontend/
├── src/
│   ├── components/
│   │   ├── wizard/                   # NEW - Wizard components directory
│   │   │   ├── WizardDialog.tsx      # NEW - Radix Dialog wrapper
│   │   │   ├── WizardProgress.tsx    # NEW - "Step X of Y" header
│   │   │   ├── WizardNavigation.tsx  # NEW - Back/Next/Finish buttons
│   │   │   ├── Step1StyleSelection.tsx  # NEW - Theme card grid
│   │   │   ├── Step2CategoryToggles.tsx # NEW - Category toggle list
│   │   │   ├── Step3GraphSelection.tsx  # NEW - Knowledge graph choices
│   │   │   ├── Step4WorldFoundations.tsx # NEW - Questionnaire form
│   │   │   ├── ThemeCard.tsx         # NEW - Individual theme card component
│   │   │   ├── CategoryToggleRow.tsx # NEW - Single category toggle row
│   │   │   └── QuestionField.tsx     # NEW - Question input (text/dropdown)
│   ├── contexts/
│   │   └── WizardContext.tsx         # NEW - Wizard state (useReducer pattern)
│   ├── hooks/
│   │   ├── useWizard.ts              # NEW - Access WizardContext
│   │   ├── useWizardStatus.ts        # NEW - Fetch wizard status on campaign load
│   │   └── useWizardCompletion.ts    # NEW - Submit wizard data
│   ├── constants/
│   │   └── themes.ts                 # NEW - THEME_DESCRIPTORS, theme label mappings
│   ├── routes/
│   │   └── loaders/
│   │       └── campaignLoader.ts     # EXTEND - Add wizard status check
│   └── pages/
│       └── CampaignPage.tsx          # EXTEND - Conditionally render WizardDialog
└── tests/
    ├── components/
    │   ├── WizardDialog.test.tsx     # NEW - Full wizard flow unit tests
    │   ├── Step1StyleSelection.test.tsx # NEW - Theme selection tests
    │   ├── Step2CategoryToggles.test.tsx # NEW - Category toggle tests
    │   ├── Step3GraphSelection.test.tsx  # NEW - Graph choice tests
    │   └── Step4WorldFoundations.test.tsx # NEW - Questionnaire tests
    ├── hooks/
    │   └── useWizardStatus.test.ts   # NEW - Status hook tests
    └── e2e/
        ├── wizard-high-fantasy.spec.ts  # NEW - Scenario 1 (23 steps)
        ├── wizard-custom-theme.spec.ts  # NEW - Scenario 2 (7 steps)
        ├── wizard-skip-foundations.spec.ts # NEW - Scenario 3 (6 steps)
        ├── wizard-back-navigation.spec.ts  # NEW - Scenario 4 (9 steps)
        └── wizard-edge-cases.spec.ts    # NEW - Scenario 5 (6 sub-scenarios)
```

**Structure Decision**: Web application structure (frontend + backend). This is a **balanced feature** with significant frontend (wizard UI flow) and backend (settings persistence, transaction management) work. All wizard state is client-side until final submission triggers backend transaction.

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

**Artifact**: [research.md](./research.md) (9.7KB, 174 lines)

**Research Questions Resolved**:
1. ✅ UI component library selection → Radix UI (existing dependency)
2. ✅ Wizard state management pattern → React Context + useReducer
3. ✅ Theme data storage approach → TypeScript constants (type safety)
4. ✅ Form validation library → React Hook Form + Zod
5. ✅ Category label storage schema → Single table with JSON columns
6. ✅ Wizard display trigger mechanism → React Router loader pattern
7. ✅ Back navigation state handling → WizardContext state preservation
8. ✅ World-Foundations questionnaire design → Static 4-question form
9. ✅ Category toggle UI pattern → Radix Switch with disabled state
10. ✅ Client vs server validation strategy → Shared Zod schemas

**Key Findings**:
- No new dependencies required (Radix UI, React Hook Form, Zod already in project)
- SQLite JSON1 extension already enabled for category_labels storage
- React Router loader pattern consistent with existing Feature 002 auth flow
- WizardContext follows existing context patterns (InformationLevelContext, ViewModeContext)

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

**Artifacts**:
- [data-model.md](./data-model.md) (24KB, 733 lines)
- [contracts/campaign-wizard.yaml](./contracts/campaign-wizard.yaml) (OpenAPI 3.0)
- [quickstart.md](./quickstart.md) (24KB, 681 lines)
- CLAUDE.md (updated via update-agent-context.sh)

### Data Model Summary

**Database Entities** (from data-model.md):

1. **CampaignSettings** (NEW table)
   - Fields: id, campaign_id (UNIQUE), theme, category_labels (JSON), enabled_categories (JSON), created_at, updated_at
   - Relationships: 1:1 with campaigns
   - Purpose: Stores wizard configuration results

2. **WorldRule** (existing table, new entries)
   - Fields: Uses existing schema from Feature 014
   - Purpose: Starter world rules from World-Foundations questionnaire
   - rule_type values: `cosmology`, `magic_system`, `technology_level`, `social_structure`

3. **KnowledgeGraph** (existing table, new entry)
   - Fields: Uses existing schema from Feature 006/015
   - Purpose: World-Foundations graph if user selects "Set up now"
   - graph_type value: `world_foundations`, toggle_state: `enabled`

**UI State Models** (TypeScript interfaces):

```typescript
interface WizardState {
  currentStep: 1 | 2 | 3 | 4;
  step1: StyleSelectionState;
  step2: CategoryToggleState;
  step3: GraphSelectionState;
  step4: WorldFoundationsState;
  canProceed: boolean;
  isSubmitting: boolean;
  error: string | null;
}

interface StyleSelectionState {
  selectedTheme: ThemeOption | null;
  customLabels: CategoryLabelsMap | null;
  isValid: boolean;
}

interface CategoryToggleState {
  enabledCategories: Set<CategoryInternalName>;
  mandatoryCategories: CategoryInternalName[];
  optionalCategories: OptionalCategory[];
  isValid: boolean;
}

interface GraphSelectionState {
  worldFoundationsChoice: 'setup_now' | 'setup_later';
  deferredGraphs: Set<'political_web' | 'geographical' | 'campaign_story'>;
  isValid: boolean;
}

interface WorldFoundationsState {
  questions: WorldFoundationsQuestion[];
  answers: Map<number, string>;
  isValid: boolean;
  isSkipped: boolean;
}
```

**Theme Constants**:
- HIGH_FANTASY_LABELS (Pantheon, Kingdoms, Realms, Artifacts, Characters, Beasts)
- CYBERPUNK_LABELS (Corporations, Districts, Runners, Missions, Gear)
- SCI_FI_LABELS (Archives, Physics, Sectors, Cosmic Forces, Objectives, Crew, Tech Mods, Xenofauna)
- MODERN_LABELS (Background, Places, Organizations, Beliefs, Tasks, Equipment)
- CUSTOM_LABELS_DEFAULT (Default capitalized internal names)

**Validation Schemas** (Zod):
- styleSelectionSchema (theme + optional customLabels)
- categoryToggleSchema (11-13 enabled categories)
- graphSelectionSchema (worldFoundationsChoice enum)
- worldFoundationsSchema (answers array with 1000 char max)
- wizardCompleteRequestSchema (complete request body)

### API Contracts Summary

**Endpoints** (from contracts/campaign-wizard.yaml):

1. **GET /campaigns/{campaignId}/wizard/status**
   - Purpose: Determine if wizard should display
   - Response: `{ shouldShowWizard: boolean, existingSettings: CampaignSettings | null }`
   - Logic: Returns true if campaign_settings does not exist

2. **GET /campaigns/{campaignId}/wizard/themes**
   - Purpose: Retrieve all 5 preset theme configurations
   - Response: `{ themes: ThemeDescriptor[] }`
   - Note: Static data, could be frontend-only but endpoint provides server validation

3. **POST /campaigns/{campaignId}/wizard/complete**
   - Purpose: Persist wizard configuration (atomic transaction)
   - Request Body: `{ theme, categoryLabels, enabledCategories, worldFoundationsAnswers? }`
   - Response: `{ success, settings, worldFoundationsGraph?, worldRulesCreated }`
   - Transaction: INSERT campaign_settings → (optional) INSERT knowledge_graph + world_rules → COMMIT or ROLLBACK

**Error Responses**:
- 400: Validation errors (invalid theme, missing labels, category count)
- 401: Unauthorized (missing JWT)
- 403: Forbidden (not campaign owner)
- 404: Campaign not found
- 409: Wizard already completed (settings exist)
- 500: Transaction failure (rollback)

### Test Scenarios Summary

**Manual Test Scenarios** (from quickstart.md):

1. **Scenario 1: Complete Wizard Flow with High Fantasy Theme** (23 steps)
   - Verifies full 4-step wizard flow
   - Tests theme selection, category toggles, graph setup, questionnaire
   - Validates sidebar labels, graph creation, world rules entries

2. **Scenario 2: Custom Theme with Manual Naming** (7 steps)
   - Tests custom theme text input for all 13 categories
   - Validates 50-character limit, empty field validation
   - Verifies backend uses internal names despite custom labels

3. **Scenario 3: Skip World-Foundations Graph Setup** (6 steps)
   - Tests "Set up later" option
   - Verifies wizard skips Step 4 (shows "Step 3 of 3")
   - Validates no graph or world rules created

4. **Scenario 4: Navigate Back to Change Style** (9 steps)
   - Tests back navigation state preservation
   - Validates theme change resets dependent state
   - Verifies forward navigation preserves unrelated state

5. **Scenario 5: Edge Cases** (6 sub-scenarios)
   - 5a: Wizard already completed (status check)
   - 5b: Close wizard mid-way (state reset on refresh)
   - 5c: Mandatory category toggle attempt (disabled state)
   - 5d: Transaction failure rollback (atomic behavior)
   - 5e: Answer length validation (1000 char limit)
   - 5f: Browser refresh during wizard (beforeunload warning)

**API Testing**: cURL examples for all 3 endpoints with expected responses

**Database Verification**: SQL queries to validate campaign_settings, world_rules, knowledge_graphs

**Troubleshooting Guide**: 5 common issues with solutions

### Agent Context Update

**CLAUDE.md Updated**: ✅ (via update-agent-context.sh)
- Added Feature 016 wizard technologies (Radix UI, React Hook Form, Zod, React Context + useReducer)
- Added campaign_settings table reference
- Preserved existing manual additions
- Updated recent changes section

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base structure
2. Generate tasks from Phase 1 artifacts (contracts, data model, quickstart)
3. Follow TDD order: Contract tests → Models → Services → UI components → Integration tests → E2E tests

**Ordering Strategy**:

**Backend Tasks** (Sequential, TDD-first):
1. [P] Write contract test for GET /wizard/status (should fail)
2. [P] Write contract test for GET /wizard/themes (should fail)
3. [P] Write contract test for POST /wizard/complete (should fail)
4. Create database migration 016-campaign-settings.sql
5. Create CampaignSettings model (TypeScript interface)
6. Create shared Zod validation schemas (validation/wizard.ts)
7. Create CampaignSettingsService (status, themes, completion)
8. Implement GET /wizard/status endpoint → contract test passes
9. Implement GET /wizard/themes endpoint → contract test passes
10. Implement POST /wizard/complete endpoint with transaction → contract test passes
11. Write integration test for atomic transaction rollback (should fail initially)
12. Implement transaction timeout and rollback logic → integration test passes

**Frontend Tasks** (Parallel components, sequential integration):
13. [P] Create theme constants (constants/themes.ts)
14. [P] Create WizardContext with useReducer (contexts/WizardContext.tsx)
15. [P] Create WizardDialog component skeleton (components/wizard/WizardDialog.tsx)
16. [P] Create WizardProgress component (components/wizard/WizardProgress.tsx)
17. [P] Create WizardNavigation component (components/wizard/WizardNavigation.tsx)
18. [P] Create Step1StyleSelection component (components/wizard/Step1StyleSelection.tsx)
19. [P] Create Step2CategoryToggles component (components/wizard/Step2CategoryToggles.tsx)
20. [P] Create Step3GraphSelection component (components/wizard/Step3GraphSelection.tsx)
21. [P] Create Step4WorldFoundations component (components/wizard/Step4WorldFoundations.tsx)
22. Create useWizardStatus hook (hooks/useWizardStatus.ts)
23. Create useWizardCompletion hook (hooks/useWizardCompletion.ts)
24. Integrate wizard into campaignLoader (routes/loaders/campaignLoader.ts)
25. Integrate wizard into CampaignPage (pages/CampaignPage.tsx)
26. [P] Write unit tests for WizardContext reducer (tests/components/WizardDialog.test.tsx)
27. [P] Write unit tests for Step1 component (tests/components/Step1StyleSelection.test.tsx)
28. [P] Write unit tests for Step2 component (tests/components/Step2CategoryToggles.test.tsx)
29. [P] Write unit tests for Step3 component (tests/components/Step3GraphSelection.test.tsx)
30. [P] Write unit tests for Step4 component (tests/components/Step4WorldFoundations.test.tsx)

**E2E Tests** (Sequential, depends on full implementation):
31. Write E2E test for Scenario 1 (wizard-high-fantasy.spec.ts) - 23 steps
32. Write E2E test for Scenario 2 (wizard-custom-theme.spec.ts) - 7 steps
33. Write E2E test for Scenario 3 (wizard-skip-foundations.spec.ts) - 6 steps
34. Write E2E test for Scenario 4 (wizard-back-navigation.spec.ts) - 9 steps
35. Write E2E test for Scenario 5 (wizard-edge-cases.spec.ts) - 6 sub-scenarios
36. Run full quickstart.md manual test scenarios

**Parallelization Opportunities** ([P] marker):
- Backend contract tests (tasks 1-3) can run in parallel
- Frontend component creation (tasks 13-21, 26-30) are independent
- Frontend unit tests (tasks 26-30) can run in parallel after components exist

**Estimated Output**: 36 numbered, ordered tasks in tasks.md

**Dependencies**:
- Tasks 8-10 depend on tasks 4-7 (model/service before routes)
- Tasks 22-25 depend on tasks 13-21 (components before hooks/integration)
- Tasks 31-36 depend on tasks 1-30 (E2E requires full implementation)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, verify wizard flow)

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| *None* | N/A | N/A |

**No complexity deviations**: Feature follows established patterns (React Context, Radix UI, Zod validation) and reuses existing infrastructure (campaigns table, knowledge_graphs table, world_rules table).

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (none in Technical Context)
- [x] Complexity deviations documented (none - no violations)

**Artifacts Generated**:
- [x] research.md (Phase 0) - 9.7KB, 10 technical decisions
- [x] data-model.md (Phase 1) - 24KB, 733 lines (entities, TypeScript interfaces, Zod schemas, state machine)
- [x] contracts/campaign-wizard.yaml (Phase 1) - OpenAPI 3.0 spec, 3 endpoints
- [x] quickstart.md (Phase 1) - 24KB, 681 lines (5 scenarios, API testing, troubleshooting)
- [x] CLAUDE.md updated (Phase 1) - via update-agent-context.sh
- [x] plan.md (this file) - Manually reconstructed from Phase 0-1 artifacts

**Reconstruction Note**: This plan.md was manually reconstructed on 2025-10-10 from existing Phase 0-1 artifacts (research.md, data-model.md, contracts/, quickstart.md) after the original plan.md template was reset. All technical decisions, entity definitions, API contracts, and test scenarios were extracted from the comprehensive artifacts and summarized here to provide coordination wrapper for task generation.

---

*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
