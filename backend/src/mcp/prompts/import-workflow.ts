/**
 * MCP Import Workflow Prompt Implementation
 * Provides structured prompt template for Import AI workflow
 */

/**
 * Prompt definition for import workflow
 */
export const importPromptDefinition = {
  name: 'import_workflow',
  description: 'Structured prompt template for Import AI workflow - extract entities from session notes',
  arguments: [
    {
      name: 'campaign_id',
      description: 'Campaign context',
      required: true
    },
    {
      name: 'file_content',
      description: 'Uploaded file content (PDF/DOCX/TXT/MD)',
      required: true
    },
    {
      name: 'file_type',
      description: 'File format (pdf/docx/txt/md)',
      required: true
    }
  ],
  handler: handleImportPrompt
};

/**
 * Handle import workflow prompt requests
 */
export async function handleImportPrompt(args: {
  campaign_id: string;
  file_content: string;
  file_type: string;
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
  const { campaign_id, file_content, file_type } = args;

  // System prompt with campaign context
  const systemPrompt = `You are an AI assistant helping a Game Master import session notes into their TTRPG campaign. Your task is to extract entities (NPCs, locations, events) from the provided content and add them to the campaign's knowledge graphs and card hierarchy.

CRITICAL CARD ARCHITECTURE RULES:
- ONE BLOCK PER CARD: Each heading, paragraph, or list is a SEPARATE card
- PAGE CARDS are CONTAINERS: They have a title but NO content, only child cards beneath them
- SIBLING CARDS stack vertically: Cards with the same parent_id appear one after another
- DON'T combine multiple blocks in one card (e.g., heading + paragraph = 2 separate cards)

CONTEXT DISCOVERY WORKFLOW (ALWAYS DO THIS FIRST):
1. Explore campaign structure: list_children with parent_id: null (note: null not "null" or 0)
   - This shows you the ROOT level cards (the landing page)
   - Example: list_children({"campaign_id": "...", "parent_id": null})
2. Navigate into organizational pages:
   - If you see "NPCs" page, get its ID: read_card({"card_id": npc_page_id})
   - List children under it: list_children({"parent_id": npc_page_id})
   - This shows you what NPCs already exist
3. Search for duplicates before creating:
   - search_cards({"query": "Gandalf", "campaign_id": "..."})
   - If found, update existing card instead of creating duplicate
4. Understand accepted structure:
   - Root level typically has: NPCs, Locations, Lore, Quests, Items, Session Notes
   - Each is a PAGE card (container) with child cards beneath
   - New content goes UNDER the appropriate page (e.g., new NPC → child of NPCs page)

WHERE TO ADD CONTENT:
- New NPC → Find "NPCs" page ID, create as child with parent_id: npcs_page_id
- New Location → Find "Locations" page ID, create as child
- New Lore entry → Find "Lore" page ID, create as child
- Session recap → Find "Session Notes" or "Recaps" page, create as child
- If organizational page doesn't exist, CREATE IT FIRST as a page card at root level

Use the MCP tools to:
1. FIRST: Discover campaign structure (list_children at root, navigate pages)
2. Search for existing entities to avoid duplicates (use search_cards)
3. Create new cards following the one-block-per-card rule (use create_card)
4. Update knowledge graphs with relationships (use update_graph)
5. Present an approval summary before committing changes

Context:
- Campaign ID: ${campaign_id}
- File type: ${file_type}
- Content length: ${file_content.length} characters

Important guidelines:
- Always check for existing entities before creating duplicates
- Use appropriate information levels (Common Knowledge for public info, DM Secret for hidden plots)
- Create relationships between entities in the knowledge graphs
- Group entities by type using PAGE cards (NPCs, Locations, Events, Items) with child cards under each
- Preserve exact quotes when they contain important dialogue or descriptions
- When creating structured content, make a page card first, then create child cards under it`;

  // User prompt with specific instructions
  const userPrompt = `Extract entities from this session recap and organize them into my campaign.

STEP-BY-STEP WORKFLOW:
1. First, explore the campaign structure:
   - list_children(parent_id: null) to see root pages
   - Navigate into NPCs, Locations, etc. pages to see what already exists
2. Search for duplicates:
   - Before creating "Gandalf", search_cards(query: "Gandalf") to check if he exists
   - If found, note his card_id for updating instead of creating
3. Determine where to add new content:
   - New NPC "Elrond" → Find NPCs page ID, create as child under it
   - New location "Rivendell" → Find Locations page ID, create as child
   - If organizational page missing, create it at root level first
4. Extract and organize:
   - One heading card per entity (e.g., "# Gandalf the Grey")
   - Separate paragraph cards for descriptions
   - Lists as their own cards

Use the knowledge graph types:
- Geographical: Locations and travel routes
- Political-Web: Factions, alliances, conflicts (mark active entities)
- World-Foundations: Lore, magic systems, cosmology
- Campaign-Story: Plot threads, quests, character arcs (mark active threads)

Before making changes, show me a summary of what you'll create/update for approval. The summary should include:
1. Campaign structure found (NPCs page exists? Locations page exists?)
2. Existing entities found via search (to avoid duplicates)
3. New cards to create (with parent_id showing where they'll be added)
4. Updates to existing cards (if duplicates found)
5. Relationships to establish in graphs

Session content to import:
---
${file_content}
---`;

  return {
    description: 'Structured prompt template for Import AI workflow - extract entities from session notes',
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