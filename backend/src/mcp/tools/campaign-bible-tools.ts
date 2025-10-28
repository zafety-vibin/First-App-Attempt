/**
 * Campaign Bible MCP Tools
 * Feature: Campaign Bible Enhancement
 *
 * Provides AI access to Campaign Bible documents (meta-level campaign governance).
 */

import { CampaignSettingsService } from '../../services/CampaignSettingsService';
import { CampaignService } from '../../services/CampaignService';

/**
 * Tool Definitions
 */
export const bibleTool = {
  name: 'get_campaign_bible',
  description: `Fetch the Campaign Bible document for a campaign.

## WHAT THIS IS:
The Campaign Bible is a meta-level governance document that establishes:
- Setting identity (genre, technology, magic, reality)
- Universal campaign rules (narrative tone, content boundaries, player agency)
- Worldbuilding constants (history, religions, politics, economics)

## WHEN TO USE:
- Understanding campaign tone and themes
- Checking content boundaries before generating suggestions
- Learning worldbuilding constants (not to be confused with active in-world content)
- Distinguishing between meta-rules (bible) vs in-world relationships (knowledge graphs) vs mechanical rules (world_rules database)

## BIBLE vs GRAPHS vs WORLD RULES:
- **Campaign Bible**: Meta-level governance (tone, boundaries, historical constants)
- **Knowledge Graphs**: In-world relationships (NPC connections, faction alliances)
- **World Rules Database**: In-lore mechanics (magic systems, custom combat rules)
- **Lore Database**: More specific, including less world defining historical constants and history. (Unchanging histories, completed stories)

Use this tool to understand the campaign's foundational context before making suggestions.
`,
  inputSchema: {
    type: 'object',
    properties: {
      campaign_id: {
        type: 'string',
        description: 'Campaign UUID (format: uuid-style string)'
      }
    },
    required: ['campaign_id']
  }
};

/**
 * Handler: Get Campaign Bible
 */
export async function handleGetCampaignBible(params: any) {
  const { campaign_id } = params;

  // Validate campaign exists
  const campaign = CampaignService.getCampaignById(campaign_id);
  if (!campaign) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Campaign not found',
          campaign_id
        }, null, 2)
      }]
    };
  }

  // Get bible (note: we can't validate ownership in MCP context without user_id)
  // For MCP tools, we trust the campaign_id is valid
  try {
    const bible = CampaignSettingsService.getCampaignBible(campaign_id, campaign.ownerId);

    if (!bible) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            campaign_id,
            campaign_name: campaign.name,
            bible: null,
            message: 'Campaign Bible not yet created. Complete the campaign wizard to generate it.'
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          campaign_id,
          campaign_name: campaign.name,
          bible
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'Failed to fetch Campaign Bible',
          details: error.message,
          campaign_id
        }, null, 2)
      }]
    };
  }
}
