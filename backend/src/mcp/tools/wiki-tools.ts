/**
 * MCP Wiki Tools Implementation
 * Provides 11 tools for Notion-style wiki management: 6 card CRUD operations + 5 hierarchy navigation tools
 *
 * ## WHAT THIS IS FOR:
 * The Notion-style wiki system (Feature 003) - hierarchical pages with rich text, database views, and map canvases.
 * Think of this as your campaign's freeform notes, narrative content, and organizational structure.
 * Cards are like pages in Notion - they can contain text, link to databases, or embed maps.
 *
 * ## NOT FOR:
 * Structured category databases (NPCs, Locations, Factions) - use query_category/create_category_entry for that.
 * The wiki is for narrative content and campaign organization, not structured data.
 *
 * ## WHEN TO USE:
 * - Building campaign narrative structure (story arcs, chapters, acts)
 * - Session notes and plot hooks
 * - Organizing homebrew content (custom rules, world lore)
 * - Creating nested reference pages (world history, cosmology)
 * - Linking to database views and maps
 */

import {
  ReadCardInputSchema,
  CreateCardInputSchema,
  UpdateCardInputSchema,
  DeleteCardInputSchema,
  SearchCardsInputSchema,
  MoveCardInputSchema
} from '../schemas/card-schemas';

import {
  GetCardPathInputSchema,
  GetSubtreeInputSchema,
  ListChildrenInputSchema,
  GetSiblingsInputSchema,
  GetAncestorInputSchema
} from '../schemas/hierarchy-schemas';

import { CardService } from '../../services/CardService';
import { db } from '../../services/DatabaseService';
import { rowToCard, CardRow } from '../../models/Card';


/**
 * Tool definitions for wiki card operations
 */
