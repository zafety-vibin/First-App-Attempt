/**
 * MCP Tools Registry (Updated for Feature 014 Category Tables)
 * Central registry for all MCP tools with their definitions and dispatch logic
 */

import {
  wikiToolDefinitions,
  handleReadCard,
  handleCreateCard,
  handleUpdateCard,
  handleDeleteCard,
  handleSearchCards,
  handleMoveCard,
  handleGetCardPath,
  handleGetSubtree,
  handleListChildren,
  handleGetSiblings,
  handleGetAncestor
} from './wiki-tools';

import {
  graphToolDefinitions,
  handleQueryGraph,
  handleListGraphNodes,
  handleGetNodeRelationships,
  handleUpdateGraph
} from './graph-tools';

import {
  infoLevelToolDefinitions,
  handleListInformationLevels,
  handleGetInformationLevelByName
} from './info-level-tools';

// Category tools for Feature 014 database tables
import {
  handleQueryCategory,
  handleCreateCategoryEntry,
  handleUpdateCategoryEntry,
  handleDeleteCategoryEntry,
  handleNavigateHierarchy
} from './category-tools';

import {
  bibleTool,
  handleGetCampaignBible
} from './campaign-bible-tools';

/**
 * Tool definitions for NEW category tools (Feature 014 integration)
 */
