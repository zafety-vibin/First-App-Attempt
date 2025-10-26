/**
 * MCP Category Tools Implementation (Feature 014 Integration)
 *
 * Provides 3 tools for interacting with 13 category database tables:
 * - query_category: Query NPCs, Locations, Factions, etc.
 * - create_category_entry: Create new entities
 * - update_category_entry: Update existing entities
 *
 * Integrates with Feature 018's ExternalAPIService for standardized access.
 */

import { ExternalAPIService, ValidCategory } from '../../services/ExternalAPIService';
import { z } from 'zod';

/**
 * Schemas for category tools
 */
export const QueryCategoryInputSchema = z.object({
  category: z.enum([
    'npcs', 'locations', 'factions', 'session_recaps', 'quests',
    'player_characters', 'lore_entries', 'world_rules', 'planar_forces',
    'session_prep', 'custom_mechanics', 'items', 'creatures'
  ]),
  campaign_id: z.string().uuid(),
  filters: z.record(z.any()).optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(50),
  sort: z.string().optional(),
  view_mode: z.enum(['dm_view', 'player_view']).optional().default('dm_view')
});

export const CreateCategoryEntryInputSchema = z.object({
  category: z.enum([
    'npcs', 'locations', 'factions', 'session_recaps', 'quests',
    'player_characters', 'lore_entries', 'world_rules', 'planar_forces',
    'session_prep', 'custom_mechanics', 'items', 'creatures'
  ]),
  campaign_id: z.string().uuid(),
  data: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    core_status: z.enum(['active', 'archived', 'draft', 'hidden']).optional(),
    player_knowledge: z.string().optional(),
    tags: z.array(z.string()).optional(),
    custom_fields: z.record(z.any()).optional()
  }).passthrough() // Allow category-specific fields
});

export const UpdateCategoryEntryInputSchema = z.object({
  category: z.enum([
    'npcs', 'locations', 'factions', 'session_recaps', 'quests',
    'player_characters', 'lore_entries', 'world_rules', 'planar_forces',
    'session_prep', 'custom_mechanics', 'items', 'creatures'
  ]),
  campaign_id: z.string().uuid(),
  entry_id: z.string().uuid(),
  updates: z.record(z.any()) // Partial updates
});

/**
 * Tool: query_category
 *
 * Query entities from any of the 13 category tables.
 *
 * Examples:
 * - Query all NPCs in a faction: { category: "npcs", filters: { faction_id: "..." } }
 * - Search locations by name: { category: "locations", filters: { name: "Tavern" } }
 * - Get active quests: { category: "quests", filters: { status: "in_progress" } }
 */
export async function handleQueryCategory(params: any) {
  try {
    const validated = QueryCategoryInputSchema.parse(params);

    // Use ExternalAPIService for standardized querying
    const result = await ExternalAPIService.queryEntries(
      validated.campaign_id,
      validated.category as ValidCategory,
      validated.filters,
      {
        page: validated.page,
        limit: validated.limit,
        sort: validated.sort,
        viewMode: validated.view_mode
      }
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: validated.category,
          entries: result.data,
          pagination: result.pagination,
          execution_time_ms: result.execution_time_ms
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'QUERY_FAILED',
          message: error.message,
          suggestion: 'Verify campaign_id and category are correct'
        })
      }],
      isError: true
    };
  }
}

/**
 * Tool: create_category_entry
 *
 * Create a new entity in any of the 13 category tables.
 *
 * Universal fields (all categories):
 * - name (required)
 * - description, core_status, player_knowledge, tags, custom_fields (optional)
 *
 * Category-specific fields:
 * - NPCs: race, class, level, alignment, faction_id, superior_npc_id
 * - Locations: location_type, population, parent_location_id
 * - Factions: faction_type, power_level, leader_id
 * - Quests: status, objectives, quest_giver_id
 * - etc.
 */
export async function handleCreateCategoryEntry(params: any) {
  try {
    const validated = CreateCategoryEntryInputSchema.parse(params);

    // Use ExternalAPIService for standardized creation
    const result = await ExternalAPIService.createEntry(
      validated.campaign_id,
      validated.category as ValidCategory,
      validated.data
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: validated.category,
          created_entry: result.data,
          execution_time_ms: result.execution_time_ms
        }, null, 2)
      }]
    };
  } catch (error: any) {
    // Check for validation errors
    if (error.message.includes('required') || error.message.includes('references non-existent')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'VALIDATION_ERROR',
            message: error.message,
            suggestion: 'Check required fields and foreign key references'
          })
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'CREATE_FAILED',
          message: error.message
        })
      }],
      isError: true
    };
  }
}

