/**
 * MCP Information Level Tools Implementation
 * Provides 2 tools for querying the 4-level information filtering system (Feature 004)
 *
 * ## WHAT THIS IS FOR:
 * Query the information filtering system that controls DM/Player visibility across your campaign.
 * This is a campaign-wide visibility system - any content (wiki cards, NPC entries, graph nodes)
 * can be tagged with an information level to control who can see it.
 *
 * Think of it like Google Drive permissions, but for campaign secrecy:
 * - System = Hidden metadata (internal use only)
 * - Common Knowledge = Public facts everyone knows
 * - Player Knowledge = Secrets the players discovered
 * - DM Secret = Hidden from players (plot twists, villain plans)
 *
 * ## APPLIES TO:
 * - **Wiki cards**: Each card has an information_level_id FK
 * - **Category databases**: All 13 categories have player_knowledge enum field
 * - **Knowledge graph nodes**: Can be tagged with visibility levels
 * - **Database columns**: Can be marked hierarchical (always hidden from players)
 *
 * ## CROSS-CUTTING CONCERN:
 * Information levels are NOT specific to wiki or databases - they're a global visibility system.
 * Use these tools to understand what levels exist before creating/updating content.
 */

import {
  ListInformationLevelsInputSchema,
  GetInformationLevelByNameInputSchema
} from '../schemas/info-level-schemas';
import { db } from '../../services/DatabaseService';

/**
 * Handler for list_information_levels tool
 */
export async function handleListInformationLevels(params: any) {
  try {
    const validated = ListInformationLevelsInputSchema.parse(params);

    // Get all information levels for the campaign (default + custom)
    const levels = db.prepare(`
      SELECT id, campaign_id, name, description, hierarchy_level, created_at, updated_at
      FROM information_levels
      WHERE campaign_id = ?
      ORDER BY hierarchy_level ASC, name ASC
    `).all(validated.campaign_id) as any[];

    if (levels.length === 0) {
      // Check if campaign exists
      const campaignRow = db.prepare(`
        SELECT id FROM campaigns WHERE id = ?
      `).get(validated.campaign_id);

      if (!campaignRow) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'CAMPAIGN_NOT_FOUND',
              message: `Campaign not found: ${validated.campaign_id}`
            })
          }]
        };
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          levels: levels.map(level => ({
            id: level.id,
            name: level.name,
            description: level.description,
            hierarchy_level: level.hierarchy_level
          })),
          total_count: levels.length
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for get_information_level_by_name tool
 */
export async function handleGetInformationLevelByName(params: any) {
  try {
    const validated = GetInformationLevelByNameInputSchema.parse(params);

    // First try exact match (case-insensitive)
    let level = db.prepare(`
      SELECT id, campaign_id, name, description, hierarchy_level, created_at, updated_at
      FROM information_levels
      WHERE campaign_id = ? AND LOWER(name) = LOWER(?)
    `).get(validated.campaign_id, validated.name) as any;

    // If no exact match, try fuzzy match
    if (!level) {
      level = db.prepare(`
        SELECT id, campaign_id, name, description, hierarchy_level, created_at, updated_at
        FROM information_levels
        WHERE campaign_id = ? AND LOWER(name) LIKE LOWER(?)
        ORDER BY LENGTH(name) ASC
        LIMIT 1
      `).get(validated.campaign_id, `%${validated.name}%`) as any;
    }

    if (!level) {
      // Check if campaign exists
      const campaignRow = db.prepare(`
        SELECT id FROM campaigns WHERE id = ?
      `).get(validated.campaign_id);

      if (!campaignRow) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'CAMPAIGN_NOT_FOUND',
              message: `Campaign not found: ${validated.campaign_id}`
            })
          }]
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'LEVEL_NOT_FOUND',
            message: `Information level not found: ${validated.name}`
          })
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          level: {
            id: level.id,
            name: level.name,
            description: level.description,
            hierarchy_level: level.hierarchy_level
          },
          exact_match: level.name.toLowerCase() === validated.name.toLowerCase()
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Tool definitions for information level management
 */