export const categoryToolDefinitions = [
  {
    name: 'query_category',
    description: `Query entities from the 13 category database tables.

## WHAT THIS QUERIES:
The 13 structured category databases (Feature 014) - NOT the wiki cards.

These are your campaign's structured data: NPCs with stats, Locations with hierarchies,
Factions with power levels, etc. Think relational database tables, not freeform notes.

## WIKI vs DATABASES:
- **Wiki (use wiki-tools)**: Freeform narrative pages in tree structure (read_card, search_cards)
- **Databases (use category-tools)**: Structured entities with defined fields (query_category)

Example: "Galik Emberfuse the wizard" could be:
- Wiki card: Narrative bio page with rich text backstory, nested under "NPCs" folder
- NPC database entry: Level 12 Human Wizard, Accord faction, 45 HP, structured data

**When to use which:**
- Read character backstory → read_card (wiki)
- Query all wizards in a faction → query_category (database)
- Update narrative notes → update_card (wiki)
- Change NPC's faction/level → update_category_entry (database)

## 13 CATEGORIES AVAILABLE:

**npcs** - Characters (allies, enemies, contacts)
**locations** - Places with parent-child hierarchies (cities > districts > buildings)
**factions** - Organizations (guilds, kingdoms, criminal syndicates)
**session_recaps** - Canonical session records (what happened, session 1, 2, 3...)
**quests** - Mission tracking (not_started, in_progress, completed, failed)
**player_characters** - PC roster (separate from NPCs for clarity)
**lore_entries** - Historical knowledge (legends, creation myths, ancient wars)
**world_rules** - Magic systems, cosmology, physics (how the world works)
**planar_forces** - Deities, cosmic entities, outer plane powers
**session_prep** - DM planning notes (always dm_only, hidden from players)
**custom_mechanics** - House rules (homebrew systems, campaign-specific mechanics)
**items** - Equipment with ownership tracking (magic items, artifacts, inventory)
**creatures** - Bestiary with stat blocks (templates for encounters)

## UNIVERSAL FIELDS (ALL 13 CATEGORIES):

These 10 fields exist on EVERY category entity:

**id**: string (UUID format: "32391c9e-1d22-49d1-afdd-6a2b3fa4ebb1" OR legacy: "npc-elara")
  - Auto-generated, immutable
  - USE THIS EXACT VALUE for update_category_entry and delete_category_entry
  - Never guess the format - always query first

**campaign_id**: string (UUID format: "1ceec234-523b-4e25-a0b5-097c71018be5")
  - Auto-populated, validates campaign ownership
  - Ensures entities are isolated per campaign
  - Immutable after creation

**name**: string (max 255 chars, searchable via 'search' parameter)
  - Required on creation
  - Display name for the entity (e.g., "Elara Moonwhisper", "Temple of Light")

**description**: string (markdown supported, searchable via 'search' parameter)
  - Rich text content, can be multi-paragraph
  - Indexed for full-text search

**core_status**: enum ['active', 'archived', 'draft', 'hidden']
  - active: Current/relevant entities (default)
  - archived: Historical/retired entities (old NPCs, completed quests)
  - draft: Work-in-progress (not finalized)
  - hidden: Soft-deleted (can be restored)

**player_knowledge**: enum ['common_knowledge', 'player_knowledge', 'dm_only', custom]
  - common_knowledge: Public info everyone knows (main towns, common NPCs)
  - player_knowledge: Players discovered in-game (quest clues, met NPCs)
  - dm_only: Hidden from player_view (secret factions, plot twists, NPC secrets)
  - custom: User-defined levels (e.g., "party_leader_only", "cleric_visions")
  - Affects view_mode filtering (see examples below)

**tags**: array of strings (max 50 tags, filterable but NOT via exact match)
  - Cross-cutting themes for organization
  - Example: ["merchant", "informant", "dwarf"]
  - NOTE: filters={"tags": "merchant"} NOT supported - query all then filter client-side

**custom_fields**: object (arbitrary JSON for campaign-specific data)
  - User-defined extensions (e.g., {"honor_points": 50, "reputation": "feared"})
  - NOT searchable or filterable in v1
  - Schema-less, any valid JSON

**created_at**: number (unix timestamp, auto-set on creation, immutable)
  - Example: 1729622400 (2024-10-22 12:00:00 UTC)
  - Sortable via sort="created_at" or sort="-created_at"

**updated_at**: number (unix timestamp, auto-updated on every change)
  - Refreshes even if you only change one field
  - Useful for "recently modified" queries

## CATEGORY-SPECIFIC FIELDS:

### NPCs (Characters):
- **race**: string (e.g., "Human", "Elf", "Dwarf", "Tiefling", "Half-Orc")
- **class**: array of strings (e.g., ["Wizard"], ["Fighter", "Rogue"] for multiclass)
- **level**: number (1-20, optional for non-leveled NPCs like commoners)
- **alignment**: string (e.g., "Lawful Good", "Chaotic Neutral", "True Neutral")
- **appearance**: string (physical description, scars, clothing)
- **personality_traits**: string (mannerisms, speech patterns)
- **motivation**: string (goals, desires, what drives them)
- **relationship_to_party**: string (ally, enemy, neutral, complicated)
- **met_party**: boolean (true if players encountered this NPC)
- **art**: string (URL to character portrait, optional)
- **faction_id**: string | null (references factions.id, nullable, CASCADE on delete)
- **superior_npc_id**: string | null (references npcs.id for org chart, nullable, SET NULL on delete)
- **dm_secrets**: string (ALWAYS filtered in player_view, even if player_knowledge="common")
- **dm_plot_relevance**: string (DM notes on story role, filtered in player_view)

### Locations (Places):
- **location_type**: string (e.g., "city", "tavern", "dungeon", "wilderness", "landmark")
- **population**: number (approximate, e.g., 5000 for a town)
- **parent_location_id**: string | null (references locations.id for hierarchy, SET NULL on delete)
  - Enables tree structure: "Galik" > "Docks District" > "The Rusty Anchor"
  - Use navigate_category_hierarchy to traverse
- **cultural_characteristics**: string (architecture, customs, atmosphere)
- **dm_secrets**: string (hidden plot hooks, secret passages, filtered in player_view)

### Factions (Organizations):
- **faction_type**: string (e.g., "guild", "kingdom", "criminal", "religious", "military")
- **power_level**: string (e.g., "local", "regional", "global", "cosmic")
- **leader_id**: string | null (references npcs.id, nullable, SET NULL on delete)
- **beliefs**: string (ideology, values, what they stand for)
- **goals**: string (short-term and long-term objectives)
- **methods**: string (how they operate, tactics)
- **key_members**: array of NPC IDs (JSON array, NOT a foreign key, no cascade)
- **dm_true_agenda**: string (hidden motives, filtered in player_view)

### Quests (Missions):
- **status**: enum ['not_started', 'in_progress', 'completed', 'failed']
- **objectives**: array of strings (e.g., ["Find the thieves", "Recover artifact"])
- **quest_giver_id**: string | null (references npcs.id, SET NULL on delete)
- **started_session_id**: string | null (references session_recaps.id, SET NULL on delete)
- **completed_session_id**: string | null (references session_recaps.id, SET NULL on delete)
- **faction_id**: string | null (quest related to this faction, SET NULL on delete)
- **dm_true_objective**: string (real goal vs apparent goal, filtered in player_view)

### SessionRecaps (Canonical Records):
- **session_number**: number (required, unique per campaign, e.g., 1, 2, 3...)
- **session_date**: number (unix timestamp of when session occurred)
- **summary**: string (what happened this session)
- **key_events**: string (major plot points, decisions)
- **npcs_encountered**: array of NPC IDs (JSON array, who the party met)
- **locations_visited**: array of location IDs (JSON array, where they went)
- **dm_consequences**: string (unseen effects, future hooks, filtered in player_view)

### PlayerCharacters (PC Roster):
- **player_name**: string (real-world player name, e.g., "Alice")
- **race**: string (same as NPCs)
- **class**: array of strings (multiclass support)
- **level**: number (1-20)
- **background**: string (character backstory, public knowledge)
- **personality**: string (traits, quirks)
- **backstory_secrets**: string (hidden character secrets, filtered in player_view unless PC's player)

### LoreEntries (Historical Knowledge):
- **lore_type**: string (e.g., "legend", "historical_event", "creation_myth")
- **time_period**: string (e.g., "Age of Dragons", "First Era", "2000 years ago")
- **reliability**: string (e.g., "confirmed", "legend", "rumor", "speculation")
- **dm_truth**: string (what actually happened, filtered in player_view)

### WorldRules (Magic Systems, Cosmology):
- **rule_type**: string (e.g., "magic_system", "physics", "cosmology", "divine_law")
- **scope**: string (e.g., "universal", "regional", "situational")
- **implications**: string (how this affects gameplay)
- **dm_exceptions**: string (hidden mechanics, filtered in player_view)

### PlanarForces (Deities, Cosmic Entities):
- **entity_type**: string (e.g., "deity", "demon_lord", "archfey", "primordial")
- **domain**: string (e.g., "war", "knowledge", "nature", "chaos")
- **power_level**: string (e.g., "greater_deity", "lesser_deity", "demigod")
- **worshipers**: string (who follows them)
- **dm_true_nature**: string (hidden aspects, filtered in player_view)

### SessionPrep (DM Planning):
- **planned_events**: string (what you plan to run)
- **encounter_prep**: string (combat encounters, stat blocks)
- **npcs_to_prep**: array of NPC IDs (who to review)
- **dm_notes**: string (additional reminders)
- NOTE: player_knowledge ALWAYS "dm_only" (enforced automatically)

### CustomMechanics (House Rules):
- **mechanic_type**: string (e.g., "combat", "skill_check", "magic", "downtime")
- **rules_text**: string (how the mechanic works)
- **examples**: string (clarifying examples)

### Items (Equipment):
- **item_type**: string (e.g., "weapon", "armor", "consumable", "magic_item", "artifact")
- **rarity**: string (e.g., "common", "uncommon", "rare", "legendary")
- **owned_by**: string | null (references npcs.id OR player_characters.id, nullable)
- **properties**: string (mechanical effects, stats)
- **dm_hidden_properties**: string (unidentified effects, curses, filtered in player_view)

### Creatures (Bestiary):
- **creature_type**: string (e.g., "humanoid", "undead", "dragon", "aberration")
- **challenge_rating**: number (e.g., 0.25, 1, 5, 20)
- **stat_block**: string (HP, AC, attacks, abilities - or link to external source)
- **behavior**: string (tactics, personality)
- **dm_tactics**: string (advanced strategies, filtered in player_view)

## SEARCH vs FILTERS - CRITICAL DIFFERENCE:

**'search' parameter** (case-INsensitive substring matching):
- Searches ONLY 'name' and 'description' fields
- Example: search="temple" matches "Temple of Light", "old temple", "TEMPLE RUINS"
- Use when: You know part of the name but not the exact spelling
- Limitation: Does NOT search custom_fields or category-specific fields

**'filters' parameter** (EXACT matching, case-sensitive for strings):
- Matches ANY field with exact values
- String fields: Exact match only (filters={"name": "Galik Emberfuse"} won't match "Galik")
- Number fields: Exact value (filters={"level": 12} matches level 12 only, no ranges in v1)
- Null values: filters={"faction_id": null} finds unaffiliated NPCs
- Array fields: NOT supported for contains logic (limitation - can't check if tags includes "merchant")
- Example: filters={"faction_id": "faction-accord", "core_status": "active"}
- Use when: You have exact IDs, enum values, or numeric values

**Combining both**: search acts as additional AND filter
Example:
{
  "search": "wizard",           // Searches name/description for "wizard"
  "filters": {
    "faction_id": "accord-id",  // AND faction matches exactly
    "core_status": "active"     // AND status matches exactly
  }
}

## RECOMMENDED WORKFLOW:

Step 1: Broad search first
→ Use 'search' to find entities by name/description
→ Example: search="merchant" to find all merchant NPCs

Step 2: Note the exact 'id' from results
→ IDs come in 2 formats:
  • UUID: "32391c9e-1d22-49d1-afdd-6a2b3fa4ebb1"
  • Legacy: "npc-elara", "faction-accord", "notion-npc-..."
→ IDs are CASE-SENSITIVE and format-specific

Step 3: Use exact IDs for filters/updates
→ filters={"id": "exact-id-from-step-1"}
→ Or pass to update_category_entry(entry_id="exact-id")

## COMMON MISTAKES:

❌ Using search for exact ID: search="npc-elara" might not work (searches name/description only)
   ✅ Use filters instead: filters={"id": "npc-elara"}

❌ Expecting substring match in filters: filters={"name": "Elar"} won't match "Elara"
   ✅ Use search for substring: search="Elar"

❌ Case-sensitive search: search="TEMPLE" won't match "temple"
   ✅ Search is case-insensitive, works automatically

❌ Not checking pagination: Assuming all results returned (default limit=50)
   ✅ Check pagination.total_pages, fetch additional pages if needed

❌ Filtering by tags: filters={"tags": "merchant"} NOT supported
   ✅ Query all, then filter client-side: entries.filter(e => e.tags.includes("merchant"))

❌ Range queries: filters={"level": ">10"} NOT supported
   ✅ Query all, filter client-side: entries.filter(e => e.level > 10)

## EXAMPLES:

<example description="Find all NPCs in The Accord faction (exact filter)">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "filters": {
    "faction_id": "faction-accord"
  }
}
Returns: All NPCs with faction_id exactly matching "faction-accord"
</example>

<example description="Search for NPCs with 'merchant' in name or description">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "search": "merchant"
}
Returns: "Marcus the Merchant", "Merchant Guild Leader", NPC with "traveling merchant" in description
</example>

<example description="Get all active quests, sorted newest first">
{
  "category": "quests",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "filters": {
    "core_status": "active"
  },
  "sort": "-created_at",
  "limit": 20
}
Returns: Active quests in reverse chronological order (newest first)
</example>

<example description="Find specific NPC by exact ID">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "filters": {
    "id": "npc-elara"
  }
}
Returns: Single NPC with id="npc-elara" (or empty array if not found)
</example>

<example description="Get player-visible factions (hides DM secrets)">
{
  "category": "factions",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "view_mode": "player_view"
}
Returns: Factions where player_knowledge != "dm_only", with dm_* fields stripped
</example>

<example description="Get recent session recaps (replaces old recap-tools)">
{
  "category": "session_recaps",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "sort": "-session_number",
  "limit": 10
}
Returns: Last 10 sessions in reverse order (session 15, 14, 13...)
</example>

<example description="Find locations with 'temple' in name/description">
{
  "category": "locations",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "search": "temple",
  "limit": 20
}
Returns: "Temple of Light", "Ancient Temple Ruins", location with "temple district" in description
</example>

<example description="Find high-level wizards (requires client-side filtering)">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "filters": {
    "class": "Wizard"
  }
}
Note: Returns all Wizards (class array contains "Wizard"), then filter client-side for level > 10
Limitation: level filtering not supported (exact match only in v1)
</example>

<example description="Paginate through large NPC list">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "limit": 20,
  "page": 2
}
Returns: NPCs 21-40 out of 56 total
Check pagination.total_pages to know if more pages exist
</example>

## ERROR SCENARIOS:

**VALIDATION_ERROR**: Invalid input parameters
- Typo in category name: category="npc" should be category="npcs" (plural)
- Malformed UUID: campaign_id="1234" instead of "1ceec234-523b-4e25-a0b5-097c71018be5"
- Invalid enum: filters={"core_status": "Active"} should be "active" (lowercase)
- Out of range: limit=200 exceeds maximum 100

**NOT_FOUND**: Campaign doesn't exist or user doesn't own it
- Wrong campaign_id (copy from campaign list, don't guess)
- Campaign was deleted
- User doesn't have access (ownership validation failed)

**QUERY_FAILED**: Database error during execution
- Circular reference in hierarchy (location.parent_location_id points to self)
- Constraint violation (foreign key references non-existent ID)
- Database locked (concurrent writes, retry after brief delay)

Common causes:
- Using wrong category name (exact match required, case-sensitive)
- Invalid filter field for that category (e.g., faction_id on locations table fails)
- Corrupted data from previous operations

## RETURN FORMAT:
{
  "category": "npcs",              // Echo of queried category
  "entries": [                     // Array of matching entities (empty if no matches)
    {
      // Universal fields (all categories)
      "id": "npc-elara",             // ← USE THIS EXACT VALUE for updates
      "campaign_id": "1ceec234-...",
      "name": "Elara Moonwhisper",
      "description": "An elven ranger and skilled tracker",
      "core_status": "active",
      "player_knowledge": "common_knowledge",
      "tags": ["ranger", "elf", "ally"],
      "custom_fields": {},
      "created_at": 1729622400,
      "updated_at": 1729622400,

      // NPC-specific fields
      "race": "Elf",
      "class": ["Ranger"],
      "level": 8,
      "alignment": "Neutral Good",
      "appearance": "Tall, dark hair, green cloak",
      "personality_traits": "Quiet, observant, loyal",
      "motivation": "Protect the forest",
      "relationship_to_party": "Ally and guide",
      "met_party": true,
      "art": null,
      "faction_id": "faction-accord",
      "superior_npc_id": null,
      "dm_secrets": "Actually a spy for...",  // ← Filtered if view_mode="player_view"
      "dm_plot_relevance": "Will betray party in Act 3"  // ← Filtered in player_view
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 56,                   // Total matching entities across all pages
    "total_pages": 2               // ← Check this to know if more data exists
  },
  "execution_time_ms": 45          // Query performance metric (Feature 014 targets <100ms)
}

**Empty Results** (no matches):
{
  "category": "npcs",
  "entries": [],                   // Empty array, NOT null
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "total_pages": 0
  },
  "execution_time_ms": 12
}`,
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['npcs', 'locations', 'factions', 'session_recaps', 'quests', 'player_characters', 'lore_entries', 'world_rules', 'planar_forces', 'session_prep', 'custom_mechanics', 'items', 'creatures'],
          description: 'Category table to query'
        },
        campaign_id: {
          type: 'string',
          format: 'uuid',
          description: 'Campaign UUID'
        },
        filters: {
          type: 'object',
          description: 'Filter conditions (e.g., {"faction_id": "...", "core_status": "active"})',
          additionalProperties: true
        },
        page: {
          type: 'number',
          minimum: 1,
          default: 1
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 50
        },
        sort: {
          type: 'string',
          description: 'Sort field (prefix with - for descending, e.g., "-created_at")'
        },
        view_mode: {
          type: 'string',
          enum: ['dm_view', 'player_view'],
          default: 'dm_view',
          description: 'Information filtering mode'
        },
        search: {
          type: 'string',
          description: 'Full-text search in name and description'
        }
      },
      required: ['category', 'campaign_id']
    }
  },
  {
    name: 'create_category_entry',
    description: `Create a new entity in any of the 13 category tables.

## AUTO-POPULATED FIELDS (never provide these):
- id: Auto-generated UUID or legacy format
- campaign_id: Auto-set from parameter
- created_at: Unix timestamp (auto-generated)
- updated_at: Unix timestamp (same as created_at initially)

## UNIVERSAL FIELDS (all 13 categories):

**REQUIRED**:
- name: string (max 255 chars) - Display name for the entity

**OPTIONAL**:
- description: string (markdown supported) - Rich text content
- core_status: enum ['active', 'archived', 'draft', 'hidden'] - Default: 'active'
- player_knowledge: enum ['common_knowledge', 'player_knowledge', 'dm_only', custom] - Default: 'common_knowledge'
- tags: array of strings - Cross-cutting themes for filtering
- custom_fields: object - User-defined extensions

## CATEGORY-SPECIFIC FIELDS:

**NPCs** (Characters):
- race: string (e.g., "Human", "Elf", "Dwarf")
- class: array (e.g., ["Wizard"], ["Fighter", "Rogue"])
- level: number (1-20)
- alignment: string (e.g., "Lawful Good", "Chaotic Neutral")
- faction_id: string (references factions.id)
- superior_npc_id: string (references npcs.id for chain of command)
- appearance, personality_traits, motivation: strings
- dm_secrets, dm_plot_relevance: strings (DM-only fields)

**Locations** (Places):
- location_type: string (e.g., "city", "tavern", "dungeon")
- population: number
- parent_location_id: string (references locations.id for hierarchy)
- cultural_characteristics: string
- dm_secrets: string (hidden from player view)

**Factions** (Organizations):
- faction_type: string (e.g., "guild", "kingdom", "criminal")
- power_level: string (e.g., "local", "regional", "global")
- leader_id: string (references npcs.id)
- beliefs, goals, methods: strings
- key_members: array of npc ids
- dm_true_agenda: string (hidden motives)

**Quests** (Missions):
- status: enum ['not_started', 'in_progress', 'completed', 'failed']
- objectives: array of strings
- quest_giver_id: string (references npcs.id)
- started_session_id, completed_session_id: strings (references session_recaps.id)
- faction_id: string (optional, quest related to faction)
- dm_true_objective: string (real goal vs apparent goal)

**SessionRecaps** (Canonical records):
- session_number: number (required, e.g., 1, 2, 3...)
- session_date: number (unix timestamp)
- summary: string (what happened)
- key_events: string
- npcs_encountered, locations_visited: arrays
- dm_consequences: string (unseen effects)

## WORKFLOW:

Before creating, consider querying to avoid duplicates:
1. query_category with search to check if similar entity exists
2. If not found, proceed with creation
3. Note the returned 'id' for future updates

## COMMON MISTAKES:

❌ Providing id field: id will be auto-generated, your value ignored
   ✅ Never include id in data

❌ Wrong enum value: core_status="Active" (capital A) will fail
   ✅ Use lowercase: "active", "archived", "draft", "hidden"

❌ String for array field: class="Wizard" instead of class=["Wizard"]
   ✅ Arrays must be arrays, even for single values

❌ Invalid FK reference: faction_id="guild-123" when faction doesn't exist
   ✅ Query factions first to get valid IDs

❌ Creating session_prep without dm_only: player_knowledge="common"
   ✅ SessionPrep MUST have player_knowledge="dm_only" (enforced)

## EXAMPLES:

<example description="Create a merchant NPC in The Accord">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "data": {
    "name": "Garrik Ironforge",
    "description": "A dwarven blacksmith and weapons dealer",
    "race": "Dwarf",
    "class": ["Artificer"],
    "level": 6,
    "faction_id": "faction-accord",
    "tags": ["merchant", "blacksmith", "dwarf"],
    "player_knowledge": "common_knowledge"
  }
}
</example>

<example description="Create a child location (tavern in a district)">
{
  "category": "locations",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "data": {
    "name": "The Rusty Anchor",
    "description": "A weathered tavern popular with dock workers",
    "location_type": "tavern",
    "parent_location_id": "location-docks-district",
    "population": 50
  }
}
</example>

<example description="Create a new quest given by an NPC">
{
  "category": "quests",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "data": {
    "name": "Retrieve the Lost Artifact",
    "description": "Marcus needs someone to recover a stolen heirloom",
    "status": "not_started",
    "objectives": ["Find the thieves", "Recover the artifact", "Return to Marcus"],
    "quest_giver_id": "npc-marcus",
    "faction_id": "faction-thieves-guild"
  }
}
</example>

<example description="Create a DM-only session prep note">
{
  "category": "session_prep",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "data": {
    "name": "Session 16 Prep",
    "description": "Elara's betrayal reveal",
    "planned_events": "Elara reveals she's been spying, party confrontation",
    "dm_notes": "Have backup if party kills her - sister can take her place",
    "npcs_to_prep": ["npc-elara", "npc-elara-sister"]
  }
}
Note: player_knowledge automatically set to "dm_only" for session_prep
</example>

## RETURN FORMAT:
{
  "category": "npcs",
  "created_entry": {
    "id": "32391c9e-1d22-49d1-afdd-6a2b3fa4ebb1",  // ← Newly generated ID
    "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
    "name": "Garrik Ironforge",
    "description": "A dwarven blacksmith...",
    "core_status": "active",  // ← Auto-defaulted
    "created_at": 1729708800,  // ← Auto-generated
    "updated_at": 1729708800,  // ← Auto-generated
    ... all fields from data parameter
  },
  "execution_time_ms": 32
}`,
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['npcs', 'locations', 'factions', 'session_recaps', 'quests', 'player_characters', 'lore_entries', 'world_rules', 'planar_forces', 'session_prep', 'custom_mechanics', 'items', 'creatures']
        },
        campaign_id: {
          type: 'string',
          format: 'uuid'
        },
        data: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            core_status: { type: 'string', enum: ['active', 'archived', 'draft', 'hidden'] },
            player_knowledge: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            custom_fields: { type: 'object' }
          },
          required: ['name'],
          additionalProperties: true
        }
      },
      required: ['category', 'campaign_id', 'data']
    }
  },
  {
    name: 'update_category_entry',
    description: `Update an existing entity with partial field updates.

## CRITICAL WORKFLOW - MUST FOLLOW:

Step 1: ALWAYS query first to get the exact 'id'
→ Use query_category with search or filters
→ Example: query_category(category="npcs", search="Elara")

Step 2: Extract the 'id' field from results
→ Could be UUID: "32391c9e-1d22-49d1-afdd-6a2b3fa4ebb1"
→ Could be legacy: "npc-elara", "faction-accord"
→ MUST use exact value - do not modify or guess format

Step 3: Call update_category_entry with that exact id
→ Only include fields you want to change
→ updated_at timestamp auto-refreshes

## WHAT GETS UPDATED:
- Only fields you provide in 'updates' parameter
- All other fields remain unchanged
- updated_at always auto-refreshes (even if not in updates)
- id, campaign_id, created_at CANNOT be changed

## PARTIAL UPDATE BEHAVIOR:
- updates={"description": "new text"} → ONLY description changes
- updates={"tags": ["new"]} → Completely REPLACES tags array
- updates={"custom_fields": {"key": "val"}} → Completely REPLACES custom_fields
- To append to arrays: Query first, merge in code, then update

## COMMON MISTAKES:

❌ Using name instead of id: updates with entry_id="Elara" will fail
   ✅ Query first, use exact id: entry_id="npc-elara"

❌ Guessing ID format: entry_id="npc-123" when actual is "notion-npc-123"
   ✅ Always query first to get exact id

❌ Trying to change id/campaign_id/created_at
   ✅ These fields are immutable, will be ignored

❌ Expecting array merge: tags=["new"] won't append to existing
   ✅ Arrays are replaced, not merged - query first if you need to append

## EXAMPLES:

<example description="Update NPC description only (partial update)">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "entry_id": "npc-elara",
  "updates": {
    "description": "An elven ranger and skilled tracker, recently promoted to scout captain"
  }
}
Result: Only description changes, all other fields stay the same
</example>

<example description="Change NPC faction and alignment">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "entry_id": "npc-marcus",
  "updates": {
    "faction_id": "faction-thieves-guild",
    "alignment": "Chaotic Neutral",
    "tags": ["merchant", "informant", "smuggler"]
  }
}
Result: faction_id, alignment, and tags updated; race, class, level, etc. unchanged
</example>

<example description="Mark quest as completed">
{
  "category": "quests",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "entry_id": "quest-dragon-hunt",
  "updates": {
    "status": "completed",
    "completed_session_id": "session-recap-15"
  }
}
</example>

<example description="Update DM secrets (won't affect player view)">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "entry_id": "npc-elara",
  "updates": {
    "dm_secrets": "Actually a doppelganger replaced the real Elara 3 sessions ago",
    "dm_plot_relevance": "Will reveal true identity during climax"
  }
}
</example>

## RETURN FORMAT:
{
  "category": "npcs",
  "updated_entry": {
    "id": "npc-elara",
    ... full entity with updated fields,
    "updated_at": 1729708800  // ← Auto-refreshed timestamp
  },
  "execution_time_ms": 28
}

## ERROR HANDLING:

UPDATE_FAILED with "not found":
→ The entry_id doesn't exist or was deleted
→ Query the category first to verify it exists

CONSTRAINT_VIOLATION with "references non-existent":
→ Foreign key validation failed (e.g., faction_id points to deleted faction)
→ Query the related category first to get valid IDs`,
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['npcs', 'locations', 'factions', 'session_recaps', 'quests', 'player_characters', 'lore_entries', 'world_rules', 'planar_forces', 'session_prep', 'custom_mechanics', 'items', 'creatures']
        },
        campaign_id: {
          type: 'string',
          format: 'uuid'
        },
        entry_id: {
          type: 'string',
          format: 'uuid',
          description: 'Entity ID to update'
        },
        updates: {
          type: 'object',
          description: 'Partial updates (only fields to change)',
          additionalProperties: true
        }
      },
      required: ['category', 'campaign_id', 'entry_id', 'updates']
    }
  },
  {
    name: 'delete_category_entry',
    description: `Delete an entity with two-phase confirmation (Feature 018).

## TWO-PHASE DELETE WORKFLOW:

Prevents accidental deletions by requiring explicit confirmation with time-limited token.

**Phase 1: Preview (confirm=false, default)**
→ Returns impact analysis: what references will be affected
→ Generates 60-second confirmation token
→ NO actual deletion occurs

**Phase 2: Execute (confirm=true with token)**
→ Validates token (expires after 60s)
→ Actually deletes the entity
→ Returns list of affected references (what was CASCADE deleted or SET NULL)

## WHY TWO PHASES?

Deleting entities can have cascading effects:
- Delete a faction → All NPCs in that faction lose their faction_id (SET NULL)
- Delete a location → All child locations become orphaned (SET NULL)
- Delete an NPC → All quests with that quest_giver lose their giver (SET NULL)
- Delete a campaign → ALL entities CASCADE deleted (this tool doesn't allow campaign deletion)

Phase 1 shows you the impact BEFORE you commit.

## FOREIGN KEY CASCADE BEHAVIORS:

**CASCADE (parent deletion deletes children):**
- Campaign deletion → All entities in that campaign (but you can't delete campaigns via this tool)

**SET NULL (parent deletion orphans children):**
- Faction deletion → NPC.faction_id set to null
- Location deletion → Location.parent_location_id set to null (child locations orphaned)
- NPC deletion → NPC.superior_npc_id set to null (reporting structure broken)
- NPC deletion → Quest.quest_giver_id set to null
- SessionRecap deletion → Quest.started_session_id / completed_session_id set to null

**NO CASCADE (array references not enforced):**
- NPC deletion doesn't affect Faction.key_members array (cleanup required manually)
- Location deletion doesn't affect SessionRecap.locations_visited array

## WORKFLOW EXAMPLE:

**Step 1: Request deletion preview**
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "entry_id": "npc-marcus"
}

**Returns:**
{
  "category": "npcs",
  "entry_id": "npc-marcus",
  "entry_name": "Marcus the Merchant",
  "preview": true,
  "affected_references": [
    {
      "category": "quests",
      "field": "quest_giver_id",
      "count": 3,
      "example_ids": ["quest-retrieve-artifact", "quest-escort-caravan", "quest-find-thieves"]
    },
    {
      "category": "factions",
      "field": "key_members (array)",
      "count": 1,
      "note": "Manual cleanup required - arrays not auto-updated"
    }
  ],
  "confirmation_token": "del_8f7a9b2c...",  // ← Use this in Phase 2
  "token_expires_in_seconds": 60,
  "message": "Review affected references. Call again with confirm=true and this token to proceed."
}

**Step 2: Confirm deletion (within 60 seconds)**
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "entry_id": "npc-marcus",
  "confirm": true,
  "confirmation_token": "del_8f7a9b2c..."  // ← From Phase 1
}

**Returns:**
{
  "category": "npcs",
  "entry_id": "npc-marcus",
  "deleted": true,
  "affected_references": [
    {
      "category": "quests",
      "field": "quest_giver_id",
      "updated_count": 3,
      "action": "SET NULL"
    }
  ],
  "execution_time_ms": 87
}

## COMMON MISTAKES:

❌ Skipping Phase 1: confirm=true without getting token first
   ✅ Always call with confirm=false first to get token

❌ Token expired: Waiting >60 seconds between Phase 1 and 2
   ✅ Re-run Phase 1 to get a new token

❌ Wrong token: Copy-paste error, typo in token
   ✅ Copy exact token from Phase 1 response

❌ Expecting array cleanup: Assuming Faction.key_members auto-updates
   ✅ Manually query and update arrays after deletion

## EXAMPLES:

<example description="Phase 1: Preview deletion of a faction">
{
  "category": "factions",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "entry_id": "faction-thieves-guild"
}
Returns: Preview showing 12 NPCs will have faction_id set to null, token generated
</example>

<example description="Phase 2: Confirm deletion with token">
{
  "category": "factions",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "entry_id": "faction-thieves-guild",
  "confirm": true,
  "confirmation_token": "del_8f7a9b2c3d4e5f6a7b8c9d0e1f2a3b4c"
}
Returns: Faction deleted, 12 NPCs updated to faction_id=null
</example>

<example description="Phase 1: Preview deletion of location with children">
{
  "category": "locations",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "entry_id": "location-docks-district"
}
Returns: Preview showing 8 child locations (taverns, warehouses) will be orphaned
</example>

## ERROR SCENARIOS:

**VALIDATION_ERROR**:
- Missing confirmation_token when confirm=true
- Invalid token format
- Entity already deleted (between Phase 1 and 2)

**TOKEN_EXPIRED**:
- More than 60 seconds elapsed since Phase 1
- Solution: Re-run Phase 1 to get fresh token

**NOT_FOUND**:
- Entry doesn't exist (wrong entry_id)
- Campaign doesn't exist or user doesn't own it
- Entry was deleted by another process

**CONSTRAINT_VIOLATION**:
- Circular reference detected (shouldn't happen with SET NULL, but possible with data corruption)

## RETURN FORMATS:

**Phase 1 (Preview):**
{
  "category": "npcs",
  "entry_id": "npc-marcus",
  "entry_name": "Marcus the Merchant",
  "preview": true,
  "affected_references": [
    {
      "category": "quests",
      "field": "quest_giver_id",
      "count": 3,
      "example_ids": ["quest-1", "quest-2", "quest-3"]
    }
  ],
  "confirmation_token": "del_...",
  "token_expires_in_seconds": 60,
  "message": "Review affected references..."
}

**Phase 2 (Execution):**
{
  "category": "npcs",
  "entry_id": "npc-marcus",
  "deleted": true,
  "affected_references": [
    {
      "category": "quests",
      "field": "quest_giver_id",
      "updated_count": 3,
      "action": "SET NULL"
    }
  ],
  "execution_time_ms": 87
}`,
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['npcs', 'locations', 'factions', 'session_recaps', 'quests', 'player_characters', 'lore_entries', 'world_rules', 'planar_forces', 'session_prep', 'custom_mechanics', 'items', 'creatures']
        },
        campaign_id: {
          type: 'string',
          format: 'uuid'
        },
        entry_id: {
          type: 'string',
          format: 'uuid'
        },
        confirm: {
          type: 'boolean',
          default: false,
          description: 'Set to true to confirm deletion (Phase 2)'
        },
        confirmation_token: {
          type: 'string',
          description: 'Token from Phase 1 preview (required for Phase 2)'
        }
      },
      required: ['category', 'campaign_id', 'entry_id']
    }
  },
  {
    name: 'navigate_category_hierarchy',
    description: `Navigate parent-child relationships for Locations and NPCs.

## WHAT THIS DOES:

Traverses hierarchical relationships in two categories:

**Locations** (parent_location_id):
- "Galik" (city) > "Docks District" (district) > "The Rusty Anchor" (tavern)
- "Elyria" (continent) > "Whispering Woods" (forest) > "Ancient Ruins" (landmark)
- Use case: "Show me all locations inside Galik" or "What buildings are in the Docks District?"

**NPCs** (superior_npc_id):
- Organizational charts, chains of command
- "King Aldric" > "General Thorne" > "Captain Elara" > "Sergeant Marcus"
- Use case: "Who reports to General Thorne?" or "Show me the military hierarchy"

## HIERARCHY vs FLAT QUERIES:

**When to use navigate_category_hierarchy:**
- "Show me all taverns IN the Docks District" (parent-child relationship)
- "Who reports TO General Thorne?" (org chart)
- "What locations are INSIDE Galik?" (nested geography)

**When to use query_category instead:**
- "Show me all taverns" (flat filter: location_type="tavern")
- "Show me all NPCs in The Accord faction" (flat filter: faction_id="faction-accord")
- "Show me all high-level wizards" (flat filter + client-side filtering)

## DEPTH PARAMETER:

Controls how many levels deep to traverse (max 5):

**depth=1** (default): Direct children only
- Galik → [Docks District, Market District, Noble Quarter]

**depth=2**: Children + grandchildren
- Galik → [Docks District, Market District, Noble Quarter]
  - Docks District → [The Rusty Anchor, Warehouse 7, Harbor Master's Office]
  - Market District → [Bazaar Square, Merchant Guild Hall]
  - Noble Quarter → [Palace, High Temple, Noble Estates]

**depth=3+**: Great-grandchildren and beyond
- Full recursive tree traversal
- Use with caution on large hierarchies (performance impact)

## RETURN STRUCTURE:

Returns nested tree structure with children arrays:

{
  "category": "locations",
  "parent_id": "location-galik",
  "parent_name": "Galik",
  "depth_requested": 2,
  "children": [
    {
      "id": "location-docks",
      "name": "Docks District",
      "location_type": "district",
      "parent_location_id": "location-galik",
      ... all universal fields,
      "children": [  // ← Depth 2: grandchildren
        {
          "id": "location-rusty-anchor",
          "name": "The Rusty Anchor",
          "location_type": "tavern",
          "parent_location_id": "location-docks",
          ... all universal fields,
          "children": []  // ← No great-grandchildren
        }
      ]
    }
  ],
  "total_descendants": 15,  // ← Total entities across all levels
  "execution_time_ms": 67
}

## COMMON USE CASES:

<example description="Get all direct child locations of Galik (depth=1)">
{
  "category": "locations",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": "location-galik",
  "depth": 1
}
Returns: [Docks District, Market District, Noble Quarter] with empty children arrays
</example>

<example description="Get full location tree under Galik (depth=3)">
{
  "category": "locations",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": "location-galik",
  "depth": 3
}
Returns: Nested tree with districts, buildings, rooms (3 levels deep)
</example>

<example description="Get NPCs who report to General Thorne (depth=1)">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": "npc-general-thorne",
  "depth": 1
}
Returns: [Captain Elara, Captain Brutus, Lieutenant Garrik] with empty children arrays
</example>

<example description="Get full military chain of command (depth=3)">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": "npc-king-aldric",
  "depth": 3
}
Returns: King > Generals > Captains > Sergeants (3 levels of reporting structure)
</example>

<example description="Get top-level locations (no parent)">
{
  "category": "locations",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": null
}
Returns: Root locations (continents, major cities without parent_location_id)
Note: parent_id=null queries for orphaned/root entities
</example>

## COMMON MISTAKES:

❌ Using on wrong category: navigate_category_hierarchy for factions
   ✅ Only works for locations (parent_location_id) and npcs (superior_npc_id)

❌ Expecting faction hierarchy: "Show me factions under The Accord"
   ✅ Factions don't have parent-child relationships, use query_category with filters

❌ Confusing faction vs org chart: "Show me NPCs in faction X"
   ✅ Use query_category(filters={"faction_id": "X"}) for faction membership
   ✅ Use navigate_category_hierarchy for reporting structure (superior_npc_id)

❌ Large depth on huge trees: depth=5 on 1000+ locations
   ✅ Start with depth=1, incrementally increase if needed

❌ Not checking total_descendants: Assuming small result set
   ✅ Check total_descendants to understand tree size before requesting depth=3+

## ERROR SCENARIOS:

**VALIDATION_ERROR**:
- Invalid category: Only "locations" and "npcs" supported
- depth out of range: Must be 1-5
- Malformed parent_id

**NOT_FOUND**:
- parent_id doesn't exist (wrong ID or deleted)
- Campaign doesn't exist or user doesn't own it

**CIRCULAR_REFERENCE**:
- Location A → Location B → Location A (shouldn't happen with SET NULL on delete)
- NPC reports to themselves (data corruption)
- Solution: Fix data via update_category_entry to break cycle

## PERFORMANCE NOTES:

- depth=1: Fast (<50ms for 100 children)
- depth=2: Moderate (<200ms for 100 children with 10 grandchildren each)
- depth=3+: Potentially slow (>500ms for large trees)
- Consider pagination for very large hierarchies (not supported in v1 - use depth=1 repeatedly)

## RETURN FORMAT:

{
  "category": "locations",
  "parent_id": "location-galik",
  "parent_name": "Galik",  // ← Name of the parent entity
  "depth_requested": 2,
  "children": [
    {
      "id": "location-docks",
      "name": "Docks District",
      ... all universal + category-specific fields,
      "children": [  // ← Nested array for depth=2+
        {
          "id": "location-rusty-anchor",
          "name": "The Rusty Anchor",
          ... all fields,
          "children": []
        }
      ]
    }
  ],
  "total_descendants": 15,  // ← Count across all levels
  "execution_time_ms": 67
}

**Empty Result** (no children):
{
  "category": "locations",
  "parent_id": "location-rusty-anchor",
  "parent_name": "The Rusty Anchor",
  "depth_requested": 1,
  "children": [],  // ← Empty array, not null
  "total_descendants": 0,
  "execution_time_ms": 23
}`,
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['locations', 'npcs'],
          description: 'Only locations and npcs support hierarchy'
        },
        campaign_id: {
          type: 'string',
          format: 'uuid'
        },
        parent_id: {
          type: 'string',
          format: 'uuid',
          description: 'Parent entity ID (or null for root entities)'
        },
        depth: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          default: 1,
          description: 'Levels to traverse (1 = direct children only)'
        }
      },
      required: ['category', 'campaign_id', 'parent_id']
    }
  }
];

