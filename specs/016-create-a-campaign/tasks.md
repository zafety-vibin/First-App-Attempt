# Tasks: Campaign Setup Wizard

**Feature**: 016-create-a-campaign
**Input**: Design documents from `/specs/016-create-a-campaign/`
**Prerequisites**: Feature 014 (Database Foundation) complete, plan.md, research.md, data-model.md, contracts/campaign-wizard.yaml, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: React 18, TypeScript 5.0+, React Context + useReducer, React Hook Form + Zod, Radix UI, Express 4.x, Better-SQLite3
   → Structure: Web app (frontend + backend)
2. Load design documents:
   → data-model.md: CampaignSettings entity, 8 UI state models, 5 theme constants, 7 Zod schemas
   → contracts/campaign-wizard.yaml: 3 endpoints (GET /status, GET /themes, POST /complete)
   → quickstart.md: 5 test scenarios (23+7+6+9+6 steps)
3. Generate tasks by layer:
   → Backend TDD: Contract tests → Migration → Models → Services → Routes → Integration tests
   → Frontend: Contexts → Constants → Components → Hooks → Integration → Component tests
   → E2E: 5 full-flow scenarios
4. Apply task rules:
   → Backend: TDD order (tests before implementation)
   → Frontend: Implementation before tests (UI pattern)
   → Different files = mark [P] for parallel
