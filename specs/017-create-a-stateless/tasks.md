# Tasks: Stateless AI Import System

**Feature**: 017-create-a-stateless
**Branch**: `017-create-a-stateless`
**Estimated Time**: 42-50 hours

## Overview

This tasks.md implements Feature 017's stateless AI import system that writes to 13 category database tables. User workflow: (1) Select import TYPE from dropdown, (2) Upload file or paste text, (3) Optional custom context, (4) Click Import for one-shot AI processing, (5) Preview displays proposed changes as editable table rows, (6) User edits fields directly, (7) Confirm to apply database changes. Key differentiator: NO conversational chat, NO knowledge graph population - pure database import with preview/edit workflow.

**Key Components**:
- **Backend**: 2 ephemeral tables (import_jobs, duplicate_candidates), 4 services (ImportService, ImportProcessingService, DeduplicationService, ImportConfirmService), 5 API endpoints
- **Frontend**: 9 components (Radix UI Dialog, TanStack Table preview, inline editing), 4 hooks, 1 context, 2 utils (Zod validation, Levenshtein fuzzy matching)
- **Performance**: <5s AI processing for 10-page document, <500ms preview rendering for 50 entities, <2s database write

---

## Phase 3.1: Backend TDD - Contract Tests

### T001 [P]: Write contract test for GET /import/types
**File**: `backend/tests/contract/import.test.ts`
**Description**: Write contract test for GET /api/campaigns/:id/import/types endpoint. Test scenarios: (1) Return 13 import types with type/table/description/sequential_supported fields, (2) Location notes sequential_supported = false, (3) Session Recap sequential_supported = true, (4) 401 unauthorized. Use Vitest + Supertest. Tests MUST FAIL initially (no implementation yet). Match OpenAPI schema from contracts/import.yaml lines 39-100.
**Dependencies**: None (first task)
**Success Criteria**: 4 test cases written, all tests fail with "endpoint not found" or similar error, test file created

---

### T002 [P]: Write contract test for POST /import/process
**File**: `backend/tests/contract/import.test.ts`
**Description**: Write contract test for POST /api/campaigns/:id/import/process endpoint. Test scenarios: (1) File upload with multipart/form-data returns import_job_id + extracted_entities + duplicate_candidates, (2) Text paste with application/json returns same structure, (3) Sequential Session Recap import with files array, (4) Custom context applied to AI prompt, (5) 400 missing import_type, (6) 413 file too large (>50MB), (7) 422 unsupported file format, (8) 500 AI processing error with retryable flag. Use Vitest + Supertest. Tests MUST FAIL initially. Match OpenAPI schema from contracts/import.yaml lines 102-307. Verify processing_time_ms returned.
**Dependencies**: None (parallel with T001)
**Success Criteria**: 8 test cases written, all tests fail, multipart and JSON request bodies tested

---

### T003 [P]: Write contract tests for POST /import/deduplicate, /import/confirm, /import/cancel
**File**: `backend/tests/contract/import.test.ts`
**Description**: Write contract tests for remaining 3 import endpoints. (1) POST /import/deduplicate: test duplicate detection with entities array, threshold parameter (default 0.7), return duplicate_candidates sorted by similarity, 404 import job not found. (2) POST /import/confirm: test atomic transaction with entities array (with tempId + mergeWithExisting fields), return success + imported_count + updated_count + imported_ids + updated_ids, 400 validation errors, 404 import job not found, 500 database write failure with rollback. (3) POST /import/cancel: test job deletion, return success message, 404 import job not found. Use Vitest + Supertest. Tests MUST FAIL initially. Match OpenAPI schemas from contracts/import.yaml lines 308-581.
**Dependencies**: None (parallel with T001, T002)
**Success Criteria**: 11 total test cases written (3 deduplicate, 6 confirm, 2 cancel), all tests fail

---

## Phase 3.2: Backend Implementation - Database Layer

### T004: Create migration 017-import-jobs.sql
**File**: `backend/src/db/migrations/017-import-jobs.sql`
**Description**: Create SQLite migration for 2 ephemeral tables: (1) import_jobs table with id (PK), campaign_id (FK CASCADE), user_id, import_type (ENUM 13 types), source_type (file_upload/text_paste), file_name, custom_context (max 1000 chars), extracted_count, confirmed_count, status (ENUM processing/preview/confirmed/cancelled/failed), error_message, created_at, updated_at. Add CHECK constraints for ENUMs and indexes on campaign_id, status, created_at. (2) duplicate_candidates table with id (PK), import_job_id (FK CASCADE), preview_entry_id, existing_entry_id, existing_entry_table, similarity_score (0.0-1.0), match_type (ENUM name_match/description_match/internal_duplicate/combined), resolution (ENUM unresolved/ignored/merged/deleted_preview/deleted_existing), created_at. Add CHECK constraints and indexes on import_job_id, similarity_score. Copy SQL from data-model.md lines 18-54, 112-137, 1149-1206.
**Dependencies**: T001, T002, T003 (contract tests written)
**Success Criteria**: Migration creates 2 tables with correct schema, CHECK constraints enforce ENUMs, indexes created, migration runs successfully, contract tests still fail (no routes yet)

---

### T005 [P]: Create ImportJob model
**File**: `backend/src/models/ImportJob.ts`
**Description**: Create TypeScript model for ImportJob entity. Define ImportJob interface with id (string), campaign_id (string), user_id (string), import_type (ImportType enum), source_type ('file_upload' | 'text_paste'), file_name (string | null), custom_context (string | null), extracted_count (number), confirmed_count (number), status ('processing' | 'preview' | 'confirmed' | 'cancelled' | 'failed'), error_message (string | null), created_at (number), updated_at (number). Define ImportType union type with all 13 category names. Add CRUD methods: create(), findById(), updateStatus(), delete(). Copy TypeScript interfaces from data-model.md lines 56-89. Implement lifecycle transitions from data-model.md lines 91-98.
**Dependencies**: T004 (migration created)
**Success Criteria**: Model file created, TypeScript types match database schema, CRUD methods implemented, no compilation errors

---

