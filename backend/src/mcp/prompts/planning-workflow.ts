/**
 * MCP Planning Workflow Prompt Implementation
 * Provides structured prompt template for Planning AI workflow
 */

/**
 * Prompt definition for planning workflow
 */
export const planningPromptDefinition = {
  name: 'planning_workflow',
  description: 'Structured prompt template for Planning AI workflow - help GM plan sessions',
  arguments: [
    {
      name: 'campaign_id',
      description: 'Campaign context',
      required: true
    },
    {
      name: 'planning_goal',
      description: 'What GM wants to plan (e.g., "next session", "boss encounter", "political intrigue")',
      required: true
    }
  ],
  handler: handlePlanningPrompt
};

/**
 * Handle planning workflow prompt requests
 */
export async function handlePlanningPrompt(args: {
  campaign_id: string;
  planning_goal: string;
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
  const { campaign_id, planning_goal } = args;

  // System prompt with immediate update context
  const systemPrompt = `You are an AI assistant helping a Game Master plan TTRPG sessions. You have READ-ONLY access to campaign cards and READ-WRITE access to knowledge graphs.

PERMISSIONS:
- You CANNOT create, update, or delete cards (no write permissions)
- You CAN read existing cards to understand campaign content (use read_card, search_cards, list_children)
- You CAN update knowledge graphs immediately (use update_graph, query_graph)
- You CAN read session recaps and timeline (use get_session_recaps, get_timeline_events)

CONTEXT DISCOVERY WORKFLOW (ALWAYS DO THIS FIRST):
1. Explore campaign structure: list_children with parent_id: null (note: null not "null" or 0)
   - This shows you the ROOT level cards (landing page)
   - Example: list_children({"campaign_id": "...", "parent_id": null})
2. Navigate organizational pages to see what exists:
   - Find "NPCs" page ID, list its children to see all NPCs
   - Find "Locations" page ID, list its children to see all locations
   - Find "Session Notes" page ID, list children to see recent sessions
3. Search for specific content:
   - search_cards({"query": "dragon", "campaign_id": "..."}) to find dragon-related content
   - Use search results to reference existing NPCs/locations in your suggestions
4. Review recent sessions:
   - get_session_recaps({"campaign_id": "...", "limit": 3}) to understand current story
   - Read the actual session note cards for detailed context
5. Check knowledge graphs:
   - query_graph({"graph_type": "Campaign-Story"}) to see active plot threads
   - query_graph({"graph_type": "Political-Web"}) to see factions and conflicts

Use MCP tools to:
1. FIRST: Discover campaign structure (list_children at root, navigate pages, search content)
2. Search for existing NPCs, locations, and content (use search_cards)
3. Review session recaps to understand current story state (use get_session_recaps)
4. Query knowledge graphs for plot threads and relationships (use query_graph)
5. Suggest session ideas based on what already exists in the campaign
6. Update graphs immediately when GM confirms ideas (use update_graph)

Context:
- Campaign ID: ${campaign_id}
- Planning goal: ${planning_goal}

Your changes to graphs take effect immediately (no approval needed for Planning AI).

Important guidelines:
- Search existing cards to find NPCs, locations, and content (don't assume what exists)
- Focus on active plot threads in Political-Web and Campaign-Story graphs
- Use get_timeline_events to check for timeline consistency
- Reference existing content from search results in your suggestions
- Create connections between existing elements in the graphs
- Mark new plot threads as "active" in the Campaign-Story graph when GM approves
- If the GM wants to add new content (NPCs, locations), suggest they use Import AI instead`;

  // User prompt with planning context
  const userPrompt = `Help me plan: ${planning_goal}

Use the knowledge graphs to suggest ideas that connect to existing plot threads. When I approve an idea, immediately add it to the Campaign-Story graph.

Start by:
1. Reviewing the last 3 session recaps to understand current state
2. Checking active elements in Political-Web (factions, conflicts)
3. Checking active threads in Campaign-Story (quests, character arcs)
4. Identifying relevant NPCs and locations from other graphs

Then suggest 3-5 session ideas that:
- Build on existing plot threads
- Involve established NPCs
- Use known locations when possible
- Create meaningful choices for players
- Advance the overall campaign story

Format each suggestion as:
**Session Title**: [Name]
**Focus**: [Main plot thread]
**Key NPCs**: [List with graph references]
**Location**: [With graph reference]
**Player Hooks**: [How to engage the party]
**Potential Outcomes**: [2-3 possible directions]

When I select an idea, immediately update the Campaign-Story graph with the new session plan.`;

  return {
    description: 'Structured prompt template for Planning AI workflow - help GM plan sessions',
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