5. Number tasks sequentially (T001, T002...)
6. Estimated: 42 tasks total
```

## Path Conventions
- Backend: `backend/src/`, `backend/tests/`
- Frontend: `frontend/src/`, `frontend/tests/`

---

## Phase 3.1: Backend Setup & TDD Tests

### T001 [P]: Write contract test for GET /wizard/status
**File**: `backend/tests/contract/campaign-wizard.test.ts`
**Description**: Write contract test for GET /api/campaigns/:id/wizard/status endpoint. Test scenarios: (1) shouldShowWizard=true when no settings exist, (2) shouldShowWizard=false when settings exist, (3) 401 unauthorized, (4) 403 forbidden (not campaign owner), (5) 404 campaign not found. Use Vitest + Supertest. Tests MUST FAIL initially (no implementation yet). Match OpenAPI schema from contracts/campaign-wizard.yaml lines 14-96.
**Dependencies**: None (first task)
**Success Criteria**: 5 test cases written, all tests fail with "endpoint not found" or similar error, test file created

### T002 [P]: Write contract test for GET /wizard/themes
**File**: `backend/tests/contract/campaign-wizard.test.ts` (same file as T001, different describe block)
**Description**: Write contract test for GET /api/campaigns/:id/wizard/themes endpoint. Test scenarios: (1) returns 5 theme descriptors with correct structure, (2) each theme has id/name/description/labels/previewCategories, (3) 401 unauthorized, (4) 403 forbidden. Use Vitest + Supertest. Tests MUST FAIL initially. Match OpenAPI schema lines 98-245.
**Dependencies**: None
**Success Criteria**: 4 test cases written, all tests fail, validates theme descriptor structure

### T003 [P]: Write contract test for POST /wizard/complete
**File**: `backend/tests/contract/campaign-wizard.test.ts` (same file, different describe block)
**Description**: Write contract test for POST /api/campaigns/:id/wizard/complete endpoint. Test scenarios: (1) success with worldFoundationsAnswers (201 response, settings + graph + rules created), (2) success without worldFoundationsAnswers (201 response, settings only), (3) 400 validation errors (invalid theme, missing labels, insufficient categories, label too long, answer too long), (4) 409 wizard already completed, (5) 500 transaction failure rollback. Use Vitest + Supertest. Tests MUST FAIL initially. Match OpenAPI schema lines 247-535.
**Dependencies**: None
**Success Criteria**: 5 test cases written, all tests fail, validates request/response schemas

### T004: Create database migration 016-campaign-settings.sql
**File**: `backend/src/db/migrations/016-campaign-settings.sql`
**Description**: Create SQLite migration file for campaign_settings table. Schema: id (INTEGER PRIMARY KEY AUTOINCREMENT), campaign_id (INTEGER NOT NULL UNIQUE), theme (TEXT NOT NULL CHECK IN 5 values), category_labels (TEXT NOT NULL - JSON object), enabled_categories (TEXT NOT NULL - JSON array), created_at (INTEGER DEFAULT unixepoch()), updated_at (INTEGER DEFAULT unixepoch()), FOREIGN KEY campaign_id → campaigns(id) ON DELETE CASCADE. Create index on campaign_id. Match schema from data-model.md lines 14-25.
**Dependencies**: None
**Success Criteria**: Migration file created, SQL syntax valid, CHECK constraint for theme enum, unique constraint on campaign_id, index created

### T005: Create CampaignSettings model
**File**: `backend/src/models/CampaignSettings.ts`
**Description**: Create TypeScript interface for CampaignSettings entity. Properties: id (number), campaign_id (number), theme (ThemeOption enum), category_labels (CategoryLabelsMap), enabled_categories (string[]), created_at (number), updated_at (number). Export interface and ThemeOption type ('high_fantasy' | 'cyberpunk' | 'sci_fi' | 'modern' | 'custom'). Match data-model.md lines 8-70.
**Dependencies**: T004 (migration defines schema)
**Success Criteria**: Interface exported, types match database schema, ThemeOption enum defined

### T006: Create shared Zod validation schemas
**File**: `backend/src/validation/wizard.ts`
**Description**: Create Zod validation schemas for wizard endpoints. Schemas: categoryLabelsMapSchema (13 categories, each string 1-50 chars), styleSelectionSchema (theme + optional customLabels), categoryToggleSchema (enabledCategories array 11-13 items), graphSelectionSchema (worldFoundationsChoice enum), worldFoundationsAnswerSchema (questionId 1-4, answer max 1000 chars), wizardCompleteRequestSchema (complete request body with all fields). Export all schemas and inferred types. Match data-model.md lines 443-517. These schemas will be imported by frontend (type-only imports).
**Dependencies**: None
**Success Criteria**: 6 Zod schemas exported, validation rules match spec (character limits, array lengths), types inferred correctly

---

## Phase 3.2: Backend Implementation

### T007: Create CampaignSettingsService
**File**: `backend/src/services/CampaignSettingsService.ts`
**Description**: Create service with 3 methods: (1) getWizardStatus(campaignId, userId) - checks if campaign_settings exists, returns shouldShowWizard boolean + existingSettings, validates user owns campaign, (2) getThemes() - returns hardcoded THEME_DESCRIPTORS array with 5 preset themes (static data, no DB query), (3) completeWizard(campaignId, userId, wizardData) - atomic transaction: INSERT campaign_settings → (optional) INSERT knowledge_graph + world_rules → COMMIT or ROLLBACK. Use Better-SQLite3 transaction, 10-second timeout. Validate Zod schemas from T006. Match data-model.md lines 609-661.
**Dependencies**: T004-T006 (model, schemas exist)
**Success Criteria**: Service exports 3 methods, transaction uses BEGIN/COMMIT/ROLLBACK, timeout enforced, validates user ownership

### T008: Implement GET /wizard/status endpoint
**File**: `backend/src/routes/campaign-wizard.ts`
**Description**: Create new route file with GET /campaigns/:campaignId/wizard/status endpoint. Call CampaignSettingsService.getWizardStatus(). Return 200 with { shouldShowWizard, existingSettings }. Handle errors: 401 (no auth), 403 (not owner), 404 (campaign not found). Use existing Keycloak auth middleware from Feature 002. Match contract test from T001.
**Dependencies**: T001 (contract test), T007 (service)
**Success Criteria**: Endpoint implemented, T001 test cases pass, auth middleware applied, error responses match OpenAPI spec

### T009: Implement GET /wizard/themes endpoint
**File**: `backend/src/routes/campaign-wizard.ts` (same file as T008)
**Description**: Add GET /campaigns/:campaignId/wizard/themes endpoint. Call CampaignSettingsService.getThemes(). Return 200 with { themes: ThemeDescriptor[] } containing 5 preset themes (HIGH_FANTASY, CYBERPUNK, SCI_FI, MODERN, CUSTOM) with labels and preview categories. Handle errors: 401, 403, 404. Match contract test from T002.
**Dependencies**: T002 (contract test), T007 (service)
**Success Criteria**: Endpoint implemented, T002 test cases pass, returns static theme data, no database queries

### T010: Implement POST /wizard/complete endpoint
**File**: `backend/src/routes/campaign-wizard.ts` (same file)
**Description**: Add POST /campaigns/:campaignId/wizard/complete endpoint. Validate request body with wizardCompleteRequestSchema (Zod from T006). Call CampaignSettingsService.completeWizard(). Return 201 with { success, settings, worldFoundationsGraph, worldRulesCreated }. Handle errors: 400 (validation), 401, 403, 404, 409 (settings exist), 500 (transaction failure). Use try/catch for transaction rollback. Match contract test from T003. Atomic transaction: all operations succeed or all rollback.
**Dependencies**: T003 (contract test), T006 (validation), T007 (service)
**Success Criteria**: Endpoint implemented, T003 test cases pass, validation errors return 400, transaction rollback on failure, 409 if settings exist

### T011: Register wizard routes in Express app
**File**: `backend/src/app.ts` (or main router file)
**Description**: Import campaign-wizard routes and register with Express app: `app.use('/api/campaigns', wizardRouter)`. Ensure routes are registered after authentication middleware but before catch-all 404 handler. Verify route precedence doesn't conflict with existing campaign routes.
**Dependencies**: T008-T010 (routes implemented)
**Success Criteria**: Routes registered, accessible at /api/campaigns/:id/wizard/*, auth middleware applied, no route conflicts

---

## Phase 3.3: Backend Integration Tests

### T012: Write integration test for atomic transaction rollback
**File**: `backend/tests/integration/wizard-transaction.test.ts`
**Description**: Write integration test to verify wizard completion transaction is atomic (all-or-nothing). Test scenarios: (1) Success case - verify all 3 tables updated (campaign_settings, knowledge_graphs, world_rules), (2) Simulate world_rules insert failure (e.g., invalid data) - verify campaign_settings and knowledge_graphs rolled back (no partial data), (3) Verify 10-second transaction timeout, (4) Concurrent wizard completions for same campaign - verify only first succeeds, second returns 409. Use Better-SQLite3 in-memory database for testing. Match quickstart.md Scenario 5d (lines 379-409).
**Dependencies**: T007-T010 (service and routes implemented)
**Success Criteria**: 4 test cases pass, rollback verified via database queries, no partial data on failure, timeout enforced

---

## Phase 3.4: Frontend Foundation (Constants & Contexts)

### T013 [P]: Create theme constants
**File**: `frontend/src/constants/themes.ts`
**Description**: Create theme configuration constants. Export: (1) THEME_DESCRIPTORS array with 5 ThemeDescriptor objects (HIGH_FANTASY, CYBERPUNK, SCI_FI, MODERN, CUSTOM), each containing id/name/description/labels/previewCategories, (2) HIGH_FANTASY_LABELS object mapping 13 categories to themed names ("Characters", "Realms", "Kingdoms", etc.), (3) CYBERPUNK_LABELS, (4) SCI_FI_LABELS, (5) MODERN_LABELS, (6) CUSTOM_LABELS_DEFAULT (capitalized internal names), (7) WORLD_FOUNDATIONS_QUESTIONS array with 4 question objects (id, question, rule_type, input_type, options, placeholder, required). Match data-model.md lines 287-441 and lines 240-286.
**Dependencies**: None
**Success Criteria**: Constants exported, 5 theme descriptors defined, 4 World-Foundations questions defined, TypeScript types for all

### T014 [P]: Create WizardContext with useReducer
**File**: `frontend/src/contexts/WizardContext.tsx`
**Description**: Create React Context for wizard state management using useReducer pattern. State shape: WizardState with currentStep (1-4), step1 (StyleSelectionState), step2 (CategoryToggleState), step3 (GraphSelectionState), step4 (WorldFoundationsState), canProceed (boolean), isSubmitting (boolean), error (string | null). Reducer actions: SET_CURRENT_STEP, SELECT_THEME, SET_CUSTOM_LABELS, TOGGLE_CATEGORY, SELECT_GRAPH_CHOICE, SET_ANSWER, SET_ERROR, SET_SUBMITTING, RESET_WIZARD. Export WizardProvider component and useWizard hook. Match data-model.md lines 107-323.
**Dependencies**: None
**Success Criteria**: Context created, reducer handles 9 action types, useWizard hook returns state and dispatch, WizardProvider wraps children

---

## Phase 3.5: Frontend Wizard Components

### T015 [P]: Create WizardDialog component
**File**: `frontend/src/components/wizard/WizardDialog.tsx`
**Description**: Create main wizard dialog using Radix UI Dialog primitive. Props: { open: boolean, onClose: () => void, campaignId: string }. Wraps all wizard content in WizardProvider from T014. Renders WizardProgress (T016), current step component (T018-T021), and WizardNavigation (T017). Implements beforeunload warning if currentStep > 1 ("Wizard progress not saved"). Full-screen overlay dialog, not dismissible by clicking outside. Match quickstart.md Scenario 5f (lines 431-444).
**Dependencies**: T014 (WizardContext)
**Success Criteria**: Dialog renders full-screen, beforeunload warning works, renders child components, cannot dismiss by outside click

### T016 [P]: Create WizardProgress component
**File**: `frontend/src/components/wizard/WizardProgress.tsx`
**Description**: Create wizard progress header. Props: { currentStep: number, totalSteps: number }. Renders "Step X of Y" heading and progress bar showing completion percentage. Progress bar uses linear gradient or filled blocks. Total steps is 4 if step3.worldFoundationsChoice === 'setup_now', otherwise 3 (Step 4 skipped). Accessible with aria-label="Wizard progress".
**Dependencies**: None (pure UI)
**Success Criteria**: Component renders step count and progress bar, totalSteps calculated correctly (3 or 4), accessible

### T017 [P]: Create WizardNavigation component
**File**: `frontend/src/components/wizard/WizardNavigation.tsx`
**Description**: Create wizard navigation buttons. Props: { onBack: () => void, onNext: () => void, onFinish: () => void, showBack: boolean, showNext: boolean, showFinish: boolean, canProceed: boolean }. Renders Back button (only if showBack), Next button (if showNext, disabled if !canProceed), Finish button (if showFinish, disabled if !canProceed). Buttons styled with Radix UI primitives or custom styles. Loading spinner on Finish button when isSubmitting=true. Keyboard navigation (Tab, Enter).
**Dependencies**: None (pure UI)
**Success Criteria**: Component renders 3 button types conditionally, disabled state works, loading spinner on Finish, keyboard accessible

### T018 [P]: Create Step1StyleSelection component
**File**: `frontend/src/components/wizard/Step1StyleSelection.tsx`
**Description**: Create Step 1 (Style Selection) component. No props (uses WizardContext). Renders 5 theme cards (ThemeCard component T022) in grid layout (2-3 columns). Each card shows theme name, description, and preview categories. Selected theme highlighted with border. Custom theme card expands to show 13 text inputs (one per category, 50 char limit, character counter). Validates all inputs filled if custom selected. Dispatches SELECT_THEME and SET_CUSTOM_LABELS actions. Match data-model.md lines 130-162 and quickstart.md Scenario 1 steps 2-4 (lines 34-59).
**Dependencies**: T013 (theme constants), T014 (WizardContext)
**Success Criteria**: Component renders 5 theme cards, custom theme shows 13 inputs, validation enforces 50-char limit, dispatches actions to context

### T019 [P]: Create Step2CategoryToggles component
**File**: `frontend/src/components/wizard/Step2CategoryToggles.tsx`
**Description**: Create Step 2 (Category Toggles) component. No props (uses WizardContext). Renders 13 CategoryToggleRow components (T023) showing themed labels from step1.selectedTheme. 11 mandatory categories have disabled Radix Switch with tooltip "Core category cannot be disabled". 2 optional categories (planar_forces default ON, creatures default OFF) have enabled switches. Displays category count "X categories enabled" (11-13). Dispatches TOGGLE_CATEGORY action. Match data-model.md lines 164-202 and quickstart.md Scenario 1 steps 5-7 (lines 61-78).
**Dependencies**: T013 (theme constants), T014 (WizardContext)
**Success Criteria**: Component renders 13 toggle rows, mandatory categories disabled with tooltip, optional toggles work, count updates

### T020 [P]: Create Step3GraphSelection component
**File**: `frontend/src/components/wizard/Step3GraphSelection.tsx`
**Description**: Create Step 3 (Knowledge Graph Selection) component. No props (uses WizardContext). Renders World-Foundations graph card with 2 radio buttons: "Set up now" (default) and "Set up later". Shows informational text explaining World-Foundations questionnaire will appear next if "Set up now" selected. Displays 3 other graph cards (Political-Web, Geographical, Campaign-Story) with disabled checkboxes and "Set up later" label + tooltip "Can be set up after wizard completion". Dispatches SELECT_GRAPH_CHOICE action. Match data-model.md lines 204-215 and quickstart.md Scenario 1 steps 8-9 (lines 80-97).
**Dependencies**: T014 (WizardContext)
**Success Criteria**: Component renders 4 graph cards, World-Foundations radio buttons work, other graphs disabled, dispatches action, info text shown

### T021 [P]: Create Step4WorldFoundations component
**File**: `frontend/src/components/wizard/Step4WorldFoundations.tsx`
**Description**: Create Step 4 (World-Foundations Questionnaire) component. No props (uses WizardContext). Renders 4 QuestionField components (T024) from WORLD_FOUNDATIONS_QUESTIONS constant (T013). Question 1: long_text textarea (magic system), Question 2: multiple_choice dropdown (technology level, 8 options), Question 3: long_text textarea (cosmology), Question 4: long_text textarea (social structures). All questions optional. Shows character count for textareas (max 1000 chars, red if exceeded). Displays summary panel "X world rules will be created" (count of answered questions). Dispatches SET_ANSWER actions. Match data-model.md lines 217-286 and quickstart.md Scenario 1 steps 9-11 (lines 99-121).
**Dependencies**: T013 (questions constant), T014 (WizardContext)
**Success Criteria**: Component renders 4 questions, textarea character counter works, dropdown has 8 options, summary count correct, dispatches answers

### T022 [P]: Create ThemeCard component
**File**: `frontend/src/components/wizard/ThemeCard.tsx`
**Description**: Create theme card sub-component for Step 1. Props: { theme: ThemeDescriptor, selected: boolean, onClick: () => void }. Renders card with theme.name (heading), theme.description (subtext), and theme.previewCategories (4-5 distinctive labels as chips). Selected state shows blue border and checkmark icon. Hover effect. Accessible with role="button", aria-selected.
**Dependencies**: None (pure UI)
**Success Criteria**: Component renders theme data, selected state visual, onClick fires, accessible, hover effect

### T023 [P]: Create CategoryToggleRow component
**File**: `frontend/src/components/wizard/CategoryToggleRow.tsx`
**Description**: Create category toggle row sub-component for Step 2. Props: { internalName: string, displayName: string, enabled: boolean, disabled: boolean, onToggle: () => void }. Renders row with displayName label, Radix UI Switch component. If disabled=true, switch grayed out with tooltip "Core category cannot be disabled". If disabled=false, switch functional and calls onToggle. Accessible with aria-label and aria-disabled.
**Dependencies**: @radix-ui/react-switch (existing), @radix-ui/react-tooltip
**Success Criteria**: Component renders label and switch, disabled state prevents interaction, tooltip shows on hover, accessible

### T024 [P]: Create QuestionField component
**File**: `frontend/src/components/wizard/QuestionField.tsx`
**Description**: Create question field sub-component for Step 4. Props: { question: WorldFoundationsQuestion, value: string, onChange: (value: string) => void }. Renders question.question text (label), input based on question.input_type: (1) long_text → textarea with character counter (max 1000, red if exceeded), (2) multiple_choice → dropdown with question.options, (3) short_text → text input. Shows placeholder if provided. Optional indicator "(optional)". Accessible labels and error messages.
**Dependencies**: None (pure UI)
**Success Criteria**: Component renders 3 input types correctly, character counter works for textarea, dropdown shows all options, accessible

---

## Phase 3.6: Frontend Hooks & Integration

### T025: Create useWizardStatus hook
**File**: `frontend/src/hooks/useWizardStatus.ts`
**Description**: Create hook to fetch wizard status on campaign load. Hook signature: `useWizardStatus(campaignId: string)`. Fetches GET /api/campaigns/:id/wizard/status on mount. Returns: { shouldShowWizard: boolean, existingSettings: CampaignSettings | null, loading: boolean, error: Error | null }. Use axios apiClient from Feature 002 with auth headers. Cache result (React Query or useState). Match contract endpoint from T008.
**Dependencies**: T008 (endpoint exists), apiClient from Feature 002
**Success Criteria**: Hook fetches status on mount, returns shouldShowWizard flag, loading and error states handled, cached

### T026: Create useWizardCompletion hook
**File**: `frontend/src/hooks/useWizardCompletion.ts`
**Description**: Create hook to submit wizard data. Hook signature: `useWizardCompletion()`. Returns: { completeWizard: (campaignId, wizardData) => Promise<response>, submitting: boolean, error: Error | null }. Calls POST /api/campaigns/:id/wizard/complete with request body: { theme, categoryLabels, enabledCategories, worldFoundationsAnswers? }. On success, invalidates wizard status cache (if using React Query). On error, returns error object. Uses axios apiClient with auth headers. Match contract endpoint from T010.
**Dependencies**: T010 (endpoint exists), T014 (WizardState types), apiClient from Feature 002
**Success Criteria**: Hook submits wizard data, returns promise, submitting state tracked, error handling, cache invalidation

### T027: Integrate wizard into campaignLoader
**File**: `frontend/src/routes/loaders/campaignLoader.ts` (or similar file)
**Description**: Extend existing React Router loader for campaign page to check wizard status. Call GET /api/campaigns/:id/wizard/status before returning loader data. If shouldShowWizard=true, include flag in loader response. Loader returns: { campaign, shouldShowWizard, existingSettings }. This prevents flash of homepage before wizard. Match research.md Decision 6 (lines 88-98).
**Dependencies**: T008 (endpoint exists), existing campaignLoader from Feature 002
**Success Criteria**: Loader checks wizard status, returns shouldShowWizard flag, no flash of content, loader data includes wizard status

### T028: Integrate wizard into CampaignPage
**File**: `frontend/src/pages/CampaignPage.tsx` (or similar file)
**Description**: Modify existing campaign page component to conditionally render WizardDialog (T015). Use loader data from T027 to get shouldShowWizard. If shouldShowWizard=true, render <WizardDialog open={true} onClose={handleWizardComplete} campaignId={campaignId} />. On wizard completion (onClose callback), refresh page or update loader data to hide wizard and show campaign homepage. Use useWizardCompletion hook (T026) for submission. Match quickstart.md Scenario 1 step 1 (lines 35-38) - wizard displays immediately after campaign creation.
**Dependencies**: T015 (WizardDialog), T025-T027 (hooks and loader), existing CampaignPage from Feature 002
**Success Criteria**: Campaign page renders wizard if shouldShowWizard=true, wizard submission calls hook, page refreshes on completion, wizard hides after success

---

## Phase 3.7: Frontend Component Tests

### T029 [P]: Test WizardContext reducer
**File**: `frontend/tests/contexts/WizardContext.test.ts`
**Description**: Unit test WizardContext reducer with Vitest. Test all 9 reducer actions: (1) SET_CURRENT_STEP updates currentStep, (2) SELECT_THEME updates step1.selectedTheme and resets customLabels if not custom, (3) SET_CUSTOM_LABELS updates step1.customLabels, (4) TOGGLE_CATEGORY adds/removes from step2.enabledCategories, (5) SELECT_GRAPH_CHOICE updates step3.worldFoundationsChoice and affects totalSteps calculation, (6) SET_ANSWER adds answer to step4.answers Map, (7) SET_ERROR sets error string, (8) SET_SUBMITTING sets isSubmitting boolean, (9) RESET_WIZARD returns initial state. Verify canProceed logic per step.
**Dependencies**: T014 (WizardContext)
**Success Criteria**: 9 test cases pass, all actions update state correctly, canProceed logic validated

### T030 [P]: Test Step1StyleSelection component
**File**: `frontend/tests/components/wizard/Step1StyleSelection.test.tsx`
**Description**: Unit test Step 1 component with Vitest + React Testing Library. Test scenarios: (1) renders 5 theme cards, (2) clicking theme card selects theme and dispatches SELECT_THEME, (3) custom theme shows 13 text inputs, (4) validation error if custom input empty, (5) validation error if custom input >50 chars, (6) character counter displays correctly. Mock WizardContext.
**Dependencies**: T018 (Step1 component)
**Success Criteria**: 6 test cases pass, component renders correctly, click handlers fire, validation works, context actions dispatched

### T031 [P]: Test Step2CategoryToggles component
**File**: `frontend/tests/components/wizard/Step2CategoryToggles.test.tsx`
**Description**: Unit test Step 2 component with Vitest + React Testing Library. Test scenarios: (1) renders 13 category toggle rows with themed labels, (2) mandatory categories show disabled toggle with tooltip, (3) optional categories toggleable, (4) category count updates when toggled, (5) TOGGLE_CATEGORY action dispatched. Mock WizardContext with different themes to verify labels change.
**Dependencies**: T019 (Step2 component)
**Success Criteria**: 5 test cases pass, disabled toggles have tooltip, enabled toggles work, count updates, actions dispatched

### T032 [P]: Test Step3GraphSelection component
**File**: `frontend/tests/components/wizard/Step3GraphSelection.test.tsx`
**Description**: Unit test Step 3 component with Vitest + React Testing Library. Test scenarios: (1) renders 4 graph cards, (2) World-Foundations has 2 radio buttons, (3) "Set up now" selected by default, (4) selecting "Set up later" dispatches SELECT_GRAPH_CHOICE action, (5) other 3 graphs show disabled state. Mock WizardContext.
**Dependencies**: T020 (Step3 component)
**Success Criteria**: 5 test cases pass, radio buttons work, default selection correct, actions dispatched, other graphs disabled

### T033 [P]: Test Step4WorldFoundations component
**File**: `frontend/tests/components/wizard/Step4WorldFoundations.test.tsx`
**Description**: Unit test Step 4 component with Vitest + React Testing Library. Test scenarios: (1) renders 4 questions, (2) Question 2 dropdown has 8 options, (3) textarea character counter shows count and red warning if >1000 chars, (4) summary panel shows "X world rules will be created" (count of answered questions), (5) SET_ANSWER action dispatched on input change. Mock WizardContext.
**Dependencies**: T021 (Step4 component)
**Success Criteria**: 5 test cases pass, questions render, character counter works, summary count correct, actions dispatched

### T034 [P]: Test useWizardStatus hook
**File**: `frontend/tests/hooks/useWizardStatus.test.ts`
**Description**: Unit test useWizardStatus hook with Vitest. Test scenarios: (1) fetches wizard status on mount, (2) returns shouldShowWizard=true when no settings exist, (3) returns shouldShowWizard=false when settings exist, (4) handles 404 error (campaign not found), (5) handles 401 error (unauthorized). Mock axios apiClient. Use @testing-library/react-hooks or similar.
**Dependencies**: T025 (useWizardStatus hook)
**Success Criteria**: 5 test cases pass, hook fetches on mount, loading/error states correct, mocked API responses handled

### T035 [P]: Test useWizardCompletion hook
**File**: `frontend/tests/hooks/useWizardCompletion.test.ts`
**Description**: Unit test useWizardCompletion hook with Vitest. Test scenarios: (1) completeWizard function submits POST request with correct body, (2) submitting state set to true during request, (3) success response returns settings + graph + rules count, (4) error response sets error state (400 validation, 409 already completed, 500 transaction failure). Mock axios apiClient.
**Dependencies**: T026 (useWizardCompletion hook)
**Success Criteria**: 4 test cases pass, POST request sent with correct data, submitting state tracked, error handling works

---

## Phase 3.8: E2E Tests

### T036: Write E2E test for Scenario 1 (High Fantasy flow)
**File**: `frontend/tests/e2e/wizard-high-fantasy.spec.ts`
**Description**: Playwright E2E test for quickstart.md Scenario 1 (Complete Wizard Flow with High Fantasy Theme, 23 steps, lines 28-138). Test flow: Create campaign → Wizard displays → Step 1: Select High Fantasy → Step 2: Enable Beasts toggle → Step 3: Select "Set up now" → Step 4: Answer 4 questionnaire questions → Click Finish → Verify sidebar shows High Fantasy labels → Verify World-Foundations graph created → Verify 4 world rules entries created. Use Playwright page object model. Assertions on DOM elements and API responses.
**Dependencies**: T001-T035 (all implementation complete)
**Success Criteria**: E2E test passes, full 23-step flow validated, sidebar labels verified, database entries confirmed

### T037: Write E2E test for Scenario 2 (Custom theme)
**File**: `frontend/tests/e2e/wizard-custom-theme.spec.ts`
**Description**: Playwright E2E test for quickstart.md Scenario 2 (Custom Theme with Manual Naming, 7 steps, lines 140-206). Test flow: Create campaign → Select "Custom" theme → Fill all 13 category name inputs with custom values → Test validation (empty field blocks Next, >50 chars blocks Next) → Complete wizard without World-Foundations → Verify sidebar shows custom labels → Verify backend uses internal names in API calls (check Network tab). Use Playwright.
**Dependencies**: T001-T035 (all implementation complete)
**Success Criteria**: E2E test passes, custom labels validated, sidebar shows custom names, API uses internal names

### T038: Write E2E test for Scenario 3 (Skip World-Foundations)
**File**: `frontend/tests/e2e/wizard-skip-foundations.spec.ts`
**Description**: Playwright E2E test for quickstart.md Scenario 3 (Skip World-Foundations Graph Setup, 6 steps, lines 208-246). Test flow: Create campaign → Select Cyberpunk theme → Disable Creatures toggle → Step 3: Select "Set up later" for World-Foundations → Verify wizard shows "Step 3 of 3" (not "Step 3 of 4") → Click Finish (not Next) → Verify no World-Foundations graph created → Verify sidebar shows Cyberpunk labels → Verify Creatures category not visible (disabled). Use Playwright.
**Dependencies**: T001-T035 (all implementation complete)
**Success Criteria**: E2E test passes, Step 4 skipped, wizard shows 3 steps total, no graph created, disabled category hidden

### T039: Write E2E test for Scenario 4 (Back navigation)
**File**: `frontend/tests/e2e/wizard-back-navigation.spec.ts`
**Description**: Playwright E2E test for quickstart.md Scenario 4 (Navigate Back to Change Style, 9 steps, lines 248-316). Test flow: Create campaign → Select High Fantasy → Progress to Step 3 → Click Back to Step 2 → Verify state preserved (Beasts toggle still enabled) → Click Back to Step 1 → Change theme to Sci-Fi → Verify Step 2 labels change to Sci-Fi theme → Verify toggle state reset (Xenofauna disabled by default) → Continue to Step 4 → Verify questionnaire answers not preserved across theme change → Complete wizard with Sci-Fi theme. Use Playwright.
**Dependencies**: T001-T035 (all implementation complete)
**Success Criteria**: E2E test passes, back navigation preserves state, theme change resets dependent state, forward navigation works

### T040: Write E2E test for Scenario 5 (Edge cases)
**File**: `frontend/tests/e2e/wizard-edge-cases.spec.ts`
**Description**: Playwright E2E test for quickstart.md Scenario 5 (Edge Cases, 6 sub-scenarios, lines 318-444). Test 5a: Wizard already completed (navigate to existing campaign, wizard not shown, status API returns shouldShowWizard=false). Test 5b: Close wizard mid-way (progress lost on refresh). Test 5c: Mandatory category toggle disabled (tooltip shown, toggle grayed out). Test 5d: Transaction failure rollback (simulate backend error, verify no partial data). Test 5e: Answer length validation (>1000 chars shows error, Finish disabled). Test 5f: Browser refresh warning (beforeunload event, progress lost). Use Playwright.
**Dependencies**: T001-T035 (all implementation complete)
**Success Criteria**: E2E test passes, all 6 edge cases validated, error handling correct, rollback verified

### T041: Run full quickstart.md manual validation
**File**: `specs/016-create-a-campaign/quickstart.md`
**Description**: Execute all 5 test scenarios from quickstart.md manually or via E2E tests (T036-T040). Verify all acceptance criteria pass. Test API endpoints with cURL examples (lines 448-571). Verify database entries with SQL queries (lines 575-610). Document any deviations or issues. Capture screenshots for visual validation.
**Dependencies**: T001-T040 (all implementation and tests complete)
**Success Criteria**: All 5 scenarios pass, API responses match OpenAPI spec, database entries correct, no regressions

---

## Phase 3.9: Polish & Documentation

### T042: Update CLAUDE.md with Feature 016
**File**: `CLAUDE.md`
**Description**: Run `.specify/scripts/bash/update-agent-context.sh claude` to update CLAUDE.md with Feature 016 technologies and recent changes. Add: campaign_settings table, React Context + useReducer pattern, 4-step wizard flow, 5 theme constants, atomic transaction for wizard completion, Radix UI Dialog/Switch/Tabs usage. Keep under 150 lines.
**Dependencies**: T001-T041 (all implementation complete)
**Success Criteria**: CLAUDE.md updated, Feature 016 technologies added, recent changes section updated, file under 150 lines

---

## Dependencies Graph

```
Backend TDD (T001-T003) → Migration (T004) → Model (T005) → Validation (T006)
                             ↓