/**
 * Tool: update_category_entry
 *
 * Update an existing entity with partial field updates.
 * Auto-refreshes updated_at timestamp.
 */
export async function handleUpdateCategoryEntry(params: any) {
  try {
    const validated = UpdateCategoryEntryInputSchema.parse(params);

    // Use ExternalAPIService for standardized updates
    const result = await ExternalAPIService.updateEntry(
      validated.campaign_id,
      validated.category as ValidCategory,
      validated.entry_id,
      validated.updates
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: validated.category,
          updated_entry: result.data,
          execution_time_ms: result.execution_time_ms
        }, null, 2)
      }]
    };
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'ENTRY_NOT_FOUND',
            message: `Entry ${params.entry_id} not found in ${params.category}`,
            suggestion: 'Verify the entry ID is correct'
          })
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'UPDATE_FAILED',
          message: error.message
        })
      }],
      isError: true
    };
  }
}

/**
 * Tool: delete_category_entry
 *
 * Delete an entity with two-phase confirmation (matches Feature 018 external API).
 */
export const DeleteCategoryEntryInputSchema = z.object({
  category: z.enum([
    'npcs', 'locations', 'factions', 'session_recaps', 'quests',
    'player_characters', 'lore_entries', 'world_rules', 'planar_forces',
    'session_prep', 'custom_mechanics', 'items', 'creatures'
  ]),
  campaign_id: z.string().uuid(),
  entry_id: z.string().uuid(),
  confirm: z.boolean().optional().default(false),
  confirmation_token: z.string().optional()
});

export async function handleDeleteCategoryEntry(params: any) {
  try {
    const validated = DeleteCategoryEntryInputSchema.parse(params);

    if (!validated.confirm) {
      // Phase 1: Preview deletion
      const preview = await ExternalAPIService.previewDelete(
        validated.campaign_id,
        validated.category as ValidCategory,
        validated.entry_id
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            phase: 'preview',
            category: validated.category,
            entry: preview.preview.entry,
            affected_references: preview.preview.affected_references,
            confirmation_token: preview.confirmation_token,
            expires_at: preview.expires_at,
            message: 'To confirm deletion, call this tool again with confirm=true and the confirmation_token'
          }, null, 2)
        }]
      };
    } else {
      // Phase 2: Confirm deletion
      if (!validated.confirmation_token) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'CONFIRMATION_TOKEN_REQUIRED',
              message: 'confirmation_token is required when confirm=true'
            })
          }],
          isError: true
        };
      }

      await ExternalAPIService.confirmDelete(validated.confirmation_token);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            phase: 'confirmed',
            category: validated.category,
            entry_id: validated.entry_id,
            message: 'Entry successfully deleted'
          })
        }]
      };
    }
  } catch (error: any) {
    if (error.message.includes('expired')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CONFIRMATION_EXPIRED',
            message: 'Confirmation token expired (60 second limit)',
            suggestion: 'Request a new preview'
          })
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'DELETE_FAILED',
          message: error.message
        })
      }],
      isError: true
    };
  }
}

/**
 * Tool: navigate_hierarchy
 *
 * Navigate parent-child relationships for locations and NPCs.
 */
export const NavigateHierarchyInputSchema = z.object({
  category: z.enum(['locations', 'npcs']),
  campaign_id: z.string().uuid(),
  parent_id: z.string().uuid(),
  depth: z.number().int().min(1).max(5).optional().default(1)
});

export async function handleNavigateHierarchy(params: any) {
  try {
    const validated = NavigateHierarchyInputSchema.parse(params);

    const result = await ExternalAPIService.getChildren(
      validated.campaign_id,
      validated.category as any,
      validated.parent_id,
      validated.depth
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: validated.category,
          parent: result.data.parent,
          children: result.data.children,
          depth: result.data.depth,
          execution_time_ms: result.execution_time_ms
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'HIERARCHY_NAVIGATION_FAILED',
          message: error.message
        })
      }],
      isError: true
    };
  }
}