### T006 [P]: Create DuplicateCandidate model
**File**: `backend/src/models/DuplicateCandidate.ts`
**Description**: Create TypeScript model for DuplicateCandidate entity. Define DuplicateCandidate interface with id (string), import_job_id (string), preview_entry_id (string), existing_entry_id (string), existing_entry_table (string), similarity_score (number 0.0-1.0), match_type ('name_match' | 'description_match' | 'internal_duplicate' | 'combined'), resolution ('unresolved' | 'ignored' | 'merged' | 'deleted_preview' | 'deleted_existing'), created_at (number). Add CRUD methods: create(), findByImportJobId(), updateResolution(), deleteByImportJobId(). Copy TypeScript interface from data-model.md lines 139-153. Implement lifecycle from data-model.md lines 155-162.
**Dependencies**: T004 (migration created), T005 (ImportJob model for FK reference)
**Success Criteria**: Model file created, TypeScript types match database schema, CRUD methods implemented, CASCADE delete behavior documented

---

## Phase 3.3: Backend Implementation - Services Layer

### T007: Create Levenshtein fuzzy matching utility
**File**: `backend/src/utils/fuzzyMatch.ts`
**Description**: Implement Levenshtein distance algorithm for fuzzy entity name matching. Create levenshteinDistance(a: string, b: string): number function using dynamic programming matrix (O(n*m) complexity). Create calculateSimilarity(a: string, b: string): number function returning 0.0-1.0 score (1.0 = identical, 0.0 = completely different). Create findDuplicates(extractedEntities, existingEntities, threshold = 0.7): DuplicateCandidate[] function for batch fuzzy matching. Normalize strings to lowercase before comparison. Handle empty string edge cases. Copy implementation from research.md lines 711-787. Add JSDoc comments with complexity analysis.
**Dependencies**: T006 (DuplicateCandidate model for return type)
**Success Criteria**: levenshteinDistance() passes unit test ("Sir Gareth" vs "Ser Gareth" = 91% similarity), calculateSimilarity() returns 0.0-1.0, findDuplicates() returns sorted candidates above threshold, empty strings handled

---

### T008 [P]: Create DeduplicationService
**File**: `backend/src/services/DeduplicationService.ts`
**Description**: Create service for duplicate detection using Levenshtein fuzzy matching. Implement detectDuplicates(campaignId, importType, extractedEntities): Promise<DuplicateCandidate[]> method that (1) fetches existing entities of same category from database using Feature 014 CategoryService, (2) runs fuzzy matching against extracted entities using 0.7 threshold, (3) sorts results by similarity_score descending, (4) returns duplicate candidates. Implement detectInternalDuplicates(extractedEntities): Promise<DuplicateCandidate[]> method to find duplicates within extracted batch (prevents importing "Sir Gareth" twice from same file). Copy implementation from research.md lines 789-848. Add performance logging for large entity sets.
**Dependencies**: T007 (fuzzy matching utility)
**Success Criteria**: detectDuplicates() finds external duplicates, detectInternalDuplicates() finds internal duplicates, results sorted by similarity, <2s for 50 extracted vs 1000 existing entities

---

### T009 [P]: Create ImportProcessingService
**File**: `backend/src/services/ImportProcessingService.ts`
**Description**: Create service for stateless AI entity extraction. Implement extractEntities(content: string, importType: ImportType, customContext: string, byollmConfig: BYOLLMConfig): Promise<ExtractedEntity[]> method that (1) loads Zod schema for import type from Feature 014, (2) constructs system prompt with import type context + custom context, (3) calls Feature 008 BYOLLM API with streaming disabled (one-shot), (4) validates AI response against Zod schema, (5) generates temp IDs for preview entities, (6) returns extracted entities array. Integrate Feature 008 rate limit handling (exponential backoff). Handle API errors with retryable flag. Copy BYOLLM integration patterns from plan.md lines 94-96 and research.md. Add processing_time_ms metric.
**Dependencies**: T006 (models), Feature 008 BYOLLM integration
**Success Criteria**: extractEntities() calls BYOLLM API, Zod validation applied, temp IDs generated, rate limit handling works, <5s for 10-page document content, retryable errors flagged

---

### T010 [P]: Create ImportConfirmService
**File**: `backend/src/services/ImportConfirmService.ts`
**Description**: Create service for atomic database writes. Implement confirmImport(campaignId: string, importType: ImportType, entities: ValidatedEntity[]): Promise<ImportResult> method using SQLite transactions. (1) Get table name and schema fields for import type from Feature 014 mappings. (2) Prepare INSERT and UPDATE statements using Better-SQLite3. (3) Wrap all operations in db.transaction() for atomicity. (4) For each entity: if mergeWithExisting field set, UPDATE existing entity; else INSERT new entity with generated UUID. (5) Extract field values, JSON.stringify arrays/objects for SQLite. (6) COMMIT transaction. (7) Return ImportResult with success, imported_count, updated_count, imported_ids, updated_ids, transaction_time_ms. On error, transaction automatically rolls back. Copy implementation from research.md lines 1047-1150. Add transaction timeout handling.
**Dependencies**: T006 (models), Feature 014 category schemas
**Success Criteria**: confirmImport() uses atomic transactions, all-or-nothing writes, rollback on any failure, <2s for 50 entities, returns accurate counts and IDs

---

### T011: Create ImportService (orchestration)
**File**: `backend/src/services/ImportService.ts`
**Description**: Create main orchestration service combining FileParserService (Feature 005), ImportProcessingService, and DeduplicationService. Implement processImport(campaignId, importType, file/text, customContext, byollmConfig): Promise<ProcessImportResult> method that (1) creates ImportJob with status 'processing', (2) parses file using FileParserService.parseFile() from Feature 005 OR accepts text directly, (3) calls ImportProcessingService.extractEntities(), (4) runs DeduplicationService.detectDuplicates() + detectInternalDuplicates(), (5) updates ImportJob status to 'preview', (6) returns import_job_id + extracted_entities + duplicate_candidates. Implement processSequentialRecaps(campaignId, files[], customContext, byollmConfig) for Session Recap batch imports that processes files in order, passing previous recap summaries as context to AI. Handle errors by updating ImportJob status to 'failed' with error_message. Copy sequential import logic from research.md lines 1305-1396.
**Dependencies**: T005 (ImportJob model), T008 (DeduplicationService), T009 (ImportProcessingService), Feature 005 FileParserService
**Success Criteria**: processImport() orchestrates full workflow, sequential recaps preserve order, errors update ImportJob status, integration with Feature 005 file parsing works