Service (T007) ← Model + Validation
                             ↓
Routes (T008-T010) ← Contract Tests (T001-T003) + Service (T007)
                             ↓
Route Registration (T011) ← Routes (T008-T010)
                             ↓
Integration Tests (T012) ← Service + Routes

Frontend Foundation (T013-T014) → Components (T015-T024) [10 parallel]
                             ↓
Hooks (T025-T026) ← Endpoints (T008, T010) + Context (T014)
                             ↓
Integration (T027-T028) ← Components + Hooks + Existing Pages
                             ↓
Component Tests (T029-T035) [7 parallel] ← Components + Hooks

E2E Tests (T036-T041) ← All Implementation (T001-T035)
                             ↓
Polish (T042) ← Tests Complete
```

**Critical Path**: T001-T012 (backend) → T013-T028 (frontend) → T036-T041 (E2E) → T042 (polish)

---

## Parallel Execution Examples

```bash
# Phase 3.1: Backend TDD Tests (3 parallel)
Task: "Write contract test for GET /wizard/status in backend/tests/contract/campaign-wizard.test.ts"
Task: "Write contract test for GET /wizard/themes in backend/tests/contract/campaign-wizard.test.ts"
Task: "Write contract test for POST /wizard/complete in backend/tests/contract/campaign-wizard.test.ts"

