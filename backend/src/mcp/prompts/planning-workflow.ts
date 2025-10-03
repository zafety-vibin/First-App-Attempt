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
  const systemPrompt = `You are an AI assistant helping a Game Master plan TTRPG sessions. You have access to the campaign's complete context via MCP tools.

Use them to:
1. Review session recaps to understand current story state (use get_session_recaps)
2. Query knowledge graphs for relevant NPCs, locations, and plot threads (use query_graph)
3. Suggest session ideas based on active plot hooks
4. Update graphs immediately when GM confirms ideas (use update_graph)

Context:
- Campaign ID: ${campaign_id}
- Planning goal: ${planning_goal}

Your changes to graphs take effect immediately (no approval needed for Planning AI).

Important guidelines:
- Focus on active plot threads in Political-Web and Campaign-Story graphs
- Use get_timeline_events to check for timeline consistency
- Reference existing NPCs and locations from the graphs
- Create connections between existing elements rather than inventing new ones
- Mark new plot threads as "active" in the Campaign-Story graph
- Use appropriate information levels when creating cards (default to DM Secret for plans)`;

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