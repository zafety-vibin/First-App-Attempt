# Tasks: Structured Category Database Foundation

**Feature**: 014-create-the-database
**Branch**: `014-create-the-database`
**Input**: Design documents from `specs/014-create-the-database/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.0+, Express 4.x, Better-SQLite3
   → Structure: Backend-only (no frontend changes)
2. Load design documents:
   → data-model.md: 14 entities (13 categories + custom_field_definitions)
   → contracts/openapi.yaml: 65 endpoints (5 CRUD per category x 13)
   → quickstart.md: 8 test scenarios
3. Generate tasks by category:
   → Setup: Migration, models (14 files)
   → Tests: Contract tests (13 files), integration tests (3 files)
   → Core: Services (13 files), routes (13 files), middleware (1 file)
   → Integration: Wire up filtering, validate performance
   → Polish: Unit tests, documentation
4. Apply task rules:
   → Models = different files = [P]
   → Services = different files = [P]
   → Routes = different files = [P]
   → Contract tests = different files = [P]
5. Number tasks sequentially (T001-T055)
6. Validate completeness:
   ✓ All 14 entities have models
   ✓ All 13 categories have services
   ✓ All 13 categories have routes
   ✓ All 13 categories have contract tests
   ✓ All 8 quickstart scenarios have integration tests
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Exact file paths included in descriptions
- Backend-only feature (paths: `backend/src/`, `backend/tests/`)

---

## Phase 3.1: Setup & Database Migration

### T001: Create database migration file
**File**: `backend/src/db/migrations/014-category-tables.sql`
**Description**: Create migration with all 13 category tables + custom_field_definitions table (14 tables total) plus indexes. Tables: npcs, locations, factions, session_recaps, quests, player_characters, lore_entries, world_rules, planar_forces, session_prep, custom_mechanics, items, creatures, custom_field_definitions. Include universal fields (id, campaign_id, name, description, core_status, player_knowledge, tags, created_at, updated_at, custom_fields) and category-specific fields per data-model.md. Create indexes for campaign_id, core_status, player_knowledge, and foreign keys.
**Dependencies**: None
**Success Criteria**: Migration runs without errors, all 14 tables created with proper foreign key constraints

### T002 [P]: Create NPC TypeScript model
**File**: `backend/src/models/npc.ts`
**Description**: Define NPC interface matching data-model.md schema. Include universal fields + category-specific fields (race, class, level, alignment, appearance, personality_traits, motivation, relationship_to_party, met_party, art, faction_id, superior_npc_id, locations, dm_secrets, dm_plot_relevance).
**Dependencies**: T001 (tables exist)
**Success Criteria**: Interface compiles, matches database schema exactly

### T003 [P]: Create Location TypeScript model
**File**: `backend/src/models/location.ts`
**Description**: Define Location interface with universal fields + category-specific (location_type, population, cultural_characteristics, map, parent_location_id, notable_npcs, factions_present, connected_locations, dm_secrets).
**Dependencies**: T001
**Success Criteria**: Interface compiles, self-referential parent_location_id type-safe

### T004 [P]: Create Faction TypeScript model
**File**: `backend/src/models/faction.ts`
**Description**: Define Faction interface with universal fields + category-specific (faction_type, power_level, resources, beliefs, goals, methods, leader_id, key_members, allied_factions, rival_factions, territory, dm_true_agenda).
**Dependencies**: T001
**Success Criteria**: Interface compiles

### T005 [P]: Create SessionRecap TypeScript model
**File**: `backend/src/models/sessionRecap.ts`
**Description**: Define SessionRecap interface with universal fields + category-specific (session_date, in_game_date_start, in_game_date_end, time_passed, summary, key_events, player_decisions, is_canon, canonical_status, npcs_encountered, locations_visited, quests_progressed, loot_acquired, dm_consequences, dm_behind_scenes). Enforce is_canon=1 and canonical_status='canon' in type.
**Dependencies**: T001
**Success Criteria**: Interface enforces canonical markers

### T006 [P]: Create Quest TypeScript model
**File**: `backend/src/models/quest.ts`
**Description**: Define Quest interface with universal fields + category-specific (status, objectives, rewards, quest_giver_id, started_session_id, completed_session_id, related_npcs, related_locations, dm_true_objective, dm_consequences). Status enum: not_started | in_progress | completed | failed.
**Dependencies**: T001
**Success Criteria**: Status enum enforced at type level

### T007 [P]: Create PlayerCharacter TypeScript model
**File**: `backend/src/models/playerCharacter.ts`
**Description**: Define PlayerCharacter interface with universal fields + category-specific (player_name, class, level, race, background, personality, goals, backstory, art, faction_affiliations, allied_npcs, dm_secrets, dm_plot_threads, dm_true_motivation, dm_consequences).
**Dependencies**: T001
**Success Criteria**: Interface compiles

### T008 [P]: Create LoreEntry TypeScript model
**File**: `backend/src/models/loreEntry.ts`
**Description**: Define LoreEntry interface with universal fields + category-specific (category, era_period, in_game_date, historical_accuracy, related_npcs, related_locations, related_factions).
**Dependencies**: T001
**Success Criteria**: Interface compiles

### T009 [P]: Create WorldRule TypeScript model
**File**: `backend/src/models/worldRule.ts`
**Description**: Define WorldRule interface with universal fields + category-specific (rule_type, exceptions, related_rules). Self-referential related_rules array.
**Dependencies**: T001
**Success Criteria**: Interface compiles with self-reference

### T010 [P]: Create PlanarForce TypeScript model
**File**: `backend/src/models/planarForce.ts`
**Description**: Define PlanarForce interface with universal fields + category-specific (entity_type, domains, alignment, worshiper_base, plane_of_origin, base_of_power, high_priest_id, allied_entities, rival_entities, religious_orders, dm_true_nature).
**Dependencies**: T001
**Success Criteria**: Interface compiles

### T011 [P]: Create SessionPrep TypeScript model
**File**: `backend/src/models/sessionPrep.ts`
**Description**: Define SessionPrep interface with universal fields + category-specific (planned_date, status, planned_events, possible_encounters, plot_hooks, dm_notes, is_canon, canonical_status, plot_threads, npcs_to_prep, locations_to_prep). Enforce is_canon=0, canonical_status='hypothetical', player_knowledge='dm_only' in type.
**Dependencies**: T001
**Success Criteria**: Interface enforces hypothetical markers

### T012 [P]: Create CustomMechanic TypeScript model
**File**: `backend/src/models/customMechanic.ts`
**Description**: Define CustomMechanic interface with universal fields + category-specific (mechanic_type, rules_text, prerequisites, source, related_rules). Self-referential related_rules.
**Dependencies**: T001
**Success Criteria**: Interface compiles

### T013 [P]: Create Item TypeScript model
**File**: `backend/src/models/item.ts`
**Description**: Define Item interface with universal fields + category-specific (item_type, rarity, properties, value, owner_npc_id, owner_pc_id, location_id, dm_secret_properties, dm_true_nature).
**Dependencies**: T001
**Success Criteria**: Interface compiles, ownership fields nullable

### T014 [P]: Create Creature TypeScript model
**File**: `backend/src/models/creature.ts`
**Description**: Define Creature interface with universal fields + category-specific (creature_type, challenge_rating, abilities, habitats, dm_behavior_notes).
**Dependencies**: T001
**Success Criteria**: Interface compiles

### T015 [P]: Create CustomFieldDefinition TypeScript model
**File**: `backend/src/models/customFieldDefinition.ts`
**Description**: Define CustomFieldDefinition interface (id, campaign_id, category, field_name, field_label, field_type, options, created_at, updated_at). field_type enum: text | number | select | multi_select | date.
**Dependencies**: T001
**Success Criteria**: field_type enum enforced

---

## Phase 3.2: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY service/route implementation

### T016 [P]: Contract tests for NPC endpoints
**File**: `backend/tests/contract/npcs.test.ts`
**Description**: Write 5 failing contract tests for NPC CRUD endpoints (GET /api/npcs, POST /api/npcs, GET /api/npcs/:id, PUT /api/npcs/:id, DELETE /api/npcs/:id). Test request/response schemas match openapi.yaml. Test X-View-Mode header filtering. Use Vitest + Supertest.
**Dependencies**: T001-T015 (models defined)
**Success Criteria**: All 5 tests fail (endpoints not implemented), schemas validated

### T017 [P]: Contract tests for Location endpoints
**File**: `backend/tests/contract/locations.test.ts`
**Description**: Write 5 failing contract tests for Location CRUD endpoints. Test parent_location_id circular reference validation. Test map field.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T018 [P]: Contract tests for Faction endpoints
**File**: `backend/tests/contract/factions.test.ts`
**Description**: Write 5 failing contract tests for Faction CRUD endpoints. Test leader_id foreign key.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T019 [P]: Contract tests for SessionRecap endpoints
**File**: `backend/tests/contract/sessionRecaps.test.ts`
**Description**: Write 5 failing contract tests for SessionRecap CRUD endpoints. Test is_canon always 1, canonical_status always 'canon'.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail, canonical markers enforced

### T020 [P]: Contract tests for Quest endpoints
**File**: `backend/tests/contract/quests.test.ts`
**Description**: Write 5 failing contract tests for Quest CRUD endpoints. Test status enum validation. Test foreign keys (quest_giver_id, started_session_id, completed_session_id).
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T021 [P]: Contract tests for PlayerCharacter endpoints
**File**: `backend/tests/contract/playerCharacters.test.ts`
**Description**: Write 5 failing contract tests for PlayerCharacter CRUD endpoints. Test art field.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T022 [P]: Contract tests for LoreEntry endpoints
**File**: `backend/tests/contract/loreEntries.test.ts`
**Description**: Write 5 failing contract tests for LoreEntry CRUD endpoints. Test historical_accuracy field.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T023 [P]: Contract tests for WorldRule endpoints
**File**: `backend/tests/contract/worldRules.test.ts`
**Description**: Write 5 failing contract tests for WorldRule CRUD endpoints. Test related_rules self-reference.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T024 [P]: Contract tests for PlanarForce endpoints
**File**: `backend/tests/contract/planarForces.test.ts`
**Description**: Write 5 failing contract tests for PlanarForce CRUD endpoints. Test base_of_power field. Test domains array.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T025 [P]: Contract tests for SessionPrep endpoints
**File**: `backend/tests/contract/sessionPrep.test.ts`
**Description**: Write 5 failing contract tests for SessionPrep CRUD endpoints. Test is_canon always 0, canonical_status always 'hypothetical', player_knowledge always 'dm_only'. Test one-way references (no reverse lookup).
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail, hypothetical markers enforced

### T026 [P]: Contract tests for CustomMechanic endpoints
**File**: `backend/tests/contract/customMechanics.test.ts`
**Description**: Write 5 failing contract tests for CustomMechanic CRUD endpoints.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T027 [P]: Contract tests for Item endpoints
**File**: `backend/tests/contract/items.test.ts`
**Description**: Write 5 failing contract tests for Item CRUD endpoints. Test owner_npc_id, owner_pc_id, location_id foreign keys. Test mutual exclusivity of owner_npc_id and owner_pc_id.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T028 [P]: Contract tests for Creature endpoints
**File**: `backend/tests/contract/creatures.test.ts`
**Description**: Write 5 failing contract tests for Creature CRUD endpoints.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

### T029 [P]: Contract tests for CustomFieldDefinition endpoints
**File**: `backend/tests/contract/customFieldDefinitions.test.ts`
**Description**: Write 5 failing contract tests for CustomFieldDefinition CRUD endpoints. Test UNIQUE constraint (campaign_id, category, field_name). Test field_type enum. Test options required for select/multi_select.
**Dependencies**: T001-T015
**Success Criteria**: All 5 tests fail

---

## Phase 3.3: Service Layer (ONLY after tests are failing)

### T030 [P]: NPCService CRUD implementation
**File**: `backend/src/services/npcService.ts`
**Description**: Implement NPCService with standard CRUD methods (create, findById, list, update, delete). Use Better-SQLite3 with prepared statements. Handle faction_id, superior_npc_id foreign keys. Validate circular hierarchies. Use transactions for multi-operation writes.
**Dependencies**: T016 (test fails), T002 (model exists)
**Success Criteria**: NPCService tests pass, circular hierarchy prevented

### T031 [P]: LocationService CRUD implementation
**File**: `backend/src/services/locationService.ts`
**Description**: Implement LocationService with standard CRUD. Handle parent_location_id self-reference. Validate circular references.
**Dependencies**: T017, T003
**Success Criteria**: LocationService tests pass

### T032 [P]: FactionService CRUD implementation
**File**: `backend/src/services/factionService.ts`
**Description**: Implement FactionService with standard CRUD. Handle leader_id foreign key.
**Dependencies**: T018, T004
**Success Criteria**: FactionService tests pass

### T033 [P]: SessionRecapService CRUD implementation
**File**: `backend/src/services/sessionRecapService.ts`
**Description**: Implement SessionRecapService with standard CRUD. Enforce is_canon=1, canonical_status='canon' at service layer.
**Dependencies**: T019, T005
**Success Criteria**: Canonical markers enforced

### T034 [P]: QuestService CRUD implementation
**File**: `backend/src/services/questService.ts`
**Description**: Implement QuestService with standard CRUD. Handle quest_giver_id, started_session_id, completed_session_id foreign keys. Validate status enum.
**Dependencies**: T020, T006
**Success Criteria**: QuestService tests pass

### T035 [P]: PlayerCharacterService CRUD implementation
**File**: `backend/src/services/playerCharacterService.ts`
**Description**: Implement PlayerCharacterService with standard CRUD.
**Dependencies**: T021, T007
**Success Criteria**: PlayerCharacterService tests pass

### T036 [P]: LoreEntryService CRUD implementation
**File**: `backend/src/services/loreEntryService.ts`
**Description**: Implement LoreEntryService with standard CRUD.
**Dependencies**: T022, T008
**Success Criteria**: LoreEntryService tests pass

### T037 [P]: WorldRuleService CRUD implementation
**File**: `backend/src/services/worldRuleService.ts`
**Description**: Implement WorldRuleService with standard CRUD. Handle related_rules self-reference.
**Dependencies**: T023, T009
**Success Criteria**: WorldRuleService tests pass

### T038 [P]: PlanarForceService CRUD implementation
**File**: `backend/src/services/planarForceService.ts`
**Description**: Implement PlanarForceService with standard CRUD. Handle high_priest_id foreign key.
**Dependencies**: T024, T010
**Success Criteria**: PlanarForceService tests pass

### T039 [P]: SessionPrepService CRUD implementation
**File**: `backend/src/services/sessionPrepService.ts`
**Description**: Implement SessionPrepService with standard CRUD. Enforce is_canon=0, canonical_status='hypothetical', player_knowledge='dm_only' at service layer. One-way references only (no reverse lookups).
**Dependencies**: T025, T011
**Success Criteria**: Hypothetical markers enforced, one-way linking validated

### T040 [P]: CustomMechanicService CRUD implementation
**File**: `backend/src/services/customMechanicService.ts`
**Description**: Implement CustomMechanicService with standard CRUD.
**Dependencies**: T026, T012
**Success Criteria**: CustomMechanicService tests pass

### T041 [P]: ItemService CRUD implementation
**File**: `backend/src/services/itemService.ts`
**Description**: Implement ItemService with standard CRUD. Validate owner_npc_id and owner_pc_id mutual exclusivity (cannot both be set).
**Dependencies**: T027, T013
**Success Criteria**: Ownership validation enforced

### T042 [P]: CreatureService CRUD implementation
**File**: `backend/src/services/creatureService.ts`
**Description**: Implement CreatureService with standard CRUD.
**Dependencies**: T028, T014
**Success Criteria**: CreatureService tests pass

### T043 [P]: CustomFieldDefinitionService CRUD implementation
**File**: `backend/src/services/customFieldDefinitionService.ts`
**Description**: Implement CustomFieldDefinitionService with standard CRUD. Validate UNIQUE constraint (campaign_id, category, field_name). Validate field_type enum. Require options for select/multi_select types.
**Dependencies**: T029, T015
**Success Criteria**: UNIQUE constraint validated, options validation works

---

## Phase 3.4: Information Filtering Middleware

### T044: Information level filtering middleware
**File**: `backend/src/middleware/informationFilter.ts`
**Description**: Implement Express middleware that reads X-View-Mode header (dm_view | player_view). For player_view: filter WHERE clause to include only player_knowledge IN ('common_knowledge', 'player_knowledge', null), strip all dm_* prefixed fields from response objects. For dm_view: pass-through (no filtering). Apply to all category endpoints.
**Dependencies**: T030-T043 (services exist)
**Success Criteria**: Middleware strips dm_secrets in player_view, filters dm_only entities

---

## Phase 3.5: REST Routes (parallel after services exist)

### T045 [P]: NPC REST routes
**File**: `backend/src/routes/npcs.ts`
**Description**: Implement 5 REST endpoints (GET /api/npcs, POST /api/npcs, GET /api/npcs/:id, PUT /api/npcs/:id, DELETE /api/npcs/:id). Use NPCService. Apply informationFilter middleware. Add Keycloak auth. Handle pagination (limit/offset), sorting, filters (campaign_id, core_status, player_knowledge, tags).
**Dependencies**: T030 (NPCService), T044 (middleware)
**Success Criteria**: T016 contract tests pass

### T046 [P]: Location REST routes
**File**: `backend/src/routes/locations.ts`
**Description**: Implement 5 REST endpoints for Locations. Use LocationService. Apply middleware.
**Dependencies**: T031, T044
**Success Criteria**: T017 contract tests pass

### T047 [P]: Faction REST routes
**File**: `backend/src/routes/factions.ts`
**Description**: Implement 5 REST endpoints for Factions. Use FactionService. Apply middleware.
**Dependencies**: T032, T044
**Success Criteria**: T018 contract tests pass

### T048 [P]: SessionRecap REST routes
**File**: `backend/src/routes/sessionRecaps.ts`
**Description**: Implement 5 REST endpoints for SessionRecaps. Use SessionRecapService. Apply middleware.
**Dependencies**: T033, T044
**Success Criteria**: T019 contract tests pass

### T049 [P]: Quest REST routes
**File**: `backend/src/routes/quests.ts`
**Description**: Implement 5 REST endpoints for Quests. Use QuestService. Apply middleware.
**Dependencies**: T034, T044
**Success Criteria**: T020 contract tests pass

### T050 [P]: PlayerCharacter REST routes
**File**: `backend/src/routes/playerCharacters.ts`
**Description**: Implement 5 REST endpoints for PlayerCharacters. Use PlayerCharacterService. Apply middleware.
**Dependencies**: T035, T044
**Success Criteria**: T021 contract tests pass

### T051 [P]: LoreEntry REST routes
**File**: `backend/src/routes/loreEntries.ts`
**Description**: Implement 5 REST endpoints for LoreEntries. Use LoreEntryService. Apply middleware.
**Dependencies**: T036, T044
**Success Criteria**: T022 contract tests pass

### T052 [P]: WorldRule REST routes
**File**: `backend/src/routes/worldRules.ts`
**Description**: Implement 5 REST endpoints for WorldRules. Use WorldRuleService. Apply middleware.
**Dependencies**: T037, T044
**Success Criteria**: T023 contract tests pass

### T053 [P]: PlanarForce REST routes
**File**: `backend/src/routes/planarForces.ts`
**Description**: Implement 5 REST endpoints for PlanarForces. Use PlanarForceService. Apply middleware.
**Dependencies**: T038, T044
**Success Criteria**: T024 contract tests pass

### T054 [P]: SessionPrep REST routes
**File**: `backend/src/routes/sessionPrep.ts`
**Description**: Implement 5 REST endpoints for SessionPrep. Use SessionPrepService. Apply middleware.
**Dependencies**: T039, T044
**Success Criteria**: T025 contract tests pass

### T055 [P]: CustomMechanic REST routes
**File**: `backend/src/routes/customMechanics.ts`
**Description**: Implement 5 REST endpoints for CustomMechanics. Use CustomMechanicService. Apply middleware.
**Dependencies**: T040, T044
**Success Criteria**: T026 contract tests pass

### T056 [P]: Item REST routes
**File**: `backend/src/routes/items.ts`
**Description**: Implement 5 REST endpoints for Items. Use ItemService. Apply middleware.
**Dependencies**: T041, T044
**Success Criteria**: T027 contract tests pass

### T057 [P]: Creature REST routes
**File**: `backend/src/routes/creatures.ts`
**Description**: Implement 5 REST endpoints for Creatures. Use CreatureService. Apply middleware.
**Dependencies**: T042, T044
**Success Criteria**: T028 contract tests pass

### T058 [P]: CustomFieldDefinition REST routes
**File**: `backend/src/routes/customFieldDefinitions.ts`
**Description**: Implement 5 REST endpoints for CustomFieldDefinitions. Use CustomFieldDefinitionService. Apply middleware.
**Dependencies**: T043, T044
**Success Criteria**: T029 contract tests pass

---

## Phase 3.6: Integration Tests

### T059 [P]: Information filtering integration test
**File**: `backend/tests/integration/informationFiltering.test.ts`
**Description**: End-to-end test for information level filtering. Create NPCs with different player_knowledge levels (common_knowledge, player_knowledge, dm_only, null). Test X-View-Mode: dm_view returns all, player_view filters correctly. Test dm_secrets field stripped in player_view. Covers quickstart Scenario 2.
**Dependencies**: T045 (NPC routes)
**Success Criteria**: Filtering works across all scenarios

### T060 [P]: Foreign key connections integration test
**File**: `backend/tests/integration/foreignKeyConnections.test.ts`
**Description**: End-to-end test for explicit foreign key relationships. Test NPC→Faction (faction_id), NPC→NPC (superior_npc_id), Location→Location (parent_location_id), Faction→NPC (leader_id), Quest→NPC (quest_giver_id), Quest→SessionRecap (started_session_id, completed_session_id). Test ON DELETE SET NULL and CASCADE behavior. Covers quickstart Scenario 1 and 3.
**Dependencies**: T045-T049 (NPC, Location, Faction, Quest routes)
**Success Criteria**: All foreign key relationships work, cascades correct

### T061 [P]: Session prep one-way linking integration test
**File**: `backend/tests/integration/sessionPrepOneWay.test.ts`
**Description**: End-to-end test for session prep one-way references. Create SessionPrep with npcs_to_prep array. Verify no reverse lookup field exists on NPCs. Delete canonical NPC, verify session prep reference becomes stale (acceptable). Test player_knowledge always 'dm_only', is_canon always 0. Covers quickstart Scenario 4.
**Dependencies**: T054 (SessionPrep routes)
**Success Criteria**: One-way linking enforced, no reverse lookups

---

## Phase 3.7: Polish & Documentation

### T062 [P]: Unit tests for information filter middleware
**File**: `backend/tests/unit/informationFilter.test.ts`
**Description**: Unit tests for informationFilter middleware. Test header parsing, field stripping, WHERE clause modification. Mock request/response objects.
**Dependencies**: T044 (middleware exists)
**Success Criteria**: 100% coverage for middleware logic

### T063: Performance validation
**File**: `backend/tests/integration/performance.test.ts`
**Description**: Performance tests for all 13 categories. Test single entity read <100ms (FR-053 via plan.md performance goals). Test list queries <500ms for 100 results. Create 100 entities per category, measure query times.
**Dependencies**: T045-T058 (all routes)
**Success Criteria**: All queries meet performance targets

### T064 [P]: Update CLAUDE.md with Feature 014
**File**: `CLAUDE.md`
**Description**: Run `.specify/scripts/bash/update-agent-context.sh claude` to add Feature 014 context. Add 13 category tables, new services, informationFilter middleware, custom_fields JSON column pattern. Update recent changes section.
**Dependencies**: T001-T063 (implementation complete)
**Success Criteria**: CLAUDE.md updated with Feature 014 technologies

### T065: Run quickstart.md validation
**File**: `specs/014-create-the-database/quickstart.md`
**Description**: Manually execute all 8 quickstart scenarios to validate Feature 014. Scenarios: (1) NPCs with hierarchy, (2) Information level filtering, (3) Locations with maps, (4) Session prep one-way linking, (5) Custom field definitions, (6) Planar forces, (7) Player characters, (8) Lore entries. Verify all success criteria met.
**Dependencies**: T001-T064 (all implementation + tests)
**Success Criteria**: All 8 scenarios pass, database operations validated

---

## Dependencies Summary

```
T001 (migration)
  └─> T002-T015 (models) [P]
       └─> T016-T029 (contract tests) [P] ⚠️ MUST FAIL
            └─> T030-T043 (services) [P]
                 └─> T044 (middleware)
                      └─> T045-T058 (routes) [P]
                           ├─> T059-T061 (integration tests) [P]
                           └─> T062-T063 (polish) [P]
                                └─> T064-T065 (documentation)