# Phase 3.4: Frontend Foundation (2 parallel)
Task: "Create theme constants in frontend/src/constants/themes.ts"
Task: "Create WizardContext with useReducer in frontend/src/contexts/WizardContext.tsx"

# Phase 3.5: Frontend Components (10 parallel - all different files)
Task: "Create WizardDialog component in frontend/src/components/wizard/WizardDialog.tsx"
Task: "Create WizardProgress component in frontend/src/components/wizard/WizardProgress.tsx"
Task: "Create WizardNavigation component in frontend/src/components/wizard/WizardNavigation.tsx"
Task: "Create Step1StyleSelection component in frontend/src/components/wizard/Step1StyleSelection.tsx"
Task: "Create Step2CategoryToggles component in frontend/src/components/wizard/Step2CategoryToggles.tsx"
Task: "Create Step3GraphSelection component in frontend/src/components/wizard/Step3GraphSelection.tsx"
Task: "Create Step4WorldFoundations component in frontend/src/components/wizard/Step4WorldFoundations.tsx"
Task: "Create ThemeCard component in frontend/src/components/wizard/ThemeCard.tsx"
Task: "Create CategoryToggleRow component in frontend/src/components/wizard/CategoryToggleRow.tsx"
Task: "Create QuestionField component in frontend/src/components/wizard/QuestionField.tsx"

