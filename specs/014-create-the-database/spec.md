# Feature Specification: Structured Category Database Foundation

**Feature Branch**: `014-create-the-database`
**Created**: 2025-01-09
**Status**: Draft - Clarifications Resolved
**Input**: User description: "Create the database foundation for 13 structured TTRPG categories (NPCs, Locations, Factions, Session Recaps, Quests, Player Characters, Lore, World Rules, Planar Forces, Session Prep, Custom Mechanics, Items, Creatures). Each table includes universal fields (name, description, core_status, player_knowledge, tags, custom_fields) and category-specific fields with explicit connection columns (e.g., faction_id, parent_location_id) NOT generic relationships arrays. Implement backend CRUD services and REST API endpoints with information level filtering (null = freely accessible). Support one-way connections for session prep linking. NO UI, NO knowledge graphs - API layer only. Reference specs/Architecture-Updates.md for complete schemas."

## Execution Flow (main)
```
1. Parse user description from Input
   → Extracted: 13 database tables, universal fields, explicit connections, CRUD services, API endpoints
2. Extract key concepts from description
   → Actors: Game Masters, AI tools (via MCP)
   → Actions: Create/read/update/delete entities, filter by information level, connect entities
   → Data: 13 category tables with structured fields
   → Constraints: No UI, no knowledge graphs, API layer only
3. For each unclear aspect:
   → ✓ RESOLVED: Custom field definitions stored in separate custom_field_definitions table
   → ✓ RESOLVED: Session prep one-way enforcement via API + MCP validation (defense in depth)
   → ✓ RESOLVED: Existing cards table left untouched (blank slate approach, no migration)
4. Fill User Scenarios & Testing section
   → Scenarios cover: Entity CRUD, information filtering, explicit connections, session prep isolation
5. Generate Functional Requirements
   → 75 requirements covering tables, CRUD, filtering, connections, validation
6. Identify Key Entities
   → 13 category entities + universal field requirements
7. Run Review Checklist
   → ✓ SUCCESS - All clarifications resolved
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

A Game Master creates a campaign and wants to organize their NPCs, locations, factions, and session notes in a structured way that AI tools can understand. They create an NPC "Chrome Bishop" with a faction affiliation, add the faction "Dragon Cult" with a leader connection, and create a location "Hidden Temple" that's the faction's base. The system stores these as structured entities with explicit foreign key connections (not vague "relationships"). Later, the GM creates session prep notes linking to these entities, but these prep connections are one-way only - the canonical entities don't show they're referenced in hypothetical prep. When the GM switches to player view, they see only entities marked as player-accessible, while DM-only secrets remain hidden.

### Key Concept: Databases vs Knowledge Graphs

**Databases (this feature)** store ALL entities comprehensively:
- Locations database contains EVERY location in the campaign
- NPCs database contains EVERY NPC from shopkeepers to major villains
- Full-fidelity storage with all details and connections
- AI tools query databases for complete information retrieval

**Knowledge Graphs (Feature 006/015)** are selective, curated for AI context:
- Geographical graph contains ONLY important location relationships (not every room in a tavern)
- Political-Web graph contains ONLY key faction dynamics and NPC alliances (not every merchant)
- Campaign-Story graph contains ONLY plot-critical events and narrative threads
- User manually curates what gets added to prevent AI context overload

**Why the distinction matters:**
- Import AI writes to databases (comprehensive, automatic)
- Knowledge graphs populated separately (selective, user-controlled)
- AI Planning uses knowledge graphs for context (focused, relevant)
- AI can still query databases for specific lookups (comprehensive fallback)

**Example:** Import session notes → Creates 20 NPCs in database → GM adds 3 plot-critical NPCs to Political-Web graph → AI Planning focuses on those 3 when generating plans, but can query database for details on all 20 if needed.

### Acceptance Scenarios

**Scenario 1: Create NPC with explicit faction connection**
1. **Given** a campaign exists with id "camp-123"
2. **When** GM creates NPC "Chrome Bishop" with `faction_id: "faction-456"` pointing to "Dragon Cult" faction
3. **Then** system stores NPC with foreign key to factions table
4. **And** querying NPC returns faction connection
5. **And** querying "Dragon Cult" faction can show all NPCs with `faction_id = "faction-456"` (reverse lookup)

**Scenario 2: Create location hierarchy with parent-child connections**
1. **Given** a campaign exists with locations "Continent of Valdris" (id: loc-1) and "Kingdom of Aranthia" (id: loc-2)
2. **When** GM creates location "City of Eldermoor" with `parent_location_id: "loc-2"`
3. **Then** system stores explicit parent connection via foreign key
4. **And** querying "City of Eldermoor" returns parent_location_id = loc-2
5. **And** querying "Kingdom of Aranthia" can compute child locations (all locations with parent_location_id = loc-2)

**Scenario 3: Information level filtering with null handling**
1. **Given** a campaign has NPCs with various player_knowledge values:
   - NPC-A: player_knowledge = "common_knowledge"
   - NPC-B: player_knowledge = "player_known"
   - NPC-C: player_knowledge = "dm_only"
   - NPC-D: player_knowledge = null
2. **When** API receives request with view mode = "player_view"
3. **Then** response includes NPC-A, NPC-B, and NPC-D (null is freely accessible)
4. **And** response excludes NPC-C (dm_only)
5. **And** all `dm_*` prefixed fields are stripped from response

**Scenario 4: Session prep one-way connections**
1. **Given** a canonical NPC "Chrome Bishop" (id: npc-789) exists with is_canon=true
2. **When** GM creates session prep "Session 5 Prep" with `npcs_to_prep: ["npc-789"]`
3. **Then** session prep stores one-way link to NPC
4. **And** querying session prep returns NPC reference
5. **And** querying NPC "Chrome Bishop" does NOT show prep references (one-way only)
6. **And** AI tools cannot update canonical NPC from prep content (hypothetical isolation enforced)

**Scenario 5: Custom fields storage and retrieval**
1. **Given** a campaign exists
2. **When** GM creates NPC "Gandalf" with custom_fields: `{"magicalAffinity": "Fire", "threatLevel": "High"}`
3. **Then** system stores custom fields as JSON in custom_fields column
4. **And** querying NPC returns custom_fields object intact
5. **And** GM can query by custom field using JSON extraction (e.g., WHERE json_extract(custom_fields, '$.magicalAffinity') = 'Fire')

**Scenario 6: Session recap vs session prep isolation**
1. **Given** a campaign has session prep "Session 5 Prep" with is_canon=false, canonical_status='hypothetical'
2. **And** campaign has session recap "Session 5 Recap" with is_canon=true, canonical_status='canon'
3. **When** AI tool attempts to update canonical NPC using session prep as source
4. **Then** system rejects the update with error "Cannot update canonical content from hypothetical prep notes"
5. **And** AI tool successfully updates canonical NPC using session recap as source

### Edge Cases

**Connection edge cases:**
- What happens when NPC's faction is deleted? (Expected: faction_id set to NULL via ON DELETE SET NULL)
- What happens when location's parent is deleted? (Expected: parent_location_id set to NULL)
- What happens when campaign is deleted? (Expected: CASCADE delete all entities in that campaign)

**Information filtering edge cases:**
- What happens when player_knowledge is null? (Expected: treated as freely accessible, included in player view)
- What happens when custom information level is deleted? (Expected: entities with that level revert to null or common_knowledge)
- What happens when DM field (dm_secrets) exists on entity with player_knowledge='player_known'? (Expected: entity shown but dm_* fields stripped in player view)

**Session prep edge cases:**
- What happens when session prep references deleted NPC? (Expected: JSON array contains stale ID, query returns null for missing NPC)
- What happens when canonical entities are updated after prep created? (Expected: prep shows outdated data, no reverse sync)

**Custom fields edge cases:**
- What happens when custom_fields JSON is malformed? (Expected: validation error on create/update)
- What happens when custom_fields exceed size limit? (Expected: validation error or truncation warning)

**Tags edge cases:**
- What happens when tags JSON array contains duplicates? (Expected: deduplication or stored as-is, query handles duplicates)
- What happens when filtering by tag that doesn't exist? (Expected: empty results)

---

## Requirements *(mandatory)*

### Functional Requirements

**Database Schema Requirements:**

- **FR-001**: System MUST create 13 structured category tables (npcs, locations, factions, session_recaps, quests, player_characters, lore_entries, world_rules, planar_forces, session_prep, custom_mechanics, items, creatures)
- **FR-002**: Every table MUST include 10 universal fields: id, campaign_id, name, description, core_status, player_knowledge, tags, created_at, updated_at, custom_fields
- **FR-003**: System MUST enforce id as TEXT PRIMARY KEY for all entities
- **FR-004**: System MUST enforce campaign_id as foreign key to campaigns table with ON DELETE CASCADE
- **FR-005**: System MUST use TEXT data type for id fields (supports UUID or similar)
- **FR-006**: System MUST use INTEGER data type for timestamps (Unix epoch seconds)
- **FR-007**: System MUST use TEXT data type for JSON columns (tags, custom_fields, and category-specific JSON arrays)
- **FR-008**: System MUST set default value 'active' for core_status field
- **FR-009**: System MUST set default value 'common_knowledge' for player_knowledge field
- **FR-010**: System MUST auto-populate created_at and updated_at timestamps on entity creation

**Connection Requirements (Explicit Columns):**

- **FR-011**: System MUST use explicit foreign key columns for one-to-many connections (e.g., npcs.faction_id → factions.id)
- **FR-012**: System MUST use JSON array columns for many-to-many connections (e.g., locations.notable_npcs stores array of NPC IDs)
- **FR-013**: System MUST NOT use generic "relationships" column with invisible types - each connection type MUST have named column
- **FR-014**: System MUST set ON DELETE SET NULL for nullable foreign keys (e.g., factions.leader_id → npcs.id)
- **FR-015**: System MUST set ON DELETE CASCADE for required foreign keys (e.g., all entities → campaigns)
- **FR-016**: System MUST support self-referential foreign keys (e.g., locations.parent_location_id → locations.id)
- **FR-017**: System MUST allow reverse lookups (e.g., find all NPCs with faction_id = X)

**Information Level Filtering Requirements:**

- **FR-018**: System MUST treat null player_knowledge as freely accessible (included in player view)
- **FR-019**: System MUST filter entities by player_knowledge when view mode is "player_view"
- **FR-020**: System MUST include entities with player_knowledge in ['common_knowledge', 'player_known', null] in player view
- **FR-021**: System MUST exclude entities with player_knowledge = 'dm_only' in player view
- **FR-022**: System MUST exclude entities with custom player_knowledge levels not in player-accessible list
- **FR-023**: System MUST strip all fields prefixed with 'dm_' in player view responses, regardless of entity's player_knowledge level
- **FR-024**: System MUST preserve all fields in DM view (no filtering)
- **FR-025**: System MUST support custom information level values (references existing information_levels table from Feature 004)

**Session Prep vs Canon Isolation Requirements:**

- **FR-026**: System MUST mark session_prep entities with is_canon=false and canonical_status='hypothetical'
- **FR-027**: System MUST mark session_recaps entities with is_canon=true and canonical_status='canon'
- **FR-028**: System MUST enforce one-way connections from session prep to canonical entities
- **FR-029**: System MUST NOT display session prep references on canonical entity detail views (one-way only)
- **FR-030**: System MUST prevent AI tools from updating canonical entities using hypothetical session prep as source
- **FR-031**: System MUST allow AI tools to update canonical entities using canon session recaps as source
- **FR-032**: System MUST store session prep NPC references in npcs_to_prep JSON array (not foreign keys)
- **FR-033**: System MUST store session prep location references in locations_to_prep JSON array

**CRUD API Requirements:**

- **FR-034**: System MUST provide create endpoint for each of 13 categories
- **FR-035**: System MUST provide read-by-id endpoint for each of 13 categories
- **FR-036**: System MUST provide list-all endpoint for each of 13 categories with pagination
- **FR-037**: System MUST provide update-by-id endpoint for each of 13 categories
- **FR-038**: System MUST provide delete-by-id endpoint for each of 13 categories
- **FR-039**: System MUST validate required fields on create (name required for all entities)
- **FR-040**: System MUST validate foreign key references exist before creating entity
- **FR-041**: System MUST return 404 error when entity not found
- **FR-042**: System MUST return 400 error when validation fails
- **FR-043**: System MUST auto-update updated_at timestamp on every update operation

**Query and Filtering Requirements:**

- **FR-044**: System MUST support filtering entities by campaign_id
- **FR-045**: System MUST support filtering entities by core_status
- **FR-046**: System MUST support filtering entities by player_knowledge
- **FR-047**: System MUST support filtering entities by tags (JSON array membership)
- **FR-048**: System MUST support filtering by category-specific fields (e.g., npcs.race, locations.location_type)
- **FR-049**: System MUST support filtering by custom fields using JSON extraction
- **FR-050**: System MUST support pagination (offset + limit) for list endpoints
- **FR-051**: System MUST support sorting by created_at, updated_at, name fields

**Custom Fields Requirements:**

- **FR-052**: System MUST store custom_fields as JSON object in TEXT column
- **FR-053**: System MUST preserve custom_fields structure on read (no data loss)
- **FR-054**: System MUST validate custom_fields is valid JSON on create/update
- **FR-055**: System MUST support querying by custom field values using JSON extraction
- **FR-056**: System MUST store custom field definitions (schema) in separate custom_field_definitions table with columns: campaign_id, category, field_name, field_label, field_type, options (JSON) for queryability and schema validation

**Tags Requirements:**

- **FR-057**: System MUST store tags as JSON array of strings
- **FR-058**: System MUST preserve tag order on read
- **FR-059**: System MUST support querying entities by tag membership (e.g., has tag "plot_critical")
- **FR-060**: System MUST validate tags is valid JSON array on create/update

**Category-Specific Requirements:**

- **FR-061**: NPCs table MUST include faction_id foreign key to factions table
- **FR-062**: Locations table MUST include parent_location_id self-foreign key for hierarchy
- **FR-063**: Factions table MUST include leader_id foreign key to npcs table
- **FR-064**: Quests table MUST include quest_giver_id, started_session_id, completed_session_id foreign keys
- **FR-065**: Items table MUST include owner_npc_id, owner_pc_id, location_id foreign keys for ownership tracking
- **FR-066**: Session recaps table MUST include npcs_encountered, locations_visited as JSON arrays for tracking
- **FR-067**: Session prep table MUST include npcs_to_prep, locations_to_prep as JSON arrays (not foreign keys - one-way connection)
- **FR-068**: Planar forces table MUST include high_priest_id foreign key to npcs table

**Migration Requirements:**

- **FR-069**: System MUST create database migration script to generate all 13 tables
- **FR-070**: System MUST create indexes on campaign_id, core_status, player_knowledge for all tables
- **FR-071**: System MUST create category-specific indexes (e.g., npcs.faction_id, locations.parent_location_id)
- **FR-072**: System MUST leave existing cards table untouched (no data migration - old cards remain in cards table, new campaigns use structured tables, both can coexist)

**Performance Requirements:**

- **FR-073**: System MUST execute single entity read queries in <100ms (no complex joins required)
- **FR-074**: System MUST execute list queries (100 results) in <500ms with proper indexing
- **FR-075**: System MUST use database indexes on foreign key columns for fast reverse lookups

### Key Entities *(include if feature involves data)*

**Universal Entity Fields** (all 13 categories inherit these):
- **id** (TEXT PRIMARY KEY): Unique identifier for entity (UUID format recommended)
- **campaign_id** (TEXT NOT NULL, FK): Which campaign this entity belongs to
- **name** (TEXT NOT NULL): Display name for entity
- **description** (TEXT): Rich text content (markdown or HTML)
- **core_status** (TEXT DEFAULT 'active'): Entity lifecycle state [active, archived, draft, hidden]
- **player_knowledge** (TEXT DEFAULT 'common_knowledge'): Information level for filtering [common_knowledge, player_known, secret, dm_only, <custom>, null]
- **tags** (TEXT): JSON array of tag strings for cross-cutting themes
- **created_at** (INTEGER NOT NULL): Unix timestamp of creation
- **updated_at** (INTEGER NOT NULL): Unix timestamp of last modification
- **custom_fields** (TEXT): JSON object for user-defined field extensions

**SETTING Type Entities:**

- **Lore Entry**: Historical events, mythology, cultural traditions
  - Category-specific fields: category, era_period, in_game_date, historical_accuracy
  - Connections: related_npcs, related_locations, related_factions (JSON arrays)

- **World Rule**: Magic systems, cosmology, physics, social structures
  - Category-specific fields: rule_type, exceptions
  - Connections: related_rules (JSON array, self-relation)

**LIVING WORLD Type Entities:**

- **NPC**: Non-player characters from shopkeepers to villains
  - Category-specific fields: race, class (JSON array), level, alignment, appearance, personality_traits, motivation, relationship_to_party
  - Explicit connections: faction_id (FK to factions)
  - JSON array connections: locations (array of location IDs)
  - DM fields: dm_secrets, dm_plot_relevance

- **Location**: Geographic areas, settlements, dungeons, landmarks
  - Category-specific fields: location_type, population, cultural_characteristics
  - Explicit connections: parent_location_id (self-FK for hierarchy)
  - JSON array connections: notable_npcs, factions_present, connected_locations
  - DM fields: dm_secrets

- **Faction**: Guilds, kingdoms, cults, corporations
  - Category-specific fields: faction_type, power_level, resources, beliefs, goals, methods
  - Explicit connections: leader_id (FK to npcs)
  - JSON array connections: key_members, allied_factions, rival_factions, territory
  - DM fields: dm_true_agenda

- **Planar Force**: Deities, extraplanar entities (optional, default ON)
  - Category-specific fields: entity_type, domains (JSON array), alignment, worshiper_base, plane_of_origin
  - Explicit connections: high_priest_id (FK to npcs)
  - JSON array connections: allied_entities, rival_entities, religious_orders
  - DM fields: dm_true_nature

**CAMPAIGN Type Entities:**

- **Session Prep**: DM planning workspace - hypothetical content
  - Category-specific fields: planned_date, status, planned_events, possible_encounters, plot_hooks, dm_notes
  - One-way JSON connections: plot_threads, npcs_to_prep, locations_to_prep (arrays, not FKs)
  - Canon markers: is_canon=false, canonical_status='hypothetical'
  - Note: player_knowledge always 'dm_only'

- **Session Recap**: Canonical record of what actually happened
  - Category-specific fields: session_date, in_game_date_start, in_game_date_end, time_passed, summary, key_events, player_decisions
  - JSON array connections: npcs_encountered, locations_visited, quests_progressed, loot_acquired
  - Canon markers: is_canon=true, canonical_status='canon'
  - DM fields: dm_consequences, dm_behind_scenes

- **Quest**: Mission tracking, narrative threads
  - Category-specific fields: status, objectives (JSON array), rewards
  - Explicit connections: quest_giver_id, started_session_id, completed_session_id (FKs to npcs and session_recaps)
  - JSON array connections: related_npcs, related_locations
  - DM fields: dm_true_objective, dm_consequences

- **Player Character**: PC roster and tracking
  - Category-specific fields: player_name, class (JSON array), level, race, background, personality, goals, backstory
  - JSON array connections: faction_affiliations, allied_npcs
  - DM fields: dm_secrets, dm_plot_threads, dm_true_motivation, dm_consequences

**EXTENDED Type Entities:**

- **Custom Mechanic**: House rules, homebrew systems
  - Category-specific fields: mechanic_type, rules_text, prerequisites, source
  - Connections: related_rules (JSON array, self-relation)

- **Item**: Weapons, armor, consumables, artifacts
  - Category-specific fields: item_type, rarity, properties, value
  - Explicit connections: owner_npc_id, owner_pc_id, location_id (FKs for ownership)
  - DM fields: dm_secret_properties, dm_true_nature

- **Creature**: Bestiary - creatures separate from NPCs (optional, default OFF)
  - Category-specific fields: creature_type, challenge_rating, abilities
  - Connections: habitats (JSON array of location IDs)
  - DM fields: dm_behavior_notes

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs) - kept to data model and API behavior
- [x] Focused on user value and business needs - enables structured campaign content with AI-friendly schemas
- [x] Written for non-technical stakeholders - uses plain language descriptions
- [x] All mandatory sections completed - User Scenarios, Requirements, Key Entities present

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain - All 3 clarifications resolved (FR-056, FR-030, FR-072)
- [x] Requirements are testable and unambiguous - 75 functional requirements with clear acceptance criteria
- [x] Success criteria are measurable - performance targets specified (FR-073, FR-074, FR-075)
- [x] Scope is clearly bounded - NO UI, NO knowledge graphs, API layer only
- [x] Dependencies and assumptions identified - depends on existing campaigns table, information_levels table (Feature 004)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (3 clarifications)
- [x] User scenarios defined
- [x] Requirements generated (75 FRs)
- [x] Entities identified (13 categories + universal fields)
- [x] Review checklist passed - All clarifications resolved

---

## Dependencies and Assumptions

**Dependencies:**
- Existing `campaigns` table (from Feature 002)
- Existing `information_levels` table (from Feature 004) for custom player_knowledge values
- Existing `knowledge_graphs` table (Feature 005/006) - not modified by this feature, but session_recaps will eventually feed Campaign-Story graph in Feature 015

**Assumptions:**
- Campaign IDs are TEXT (UUID format)
- User IDs from Keycloak are available for ownership/audit (via campaigns.user_id)
- SQLite JSON1 extension is enabled for json_extract queries
- Frontend (Feature 015) will handle UI for entity CRUD - this feature provides API only
- Knowledge graph population (Feature 006/015) will read from these tables - this feature does not populate graphs
- Wiki (cards table) remains separate and is not affected by this feature - Wiki is optional portal feature for GMs (Feature 018), NOT part of canon context system

**Non-Goals:**
- User interface for entity management (that's Feature 014)
- Knowledge graph creation or visualization (that's Feature 015)
- Campaign setup wizard (that's Feature 016)
- Wiki linking or integration (future)
- Migration tool for existing cards data (future, not v1)
- Junction tables for complex many-to-many relationships (use JSON arrays for v1, optimize later if needed)
- Real-time collaboration or live updates (out of scope for local prototype)

---

## Clarification Resolutions

All 3 open questions have been resolved:

1. **Custom Field Definitions Storage** (FR-056) - ✓ RESOLVED
   - **Decision**: Option A - Create separate `custom_field_definitions` table
   - **Rationale**: Better queryability and schema validation compared to storing in campaign settings JSON or inline
   - **Impact**: FR-056 updated to specify separate table with columns: campaign_id, category, field_name, field_label, field_type, options (JSON)

2. **Session Prep One-Way Enforcement** (FR-030) - ✓ RESOLVED
   - **Decision**: Option B + Option C - API-level validation AND MCP middleware enforcement
   - **Rationale**: Defense in depth approach ensures hypothetical session prep cannot update canonical entities at both API and MCP tool layers
   - **Impact**: FR-030 specifies prevention of canonical updates from prep sources via dual-layer validation

3. **Cards Table Migration** (FR-072) - ✓ RESOLVED
   - **Decision**: Option A - Leave cards table untouched (blank slate approach)
   - **Rationale**: No user content to migrate (existing test data doesn't need preservation), new campaigns use structured tables, both systems can coexist
   - **Impact**: FR-072 updated to specify no data migration - schema migrations create new tables, data migration does not occur

---

**References:**
- Architecture document: `specs/Architecture-Updates.md`
- Complete SQL schemas for all 13 tables documented in Architecture-Updates.md lines 162-855
- Universal field requirements in Architecture-Updates.md lines 858-879
- Relationship system design in Architecture-Updates.md lines 882-938
- Information filtering rules in Architecture-Updates.md lines 992-1042
- Session prep vs canon isolation in Architecture-Updates.md lines 1045-1109
