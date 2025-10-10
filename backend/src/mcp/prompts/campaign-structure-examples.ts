/**
 * MCP Campaign Structure Examples Prompt
 * Provides concrete before/after examples of campaign organization
 */

export const campaignStructureExamplesDefinition = {
  name: 'campaign_structure_examples',
  description: 'Concrete examples of campaign organization - empty campaign to fully organized',
  arguments: [
    {
      name: 'campaign_id',
      description: 'Campaign ID to use in examples',
      required: true
    }
  ],
  handler: handleCampaignStructureExamples
};

export async function handleCampaignStructureExamples(args: {
  campaign_id: string;
}): Promise<{
  description: string;
  messages: Array<{
    role: 'system' | 'user';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}> {
  const { campaign_id } = args;

  const systemPrompt = `You are looking at concrete examples of how to organize a TTRPG campaign from scratch.

CRITICAL UNDERSTANDING:
- Database stores EVERYTHING as rows in cards table
- Frontend renders these rows as visual blocks
- ONE CARD = ONE VISUAL BLOCK (heading, paragraph, list, etc.)
- PAGE cards are CONTAINERS (have title, no content, hold children)
- TEXT cards are CONTENT (no title, have content, can nest under pages)

Study these examples carefully before creating any cards.`;

  const userPrompt = `# Campaign Organization Examples

Campaign ID for all examples: ${campaign_id}

---

## EXAMPLE 1: Empty Campaign (Just Created)

**What the database looks like:**
\`\`\`
(No cards exist yet - empty table)
\`\`\`

**What you see in the frontend:**
\`\`\`
(Empty page - "Get started by creating your first page")
\`\`\`

**First step - Create root organizational pages:**
\`\`\`javascript
// Create NPCs page (container for all NPCs)
create_card({
  campaign_id: "${campaign_id}",
  card_type: "page",
  title: "NPCs"
  // NO content - pages are containers only
  // NO parent_id - defaults to "0" (root level)
})
// Returns: {id: "npc-page-id", ...}

// Create Locations page
create_card({
  campaign_id: "${campaign_id}",
  card_type: "page",
  title: "Locations"
})
// Returns: {id: "loc-page-id", ...}

// Create Session Notes page
create_card({
  campaign_id: "${campaign_id}",
  card_type: "page",
  title: "Session Notes"
})
// Returns: {id: "session-page-id", ...}
\`\`\`

**After creating these, list_children shows:**
\`\`\`javascript
list_children({campaign_id: "${campaign_id}"})  // parent_id defaults to "0"
// Returns:
{
  children: [
    {id: "npc-page-id", title: "NPCs", card_type: "page", position: 0},
    {id: "loc-page-id", title: "Locations", card_type: "page", position: 1},
    {id: "session-page-id", title: "Session Notes", card_type: "page", position: 2}
  ],
  count: 3
}
\`\`\`

---

## EXAMPLE 2: Adding Your First NPC

**Goal:** Add Gandalf under the NPCs page

**Step 1: Find the NPCs page ID**
\`\`\`javascript
list_children({campaign_id: "${campaign_id}"})
// See "NPCs" page with id: "npc-page-id"
\`\`\`

**Step 2: Create heading card for Gandalf's name**
\`\`\`javascript
create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "# Gandalf the Grey"},
  parent_id: "npc-page-id"  // Child of NPCs page
})
// Returns: {id: "gandalf-heading-id", ...}
\`\`\`

**Step 3: Create paragraph card for description**
\`\`\`javascript
create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "Wizard of the Grey Order. Arrives precisely when he means to."},
  parent_id: "npc-page-id"  // Another child of NPCs page (sibling to heading)
})
// Returns: {id: "gandalf-desc-id", ...}
\`\`\`

**Step 4: Create bullet list card for attributes**
\`\`\`javascript
create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "- Carries wooden staff\\n- Wears grey robes\\n- Rides Shadowfax"},
  parent_id: "npc-page-id"  // Third child of NPCs page
})
// Returns: {id: "gandalf-attrs-id", ...}
\`\`\`

**What list_children shows now:**
\`\`\`javascript
list_children({campaign_id: "${campaign_id}", parent_id: "npc-page-id"})
// Returns:
{
  children: [
    {id: "gandalf-heading-id", card_type: "text", position: 0},
    {id: "gandalf-desc-id", card_type: "text", position: 1},
    {id: "gandalf-attrs-id", card_type: "text", position: 2}
  ],
  count: 3
}
\`\`\`

**What the database looks like:**
\`\`\`
Table: cards
Row 1: {id: "npc-page-id", type: "page", title: "NPCs", parent_id: "0", content: null}
Row 2: {id: "gandalf-heading-id", type: "text", title: null, parent_id: "npc-page-id", content: '{"text":"# Gandalf the Grey"}'}
Row 3: {id: "gandalf-desc-id", type: "text", title: null, parent_id: "npc-page-id", content: '{"text":"Wizard of..."}'}
Row 4: {id: "gandalf-attrs-id", type: "text", title: null, parent_id: "npc-page-id", content: '{"text":"- Carries..."}'}
\`\`\`

**What user sees in browser (under NPCs page):**
\`\`\`
# Gandalf the Grey

Wizard of the Grey Order. Arrives precisely when he means to.

• Carries wooden staff
• Wears grey robes
• Rides Shadowfax
\`\`\`

---

## EXAMPLE 3: Adding a Second NPC (Avoiding Duplicates)

**Step 1: Check if Elrond already exists**
\`\`\`javascript
search_cards({campaign_id: "${campaign_id}", query: "Elrond"})
// Returns: {cards: [], count: 0}  ← Not found, safe to create
\`\`\`

**Step 2: Create Elrond cards under NPCs page**
\`\`\`javascript
create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "# Elrond Half-elven"},
  parent_id: "npc-page-id"
})

create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "Lord of Rivendell. Master of lore and healing."},
  parent_id: "npc-page-id"
})
\`\`\`

**What NPCs page looks like now:**
\`\`\`javascript
list_children({campaign_id: "${campaign_id}", parent_id: "npc-page-id"})
// Returns 5 cards (3 for Gandalf, 2 for Elrond) all stacked vertically
\`\`\`

---

## EXAMPLE 4: Nested Pages (Locations with Sub-locations)

**Goal:** Create "Rivendell" location with sub-areas

**Step 1: Create Rivendell page under Locations**
\`\`\`javascript
create_card({
  campaign_id: "${campaign_id}",
  card_type: "page",
  title: "Rivendell",
  parent_id: "loc-page-id"  // Child of Locations page
})
// Returns: {id: "rivendell-page-id", ...}
\`\`\`

**Step 2: Add description cards under Rivendell**
\`\`\`javascript
create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "# The Last Homely House"},
  parent_id: "rivendell-page-id"  // Child of Rivendell page
})

create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "Hidden valley east of the Misty Mountains. Protected by Elrond's magic."},
  parent_id: "rivendell-page-id"
})
\`\`\`

**Hierarchy visualization:**
\`\`\`
Campaign Root (parent_id: "0")
├── NPCs (page)
│   ├── # Gandalf the Grey (text)
│   ├── Wizard of the Grey Order... (text)
│   ├── - Carries wooden staff... (text)
│   ├── # Elrond Half-elven (text)
│   └── Lord of Rivendell... (text)
├── Locations (page)
│   └── Rivendell (page)  ← Nested page!
│       ├── # The Last Homely House (text)
│       └── Hidden valley east... (text)
└── Session Notes (page)
\`\`\`

---

## COMMON MISTAKES TO AVOID

### ❌ WRONG: Putting content in title
\`\`\`javascript
create_card({
  card_type: "text",
  title: "Gandalf is a wizard",  // NO! Title is for pages only!
  content: null
})
\`\`\`

### ✅ RIGHT: Content goes in content field
\`\`\`javascript
create_card({
  card_type: "text",
  content: {text: "Gandalf is a wizard"}
  // NO title for text cards!
})
\`\`\`

---

### ❌ WRONG: Multiple blocks in one card
\`\`\`javascript
create_card({
  card_type: "text",
  content: {text: "# Gandalf\\n\\nWizard of the Grey Order\\n\\n- Carries staff"}
})
// This creates ONE card with heading + paragraph + list
// Frontend can't reorder these separately!
\`\`\`

### ✅ RIGHT: One block per card
\`\`\`javascript
// Create 3 separate cards:
create_card({card_type: "text", content: {text: "# Gandalf"}})
create_card({card_type: "text", content: {text: "Wizard of the Grey Order"}})
create_card({card_type: "text", content: {text: "- Carries staff"}})
\`\`\`

---

### ❌ WRONG: Creating duplicates without checking
\`\`\`javascript
// Just create without searching
create_card({card_type: "text", content: {text: "# Gandalf"}})
// If Gandalf already exists, now you have 2!
\`\`\`

### ✅ RIGHT: Search first, then create or update
\`\`\`javascript
// Search first
const existing = search_cards({query: "Gandalf", campaign_id: "..."})
if (existing.count > 0) {
  // Update existing card
  update_card({card_id: existing.cards[0].id, content: {text: "..."}})
} else {
  // Create new
  create_card({content: {text: "# Gandalf"}})
}
\`\`\`

---

### ❌ WRONG: Using parent_id without finding it first
\`\`\`javascript
create_card({
  parent_id: "npcs-page",  // Guessing the ID!
  content: {text: "# Gandalf"}
})
\`\`\`

### ✅ RIGHT: List children to find parent ID
\`\`\`javascript
// First, find NPCs page
const root = list_children({campaign_id: "..."})
const npcsPage = root.children.find(c => c.title === "NPCs")
// Then use the actual ID
create_card({
  parent_id: npcsPage.id,
  content: {text: "# Gandalf"}
})
\`\`\`

---

## WORKFLOW TEMPLATE: Import Session Recap

When importing session notes, follow this pattern:

\`\`\`javascript
// 1. Discover structure
const root = list_children({campaign_id: "${campaign_id}"})
// See what organizational pages exist (NPCs, Locations, etc.)

// 2. Find or create session notes container
let sessionNotesPage = root.children.find(c => c.title === "Session Notes")
if (!sessionNotesPage) {
  const newPage = create_card({
    campaign_id: "${campaign_id}",
    card_type: "page",
    title: "Session Notes"
  })
  sessionNotesPage = {id: newPage.id}
}

// 3. Create session recap as child of Session Notes
create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "# Session 1: The Adventure Begins"},
  parent_id: sessionNotesPage.id
})

create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "The party met in a tavern..."},
  parent_id: sessionNotesPage.id
})

// 4. Extract NPCs mentioned in session
search_cards({campaign_id: "${campaign_id}", query: "Innkeeper"})
// If not found, create under NPCs page
const npcsPage = root.children.find(c => c.title === "NPCs")
create_card({
  campaign_id: "${campaign_id}",
  card_type: "text",
  content: {text: "# Innkeeper Tom"},
  parent_id: npcsPage.id
})

// 5. Continue for locations, items, etc.
\`\`\`

---

Now you understand the structure. Use these patterns when working with campaign: ${campaign_id}`;

  return {
    description: 'Concrete examples of campaign organization - empty campaign to fully organized',
    messages: [
      {
        role: 'system',
        content: {
          type: 'text',
          text: systemPrompt
        }
      },
      {
        role: 'user',
        content: {
          type: 'text',
          text: userPrompt
        }
      }
    ]
  };
}