export const infoLevelToolDefinitions = [
  {
    name: 'list_information_levels',
    description: `List all information levels available in a campaign (4 defaults + custom levels).

## WHAT THIS IS FOR:
Discover what information levels exist in a campaign before tagging content.
Returns the 4 default levels (System, Common Knowledge, Player Knowledge, DM Secret)
plus any custom levels the GM created (e.g., "Investigation Clues", "Foreshadowing").

Use this to understand the campaign's visibility structure before calling other tools.

## THE 4 DEFAULT INFORMATION LEVELS:

**1. System (hierarchy_level: 0)**
Hidden internal metadata. Never shown in any view mode.
- Examples: Database IDs, timestamps, internal flags
- Usage: Rare - most campaign content uses levels 1-3
- View mode behavior: Hidden in both dm_view and player_view

**2. Common Knowledge (hierarchy_level: 1)**
Everyone in the world knows this. Visible in all view modes.
- Examples:
  - "Waterdeep is a major city on the Sword Coast"
  - "The Yawning Portal is a famous tavern"
  - "Elves live longer than humans"
- Use when: Public facts, geography, common NPCs, known history
- View mode behavior: Visible in both dm_view and player_view

**3. Player Knowledge (hierarchy_level: 2)**
Players discovered this through gameplay. Visible in player_view and dm_view.
- Examples:
  - "The secret passage behind the bookshelf (found in Session 12)"
  - "Lord Neverember is secretly funding the Zhentarim (discovered Session 8)"
  - "Galik Emberfuse is a retired adventurer (players met him)"
- Use when: Clues found, secrets discovered, NPCs met, plot revelations
- View mode behavior: Visible in both dm_view and player_view

**4. DM Secret (hierarchy_level: 3 / dm_only)**
Hidden from players. Only visible in dm_view.
- Examples:
  - "The BBEG's true motivation is revenge for [spoiler]"
  - "The Cult of the Dragon is planning an attack next session"
  - "NPC secretly working for the villain"
- Use when: Plot hooks, villain plans, future events, DM-only notes
- View mode behavior: Only visible in dm_view, hidden in player_view

## CUSTOM INFORMATION LEVELS:

Game Masters can create custom levels beyond the default 4:
- "Investigation Clues" (hierarchy_level: 2.5, between Player and DM)
- "Party Secrets" (hierarchy_level: 2.2, subset of Player Knowledge)
- "Foreshadowing" (hierarchy_level: 1.5, hints visible to players)

Custom levels:
- Have unique names chosen by the GM
- Must have hierarchy_level between 0-3 (decimals allowed for fine-grained control)
- Inherit visibility rules based on hierarchy_level value
- Can be used the same as default levels when creating content

Check for custom levels by calling this tool before tagging new content.

## VIEW MODE VISIBILITY MATRIX:

**dm_view** (Game Master sees everything):
- System: ❌ Hidden
- Common Knowledge: ✅ Visible
- Player Knowledge: ✅ Visible
- DM Secret: ✅ Visible
- Custom levels: Based on hierarchy_level

**player_view** (Players see discovered info):
- System: ❌ Hidden
- Common Knowledge: ✅ Visible
- Player Knowledge: ✅ Visible
- DM Secret: ❌ Hidden
- Custom levels: Based on hierarchy_level

View mode is controlled via X-View-Mode HTTP header in all API requests.

## RECOMMENDED WORKFLOW:
1. list_information_levels to see available levels
2. Note the level IDs for use in other tools
3. When creating wiki cards: Pass information_level_id
4. When creating category entries: Pass player_knowledge enum
5. System automatically filters content based on current view mode

## INTEGRATION WITH OTHER TOOLS:

**With wiki tools (create_card, update_card):**
Requires information_level_id parameter (the numeric id field).
Get valid IDs by calling list_information_levels first.

Example workflow:
1. list_information_levels(campaign_id) → Get level IDs
2. create_card(..., information_level_id: 3) → Tag as DM Secret

**With category tools (create_category_entry, update_category_entry):**
All 13 categories use player_knowledge enum instead of information_level_id.
Enum values: 'common_knowledge' | 'player_knowledge' | 'dm_only'

Mapping from levels to enum:
- System → Not available for categories (internal use only)
- Common Knowledge → 'common_knowledge'
- Player Knowledge → 'player_knowledge'
- DM Secret → 'dm_only'
- Custom levels → Map based on hierarchy_level (0-1.9: common, 2-2.9: player, 3+: dm_only)

**With knowledge graph tools:**
Graph nodes can be tagged with information levels (implementation varies by graph type).

## EXAMPLES:

<example description="List all levels to see what's available before creating content">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}

Returns:
{
  "levels": [
    {
      "id": 0,
      "name": "System",
      "description": "Hidden metadata",
      "hierarchy_level": 0
    },
    {
      "id": 1,
      "name": "Common Knowledge",
      "description": "Public information everyone knows",
      "hierarchy_level": 1
    },
    {
      "id": 2,
      "name": "Player Knowledge",
      "description": "Information players discovered",
      "hierarchy_level": 2
    },
    {
      "id": 3,
      "name": "DM Secret",
      "description": "Hidden from players",
      "hierarchy_level": 3
    },
    {
      "id": 4,
      "name": "Investigation Clues",
      "description": "Custom level for detective campaign",
      "hierarchy_level": 2.5
    }
  ],
  "total_count": 5
}
</example>

<example description="Discover custom levels created by GM">
{
  "campaign_id": "a72f4b1e-8d9c-4e12-b3f5-6a8d7c9e1f2a"
}

Returns default 4 levels + any custom levels (e.g., "Foreshadowing", "Party Secrets")
</example>

<example description="Check available levels before AI import session">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}

Use results to determine appropriate level for imported NPCs/locations.
If importing published module content → Common Knowledge
If importing plot secrets → DM Secret
</example>

## RETURN FORMAT:
{
  "levels": [
    {
      "id": 1,  // Numeric ID (use this for wiki card information_level_id)
      "name": "Common Knowledge",  // Display name
      "description": "Public information everyone knows",  // Optional description
      "hierarchy_level": 1  // Determines visibility rules (0-3 scale)
    },
    // ... more levels
  ],
  "total_count": 5  // Total number of levels (4 defaults + N custom)
}

## ERRORS:
- CAMPAIGN_NOT_FOUND: Campaign doesn't exist or user lacks access
- VALIDATION_ERROR: Malformed UUID or invalid parameters

Common causes:
- Wrong campaign_id (typo or doesn't exist)
- Invalid UUID format (must be standard UUID v4)`,
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: {
          type: 'string',
          description: 'Campaign UUID to list levels for'
        }
      },
      required: ['campaign_id']
    },
    handler: handleListInformationLevels
  },
  {
    name: 'get_information_level_by_name',
    description: `Get a specific information level by name with fuzzy matching.

## WHAT THIS IS FOR:
Lookup a specific information level by name when you know what you're looking for
but don't have the numeric ID. Useful when AI needs to tag content at a specific
secrecy level or when referencing custom levels by name.

Supports case-insensitive exact matching and fuzzy matching for convenience.

## WHEN TO USE:
- AI determining appropriate level for generated content
- Checking if a custom level exists (e.g., "Investigation Clues")
- Getting level ID to pass to create_card/update_card
- Understanding level properties (hierarchy_level value)

Don't use this if you just need all levels - use list_information_levels instead.

## NAME MATCHING BEHAVIOR:

**Exact match (case-insensitive, preferred):**
- "dm secret" matches "DM Secret"
- "common knowledge" matches "Common Knowledge"
- "PLAYER KNOWLEDGE" matches "Player Knowledge"

**Fuzzy match (substring, fallback):**
- "dm" matches "DM Secret" (shortest match wins)
- "knowledge" matches "Common Knowledge" (first alphabetically if tie)
- "invest" matches "Investigation Clues" (custom level)

Exact matches always preferred. Fuzzy matching helps with partial names
or typos, but be careful with ambiguous queries.

## INTEGRATION WITH OTHER TOOLS:

**Workflow for tagging wiki cards:**
1. get_information_level_by_name(campaign_id, "DM Secret")
2. Note the numeric id from response (e.g., 3)
3. create_card(..., information_level_id: 3)

**Workflow for category entries:**
Categories use player_knowledge enum, not level IDs.
If you get a level by name, map to enum:
- "Common Knowledge" → 'common_knowledge'
- "Player Knowledge" → 'player_knowledge'
- "DM Secret" → 'dm_only'

**Checking for custom levels:**
get_information_level_by_name(campaign_id, "Investigation Clues")
- Returns level details if exists
- Returns LEVEL_NOT_FOUND if custom level doesn't exist

## EXAMPLES:

<example description="Get DM Secret level ID for tagging a plot twist card">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "name": "DM Secret"
}

Returns:
{
  "level": {
    "id": 3,
    "name": "DM Secret",
    "description": "Hidden from players",
    "hierarchy_level": 3
  },
  "exact_match": true
}

Use level.id (3) for create_card's information_level_id parameter.
</example>

<example description="Fuzzy match with partial name">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "name": "player"
}

Returns:
{
  "level": {
    "id": 2,
    "name": "Player Knowledge",
    "description": "Information players discovered",
    "hierarchy_level": 2
  },
  "exact_match": false
}

exact_match: false indicates fuzzy match was used. Consider confirming
with user or using list_information_levels for precision.
</example>

<example description="Check if custom level exists">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "name": "Investigation Clues"
}

If custom level exists:
{
  "level": {
    "id": 4,
    "name": "Investigation Clues",
    "description": "Detective campaign clues",
    "hierarchy_level": 2.5
  },
  "exact_match": true
}

If doesn't exist:
{
  "error": "LEVEL_NOT_FOUND",
  "message": "Information level not found: Investigation Clues"
}
</example>

<example description="Case-insensitive exact match">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "name": "common knowledge"
}

Returns Common Knowledge level (exact_match: true) despite lowercase input.
</example>

<example description="Get System level (rare but valid)">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "name": "System"
}

Returns:
{
  "level": {
    "id": 0,
    "name": "System",
    "description": "Hidden metadata",
    "hierarchy_level": 0
  },
  "exact_match": true
}

System level is valid but rarely used for campaign content.
</example>

<example description="Map level to category enum for NPC creation">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "name": "Player Knowledge"
}

Returns level with hierarchy_level: 2

Map to enum for create_category_entry:
- hierarchy_level 0-1.9 → 'common_knowledge'
- hierarchy_level 2-2.9 → 'player_knowledge'
- hierarchy_level 3+ → 'dm_only'

Result: Use player_knowledge: 'player_knowledge' for this NPC.
</example>

## RETURN FORMAT:
{
  "level": {
    "id": 2,  // Numeric ID for wiki cards
    "name": "Player Knowledge",  // Exact name from database
    "description": "Information players discovered",  // Optional
    "hierarchy_level": 2  // Visibility tier (0-3+ scale)
  },
  "exact_match": true  // true if exact match, false if fuzzy match
}

## ERRORS:
- CAMPAIGN_NOT_FOUND: Campaign doesn't exist or user lacks access
- LEVEL_NOT_FOUND: No level matches that name (exact or fuzzy)
- VALIDATION_ERROR: Malformed UUID or invalid parameters

Common causes:
- Typo in level name (check list_information_levels for exact names)
- Wrong campaign_id
- Searching for custom level that doesn't exist in this campaign
- Empty name parameter`,
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: {
          type: 'string',
          description: 'Campaign UUID'
        },
        name: {
          type: 'string',
          description: 'Level name to search for (case-insensitive, supports fuzzy matching)'
        }
      },
      required: ['campaign_id', 'name']
    },
    handler: handleGetInformationLevelByName
  }
];