```

**Critical Path**: T001 → T002-T015 → T016-T029 → T030-T043 → T044 → T045-T058 → T062-T065

**Parallelization Opportunities**:
- T002-T015: 14 model files (parallel)
- T016-T029: 14 contract test files (parallel)
- T030-T043: 14 service files (parallel)
- T045-T058: 14 route files (parallel)
- T059-T061: 3 integration test files (parallel)
- T062-T063: 2 polish tasks (parallel)

**Total Estimated Time**: ~40-50 hours for full implementation
- Setup/Models: 4-6 hours
- Contract Tests: 8-10 hours
- Services: 10-12 hours
- Routes: 8-10 hours
- Integration/Polish: 6-8 hours
- Validation: 2-4 hours

---

## Parallel Execution Examples

### Example 1: Launch all 14 model tasks together
```bash
# After T001 (migration) completes:
Task: "Create NPC model in backend/src/models/npc.ts"
Task: "Create Location model in backend/src/models/location.ts"
Task: "Create Faction model in backend/src/models/faction.ts"
Task: "Create SessionRecap model in backend/src/models/sessionRecap.ts"
Task: "Create Quest model in backend/src/models/quest.ts"
Task: "Create PlayerCharacter model in backend/src/models/playerCharacter.ts"
Task: "Create LoreEntry model in backend/src/models/loreEntry.ts"
Task: "Create WorldRule model in backend/src/models/worldRule.ts"
Task: "Create PlanarForce model in backend/src/models/planarForce.ts"
Task: "Create SessionPrep model in backend/src/models/sessionPrep.ts"
Task: "Create CustomMechanic model in backend/src/models/customMechanic.ts"
Task: "Create Item model in backend/src/models/item.ts"
Task: "Create Creature model in backend/src/models/creature.ts"
Task: "Create CustomFieldDefinition model in backend/src/models/customFieldDefinition.ts"
```

### Example 2: Launch all 14 contract test tasks together
```bash
# After T002-T015 (models) complete:
Task: "Contract tests for NPC endpoints in backend/tests/contract/npcs.test.ts"
Task: "Contract tests for Location endpoints in backend/tests/contract/locations.test.ts"
Task: "Contract tests for Faction endpoints in backend/tests/contract/factions.test.ts"
# ... (11 more test files)
```

### Example 3: Launch all 14 service tasks together
```bash
# After T016-T029 (tests fail):
Task: "NPCService CRUD in backend/src/services/npcService.ts"
Task: "LocationService CRUD in backend/src/services/locationService.ts"
Task: "FactionService CRUD in backend/src/services/factionService.ts"
# ... (11 more service files)
```

### Example 4: Launch all 14 route tasks together
```bash
# After T030-T043 (services) and T044 (middleware) complete:
Task: "NPC REST routes in backend/src/routes/npcs.ts"
Task: "Location REST routes in backend/src/routes/locations.ts"
Task: "Faction REST routes in backend/src/routes/factions.ts"
# ... (11 more route files)
```

---

## Notes

- **[P] tasks = different files**, no dependencies between them
- **TDD critical**: Contract tests (T016-T029) MUST fail before services (T030-T043)
- **Middleware applies globally**: informationFilter (T044) must exist before routes (T045-T058)
- **Foreign keys enforced**: Database constraints handle referential integrity
- **JSON arrays for many-to-many**: Avoid junction tables for v1 simplicity
- **Performance targets**: <100ms single reads, <500ms list queries (per plan.md)
- **Backend-only feature**: No frontend changes in this feature
- **Next feature**: Feature 015 (Dashboard UI) will consume these APIs

---

## Validation Checklist
*GATE: Verified before tasks.md completion*

- [x] All 14 entities have model tasks (T002-T015)
- [x] All 14 categories have contract test tasks (T016-T029)
- [x] All 14 categories have service tasks (T030-T043)
- [x] All 14 categories have route tasks (T045-T058)
- [x] All 8 quickstart scenarios covered by integration tests (T059-T061, T065)
- [x] Middleware task exists (T044)
- [x] Performance validation task exists (T063)
- [x] Documentation task exists (T064-T065)
- [x] Tests come before implementation (T016-T029 before T030-T058)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

---

**Status**: ✅ Tasks generated - 65 tasks total, ready for execution