---

## Phase 3.4: Backend Implementation - API Layer

### T012: Create import routes
**File**: `backend/src/routes/import.ts`
**Description**: Create Express router for 5 import endpoints matching contracts/import.yaml. (1) GET /campaigns/:id/import/types: return static list of 13 import types with type/table/description/sequential_supported fields. (2) POST /campaigns/:id/import/process: handle multipart/form-data (multer middleware from Feature 005, 50MB limit) and application/json, validate import_type, call ImportService.processImport() or processSequentialRecaps(), return import_job_id + extracted_entities + duplicate_candidates. (3) POST /campaigns/:id/import/deduplicate: accept entities array + threshold, call DeduplicationService, return duplicate_candidates. (4) POST /campaigns/:id/import/confirm: validate entities with Zod schemas, call ImportConfirmService.confirmImport(), delete ImportJob (ephemeral cleanup), return success + counts + IDs. (5) POST /campaigns/:id/import/cancel: delete ImportJob by ID, return success message. Add Keycloak authentication middleware. Add error handling for 400/401/404/413/422/500 responses matching OpenAPI spec. Register router in backend/src/server.ts.
**Dependencies**: T011 (ImportService)
**Success Criteria**: 5 endpoints implemented, routes registered, multer configured for file upload, error responses match OpenAPI spec, Keycloak auth applied

---

### T013: Fix failing backend contract tests
**File**: `backend/tests/contract/import.test.ts`
**Description**: Run backend contract tests from T001-T003 and verify all tests now pass with implemented routes. Fix any schema mismatches or response format issues. Test multipart/form-data file upload with actual PDF file. Test JSON text paste request body. Test sequential=true parameter for Session Recap imports. Test 401 unauthorized without token. Test 404 for non-existent import job. Test 500 error handling with mocked AI failure. Test atomic transaction rollback by forcing database constraint violation. Verify processing_time_ms and transaction_time_ms fields present in responses. Add test data cleanup (delete test ImportJobs).
**Dependencies**: T012 (routes implemented)
**Success Criteria**: All contract tests pass (16+ test cases total), file upload tested, sequential import tested, error codes correct, ephemeral cleanup verified

---

## Phase 3.5: Backend Integration Tests

### T014: Write integration test for full import workflow
**File**: `backend/tests/integration/import-workflow.test.ts`
**Description**: Write end-to-end integration test for complete import flow: (1) Create test campaign. (2) Upload location notes file via POST /import/process. (3) Verify ImportJob created with status 'preview'. (4) Verify extracted_entities returned with temp IDs and correct schema fields (location_type, population, etc.). (5) Run deduplication via POST /import/deduplicate (should find 0 duplicates in empty campaign). (6) Confirm import via POST /import/confirm with edited entities (population changed, 1 entity deleted). (7) Verify locations table has exactly 2 new rows (not 3). (8) Verify edited population value persisted. (9) Verify ImportJob deleted (ephemeral cleanup). (10) Test cancellation: process new import, call POST /import/cancel, verify no database writes, ImportJob deleted. Use Vitest + Supertest. Copy test scenarios from quickstart.md Scenarios 1, 2, 5.
**Dependencies**: T013 (contract tests passing)
**Success Criteria**: Integration test passes, full workflow validated, preview editing works, cancellation works, ephemeral cleanup verified

---

### T015: Write integration test for sequential Session Recap import
**File**: `backend/tests/integration/sequential-batch.test.ts`
**Description**: Write integration test for sequential batch import preserving chronological order: (1) Create 3 session recap text files with cause/effect references ("Session 1 found map", "Session 2 used map from Session 1", "Session 3 references Session 2 events"). (2) Upload files via POST /import/process with sequential=true and files array. (3) Verify AI extracts all 3 recaps with correct session_date order. (4) Verify Session 3 key_events reference "map from Session 2" (timeline context preserved). (5) Confirm import. (6) Verify session_recaps table has 3 rows with is_canon=1, canonical_status='canon'. (7) Verify session recaps ordered by session_date. Copy test scenario from quickstart.md Scenario 4 lines 454-622.
**Dependencies**: T013 (contract tests passing)
**Success Criteria**: Sequential import test passes, 3 recaps processed in order, AI references previous context, is_canon enforced

---

### T016: Write integration test for duplicate detection and resolution
**File**: `backend/tests/integration/deduplication.test.ts`
**Description**: Write integration test for fuzzy duplicate detection: (1) Create existing NPC "Sir Gareth" in database. (2) Upload NPC notes with typo "Ser Gareth" via POST /import/process. (3) Verify duplicate_candidates returned with similarity_score >= 0.7, match_type='name_match'. (4) Verify existing_entry_id matches "Sir Gareth", preview_entry_id is temp ID for "Ser Gareth". (5) Test resolution: confirm import with "Ser Gareth" deleted from entities array (merge by deletion). (6) Verify only 1 NPC in database (no duplicate created). (7) Test internal duplicates: upload file with "Sir Gareth" mentioned twice, verify internal_duplicate flagged. Copy test scenario from quickstart.md Scenario 3 lines 295-451.
**Dependencies**: T013 (contract tests passing)
**Success Criteria**: Duplicate detection test passes, Levenshtein matching works, similarity_score correct, merge by deletion works, internal duplicates detected

---

## Phase 3.6: Backend Unit Tests

### T017 [P]: Write unit tests for ImportService
**File**: `backend/tests/unit/ImportService.test.ts`
**Description**: Write unit tests for ImportService methods using mocked dependencies. Test processImport(): (1) Mock FileParserService, ImportProcessingService, DeduplicationService. (2) Verify ImportJob created with status 'processing'. (3) Verify extractEntities called with correct parameters. (4) Verify detectDuplicates called. (5) Verify ImportJob status updated to 'preview'. (6) Test error handling: mock AI API failure, verify status updated to 'failed' with error_message. Test processSequentialRecaps(): (1) Mock processImport() for each file. (2) Verify files processed in order (1 → 2 → 3). (3) Verify previous recap summaries passed as context to subsequent calls. Use Vitest + vi.mock().
**Dependencies**: T011 (ImportService)
**Success Criteria**: Unit tests pass, mocked dependencies work, error handling tested, sequential processing logic validated

---

