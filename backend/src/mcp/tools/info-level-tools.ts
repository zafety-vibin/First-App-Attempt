/**
 * MCP Information Level Tools Implementation
 * Provides 2 tools for information level management: list_information_levels, get_information_level_by_name
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

    // Get all information levels for the campaign
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
    description: 'List all information levels for a campaign',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' }
      },
      required: ['campaign_id']
    },
    handler: handleListInformationLevels
  },
  {
    name: 'get_information_level_by_name',
    description: 'Get an information level by name with fuzzy matching',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        name: { type: 'string' }
      },
      required: ['campaign_id', 'name']
    },
    handler: handleGetInformationLevelByName
  }
];