# Phase 3.7: Component Tests (7 parallel)
Task: "Test WizardContext reducer in frontend/tests/contexts/WizardContext.test.ts"
Task: "Test Step1StyleSelection component in frontend/tests/components/wizard/Step1StyleSelection.test.tsx"
Task: "Test Step2CategoryToggles component in frontend/tests/components/wizard/Step2CategoryToggles.test.tsx"
Task: "Test Step3GraphSelection component in frontend/tests/components/wizard/Step3GraphSelection.test.tsx"
Task: "Test Step4WorldFoundations component in frontend/tests/components/wizard/Step4WorldFoundations.test.tsx"
Task: "Test useWizardStatus hook in frontend/tests/hooks/useWizardStatus.test.ts"
Task: "Test useWizardCompletion hook in frontend/tests/hooks/useWizardCompletion.test.ts"
```

---

## Task Summary

**Total Tasks**: 42
- **Backend TDD**: 3 tasks (T001-T003) [3 parallel]
- **Backend Setup**: 3 tasks (T004-T006) [sequential]
- **Backend Implementation**: 5 tasks (T007-T011) [sequential, depend on TDD tests]
- **Backend Integration Tests**: 1 task (T012) [sequential]
- **Frontend Foundation**: 2 tasks (T013-T014) [2 parallel]
- **Frontend Components**: 10 tasks (T015-T024) [10 parallel]
- **Frontend Hooks & Integration**: 4 tasks (T025-T028) [sequential]
- **Frontend Component Tests**: 7 tasks (T029-T035) [7 parallel]
- **E2E Tests**: 6 tasks (T036-T041) [sequential]
- **Polish**: 1 task (T042) [sequential]

**Estimated Time**: 30-38 hours (12-15 hours backend, 15-20 hours frontend, 5-8 hours E2E tests, 1-2 hours polish)

**Maximum Parallelization**: 22 tasks can run in parallel (3 backend tests + 2 frontend foundation + 10 components + 7 component tests)

---

## Validation Checklist
*GATE: Checked before implementation*

- [x] All API endpoints have contract tests (3 endpoints, T001-T003)
- [x] All Zod schemas defined (6 schemas, T006)
- [x] All wizard steps have components (4 steps, T018-T021)
- [x] All components have tests (10 components, T029-T035)
- [x] All E2E scenarios covered (5 scenarios from quickstart.md, T036-T040)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Dependencies clearly documented
- [x] TDD order enforced (backend tests before implementation)
- [x] Atomic transaction validated (T012 integration test)

---

**Status**: ✅ Tasks ready for implementation - 42 tasks generated, dependency order validated, parallel execution optimized, ready for Feature 016 execution