### T018 [P]: Write unit tests for DeduplicationService
**File**: `backend/tests/unit/DeduplicationService.test.ts`
**Description**: Write unit tests for fuzzy matching logic. Test detectDuplicates(): (1) Create test extracted entities and existing entities arrays. (2) Test exact match detection (similarity 1.0 excluded). (3) Test near-match detection ("Sir Gareth" vs "Ser Gareth" = 0.91 similarity >= 0.7 threshold). (4) Test no match (similarity < 0.7). (5) Test case insensitivity. (6) Test empty string edge cases. Test detectInternalDuplicates(): (1) Create extracted entities with duplicate names. (2) Verify internal_duplicate match_type returned. Test Levenshtein algorithm directly: (1) levenshteinDistance("Sir Gareth", "Ser Gareth") = 2 edits. (2) calculateSimilarity() returns correct 0.0-1.0 score. Use Vitest.
**Dependencies**: T008 (DeduplicationService), T007 (fuzzy matching utility)
**Success Criteria**: Unit tests pass, Levenshtein algorithm validated, threshold behavior correct, edge cases handled

---

## Phase 3.7: Frontend Foundation - Utils & Context

### T019 [P]: Create importValidation.ts with 13 Zod schemas
**File**: `frontend/src/utils/importValidation.ts`
**Description**: Create Zod validation schemas for all 13 import types matching Feature 014 database schemas. Define universalSchema with required fields (name, description, core_status, player_knowledge, tags, custom_fields). Extend universalSchema for each category: npcSchema (race, class, level, alignment, faction_id, superior_npc_id, locations), locationSchema (location_type, population, parent_location_id, notable_npcs, factions_present), factionSchema (faction_type, power_level, leader_id, key_members, allied_factions, rival_factions), sessionRecapSchema (session_date, in_game_date_start, key_events, is_canon=1, canonical_status='canon'), questSchema (status, objectives, rewards, quest_giver_id), playerCharacterSchema (player_name, class, level, race, faction_affiliations), loreSchema (category, era_period, related_npcs), worldRuleSchema (rule_type, exceptions, related_rules), planarForceSchema (entity_type, domains, alignment, high_priest_id), sessionPrepSchema (planned_date, status, player_knowledge='dm_only', is_canon=0, canonical_status='hypothetical'), customMechanicSchema (mechanic_type, rules_text, prerequisites), itemSchema (item_type, rarity, properties, value, owner_npc_id, location_id), creatureSchema (creature_type, challenge_rating, abilities, habitats). Add getSchemaForImportType(importType: ImportType): z.ZodSchema helper. Copy all schemas from data-model.md lines 285-1003.
**Dependencies**: None (first frontend task)
**Success Criteria**: 13 Zod schemas created, universalSchema extended for each category, getSchemaForImportType() returns correct schema, no TypeScript errors

---

### T020 [P]: Create levenshtein.ts client-side utility
**File**: `frontend/src/utils/levenshtein.ts`
**Description**: Create client-side Levenshtein distance utility for duplicate highlighting in preview table. Copy levenshteinDistance() and calculateSimilarity() functions from backend fuzzy matching utility (T007). Add isSimilar(a: string, b: string, threshold = 0.7): boolean helper for quick duplicate checks. Use for real-time duplicate warning highlighting when user edits entity names in preview table. Add JSDoc comments explaining O(n*m) complexity.
**Dependencies**: None (parallel with T019)
**Success Criteria**: Client-side Levenshtein utility created, calculateSimilarity() returns 0.0-1.0, isSimilar() threshold check works

---

### T021: Create ImportContext with useReducer state machine
**File**: `frontend/src/contexts/ImportContext.tsx`
**Description**: Create React Context for import dialog workflow state management. Define ImportDialogState interface with stage ('upload' | 'processing' | 'preview' | 'confirmed' | 'error'), importType (ImportType | null), sourceType ('file' | 'text' | null), fileName (string | null), textContent (string | null), customContext (string), extractedEntities (ExtractedEntity[]), processingProgress (number 0-100), error (ImportError | null), duplicateCandidates (DuplicateCandidate[]), sequentialImport (boolean), sequentialFiles (File[]). Define ImportAction discriminated union with 13 action types: SET_IMPORT_TYPE, SET_FILE, SET_TEXT, SET_CUSTOM_CONTEXT, START_PROCESSING, UPDATE_PROGRESS, PROCESSING_SUCCESS, PROCESSING_ERROR, UPDATE_ENTITY, DELETE_ENTITY, CONFIRM_IMPORT, CANCEL_IMPORT, RESET. Implement importReducer with state machine transitions: upload → processing → preview → confirmed, with error transitions. Create ImportProvider component with useReducer hook and helper methods (setImportType, uploadFile, pasteText, startProcessing, updateEntity, deleteEntity, confirmImport, cancelImport). Add useImport() hook for consuming context. Copy state types and reducer from research.md lines 502-676.
**Dependencies**: T019 (importValidation for ExtractedEntity types)
**Success Criteria**: ImportContext created, useReducer state machine works, action types enforce TypeScript safety, helper methods dispatch actions

---

## Phase 3.8: Frontend Hooks

### T022 [P]: Create useImportProcessing hook
**File**: `frontend/src/hooks/useImportProcessing.ts`
**Description**: Create hook for stateless AI processing API calls. Implement useImportProcessing(campaignId: string) hook that exposes processImport(importType, file/text, customContext): Promise<ProcessImportResult> method. Use axios to POST /import/process with multipart/form-data for file upload or application/json for text paste. Handle loading state, error state (with retryable flag). Integrate Feature 008 BYOLLM rate limit notification handling. Return import_job_id, extracted_entities, duplicate_candidates, processing_time_ms. Add retry() method for manual retry on failure. Handle 400/413/422/500 errors with user-friendly messages. Copy error handling patterns from research.md lines 1558-1765.
**Dependencies**: T021 (ImportContext for state updates)
**Success Criteria**: useImportProcessing() hook created, POST /import/process called, file upload works, text paste works, error handling works, retry() method available

---

