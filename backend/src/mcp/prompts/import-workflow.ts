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

Use the MCP tools to:
1. Search for existing entities to avoid duplicates (use search_cards with similarity matching)
2. Create new cards following the one-block-per-card rule (use create_card)
3. Update knowledge graphs with relationships (use update_graph)
4. Present an approval summary before committing changes

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

Use the knowledge graph types:
- Geographical: Locations and travel routes
- Political-Web: Factions, alliances, conflicts (mark active entities)
- World-Foundations: Lore, magic systems, cosmology
- Campaign-Story: Plot threads, quests, character arcs (mark active threads)

Before making changes, show me a summary of what you'll create/update for approval. The summary should include:
1. New NPCs to create (with suggested information level)
2. New locations to create
3. Events/plot points to add
4. Relationships to establish in graphs
5. Any potential duplicates found

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