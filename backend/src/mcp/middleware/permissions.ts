/**
 * MCP Permissions Middleware
 * Validates campaign ownership and applies information level filtering
 */

import { db } from '../../services/DatabaseService';

export interface PermissionOptions {
  requireCampaignOwnership?: boolean;
  applyInformationFiltering?: boolean;
  viewMode?: 'dm' | 'player';
}

/**
 * Middleware to wrap tool handlers with permission checks
 */
export function withPermissions<T extends (...args: any[]) => any>(
  handler: T,
  options: PermissionOptions = {}
): T {
  const {
    requireCampaignOwnership = true,
    applyInformationFiltering = true,
    viewMode = 'dm'
  } = options;

  return (async (...args: Parameters<T>) => {
    const [params, context] = args;

    // Extract campaign_id from params (most tools have it)
    const campaignId = params?.campaign_id;
    const userId = context?.userId;

    if (requireCampaignOwnership && campaignId) {
      // Check if user owns the campaign
      const campaign = db.prepare(`
        SELECT owner_id FROM campaigns WHERE id = ?
      `).get(campaignId) as { owner_id: string } | undefined;

      if (!campaign) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'CAMPAIGN_NOT_FOUND',
              message: `Campaign not found: ${campaignId}`
            })
          }]
        };
      }

      // In MCP context, we may not always have userId (system context)
      // For prototype, allow system access
      if (userId && userId !== 'system' && campaign.owner_id !== userId) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'PERMISSION_DENIED',
              message: 'You do not have permission to access this campaign'
            })
          }]
        };
      }
    }

    // Apply information level filtering to params if needed
    if (applyInformationFiltering && viewMode === 'player') {
      // Add view mode to context for downstream handlers
      const filteredContext = {
        ...context,
        viewMode,
        informationLevelFilter: (hierarchyLevel: number | null) => {
          // Player mode: only show hierarchy_level <= 1 (Common Knowledge + Player Knowledge)
          if (hierarchyLevel === null) return true; // System level always visible
          return hierarchyLevel <= 1;
        }
      };

      return handler(params, filteredContext);
    }

    // DM mode: all information visible
    return handler(...args);
  }) as T;
}