export const wikiToolDefinitions = [
  {
    name: 'batch_create_cards',
    description: `Create multiple cards in one atomic operation with automatic parent-child linking.

## WHAT THIS IS FOR:
Build an entire wiki structure in ONE call instead of creating cards piece-by-piece.
Useful when you know the full hierarchy upfront (like importing content or creating a section).

## HOW IT WORKS:
1. Provide array of cards to create
2. Use placeholders like "@parent1", "@parent2" for parent references
3. Tool creates cards in order and links children to actual UUIDs
4. Returns mapping of placeholders to real UUIDs

## CRITICAL - STILL RESPECT GRANULARITY:
Even in batch mode, create separate cards for each formatting block!
Don't create one giant card - create multiple granular cards in the batch.

## PARENT REFERENCE PLACEHOLDERS:
- Use "@root" for campaign root (parent_id: null)
- Use "@placeholder-name" to reference a card created earlier in same batch
- Example: "@world-lore" references the "World Lore" page created in same batch

## EXAMPLE - Building a lore section with proper hierarchy:

<example description="Batch create: parent page + child pages + text blocks">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "cards": [
    {
      "placeholder": "@lore-hub",
      "parent_ref": "@root",
      "title": "📚 Campaign Lore",
      "card_type": "page",
      "content": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Explore the world"}]}]}
    },
    {
      "placeholder": "@dragon-page",
      "parent_ref": "@lore-hub",
      "title": "Three-Headed Dragon",
      "card_type": "page",
      "content": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Learn about the dragon"}]}]}
    },
    {
      "parent_ref": "@dragon-page",
      "title": null,
      "card_type": "text",
      "content": {"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "The Three Heads"}]}]}
    },
    {
      "parent_ref": "@dragon-page",
      "title": null,
      "card_type": "text",
      "content": {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Good, Evil, and Neutral ruled together..."}]}]}
    }
  ]
}
Creates: Lore Hub (page) → Dragon (page) → Heading (text) + Paragraph (text)
</example>

## SEQUENTIAL WORKFLOW (if not using batch):

To create nested structure, you MUST get parent UUIDs first:

  Step 1: Create the parent PAGE card
  create_card({
    parent_id: null,
    title: "World Lore",
    card_type: "page"
  })
  → Returns: {"id": "abc-123-uuid", ...}

  Step 2: Use that UUID for children - DON'T GUESS!
  create_card({
    parent_id: "abc-123-uuid",  // ← Use exact UUID from Step 1 response
    title: "Dragon History",
    card_type: "page"
  })
  → Returns: {"id": "def-456-uuid", ...}

  Step 3: Create text blocks under Dragon History
  create_card({
    parent_id: "def-456-uuid",  // ← Use exact UUID from Step 2 response
    title: null,
    card_type: "text",
    content: heading("The Three Heads")
  })

CRITICAL: Use search_cards or list_children to find existing page IDs.
NEVER hallucinate/guess parent UUIDs - always get from response or query!

## WHEN TO USE batch_create_cards vs create_card:
- Use batch when: Building multi-level structure, know full hierarchy upfront
- Use single when: Adding one card to existing structure, have parent UUID
- Batch is atomic: all succeed or all fail (no partial wikis)

## RETURN FORMAT:
{
  "created_count": 4,
  "placeholder_map": {
    "@lore-hub": "uuid-abc-123",
    "@dragon-page": "uuid-def-456"
  },
  "cards": [array of created cards with real UUIDs]
}`,
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              placeholder: { type: 'string' },
              parent_ref: { type: 'string' },
              title: { type: ['string', 'null'] },
              card_type: { type: 'string', enum: ['text', 'page', 'database'] },
              content: { type: 'object' },
              information_level_id: { type: ['number', 'null'] }
            },
            required: ['parent_ref', 'card_type']
          }
        }
      },
      required: ['campaign_id', 'cards']
    }
  },
  {
    name: 'read_card',
    description: `Read a campaign wiki card by ID, including content, metadata, and hierarchy position.

## WHAT THIS IS FOR:
Fetches the full details of a single wiki card (page) including its rich text content,
hierarchy position, and metadata. Use this when you need to examine or display
the contents of a specific page you already know the ID for.

## RECOMMENDED WORKFLOW:
1. search_cards to find cards by title/content
2. Note the card ID from search results
3. read_card to get full content and metadata
4. Consider list_children if you need to see subpages

## CARD TYPES EXPLAINED:
- **text**: Rich text pages with ProseMirror content (most common)
- **database**: Links to a category database view (shows NPCs, Locations, etc.)
- **map**: Interactive map canvas with pins and zones (Feature 007)

## PROSEMIRROR CONTENT FORMAT:
Text cards store content in ProseMirror JSON format:
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {"type": "text", "text": "Plain text"},
        {"type": "text", "marks": [{"type": "bold"}], "text": "Bold text"}
      ]
    },
    {
      "type": "heading",
      "attrs": {"level": 2},
      "content": [{"type": "text", "text": "Heading"}]
    }
  ]
}

Supported node types: paragraph, heading (level 1-3), bulletList, orderedList, listItem
Supported marks: bold, italic, code, link

## EXAMPLES:

<example description="Read a chapter card in campaign notes">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "card_id": 42
}
</example>

<example description="Read the root card of a campaign">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "card_id": 1
}
</example>

## RETURN FORMAT:
{
  "id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": 15,  // null for root cards
  "title": "Chapter 3: The Shadowfell Incursion",
  "card_type": "text",
  "content": {
    "type": "doc",
    "content": [...]  // ProseMirror JSON
  },
  "information_level_id": null,  // null = System/public
  "position": 2,  // Order among siblings
  "created_at": 1729622400,  // Unix timestamp
  "updated_at": 1729708800
}

## ERRORS:
- NOT_FOUND: Card with given ID doesn't exist in this campaign
- VALIDATION_ERROR: Invalid parameters (e.g., non-numeric card_id)`,
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'create_card',
    description: `Create a new card in the campaign wiki hierarchy.

!!!!! MANDATORY RULE - READ THIS FIRST !!!!!
ONE FORMATTING BLOCK PER CARD - NO EXCEPTIONS

Do NOT create cards with multiple paragraphs, headings, or lists in one card.
Each formatting change = SEPARATE create_card call.

If you're about to create a card with 2+ content blocks, STOP and create multiple cards instead.

## WHAT THIS IS FOR:
Creates a child card that renders INSIDE a parent page. Cards stack vertically within their parent.

## CRITICAL: PAGES vs CHILD CARDS

**A PAGE** = Container with unique URL (like /campaigns/123/cards/abc)
**CHILD CARDS** = Content blocks rendered vertically INSIDE that page

When you view a page, you see its child cards stacked vertically:

  Parent Page URL: /campaigns/123/cards/abc
  ├─ Text card: "Introduction paragraph..." (inline content)
  ├─ Text card: "Another paragraph..." (inline content)
  ├─ Page card: "📚 Subpage" (clickable link → navigates to /cards/def)
  └─ Text card: "Footer text..." (inline content)

## NOTION-LIKE STRUCTURE - THE RIGHT WAY:

**ANTI-PATTERN (What Desktop Did Wrong):**

  Create ONE card with ALL content in ProseMirror JSON:
  - title: "Campaign Hub"
  - content with: heading("TROPEIA") + paragraph("intro") + heading("World Lore") + paragraph("dragon system")...

  This creates a monolithic document - hard to navigate, not hierarchical.

**CORRECT PATTERN (Hierarchical Pages):**

  Step 1: Create parent page with brief intro
    parent_id: null (root level)
    title: "Tropeia Campaign Hub"
    card_type: "text"
    content: one paragraph welcoming

  Step 2: Inside that parent, create PAGE child cards (clickable navigation)
    parent_id: "parent-page-uuid"
    title: "📚 World Lore & History"
    card_type: "page" (creates clickable link)

  Step 3: Inside World Lore page, create separate TEXT cards
    Each formatting block = separate card:
    - Text card: heading "Three-Headed Dragon"
    - Text card: paragraph about dragon
    - Text card: bullet list with 3 items

## CARD TYPE SELECTION:

- **text**: Inline content blocks (paragraphs, lists, quotes)
  - Renders inside parent page
  - NOT clickable
  - CANNOT HAVE CHILDREN - text cards are leaf nodes!
  - Use for: paragraph content, lists, single blocks

- **page**: Navigable sub-pages (clickable links)
  - Has its own URL: /campaigns/{id}/cards/{page-id}
  - Clickable from parent page
  - CAN HAVE CHILDREN - pages are containers!
  - Use for: major sections that need sub-content
  - Can have text cards and page cards as children

- **database**: Embedded database view (table of NPCs, etc.)
  - Renders database table inline
  - CANNOT HAVE CHILDREN
  - Use sparingly for overview tables

!!!!! CRITICAL RULE !!!!!
ONLY "page" cards and the root page can have children.
NEVER set parent_id to a "text" card - it will fail or orphan the child.

If you need to nest content, the parent MUST be card_type: "page"!

## WHEN TO CREATE A PAGE vs TEXT CARD:

**Create a PAGE card when:**
- Content will have child cards underneath it (pages can have children!)
- You want users to click to navigate deeper
- It's a major topic worth its own URL
- It's a section/chapter/category that organizes other content
- Example: "Geography" page with region text cards inside
- Example: "NPCs" page with character pages inside

**Create a TEXT card when:**
- It's inline content with NO children needed (text cards CANNOT have children!)
- ONE formatting block (one paragraph, OR one list, OR one heading)
- It's a leaf node (end of hierarchy)
- Example: A single paragraph of lore
- Example: A bullet list of facts

CRITICAL DECISION:
- Will this card have children? → Use card_type: "page"
- Is this a leaf block with no children? → Use card_type: "text"

!!!!! MANDATORY - ONE FORMATTING BLOCK PER TEXT CARD !!!!!

You MUST create separate cards for each formatting element:
- ONE heading = ONE card
- ONE paragraph = ONE card
- ONE bullet list = ONE card
- ONE numbered list = ONE card
- ONE blockquote = ONE card

NEVER combine: heading + paragraph in same card
NEVER combine: paragraph + bulletList in same card
NEVER combine: multiple paragraphs in same card

WRONG (DO NOT DO THIS):
  content: {
    type: "doc",
    content: [
      {type: "heading", ...},
      {type: "paragraph", ...},
      {type: "bulletList", ...}
    ]
  }

RIGHT (DO THIS INSTEAD):
  Call create_card THREE TIMES:
  1. create_card with ONLY heading
  2. create_card with ONLY paragraph
  3. create_card with ONLY bulletList

Each card renders as ONE formatting block stacked vertically in the page.

## HIERARCHICAL WORKFLOW EXAMPLE:

Building a "Campaign Lore" section:

  1. Create PAGE card: "Campaign Lore" (parent_id: null)
     → This gets URL /cards/abc, shows on root

  2. Inside "Campaign Lore", create PAGE children for major topics

  3. Inside "World History" page, create TEXT children (one per formatting block)
     - Text card: heading "Ancient Empires"
     - Text card: paragraph "The elven empire ruled..."
     - Text card: bullet list with 3 items

Result: Clean hierarchy with clickable navigation, not giant documents.

## PARENT_ID BEHAVIOR:
- **null**: Creates card at campaign root (top level)
- **number**: Nests under specified parent card
- Invalid parent_id will fail with foreign key error

## CONTENT FORMAT for text cards:
Must be valid ProseMirror JSON. Minimal example:
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {"type": "text", "text": "Your content here"}
      ]
    }
  ]
}

For database cards: {"type": "database", "schema_id": "auto-generated-uuid"}
For map cards: {"type": "map", "map_enabled": true}

## COMMON MISTAKES:
- Using card tools for NPCs/Locations (use create_category_entry instead)
- Forgetting parent_id creates root-level card (might clutter top level)
- Invalid ProseMirror JSON structure (missing required fields)
- Using string for card_type instead of enum value

## EXAMPLES - GRANULAR BLOCKS:

<example description="Create a heading block (ONE card for heading only)">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": "parent-page-uuid",
  "title": null,
  "card_type": "text",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": {"level": 2},
        "content": [{"type": "text", "text": "The Three-Headed Dragon"}]
      }
    ]
  }
}
Note: ONLY the heading, nothing else!
</example>

<example description="Create a paragraph block (ONE card for paragraph only)">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": "parent-page-uuid",
  "title": null,
  "card_type": "text",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{"type": "text", "text": "The dragon ruled from Hopewind for millennia..."}]
      }
    ]
  }
}
Note: ONLY one paragraph, nothing else!
</example>

<example description="Create a bullet list block (ONE card for list only)">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": "parent-page-uuid",
  "title": null,
  "card_type": "text",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "bulletList",
        "content": [
          {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Good head"}]}]},
          {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Evil head"}]}]},
          {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Neutral head"}]}]}
        ]
      }
    ]
  }
}
Note: ONLY the list, nothing else!
</example>

<example description="Create a PAGE card for clickable navigation (use for major sections)">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": "parent-page-uuid",
  "title": "📚 World Lore & History",
  "card_type": "page",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{"type": "text", "text": "Click to explore world lore"}]
      }
    ]
  }
}
Note: card_type: "page" makes this CLICKABLE - navigates to its own URL!
</example>

<example description="Create a database view card for NPCs">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": "parent-page-uuid",
  "title": "Major NPCs",
  "card_type": "database",
  "content": {"type": "database", "category": "npcs"}
}
</example>

## RETURN FORMAT:
Returns the created card with auto-generated fields:
{
  "id": 43,  // Auto-assigned ID
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": 12,
  "title": "Chapter 3: The Shadowfell Incursion",
  "card_type": "text",
  "content": {...},
  "information_level_id": null,
  "position": 0,  // Auto-calculated position
  "created_at": 1729708800,
  "updated_at": 1729708800
}

## ERRORS:
- CREATE_ERROR: Database rejected insert (foreign key, uniqueness violation)
- VALIDATION_ERROR: Invalid parameters or content structure`,
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        parent_id: { type: ['string', 'null'] },
        title: { type: 'string' },
        card_type: { type: 'string', enum: ['text', 'database', 'map'] },
        content: { type: 'object' },
        information_level_id: { type: ['number', 'null'] }
      },
      required: ['campaign_id', 'title', 'card_type']
    }
  },
  {
    name: 'update_card',
    description: `Update an existing card's title, content, or information level.

## WHAT THIS IS FOR:
Modifies an existing wiki card's content or metadata. Only updates the fields
you specify - all other fields remain unchanged. Cannot change card_type or
hierarchy position (use move_card for repositioning).

## RECOMMENDED WORKFLOW:
1. read_card to see current content
2. Modify the content as needed
3. update_card with only changed fields
4. Consider move_card if position needs changing

## PARTIAL UPDATE BEHAVIOR:
- Only fields provided are updated
- Unspecified fields remain unchanged
- updated_at timestamp auto-refreshes
- Cannot update: id, campaign_id, parent_id, card_type, position, created_at

## CONTENT EDITING TIPS:
When updating ProseMirror content:
1. Fetch current content with read_card
2. Parse and modify the JSON structure
3. Ensure valid ProseMirror format
4. Send complete new content (not a diff)

## COMMON MISTAKES:
- Trying to change card_type (immutable - delete and recreate instead)
- Attempting to move card via parent_id (use move_card tool)
- Sending partial content structure (send complete ProseMirror doc)
- Forgetting that arrays/objects are replaced, not merged

## EXAMPLES:

<example description="Update only the title">
{
  "card_id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "title": "Chapter 3: Into the Shadowfell (Revised)"
}
</example>

<example description="Update content while preserving title">
{
  "card_id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{"type": "text", "text": "Updated content after session 15..."}]
      }
    ]
  }
}
</example>

<example description="Change information level to DM-only">
{
  "card_id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "information_level_id": 4
}
</example>

<example description="Update multiple fields at once">
{
  "card_id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "title": "Chapter 3: The Shadow War",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": {"level": 1},
        "content": [{"type": "text", "text": "Chapter 3: The Shadow War"}]
      },
      {
        "type": "paragraph",
        "content": [{"type": "text", "text": "Revised after player actions..."}]
      }
    ]
  },
  "information_level_id": 2
}
</example>

## RETURN FORMAT:
Returns the complete updated card:
{
  "id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": 15,
  "title": "Chapter 3: The Shadow War",  // Updated
  "card_type": "text",  // Unchanged
  "content": {...},  // Updated
  "information_level_id": 2,  // Updated
  "position": 2,  // Unchanged
  "created_at": 1729622400,  // Unchanged
  "updated_at": 1729709000  // Auto-refreshed
}

## ERRORS:
- NOT_FOUND: Card doesn't exist
- UPDATE_ERROR: Database constraint violation
- VALIDATION_ERROR: Invalid parameters or content`,
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'object' },
        information_level_id: { type: ['number', 'null'] }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'delete_card',
    description: `Delete a card and its entire subtree from the campaign.

## WHAT THIS IS FOR:
Permanently removes a wiki card and ALL of its descendant cards (subpages).
This is a destructive operation that cannot be undone. The deletion cascades
through the entire subtree - if you delete a chapter, all sections within it
are also deleted.

## CASCADE BEHAVIOR:
- Deletes the specified card
- Deletes ALL descendant cards recursively
- Updates sibling positions to fill the gap
- Cannot be undone - no soft delete

## RECOMMENDED WORKFLOW:
1. get_subtree to preview what will be deleted
2. Consider move_card to preserve important children
3. delete_card only when certain
4. Note the deleted_cards array in response

## SAFETY CONSIDERATIONS:
- Always check subtree first (could be hundreds of cards)
- Consider moving important children to a different parent first
- Database and map cards will lose their linked data
- Information level filtering is preserved until actual deletion

## COMMON MISTAKES:
- Not checking for children before deletion
- Assuming soft delete (it's permanent)
- Deleting root campaign card (loses entire wiki)
- Not backing up important content first

## EXAMPLES:

<example description="Delete a single leaf card (no children)">
{
  "card_id": 99,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}
</example>

<example description="Delete a chapter and all its sections">
{
  "card_id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}
Note: First use get_subtree to see what will be deleted
</example>

<example description="Delete a misplaced card after moving its children">
Step 1: move_card to relocate important children
Step 2: {
  "card_id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}
</example>

## RETURN FORMAT:
{
  "success": true,
  "deleted_count": 7,  // Total cards deleted
  "deleted_cards": [42, 43, 44, 45, 46, 47, 48]  // All deleted IDs
}

## ERRORS:
- NOT_FOUND: Card doesn't exist
- DELETE_ERROR: Database constraint violation (shouldn't happen with CASCADE)`,
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'search_cards',
    description: `Search for cards by title or content text within a campaign.

## WHAT THIS IS FOR:
Full-text search across all wiki cards in a campaign. Searches both titles
and content for matching text. Supports filtering by card type and information
level. Returns snippets of matching content for preview.

## SEARCH BEHAVIOR:
- Case-insensitive substring matching
- Searches both title and content fields
- Content search includes all text within ProseMirror structure
- Returns first 200 characters of matching content as snippet
- Ordered by relevance (title matches rank higher)

## RECOMMENDED WORKFLOW:
1. Start with broad search terms
2. Note the IDs and paths of relevant cards
3. Use read_card for full content
4. Consider get_card_path to understand hierarchy
5. Narrow search with filters if too many results

## FILTERING OPTIONS:
- **card_type**: Limit to text, database, or map cards
- **information_level_id**: Filter by visibility level
- **limit**: Maximum results to return (default 20, max 100)

## COMMON USE CASES:
- Finding all mentions of an NPC or location
- Locating session notes from specific dates
- Discovering lore about particular topics
- Finding all database view cards
- Searching for DM-only content

## EXAMPLES:

<example description="Search for all mentions of 'Shadowfell'">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "query": "Shadowfell"
}
</example>

<example description="Find all database view cards">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "query": "",
  "card_type": "database"
}
</example>

<example description="Search for DM-only content about 'betrayal'">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "query": "betrayal",
  "information_level_id": 4
}
</example>

<example description="Find session notes mentioning 'dragon'">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "query": "session dragon",
  "card_type": "text",
  "limit": 50
}
</example>

## RETURN FORMAT:
{
  "cards": [
    {
      "id": 42,
      "title": "Chapter 3: The Shadowfell Incursion",
      "card_type": "text",
      "parent_id": 12,
      "path": "/1/12/42",  // Hierarchical path
      "snippet": "The party discovers a rift to the Shadowfell that threatens to consume...",
      "information_level_id": null
    },
    {
      "id": 67,
      "title": "Shadowfell Creatures",
      "card_type": "text",
      "parent_id": 42,
      "path": "/1/12/42/67",
      "snippet": "Common denizens of the Shadowfell include shadows, wraiths, and...",
      "information_level_id": 2
    }
  ],
  "total_count": 7  // Total matches (may exceed returned cards if limit hit)
}

## ERRORS:
- SEARCH_ERROR: Database query failed
- VALIDATION_ERROR: Invalid parameters`,
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        query: { type: 'string' },
        card_type: { type: 'string', enum: ['text', 'database', 'map'] },
        information_level_id: { type: ['number', 'null'] },
        limit: { type: 'number' }
      },
      required: ['campaign_id', 'query']
    }
  },
  {
    name: 'move_card',
    description: `Move a card to a new parent or position in the hierarchy.

## WHAT THIS IS FOR:
Reorganizes wiki structure by moving cards to different parents or reordering
siblings. Automatically updates paths for moved card and all descendants.
Prevents circular references (can't move a card under its own descendant).

## MOVE OPERATIONS:
- **Change parent**: Move card to different section of wiki
- **Reorder siblings**: Change position among cards with same parent
- **Move to root**: Set new_parent_id to null
- **Bulk moves**: Move entire subtree by moving parent card

## POSITION BEHAVIOR:
- Position 0 = first among siblings
- Position N = after Nth sibling
- Positions auto-adjust to maintain sequence
- Gaps in positions are automatically closed

## CIRCULAR REFERENCE PREVENTION:
System prevents moving a card under its own descendant:
- Can't move Chapter 1 under Section 1.1
- Can't move root card under any child
- Validation happens before any changes

## RECOMMENDED WORKFLOW:
1. get_card_path to understand current position
2. list_children of target parent to see siblings
3. Plan position number based on desired order
4. move_card with new parent and position
5. Verify with get_subtree or list_children

## COMMON USE CASES:
- Reorganizing campaign story structure
- Moving session notes to archive
- Promoting subsection to main section
- Reordering chapters or acts
- Consolidating scattered notes

## EXAMPLES:

<example description="Move a section to a different chapter">
{
  "card_id": 67,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "new_parent_id": 89,
  "new_position": 0
}
Moves card 67 to be first child of card 89
</example>

<example description="Reorder siblings (move 3rd card to 1st position)">
{
  "card_id": 45,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "new_parent_id": 12,  // Same parent
  "new_position": 0  // Move to first
}
</example>

<example description="Move card to campaign root">
{
  "card_id": 67,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "new_parent_id": null,
  "new_position": 2
}
Makes card 67 a root-level card at position 2
</example>

<example description="Move to end of sibling list">
{
  "card_id": 67,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "new_parent_id": 42,
  "new_position": 999  // Larger than sibling count = last position
}
</example>

## RETURN FORMAT:
{
  "success": true,
  "card": {
    "id": 67,
    "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
    "parent_id": 89,  // New parent
    "title": "Shadowfell Creatures",
    "card_type": "text",
    "content": {...},
    "information_level_id": 2,
    "position": 0,  // New position
    "created_at": 1729622400,
    "updated_at": 1729709000  // Updated timestamp
  },
  "affected_cards": [
    {"id": 68, "position": 1},  // Siblings that shifted
    {"id": 69, "position": 2}
  ]
}

## ERRORS:
- MOVE_ERROR: Invalid move operation
- CIRCULAR_REFERENCE: Attempted to create circular hierarchy
- NOT_FOUND: Card doesn't exist`,
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' },
        new_parent_id: { type: ['string', 'null'] },
        new_position: { type: 'number' }
      },
      required: ['card_id', 'campaign_id', 'new_parent_id', 'new_position']
    }
  },

  // Hierarchy navigation tools
  {
    name: 'get_card_path',
    description: `Get the hierarchical path from root to a specific card.

## WHAT THIS IS FOR:
Traces the complete ancestry path from a card up to the campaign root.
Useful for breadcrumb navigation, understanding card location in hierarchy,
and displaying the full context of where a card sits in the wiki structure.

## PATH FORMAT:
Returns an array of ancestor cards from root to target:
- First element is always the root card
- Last element is the requested card
- Each element includes id, title, and type

## RECOMMENDED WORKFLOW:
1. search_cards or read_card to get a card ID
2. get_card_path to understand its location
3. Use path for breadcrumb navigation
4. Consider get_siblings for related content

## COMMON USE CASES:
- Building breadcrumb navigation UI
- Understanding deep nesting structure
- Finding the chapter a section belongs to
- Verifying card hierarchy before moves
- Generating table of contents

## EXAMPLES:

<example description="Get path to a deeply nested card">
{
  "card_id": 156,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}
</example>

<example description="Verify location before moving a card">
{
  "card_id": 89,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}
</example>

## RETURN FORMAT:
{
  "path": [
    {
      "id": 1,
      "title": "Campaign Root",
      "card_type": "text",
      "information_level_id": null
    },
    {
      "id": 12,
      "title": "Act 2: Rising Darkness",
      "card_type": "text",
      "information_level_id": null
    },
    {
      "id": 42,
      "title": "Chapter 3: The Shadowfell Incursion",
      "card_type": "text",
      "information_level_id": null
    },
    {
      "id": 156,
      "title": "Section 3.2: The Portal Opens",
      "card_type": "text",
      "information_level_id": 2
    }
  ],
  "depth": 4  // Number of levels from root
}

## ERRORS:
- CARD_NOT_FOUND: Card doesn't exist
- VALIDATION_ERROR: Invalid parameters`,
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'get_subtree',
    description: `Get a card and all its descendants up to a specified depth.

## WHAT THIS IS FOR:
Retrieves a hierarchical tree structure starting from a card and including
all descendants up to a specified depth. Perfect for displaying collapsible
tree views, generating sitemaps, or understanding the scope of a section.

## DEPTH BEHAVIOR:
- depth 1 = Only the card itself
- depth 2 = Card + direct children
- depth 3 = Card + children + grandchildren
- Maximum depth: 10 (prevents infinite recursion)
- Default depth: 3 (reasonable for most uses)

## TREE STRUCTURE:
Each node includes:
- Full card metadata (id, title, type)
- Array of child nodes (recursive)
- has_more_children flag when depth limit reached

## RECOMMENDED WORKFLOW:
1. Start with shallow depth (2-3) for overview
2. Note has_more_children flags
3. Request deeper subtrees for specific branches
4. Use for tree view UI components

## PERFORMANCE CONSIDERATIONS:
- Depth 3-4 is usually sufficient
- Deep trees can return hundreds of cards
- Consider pagination for large wikis
- Use list_children for single-level views

## EXAMPLES:

<example description="Get a chapter with its sections (2 levels)">
{
  "card_id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "max_depth": 2
}
</example>

<example description="Get complete subtree for small section">
{
  "card_id": 67,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "max_depth": 5
}
</example>

<example description="Preview card with default depth">
{
  "card_id": 12,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}
Uses default max_depth of 3
</example>

## RETURN FORMAT:
{
  "tree": {
    "id": 42,
    "title": "Chapter 3: The Shadowfell Incursion",
    "card_type": "text",
    "information_level_id": null,
    "children": [
      {
        "id": 67,
        "title": "Section 3.1: First Contact",
        "card_type": "text",
        "information_level_id": null,
        "children": [
          {
            "id": 89,
            "title": "The Shadow Cultists",
            "card_type": "text",
            "information_level_id": 2,
            "children": [],
            "has_more_children": false
          }
        ],
        "has_more_children": false
      },
      {
        "id": 68,
        "title": "Section 3.2: The Portal",
        "card_type": "text",
        "information_level_id": null,
        "children": [],
        "has_more_children": true  // Has children beyond max_depth
      }
    ],
    "has_more_children": false
  },
  "max_depth": 3
}

## ERRORS:
- CARD_NOT_FOUND: Starting card doesn't exist
- DEPTH_LIMIT_EXCEEDED: Requested depth > 10
- VALIDATION_ERROR: Invalid parameters`,
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' },
        max_depth: { type: 'number', minimum: 1, maximum: 10 }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'list_children',
    description: `List all direct child cards of a specific card.

## WHAT THIS IS FOR:
Retrieves immediate children of a card (one level only). More efficient
than get_subtree when you only need direct descendants. Returns children
in their position order for consistent display.

## PARENT_ID BEHAVIOR:
- **null**: Lists root-level cards (top of hierarchy)
- **number**: Lists children of specified card
- Non-existent parent returns error

## ORDERING:
- Children always returned in position order
- Position 0 appears first
- Maintains user-defined organization

## RECOMMENDED WORKFLOW:
1. Use for navigation menus
2. Build collapsible tree views incrementally
3. Check child count before deletion
4. Verify position before adding siblings

## COMMON USE CASES:
- Building navigation sidebars
- Displaying table of contents
- Checking for children before delete
- Finding insertion points for new cards
- Lazy-loading tree views

## EXAMPLES:

<example description="List all root-level cards">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": null
}
</example>

<example description="List sections within a chapter">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": 42
}
</example>

<example description="Check if card has children before deletion">
{
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "parent_id": 89
}
If count = 0, safe to delete without losing content
</example>

## RETURN FORMAT:
{
  "children": [
    {
      "id": 67,
      "title": "Section 3.1: First Contact",
      "card_type": "text",
      "information_level_id": null,
      "position": 0
    },
    {
      "id": 68,
      "title": "Section 3.2: The Portal Opens",
      "card_type": "text",
      "information_level_id": 2,
      "position": 1
    },
    {
      "id": 69,
      "title": "Section 3.3: Into Darkness",
      "card_type": "text",
      "information_level_id": null,
      "position": 2
    }
  ],
  "count": 3
}

## ERRORS:
- CARD_NOT_FOUND: Parent card doesn't exist (if parent_id provided)
- VALIDATION_ERROR: Invalid parameters`,
    inputSchema: {
      type: 'object',
      properties: {
        parent_id: { type: ['string', 'null'] },
        campaign_id: { type: 'string' }
      },
      required: ['campaign_id']
    }
  },
  {
    name: 'get_siblings',
    description: `Get all sibling cards (cards with the same parent) of a specific card.

## WHAT THIS IS FOR:
Retrieves all cards that share the same parent as the specified card,
excluding the card itself. Useful for navigation between related content
at the same hierarchy level, like moving between chapters or sections.

## SIBLING DEFINITION:
- Same parent_id = siblings
- Excludes the requested card itself
- Root cards (parent_id = null) are siblings
- Ordered by position

## RECOMMENDED WORKFLOW:
1. read_card to get current card
2. get_siblings to find related content
3. Build previous/next navigation
4. Display related sections

## COMMON USE CASES:
- Previous/Next chapter navigation
- Showing related sections in sidebar
- Finding peer content for cross-references
- Building horizontal navigation
- Reordering cards among siblings

## EXAMPLES:

<example description="Get all other sections in same chapter">
{
  "card_id": 67,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}
If card 67 is in chapter 3, returns all other sections in chapter 3
</example>

<example description="Find sibling chapters in same act">
{
  "card_id": 42,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}
</example>

<example description="Get other root-level cards">
{
  "card_id": 1,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5"
}
If card 1 is at root, returns all other root cards
</example>

## RETURN FORMAT:
{
  "siblings": [
    {
      "id": 41,
      "title": "Chapter 2: The Gathering Storm",
      "card_type": "text",
      "information_level_id": null,
      "position": 0
    },
    {
      "id": 43,
      "title": "Chapter 4: The Final Battle",
      "card_type": "text",
      "information_level_id": null,
      "position": 2
    }
  ],
  "count": 2  // Excludes the requested card itself
}

## ERRORS:
- CARD_NOT_FOUND: Requested card doesn't exist
- VALIDATION_ERROR: Invalid parameters`,
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'get_ancestor',
    description: `Get the nearest ancestor of a specific type.

## WHAT THIS IS FOR:
Traverses up the hierarchy to find the nearest ancestor card of a specified
type (text, database, or map). Useful for finding which database or map
a card belongs to, or finding the containing chapter/act structure.

## ANCESTOR SEARCH:
- Searches upward from card's parent
- Stops at first match of specified type
- Returns null if no ancestor of that type
- Doesn't include the card itself

## COMMON USE CASES:
- Finding which map a location pin belongs to
- Determining database context for entries
- Finding chapter that contains a section
- Locating act that contains a scene
- Building contextual navigation

## TYPE MATCHING:
- 'text': Standard content cards
- 'database': Database view cards
- 'map': Interactive map cards

## EXAMPLES:

<example description="Find the map this location belongs to">
{
  "card_id": 234,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "ancestor_type": "map"
}
</example>

<example description="Find parent database for an entry">
{
  "card_id": 156,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "ancestor_type": "database"
}
</example>

<example description="Find containing chapter (assuming chapters are text cards)">
{
  "card_id": 89,
  "campaign_id": "1ceec234-523b-4e25-a0b5-097c71018be5",
  "ancestor_type": "text"
}
</example>

## RETURN FORMAT (when found):
{
  "ancestor": {
    "id": 42,
    "title": "Waterdeep City Map",
    "card_type": "map",
    "depth": 3  // Levels above the requested card
  },
  "found": true
}

## RETURN FORMAT (when not found):
{
  "ancestor": null,
  "found": false
}

## ERRORS:
- CARD_NOT_FOUND: Starting card doesn't exist
- VALIDATION_ERROR: Invalid parameters or ancestor_type`,
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' },
        ancestor_type: { type: 'string', enum: ['text', 'database', 'map'] }
      },
      required: ['card_id', 'campaign_id', 'ancestor_type']
    }
  }
];