### T023 [P]: Create usePreviewTable hook
**File**: `frontend/src/hooks/usePreviewTable.ts`
**Description**: Create hook for TanStack Table v8 configuration with inline editing. Implement usePreviewTable(importType: ImportType, extractedEntities: ExtractedEntity[], onEntityChange, onEntityDelete) hook that returns TanStack Table instance with dynamic columns based on import type schema. Generate columns from Feature 014 category schemas: universal fields (name, description, player_knowledge, tags) + category-specific fields (race/class for NPCs, location_type/population for Locations, etc.). Configure EditableCell component for inline editing with validation. Configure DeleteRowButton component for row deletion. Add row selection for bulk operations. Configure virtualization for 50+ entity previews. Copy TanStack Table patterns from research.md lines 149-259.
**Dependencies**: T019 (Zod schemas for column generation)
**Success Criteria**: usePreviewTable() hook created, TanStack Table configured, dynamic columns work, inline editing works, row selection works

---

### T024 [P]: Create useDeduplication hook
**File**: `frontend/src/hooks/useDeduplication.ts`
**Description**: Create hook for duplicate conflict management. Implement useDeduplication(importJobId: string, entities: ExtractedEntity[]) hook that exposes rerunDeduplication(entities, threshold?): Promise<DuplicateCandidate[]> method to call POST /import/deduplicate after user edits entity names. Maintain duplicateCandidates state. Provide getDuplicateWarning(entityId: string): DuplicateCandidate | null helper for showing warnings in preview table rows. Provide resolveDuplicate(candidateId: string, resolution: 'ignored' | 'merged' | 'deleted_preview') method to update resolution state. Integrate with levenshtein.ts utility for client-side duplicate highlighting. Copy duplicate handling patterns from research.md lines 853-864.
**Dependencies**: T020 (levenshtein utility)
**Success Criteria**: useDeduplication() hook created, rerunDeduplication() calls API, getDuplicateWarning() returns warnings, resolveDuplicate() updates state

---

## Phase 3.9: Frontend Components - Import Dialog

### T025: Create ImportDialog component
**File**: `frontend/src/components/import/ImportDialog.tsx`
**Description**: Create main Radix UI Dialog component for import workflow. Use Dialog.Root, Dialog.Portal, Dialog.Overlay, Dialog.Content primitives. Render different content based on ImportContext stage: (1) 'upload' stage: show TypeSelector + FileUploadArea/TextPasteTab + CustomContextInput + Import button. (2) 'processing' stage: show loading spinner + progress bar (0-100%). (3) 'preview' stage: show PreviewTable + DuplicateWarning + Confirm/Cancel buttons. (4) 'confirmed' stage: show success message + close button. (5) 'error' stage: show ImportErrorDisplay + Retry/Cancel buttons. Add Dialog.Close button (X icon) in top-right corner. Handle dialog close with unsaved preview warning. Integrate ImportProvider to wrap dialog content. Add responsive styling (fullscreen on mobile, max-w-4xl on desktop). Copy Radix UI Dialog patterns from research.md lines 36-92.
**Dependencies**: T021 (ImportContext)
**Success Criteria**: ImportDialog renders, Radix UI Dialog works, stage-based content switching works, close confirmation works

---

### T026 [P]: Create TypeSelector component
**File**: `frontend/src/components/import/TypeSelector.tsx`
**Description**: Create dropdown select component for 13 import types. Fetch available types from GET /api/campaigns/:id/import/types. Render select dropdown with type labels ("Location notes", "NPC notes", etc.) and descriptions. Show sequential_supported badge for Session Recap type. Call ImportContext.setImportType() on selection. Disable Import button until type selected. Add type icons (location pin, person, shield for faction, etc.) for visual identification. Use Radix UI Select primitive for accessibility.
**Dependencies**: T021 (ImportContext)
**Success Criteria**: TypeSelector renders, 13 types fetched from API, selection updates context, sequential badge shown for Session Recap, icons displayed

---

### T027 [P]: Create FileUploadArea component
**File**: `frontend/src/components/import/FileUploadArea.tsx`
**Description**: Create file upload component with drag-and-drop support. Accept PDF, DOCX, TXT, MD files (mime type validation). Show file size limit (50MB) warning. Display selected file name + size after upload. Validate file format (reject unsupported types). Call ImportContext.uploadFile(file) on file selection. Add drag-and-drop zone with visual feedback (border highlight on drag-over). Show file preview icon based on extension. Add "Remove file" button to clear selection. Handle file input via hidden <input type="file"> with click trigger.
**Dependencies**: T021 (ImportContext)
**Success Criteria**: FileUploadArea renders, file selection works, drag-and-drop works, file validation works, 50MB limit enforced, remove file works

---

### T028 [P]: Create CustomContextInput component
**File**: `frontend/src/components/import/CustomContextInput.tsx`
**Description**: Create optional text input for custom AI context/system prompt (max 1000 chars). Show character count (e.g., "450 / 1000"). Add placeholder text: "Optional: Add context for AI extraction (e.g., focus on character motivations)". Call ImportContext.setCustomContext() on change. Add collapsible/expandable section (closed by default, "Advanced" label). Support multiline textarea (3 rows default, expandable). Show example prompts on hover/tooltip ("Focus on combat stats", "Extract historical dates", etc.).
**Dependencies**: T021 (ImportContext)
**Success Criteria**: CustomContextInput renders, character count updates, 1000 char limit enforced, collapsible section works, context updates state

---

### T029: Create PreviewTable component
**File**: `frontend/src/components/import/PreviewTable.tsx`
**Description**: Create TanStack Table v8 editable preview table component. Use usePreviewTable() hook for table configuration. Render table with dynamic columns based on import type (universal fields + category-specific fields). Integrate EditableCell component for inline editing. Show DuplicateWarning component in rows with duplicate_candidates. Add row selection checkboxes for bulk operations. Show "X entities selected" indicator when rows selected. Add BulkEditToolbar for bulk field updates (player_knowledge, tags, core_status). Add row delete button (trash icon). Virtualize table rows if >50 entities (react-window). Show validation errors inline per cell (red border + error text). Disable Confirm button if validation errors exist. Copy TanStack Table implementation from research.md lines 149-259. Add loading skeleton while processing.
**Dependencies**: T023 (usePreviewTable hook)
**Success Criteria**: PreviewTable renders, dynamic columns work, inline editing works, duplicate warnings shown, row selection works, validation errors displayed

---