/**
 * Complete registry of all MCP tools
 * Wiki tools (11: 6 card + 5 hierarchy) + Graph tools (4) +
 * Info-level tools (2) + Category tools (5) + Campaign Bible (1) = 23 total
 */
export const TOOL_REGISTRY = [
  ...wikiToolDefinitions,  // 11 tools: 6 card CRUD + 5 hierarchy navigation
  ...graphToolDefinitions,
  ...infoLevelToolDefinitions,
  ...categoryToolDefinitions,  // Feature 014 category database tools
  bibleTool  // Campaign Bible access
];

/**
 * Dispatch a tool call to the appropriate handler
 */
export async function dispatchToolCall(name: string, params: any): Promise<any> {
  switch (name) {
    // Wiki tools (11) - Feature 003 Notion-style wiki system
    // Card CRUD operations
    case 'read_card':
      return await handleReadCard(params);
    case 'create_card':
      return await handleCreateCard(params);
    case 'update_card':
      return await handleUpdateCard(params);
    case 'delete_card':
      return await handleDeleteCard(params);
    case 'search_cards':
      return await handleSearchCards(params);
    case 'move_card':
      return await handleMoveCard(params);
    // Hierarchy navigation
    case 'get_card_path':
      return await handleGetCardPath(params);
    case 'get_subtree':
      return await handleGetSubtree(params);
    case 'list_children':
      return await handleListChildren(params);
    case 'get_siblings':
      return await handleGetSiblings(params);
    case 'get_ancestor':
      return await handleGetAncestor(params);

    // Graph tools (4) - Feature 005/006 knowledge graphs
    case 'query_graph':
      return await handleQueryGraph(params);
    case 'list_graph_nodes':
      return await handleListGraphNodes(params);
    case 'get_node_relationships':
      return await handleGetNodeRelationships(params);
    case 'update_graph':
      return await handleUpdateGraph(params);

    // Information level tools (2) - Feature 004 filtering
    case 'list_information_levels':
      return await handleListInformationLevels(params);
    case 'get_information_level_by_name':
      return await handleGetInformationLevelByName(params);

    // Category tools (5) - Feature 014 category tables
    case 'query_category':
      return await handleQueryCategory(params);
    case 'create_category_entry':
      return await handleCreateCategoryEntry(params);
    case 'update_category_entry':
      return await handleUpdateCategoryEntry(params);
    case 'delete_category_entry':
      return await handleDeleteCategoryEntry(params);
    case 'navigate_category_hierarchy':
      return await handleNavigateHierarchy(params);

    // Campaign Bible tool
    case 'get_campaign_bible':
      return await handleGetCampaignBible(params);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
