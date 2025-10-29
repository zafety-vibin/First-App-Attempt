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
The structured category databases (Feature 014) - NOT the wiki cards (use read_card/search_cards for wiki).

13 Categories Available:
- npcs: Characters with race/class/faction 
- locations: Places with hierarchies 
- factions: Organizations with power dynamics 
- session_recaps: Canonical session records 
- quests: Mission tracking with status 
- player_characters: PC roster
- lore_entries: Historical knowledge
- world_rules: Magic systems, cosmology
- planar_forces: Deities, cosmic entities
- session_prep: DM planning notes (always dm_only)
- custom_mechanics: House rules
- items: Equipment with ownership
- creatures: Bestiary with stat blocks

## SEARCH vs FILTERS - CRITICAL DIFFERENCE:

**'search' parameter** (case-INsensitive substring matching):
- Searches ONLY 'name' and 'description' fields
- Example: search="temple" matches "Temple of Light", "old temple", "TEMPLE RUINS"
- Use when: You know part of the name but not the exact spelling

**'filters' parameter** (EXACT matching, case-sensitive):
- Matches ANY field with exact values
- String fields: Exact match only (no substring)
- Number fields: Exact value
- Array fields: Not supported directly
- Example: filters={"faction_id": "faction-accord"} - must match exactly
- Use when: You have exact IDs or enum values

**Combining both**: search acts as additional AND filter.

## RECOMMENDED WORKFLOW:

Step 1: Broad search first
→ Use 'search' to find entities by name/description
→ Example: search="merchant" to find all merchant NPCs

Step 2: Note the exact 'id' from results
→ IDs come in 2 formats:
  • UUID: "32391c9e-1d22-49d1-afdd-6a2b3fa4ebb1"
  • Legacy: "npc-elara", "faction-accord", "notion-npc-..."

Step 3: Use exact IDs for filters/updates
→ filters={"id": "exact-id-from-step-1"}
→ Or use the ID in update_category_entry

## COMMON MISTAKES:

❌ Using search for exact ID: search="npc-elara" might not work
   ✅ Use filters instead: filters={"id": "npc-elara"}

❌ Expecting substring match in filters: filters={"name": "Elar"} won't match "Elara"
   ✅ Use search for substring: search="Elar"

❌ Case-sensitive search: search="TEMPLE" won't match "temple"
   ✅ Search is case-insensitive, works automatically

❌ Not checking pagination: Assuming all results returned
   ✅ Check pagination.total_pages, fetch additional pages if needed

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
Returns: "Marcus the Merchant", "Merchant Guild Leader", "traveling merchant", etc.
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
Returns: Factions visible to players (dm_only entities hidden, dm_* fields stripped)
</example>

<example description="Paginate through large NPC list">
{
  "category": "npcs",
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "limit": 20,
  "page": 2
}
Returns: NPCs 21-40 out of 56 total
</example>

## RETURN FORMAT:
{
  "category": "npcs",
  "entries": [
    {
      "id": "npc-elara",  // ← USE THIS EXACT VALUE for updates
      "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
      "name": "Elara Moonwhisper",
      "description": "An elven ranger...",
      "core_status": "active",
      "player_knowledge": "common_knowledge",
      "tags": ["ranger", "elf", "ally"],
      "created_at": 1729622400,
      "updated_at": 1729622400,
      "custom_fields": {},
      "race": "Elf",
      "class": ["Ranger"],
      "level": 8,
      "faction_id": "faction-accord",
      "superior_npc_id": null,
      "dm_secrets": "Actually a spy for...",
      "dm_plot_relevance": "Will betray party in Act 3"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 56,
    "total_pages": 2
  },
  "execution_time_ms": 45
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
    description: 'Delete an entity with two-phase confirmation. Phase 1 (confirm=false): Returns preview with affected references. Phase 2 (confirm=true with token): Actually deletes. Prevents accidental deletions.',
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
    description: 'Navigate parent-child relationships for Locations (parent_location_id) and NPCs (superior_npc_id). Supports multi-level traversal with depth parameter.',
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
          description: 'Parent entity ID'
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