### T030 [P]: Create PreviewRow / EditableCell component
**File**: `frontend/src/components/import/PreviewRow.tsx`, `frontend/src/components/import/EditableCell.tsx`
**Description**: Create inline editable cell component for preview table. Implement click-to-edit interaction: non-editing state shows value, click activates input. Show hover effect (hover:bg-blue-50) to indicate clickable. Auto-save on blur (save changes when clicking away). Support input types: text, textarea (multiline), number, select (for enums like player_knowledge). Show validation error below cell if invalid (Zod schema validation). Handle required fields (name, description) with visual indicator (*). Add escape key to cancel edit and restore original value. Add tab key navigation to move to next cell. Copy inline editing patterns from research.md lines 269-319.
**Dependencies**: T019 (Zod validation schemas)
**Success Criteria**: EditableCell click-to-edit works, auto-save on blur works, validation errors shown, escape/tab navigation works

---

### T031 [P]: Create DuplicateWarning component
**File**: `frontend/src/components/import/DuplicateWarning.tsx`
**Description**: Create warning badge for duplicate conflicts. Show yellow background + warning icon + similarity percentage. Display existing entity name for comparison: "Similar to existing 'Sir Gareth' (85% match)". Add action buttons: "Ignore" (hide warning), "Merge" (open merge dialog), "Delete Preview" (remove preview row). Show match_type badge (name_match, description_match, internal_duplicate). Highlight preview row with yellow border when duplicate exists. Update DuplicateCandidate resolution when user clicks action button. Copy duplicate warning UI from research.md lines 853-864.
**Dependencies**: T024 (useDeduplication hook)
**Success Criteria**: DuplicateWarning renders, similarity percentage shown, existing entity name shown, action buttons work, resolution updates state

---

### T032 [P]: Create SequentialBatchUpload component
**File**: `frontend/src/components/import/SequentialBatchUpload.tsx`
**Description**: Create multi-file upload component with drag-to-reorder for Session Recap sequential import. Show checkbox "Sequential Import" (only visible when importType='Session Recap'). Accept multiple file uploads (files[] array). Display uploaded files in ordered list with drag handles (using @dnd-kit/core). Show file order numbers (1, 2, 3). Allow drag-and-drop reordering to correct upload sequence. Show "Session Order (drag to reorder)" label. Add "Remove" button per file to delete from list. Call ImportContext.setSequentialFiles(files) on file order change. Copy sequential upload UI from research.md lines 1248-1303.
**Dependencies**: T021 (ImportContext)
**Success Criteria**: SequentialBatchUpload renders, checkbox only shows for Session Recap, multiple files accepted, drag-to-reorder works, file order preserved

---

### T033 [P]: Create ImportConfirmation component
**File**: `frontend/src/components/import/ImportConfirmation.tsx`
**Description**: Create confirmation section at bottom of preview dialog. Show row count summary: "Confirm import of X entities" (exclude deleted rows from count). Show Confirm button (blue, prominent) and Cancel button (gray, secondary). Disable Confirm button if validation errors exist or no entities in preview. Show loading spinner on Confirm button during database write. Call ImportContext.confirmImport() on Confirm click. Call ImportContext.cancelImport() on Cancel click. Show confirmation prompt if preview has unsaved edits: "Discard X changes?" on Cancel. Add keyboard shortcut hints (Ctrl+Enter to confirm, Escape to cancel). Display transaction_time_ms after successful confirmation.
**Dependencies**: T021 (ImportContext)
**Success Criteria**: ImportConfirmation renders, row count correct, Confirm button disabled when invalid, loading state shown, keyboard shortcuts work

---

## Phase 3.10: Frontend Component Tests

### T034 [P]: Write component tests for ImportDialog
**File**: `frontend/tests/components/ImportDialog.test.tsx`
**Description**: Write component tests for ImportDialog state machine. Test stage transitions: (1) Render upload stage with TypeSelector + FileUploadArea + Import button. (2) Mock ImportContext with 'processing' stage, verify loading spinner shown. (3) Mock 'preview' stage with extracted entities, verify PreviewTable rendered. (4) Mock 'error' stage with retryable error, verify error message + Retry button shown. (5) Mock 'confirmed' stage, verify success message shown. Test close confirmation: (1) Mock preview stage with isDirty=true, click close button, verify "Discard changes?" prompt. Use Vitest + React Testing Library + vi.mock() for ImportContext.
**Dependencies**: T025 (ImportDialog component)
**Success Criteria**: Component tests pass, stage transitions tested, close confirmation tested, context mocked

---

### T035 [P]: Write component tests for PreviewTable
**File**: `frontend/tests/components/PreviewTable.test.tsx`
**Description**: Write component tests for PreviewTable inline editing. Test inline editing: (1) Render table with 3 extracted NPCs. (2) Click name cell, verify input activated. (3) Edit name, blur cell, verify onEntityChange called. (4) Test validation error display for required field (empty name). Test row deletion: (1) Click delete button, verify onEntityDelete called. Test bulk selection: (1) Select 2 rows via checkboxes, verify BulkEditToolbar shown. (2) Bulk update player_knowledge field, verify all selected rows updated. Test duplicate warnings: (1) Mock duplicate_candidates array, verify DuplicateWarning component rendered for matching row. Use Vitest + React Testing Library.
**Dependencies**: T029 (PreviewTable component)
**Success Criteria**: Component tests pass, inline editing tested, row deletion tested, bulk operations tested, duplicate warnings tested

---

### T036 [P]: Write component tests for DuplicateWarning
**File**: `frontend/tests/components/DuplicateWarning.test.tsx`
**Description**: Write component tests for duplicate conflict resolution. Test warning display: (1) Render DuplicateWarning with candidate (similarity 0.85, existing "Sir Gareth", preview "Ser Gareth"). (2) Verify "85% match" text shown. (3) Verify existing entity name shown. Test action buttons: (1) Click "Ignore" button, verify resolution updated to 'ignored'. (2) Click "Delete Preview" button, verify resolution updated to 'deleted_preview'. Test match type badges: (1) Render with match_type='name_match', verify badge shown. (2) Render with match_type='internal_duplicate', verify different badge. Use Vitest + React Testing Library.
**Dependencies**: T031 (DuplicateWarning component)
**Success Criteria**: Component tests pass, warning display tested, action buttons tested, match type badges tested

---

## Phase 3.11: E2E Tests