/**
 * Handler for read_card tool
 */
async function handleReadCard(params: any) {
  try {
    const validated = ReadCardInputSchema.parse(params);

    // Query card with campaign validation
    const row = db.prepare(`
      SELECT * FROM cards
      WHERE id = ? AND campaign_id = ?
    `).get(validated.card_id, validated.campaign_id) as CardRow | undefined;

    if (!row) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    const card = rowToCard(row);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: card.id,
          campaign_id: card.campaignId,
          parent_id: card.parentId ? card.parentId : null,
          title: card.title,
          card_type: card.type === 'page' ? 'map' : card.type,
          content: card.content,
          information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
          position: card.position,
          created_at: Math.floor(card.createdAt.getTime() / 1000),
          updated_at: Math.floor(card.updatedAt.getTime() / 1000)
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
 * Handler for create_card tool
 */
async function handleCreateCard(params: any) {
  try {
    const validated = CreateCardInputSchema.parse(params);
    const cardService = new CardService();

    // MCP context: Get campaign owner to bypass ownership check
    // MCP tools don't have user sessions, so we use the campaign owner
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(validated.campaign_id) as { owner_id: string } | undefined;

    if (!campaign) {
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

    const userId = campaign.owner_id;

    // Create card using CardService
    const card = await cardService.createCard({
      campaignId: validated.campaign_id,
      parentId: validated.parent_id?.toString() || undefined,
      type: validated.card_type === 'text' ? 'text' : validated.card_type === 'map' ? 'page' : validated.card_type,
      title: validated.title,
      content: validated.content,
      informationLevelId: validated.information_level_id?.toString(),
      position: 0 // Will be calculated by service
    }, userId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: card.id,
          campaign_id: card.campaignId,
          parent_id: card.parentId ? card.parentId : null,
          title: card.title,
          card_type: card.type === 'page' ? 'map' : card.type,
          content: card.content,
          information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
          position: card.position,
          created_at: Math.floor(card.createdAt.getTime() / 1000),
          updated_at: Math.floor(card.updatedAt.getTime() / 1000)
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'CREATE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for update_card tool
 */
async function handleUpdateCard(params: any) {
  try {
    const validated = UpdateCardInputSchema.parse(params);

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (validated.title !== undefined) {
      updates.push('title = ?');
      values.push(validated.title);
    }

    if (validated.content !== undefined) {
      updates.push('content = ?');
      values.push(JSON.stringify(validated.content));
    }

    if (validated.information_level_id !== undefined) {
      updates.push('information_level_id = ?');
      values.push(validated.information_level_id?.toString() || 'system');
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at
    updates.push("updated_at = strftime('%s', 'now')");

    // Add WHERE clause parameters
    values.push(validated.card_id);
    values.push(validated.campaign_id);

    // Execute update
    const result = db.prepare(`
      UPDATE cards
      SET ${updates.join(', ')}
      WHERE id = ? AND campaign_id = ?
    `).run(...values);

    if (result.changes === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    // Fetch updated card
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(validated.card_id) as CardRow;
    const card = rowToCard(row);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: card.id,
          campaign_id: card.campaignId,
          parent_id: card.parentId ? card.parentId : null,
          title: card.title,
          card_type: card.type === 'page' ? 'map' : card.type,
          content: card.content,
          information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
          position: card.position,
          created_at: Math.floor(card.createdAt.getTime() / 1000),
          updated_at: Math.floor(card.updatedAt.getTime() / 1000)
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'UPDATE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for delete_card tool
 */
async function handleDeleteCard(params: any) {
  try {
    const validated = DeleteCardInputSchema.parse(params);
    const cardService = new CardService();

    // Get card and its path for subtree deletion
    const card = db.prepare(`
      SELECT id, path FROM cards
      WHERE id = ? AND campaign_id = ?
    `).get(validated.card_id, validated.campaign_id) as { id: string; path: string } | undefined;

    if (!card) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    // Get all cards that will be deleted (card + subtree)
    const toDelete = db.prepare(`
      SELECT id FROM cards
      WHERE path LIKE ? OR id = ?
    `).all(`${card.path}/%`, validated.card_id) as { id: string }[];

    // Delete using CardService (handles references and CASCADE)
    const result = await cardService.deleteCard(validated.card_id.toString(), { force: true });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          deleted_count: result.deleted_count,
          deleted_cards: toDelete.map(c => parseInt(c.id))
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'DELETE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for search_cards tool
 */
async function handleSearchCards(params: any) {
  try {
    const validated = SearchCardsInputSchema.parse(params);

    // Build search query
    let query = `
      SELECT id, title, type, parent_id, path, content, information_level_id
      FROM cards
      WHERE campaign_id = ?
      AND (title LIKE ? OR content LIKE ?)
    `;
    const values: any[] = [
      validated.campaign_id,
      `%${validated.query}%`,
      `%${validated.query}%`
    ];

    // Add optional filters
    if (validated.card_type) {
      const dbType = validated.card_type === 'map' ? 'page' : validated.card_type;
      query += ' AND type = ?';
      values.push(dbType);
    }

    if (validated.information_level_id !== undefined) {
      query += ' AND information_level_id = ?';
      values.push(validated.information_level_id?.toString() || 'system');
    }

    query += ` LIMIT ${validated.limit || 20}`;

    const rows = db.prepare(query).all(...values) as CardRow[];

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as count
      FROM cards
      WHERE campaign_id = ?
      AND (title LIKE ? OR content LIKE ?)
    `;
    const countValues = [validated.campaign_id, `%${validated.query}%`, `%${validated.query}%`];

    if (validated.card_type) {
      countQuery += ' AND type = ?';
      countValues.push(validated.card_type === 'map' ? 'page' : validated.card_type);
    }

    if (validated.information_level_id !== undefined) {
      countQuery += ' AND information_level_id = ?';
      countValues.push(validated.information_level_id?.toString() || 'system');
    }

    const { count } = db.prepare(countQuery).get(...countValues) as { count: number };

    // Format results
    const cards = rows.map(row => {
      const content = row.content ? JSON.parse(row.content) : null;
      const snippet = content?.content?.[0]?.content?.[0]?.text || row.title || '';

      return {
        id: parseInt(row.id),
        title: row.title || 'Untitled',
        card_type: row.type === 'page' ? 'map' : row.type as any,
        parent_id: row.parent_id ? parseInt(row.parent_id) : null,
        path: row.path,
        snippet: snippet.substring(0, 200),
        information_level_id: row.information_level_id === 'system' ? null : parseInt(row.information_level_id)
      };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          cards,
          total_count: count
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'SEARCH_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for move_card tool
 */
async function handleMoveCard(params: any) {
  try {
    const validated = MoveCardInputSchema.parse(params);
    const cardService = new CardService();

    // MCP context: Get campaign owner
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(validated.campaign_id) as { owner_id: string } | undefined;

    if (!campaign) {
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

    const userId = campaign.owner_id;

    // Move card using CardService
    const card = await cardService.moveCard(
      validated.card_id.toString(),
      validated.new_parent_id?.toString() || null,
      validated.new_position,
      userId
    );

    // Get affected cards (siblings at new position)
    const affectedRows = db.prepare(`
      SELECT id, position FROM cards
      WHERE campaign_id = ?
      AND parent_id ${validated.new_parent_id ? '= ?' : 'IS NULL'}
      AND position >= ?
      AND id != ?
      ORDER BY position
    `).all(
      validated.campaign_id,
      ...(validated.new_parent_id ? [validated.new_parent_id] : []),
      validated.new_position,
      validated.card_id
    ) as { id: string; position: number }[];

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          card: {
            id: card.id,
            campaign_id: card.campaignId,
            parent_id: card.parentId ? card.parentId : null,
            title: card.title,
            card_type: card.type === 'page' ? 'map' : card.type,
            content: card.content,
            information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
            position: card.position,
            created_at: Math.floor(card.createdAt.getTime() / 1000),
            updated_at: Math.floor(card.updatedAt.getTime() / 1000)
          },
          affected_cards: affectedRows.map(r => ({
            id: parseInt(r.id),
            position: r.position
          }))
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'MOVE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for get_card_path tool (hierarchy navigation)
 */
async function handleGetCardPath(params: any) {
  try {
    const validated = GetCardPathInputSchema.parse(params);

    const path: any[] = [];
    let currentCardId: string | null = validated.card_id;

    // Traverse up the hierarchy
    while (currentCardId !== null) {
      const row = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(currentCardId, validated.campaign_id) as CardRow | undefined;

      if (!row) {
        if (path.length === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'CARD_NOT_FOUND',
                message: `Card not found: ${currentCardId}`
              })
            }]
          };
        }
        break;
      }

      const card = rowToCard(row);
      path.unshift({
        id: card.id,
        title: card.title,
        card_type: card.type === 'page' ? 'map' : card.type,
        information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId)
      });

      currentCardId = card.parentId ? card.parentId : null;
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          path,
          depth: path.length
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
 * Handler for get_subtree tool (hierarchy navigation)
 */
async function handleGetSubtree(params: any) {
  try {
    const validated = GetSubtreeInputSchema.parse(params);
    const maxDepth = validated.max_depth || 3;

    // Recursive function to build tree
    const buildSubtree = (cardId: string, currentDepth: number): any => {
      if (currentDepth > maxDepth) {
        return null;
      }

      const row = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(cardId, validated.campaign_id) as CardRow | undefined;

      if (!row) {
        return null;
      }

      const card = rowToCard(row);

      // Get children
      const childRows = db.prepare(`
        SELECT * FROM cards
        WHERE parent_id = ? AND campaign_id = ?
        ORDER BY position ASC
      `).all(cardId, validated.campaign_id) as CardRow[];

      const children = currentDepth < maxDepth
        ? childRows.map(childRow => buildSubtree(childRow.id, currentDepth + 1)).filter(Boolean)
        : [];

      return {
        id: card.id,
        title: card.title,
        card_type: card.type === 'page' ? 'map' : card.type,
        information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
        children,
        has_more_children: currentDepth >= maxDepth && childRows.length > 0
      };
    };

    const tree = buildSubtree(validated.card_id, 1);

    if (!tree) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          tree,
          max_depth: maxDepth
        })
      }]
    };
  } catch (error: any) {
    if (error.message?.includes('depth')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'DEPTH_LIMIT_EXCEEDED',
            message: 'Maximum depth exceeded'
          })
        }]
      };
    }
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
 * Handler for list_children tool (hierarchy navigation)
 */
async function handleListChildren(params: any) {
  try {
    const validated = ListChildrenInputSchema.parse(params);

    // If parent_id is provided, verify it exists
    if (validated.parent_id !== null) {
      const parentRow = db.prepare(`
        SELECT id FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(validated.parent_id, validated.campaign_id);

      if (!parentRow) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'CARD_NOT_FOUND',
              message: `Parent card not found: ${validated.parent_id}`
            })
          }]
        };
      }
    }

    // Get all children
    const childRows = db.prepare(`
      SELECT * FROM cards
      WHERE parent_id ${validated.parent_id !== null ? '= ?' : 'IS NULL'}
        AND campaign_id = ?
      ORDER BY position ASC
    `).all(
      ...(validated.parent_id !== null ? [validated.parent_id, validated.campaign_id] : [validated.campaign_id])
    ) as CardRow[];

    const children = childRows.map(row => {
      const card = rowToCard(row);
      return {
        id: card.id,
        title: card.title,
        card_type: card.type === 'page' ? 'map' : card.type,
        information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
        position: card.position
      };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          children,
          count: children.length
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
 * Handler for get_siblings tool (hierarchy navigation)
 */
async function handleGetSiblings(params: any) {
  try {
    const validated = GetSiblingsInputSchema.parse(params);

    // Get the target card to find its parent
    const targetRow = db.prepare(`
      SELECT parent_id FROM cards
      WHERE id = ? AND campaign_id = ?
    `).get(validated.card_id, validated.campaign_id) as { parent_id: string | null } | undefined;

    if (!targetRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    // Get all siblings (same parent, excluding self)
    const siblingRows = db.prepare(`
      SELECT * FROM cards
      WHERE parent_id ${targetRow.parent_id ? '= ?' : 'IS NULL'}
        AND campaign_id = ?
        AND id != ?
      ORDER BY position ASC
    `).all(
      ...(targetRow.parent_id ? [targetRow.parent_id, validated.campaign_id, validated.card_id] : [validated.campaign_id, validated.card_id])
    ) as CardRow[];

    const siblings = siblingRows.map(row => {
      const card = rowToCard(row);
      return {
        id: card.id,
        title: card.title,
        card_type: card.type === 'page' ? 'map' : card.type,
        information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
        position: card.position
      };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          siblings,
          count: siblings.length
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
 * Handler for get_ancestor tool (hierarchy navigation)
 */
async function handleGetAncestor(params: any) {
  try {
    const validated = GetAncestorInputSchema.parse(params);

    let currentCardId: string | null = validated.card_id;
    let depth = 0;

    // Traverse up the hierarchy looking for ancestor of specified type
    while (currentCardId !== null) {
      const row = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(currentCardId, validated.campaign_id) as CardRow | undefined;

      if (!row) {
        if (depth === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'CARD_NOT_FOUND',
                message: `Card not found: ${currentCardId}`
              })
            }]
          };
        }
        break;
      }

      const card = rowToCard(row);
      const cardType = card.type === 'page' ? 'map' : card.type;

      // Skip the starting card, only check ancestors
      if (depth > 0 && cardType === validated.ancestor_type) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ancestor: {
                id: card.id,
                title: card.title,
                card_type: cardType,
                depth
              },
              found: true
            })
          }]
        };
      }

      currentCardId = card.parentId ? card.parentId : null;
      depth++;
    }

    // No ancestor of the specified type found
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ancestor: null,
          found: false
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
 * Handler for batch_create_cards tool
 */
async function handleBatchCreateCards(params: any) {
  try {
    const { campaign_id, cards } = params;

    // Get campaign owner for auth
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(campaign_id) as { owner_id: string } | undefined;

    if (!campaign) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CAMPAIGN_NOT_FOUND',
            message: `Campaign not found: ${campaign_id}`
          })
        }]
      };
    }

    const cardService = new CardService();
    const createdCards: any[] = [];
    const placeholderMap: Record<string, string> = {};

    // Process cards in order
    for (const cardSpec of cards) {
      // Resolve parent reference
      let parentId: string | null = null;
      if (cardSpec.parent_ref === '@root') {
        parentId = null; // Root level
      } else if (cardSpec.parent_ref.startsWith('@')) {
        // Lookup placeholder
        parentId = placeholderMap[cardSpec.parent_ref] || null;
        if (!parentId) {
          throw new Error(`Parent reference ${cardSpec.parent_ref} not found in placeholder map`);
        }
      } else {
        // Direct UUID
        parentId = cardSpec.parent_ref;
      }

      // Create the card
      const card = await cardService.createCard({
        campaignId: campaign_id,
        parentId: parentId || undefined,
        type: cardSpec.card_type === 'map' ? 'page' : cardSpec.card_type,
        title: cardSpec.title || 'Untitled',
        content: cardSpec.content,
        informationLevelId: cardSpec.information_level_id?.toString(),
        position: 0
      }, campaign.owner_id);

      createdCards.push({
        id: card.id,
        title: card.title,
        card_type: card.type,
        parent_id: card.parentId
      });

      // Store placeholder if provided
      if (cardSpec.placeholder) {
        placeholderMap[cardSpec.placeholder] = card.id;
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          created_count: createdCards.length,
          placeholder_map: placeholderMap,
          cards: createdCards
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'BATCH_CREATE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

// Export all handlers for use in index.ts
export {
  handleBatchCreateCards,
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
};