### T037: Write E2E test for location import workflow
**File**: `frontend/tests/e2e/import-location-notes.spec.ts`
**Description**: Write Playwright E2E test for Scenario 1 (location import with type selection) from quickstart.md lines 55-171. (1) Login as GM user. (2) Create test campaign. (3) Click "Import" button in dashboard. (4) Select "Location notes" from type dropdown. (5) Upload locations.txt file. (6) Click "Import" button. (7) Wait for preview table to render. (8) Verify 3 location rows extracted (Waterdeep, Undermountain, Candlekeep). (9) Verify location schema fields present (location_type, population). (10) Click "Confirm" button. (11) Verify toast notification "3 locations imported". (12) Navigate to locations table, verify 3 new rows. Use Playwright.
**Dependencies**: T025-T033 (all frontend components), T012 (backend routes)
**Success Criteria**: E2E test passes, full workflow validated end-to-end, toast notification shown, database written

---

### T038: Write E2E test for preview editing workflow
**File**: `frontend/tests/e2e/edit-preview-fields.spec.ts`
**Description**: Write Playwright E2E test for Scenario 2 (preview editing) from quickstart.md lines 173-293. (1) Start location import. (2) Wait for preview table. (3) Click Waterdeep population cell. (4) Edit population from 150000 to 200000. (5) Click Undermountain player_knowledge cell. (6) Change to "dm_only". (7) Click delete button on Candlekeep row. (8) Verify row count "2 entities" (3 → 2 after delete). (9) Click "Confirm" button. (10) Verify locations table has 2 rows (not 3). (11) Verify Waterdeep population = 200000. (12) Change view mode to Player View, verify Undermountain hidden. Use Playwright with page.locator() for table cells.
**Dependencies**: T025-T033 (all frontend components), T012 (backend routes)
**Success Criteria**: E2E test passes, inline editing works, row deletion works, edited values persisted, view mode filtering works

---

### T039: Write E2E test for duplicate resolution workflow
**File**: `frontend/tests/e2e/resolve-duplicates.spec.ts`
**Description**: Write Playwright E2E test for Scenario 3 (duplicate resolution) from quickstart.md lines 295-451. (1) Create existing NPC "Sir Gareth" manually. (2) Start NPC import with file containing "Ser Gareth" (typo). (3) Wait for preview table. (4) Verify DuplicateWarning shown for "Ser Gareth" row with "85% match" text. (5) Verify existing "Sir Gareth" name shown in warning. (6) Click "Delete Preview" button on warning. (7) Verify "Ser Gareth" row removed from preview. (8) Click "Confirm" button. (9) Verify NPCs table has only 1 "Sir Gareth" (no duplicate). (10) Verify Captain Marcus imported (non-duplicate). Use Playwright.
**Dependencies**: T025-T033 (all frontend components), T012 (backend routes)
**Success Criteria**: E2E test passes, duplicate warning shown, similarity percentage correct, delete preview works, no duplicate created

---

### T040: Write E2E test for sequential batch import workflow
**File**: `frontend/tests/e2e/sequential-batch.spec.ts`
**Description**: Write Playwright E2E test for Scenario 4 (sequential Session Recap import) from quickstart.md lines 454-622. (1) Select "Session Recap" import type. (2) Check "Sequential Import" checkbox. (3) Upload 3 session files (session1.txt, session2.txt, session3.txt). (4) Verify file order list shows 1, 2, 3. (5) Drag session3 to position 2 (reorder). (6) Drag back to position 3 (correct order). (7) Click "Import" button. (8) Wait for preview table. (9) Verify 3 session recaps extracted with correct session_date order. (10) Verify Session 3 key_events references "map from Session 2" (timeline context preserved). (11) Click "Confirm" button. (12) Verify session_recaps table has 3 rows with is_canon=1. Use Playwright with drag-and-drop API.
**Dependencies**: T025-T033 (all frontend components), T012 (backend routes)
**Success Criteria**: E2E test passes, sequential checkbox works, file reordering works, 3 recaps processed in order, timeline context preserved

---

### T041: Write E2E test for cancel workflow
**File**: `frontend/tests/e2e/cancel-import.spec.ts`
**Description**: Write Playwright E2E test for Scenario 5 (cancel import) from quickstart.md lines 625-710. (1) Start NPC import with wrong file (bob-the-builder.txt). (2) Wait for preview table showing "Bob the Builder" NPC. (3) Click "Cancel" button. (4) Verify dialog closed. (5) Navigate to NPCs table, verify "Bob the Builder" NOT in database. (6) Start new import (correct file). (7) Wait for preview. (8) Edit 2 fields in preview. (9) Click "Cancel" button. (10) Verify confirmation prompt "Discard 2 changes?". (11) Click "Confirm discard". (12) Verify dialog closed, no database writes. Use Playwright.
**Dependencies**: T025-T033 (all frontend components), T012 (backend routes)
**Success Criteria**: E2E test passes, cancel works, no database writes, discard confirmation works for dirty state

---

### T042: Write E2E test for text paste workflow
**File**: `frontend/tests/e2e/text-paste.spec.ts`
**Description**: Write Playwright E2E test for Scenario 6 (text paste) from quickstart.md lines 712-794. (1) Click "Import" button. (2) Select "Quest notes" import type. (3) Click "Paste Text" tab (instead of File Upload). (4) Paste quest text: "The party needs to recover the Sunstone from the goblin caves. Reward: 500 gold." (5) Add custom context: "This is a side quest". (6) Click "Import" button. (7) Wait for preview table. (8) Verify 1 quest extracted with name "Recover the Sunstone", rewards "500 gold", tags ["side-quest"]. (9) Click "Confirm" button. (10) Verify quests table has 1 new row with correct fields. Use Playwright with page.fill() for textarea.
**Dependencies**: T025-T033 (all frontend components), T012 (backend routes)
**Success Criteria**: E2E test passes, text paste works, custom context applied, quest imported correctly

---

## Phase 3.12: Integration & Polish

### T043: Integrate import button in dashboard UI
**File**: `frontend/src/pages/DashboardPage.tsx`
**Description**: Add "Import" button to Feature 015 dashboard UI. Position button in top-right toolbar next to "Create Entry" button. Open ImportDialog on click. Pass campaignId from URL params. Wrap with ImportProvider. Add keyboard shortcut (Ctrl+I) to open dialog. Show import button only for GM users (hide for players). Add tooltip on hover: "Import content from files (Ctrl+I)". Refresh dashboard tables after successful import (listen for ImportContext confirmed state). Add recent imports list in sidebar (last 5 imports with timestamps + entity counts).
**Dependencies**: T025 (ImportDialog), Feature 015 dashboard integration
**Success Criteria**: Import button added to dashboard, dialog opens on click, keyboard shortcut works, dashboard refreshes after import

---

### T044: Update CLAUDE.md with Feature 017 documentation
**File**: `C:/Users/zmanl/projects/VVD-mimic/CLAUDE.md`
**Description**: Update project documentation with Feature 017 context. Add to "Active Technologies" section: "Feature 017: Stateless AI Import - Radix UI Dialog, TanStack Table v8, React Hook Form + Zod, multer (file upload), pdf-parse/mammoth (reuse Feature 005), Levenshtein fuzzy matching, SQLite atomic transactions". Add to "Project Structure" section: backend services (ImportService, ImportProcessingService, DeduplicationService, ImportConfirmService), frontend components (ImportDialog, PreviewTable, DuplicateWarning, SequentialBatchUpload), 2 ephemeral tables (import_jobs, duplicate_candidates). Add to "Recent Changes" section: "Feature 017 (2025-01-10): Stateless AI import system with type selection, preview/edit UI, fuzzy deduplication, atomic transactions. 5 API endpoints, 9 frontend components, 13 Zod schemas. NO knowledge graph population (database-only). Sequential Session Recap batch imports preserve timeline. Performance: <5s AI processing, <500ms preview rendering, <2s database write."
**Dependencies**: All tasks complete
**Success Criteria**: CLAUDE.md updated with Feature 017 sections, tech stack documented, commands added, recent changes logged

---

## Parallel Execution Groups

**Maximum Parallelization**: 19 tasks can run concurrently in optimal scenario.

### Group 1: Backend Contract Tests (T001, T002, T003) - 3 parallel
All contract test files are independent, can be written simultaneously.

### Group 2: Backend Models (T005, T006) - 2 parallel
After T004 (migration), both models can be created in parallel.

### Group 3: Backend Services (T007, T008, T009, T010) - 4 parallel
After T006, fuzzy matching (T007), DeduplicationService (T008), ImportProcessingService (T009), ImportConfirmService (T010) are independent.

### Group 4: Backend Unit Tests (T017, T018) - 2 parallel
After T011, both unit test files can be written in parallel.

### Group 5: Frontend Utils (T019, T020) - 2 parallel
Zod schemas and Levenshtein utility are independent.

### Group 6: Frontend Hooks (T022, T023, T024) - 3 parallel
After T021 (ImportContext), all hooks can be created in parallel.

### Group 7: Frontend Components (T026, T027, T028, T030, T031, T032, T033) - 7 parallel
After T025 (ImportDialog), most child components are independent files.

### Group 8: Frontend Component Tests (T034, T035, T036) - 3 parallel
After components complete, all test files are independent.

### Group 9: E2E Tests (T037-T042) - 6 parallel
After all components and backend complete, E2E tests can run in parallel.

---

## Task Dependency Graph

```
T001, T002, T003 (contract tests) [P]
  ↓
T004 (migration)
  ↓
T005, T006 (models) [P]
  ↓
T007 (fuzzy matching)
  ↓
T008, T009, T010 (services) [P]
  ↓
T011 (ImportService orchestration)
  ↓
T012 (routes)
  ↓
T013 (fix contract tests)
  ↓
T014, T015, T016 (integration tests) [P]
  ↓
T017, T018 (unit tests) [P]

// Frontend parallel track
T019, T020 (utils) [P]
  ↓
T021 (ImportContext)
  ↓
T022, T023, T024 (hooks) [P]
  ↓
T025 (ImportDialog)
  ↓
T026, T027, T028, T030, T031, T032, T033 (components) [P]
  ↓
T029 (PreviewTable - depends on some child components)
  ↓
T034, T035, T036 (component tests) [P]

// E2E tests depend on both tracks complete
T013 + T034 complete
  ↓
T037, T038, T039, T040, T041, T042 (E2E tests) [P]
  ↓
T043 (dashboard integration)
  ↓
T044 (CLAUDE.md update)
```

---

## Estimated Time Breakdown

**Backend**: 22-26 hours
- Contract tests: 3 hours (T001-T003)
- Database layer: 2 hours (T004-T006)
- Services layer: 8 hours (T007-T011)
- API layer: 2 hours (T012-T013)
- Integration tests: 4 hours (T014-T016)
- Unit tests: 3 hours (T017-T018)

**Frontend**: 18-22 hours
- Utils & context: 3 hours (T019-T021)
- Hooks: 3 hours (T022-T024)
- Components: 8 hours (T025-T033)
- Component tests: 2 hours (T034-T036)
- E2E tests: 6 hours (T037-T042)

**Integration & Polish**: 2 hours
- Dashboard integration: 1 hour (T043)
- Documentation: 1 hour (T044)

**Total**: 42-50 hours for complete implementation

---

## Success Criteria

✅ **All 44 tasks completed**
✅ **All tests passing**: 16+ contract tests, 3 integration tests, 2 unit test suites, 3 component test suites, 6 E2E scenarios
✅ **Feature workflow validated**: Type selection → upload/paste → preview → edit → confirm → database write
✅ **Performance targets met**: <5s AI processing, <500ms preview rendering, <2s DB write
✅ **Dependencies integrated**: Feature 005 file parsing, Feature 008 BYOLLM API, Feature 014 category schemas, Feature 015 dashboard
✅ **Ephemeral cleanup verified**: ImportJobs deleted after confirm/cancel
✅ **Fuzzy deduplication works**: Levenshtein distance with 0.7 threshold, duplicate warnings shown
✅ **Sequential batch import works**: Session Recaps processed in chronological order with timeline context
✅ **Atomic transactions enforced**: All-or-nothing database writes, automatic rollback on failure
✅ **Documentation updated**: CLAUDE.md with Feature 017 context, contracts validated, quickstart scenarios pass

---

**Status**: ✅ Tasks.md generated - 44 tasks, 42-50 hour estimate, ready for implementation

