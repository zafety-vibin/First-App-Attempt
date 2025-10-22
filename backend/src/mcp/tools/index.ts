/**
 * MCP Tools Registry (Updated for Feature 014 Category Tables)
 * Central registry for all MCP tools with their definitions and dispatch logic
 */

import {
  cardToolDefinitions,
  handleReadCard,
  handleCreateCard,
  handleUpdateCard,
  handleDeleteCard,
  handleSearchCards,
  handleMoveCard
} from './card-tools';

import {
  hierarchyToolDefinitions,
  handleGetCardPath,
  handleGetSubtree,
  handleListChildren,
  handleGetSiblings,
  handleGetAncestor
} from './hierarchy-tools';

import {
  graphToolDefinitions,
  handleQueryGraph,
  handleListGraphNodes,
  handleGetNodeRelationships,
  handleUpdateGraph
} from './graph-tools';

import {
  recapToolDefinitions,
  handleGetSessionRecaps,
  handleGetTimelineEvents
} from './recap-tools';

import {
  infoLevelToolDefinitions,
  handleListInformationLevels,
  handleGetInformationLevelByName
} from './info-level-tools';

// NEW: Category tools for Feature 014 database tables
import {
  handleQueryCategory,
  handleCreateCategoryEntry,
  handleUpdateCategoryEntry,
  handleDeleteCategoryEntry,
  handleNavigateHierarchy
} from './category-tools';

import {
  mapToolDefinitions,
  handleListMapPins,
  handleCreateMapPin
} from './map-tools';

/**
 * Tool definitions for NEW category tools (Feature 014 integration)
 */
export const categoryToolDefinitions = [
  {
    name: 'query_category',
    description: 'Query entities from any of the 13 category tables (NPCs, Locations, Factions, SessionRecaps, Quests, PlayerCharacters, LoreEntries, WorldRules, PlanarForces, SessionPrep, CustomMechanics, Items, Creatures). Supports filtering, pagination, sorting, and information level filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['npcs', 'locations', 'factions', 'session_recaps', 'quests', 'player_characters', 'lore_entries', 'world_rules', 'planar_forces', 'session_prep', 'custom_mechanics', 'items', 'creatures'],
          description: 'Category table to query'
        },
        campaign_id: {
          type: 'string',
          format: 'uuid',
          description: 'Campaign UUID'
        },
        filters: {
          type: 'object',
          description: 'Filter conditions (e.g., {"faction_id": "...", "core_status": "active"})',
          additionalProperties: true
        },
        page: {
          type: 'number',
          minimum: 1,
          default: 1
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 50
        },
        sort: {
          type: 'string',
          description: 'Sort field (prefix with - for descending, e.g., "-created_at")'
        },
        view_mode: {
          type: 'string',
          enum: ['dm_view', 'player_view'],
          default: 'dm_view',
          description: 'Information filtering mode'
        },
        search: {
          type: 'string',
          description: 'Full-text search in name and description'
        }
      },
      required: ['category', 'campaign_id']
    }
  },
  {
    name: 'create_category_entry',
    description: 'Create a new entity in any of the 13 category tables. Auto-populates id, campaign_id, created_at, updated_at. Universal fields: name (required), description, core_status, player_knowledge, tags, custom_fields. Category-specific fields vary (e.g., NPCs have race/class/faction_id, Locations have location_type/parent_location_id).',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['npcs', 'locations', 'factions', 'session_recaps', 'quests', 'player_characters', 'lore_entries', 'world_rules', 'planar_forces', 'session_prep', 'custom_mechanics', 'items', 'creatures']
        },
        campaign_id: {
          type: 'string',
          format: 'uuid'
        },
        data: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            core_status: { type: 'string', enum: ['active', 'archived', 'draft', 'hidden'] },
            player_knowledge: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            custom_fields: { type: 'object' }
          },
          required: ['name'],
          additionalProperties: true
        }
      },
      required: ['category', 'campaign_id', 'data']
    }
  },
  {
    name: 'update_category_entry',
    description: 'Update an existing entity with partial field updates. Auto-refreshes updated_at timestamp. Only provided fields are modified.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['npcs', 'locations', 'factions', 'session_recaps', 'quests', 'player_characters', 'lore_entries', 'world_rules', 'planar_forces', 'session_prep', 'custom_mechanics', 'items', 'creatures']
        },
        campaign_id: {
          type: 'string',
          format: 'uuid'
        },
        entry_id: {
          type: 'string',
          format: 'uuid',
          description: 'Entity ID to update'
        },
        updates: {
          type: 'object',
          description: 'Partial updates (only fields to change)',
          additionalProperties: true
        }
      },
      required: ['category', 'campaign_id', 'entry_id', 'updates']
    }
  },
  {
    name: 'delete_category_entry',
    description: 'Delete an entity with two-phase confirmation. Phase 1 (confirm=false): Returns preview with affected references. Phase 2 (confirm=true with token): Actually deletes. Prevents accidental deletions.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['npcs', 'locations', 'factions', 'session_recaps', 'quests', 'player_characters', 'lore_entries', 'world_rules', 'planar_forces', 'session_prep', 'custom_mechanics', 'items', 'creatures']
        },
        campaign_id: {
          type: 'string',
          format: 'uuid'
        },
        entry_id: {
          type: 'string',
          format: 'uuid'
        },
        confirm: {
          type: 'boolean',
          default: false,
          description: 'Set to true to confirm deletion (Phase 2)'
        },
        confirmation_token: {
          type: 'string',
          description: 'Token from Phase 1 preview (required for Phase 2)'
        }
      },
      required: ['category', 'campaign_id', 'entry_id']
    }
  },
  {
    name: 'navigate_category_hierarchy',
    description: 'Navigate parent-child relationships for Locations (parent_location_id) and NPCs (superior_npc_id). Supports multi-level traversal with depth parameter.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['locations', 'npcs'],
          description: 'Only locations and npcs support hierarchy'
        },
        campaign_id: {
          type: 'string',
          format: 'uuid'
        },
        parent_id: {
          type: 'string',
          format: 'uuid',
          description: 'Parent entity ID'
        },
        depth: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          default: 1,
          description: 'Levels to traverse (1 = direct children only)'
        }
      },
      required: ['category', 'campaign_id', 'parent_id']
    }
  }
];

/**
 * Complete registry of all MCP tools
 * Card tools (6) + Hierarchy tools (5) + Graph tools (4) + Recap tools (2) +
 * Info-level tools (2) + Category tools (5 NEW) + Map tools (2) = 26 total
 */
export const TOOL_REGISTRY = [
  ...cardToolDefinitions,
  ...hierarchyToolDefinitions,
  ...graphToolDefinitions,
  ...recapToolDefinitions,
  ...infoLevelToolDefinitions,
  ...categoryToolDefinitions,  // NEW: Feature 014 category database tools
  ...mapToolDefinitions
];

/**
 * Dispatch a tool call to the appropriate handler
 */
export async function dispatchToolCall(name: string, params: any): Promise<any> {
  switch (name) {
    // Card tools (6) - Feature 003 card-based content
    case 'read_card':
      return await handleReadCard(params);
    case 'create_card':
      return await handleCreateCard(params);
    case 'update_card':
      return await handleUpdateCard(params);
    case 'delete_card':
      return await handleDeleteCard(params);
    case 'search_cards':
      return await handleSearchCards(params);
    case 'move_card':
      return await handleMoveCard(params);

    // Hierarchy tools (5) - Feature 003 card hierarchy
    case 'get_card_path':
      return await handleGetCardPath(params);
    case 'get_subtree':
      return await handleGetSubtree(params);
    case 'list_children':
      return await handleListChildren(params);
    case 'get_siblings':
      return await handleGetSiblings(params);
    case 'get_ancestor':
      return await handleGetAncestor(params);

    // Graph tools (4) - Feature 005/006 knowledge graphs
    case 'query_graph':
      return await handleQueryGraph(params);
    case 'list_graph_nodes':
      return await handleListGraphNodes(params);
    case 'get_node_relationships':
      return await handleGetNodeRelationships(params);
    case 'update_graph':
      return await handleUpdateGraph(params);

    // Recap tools (2) - Feature 014 session recaps
    case 'get_session_recaps':
      return await handleGetSessionRecaps(params);
    case 'get_timeline_events':
      return await handleGetTimelineEvents(params);

    // Information level tools (2) - Feature 004 filtering
    case 'list_information_levels':
      return await handleListInformationLevels(params);
    case 'get_information_level_by_name':
      return await handleGetInformationLevelByName(params);

    // Category tools (5 NEW) - Feature 014 category tables
    case 'query_category':
      return await handleQueryCategory(params);
    case 'create_category_entry':
      return await handleCreateCategoryEntry(params);
    case 'update_category_entry':
      return await handleUpdateCategoryEntry(params);
    case 'delete_category_entry':
      return await handleDeleteCategoryEntry(params);
    case 'navigate_category_hierarchy':
      return await handleNavigateHierarchy(params);

    // Map tools (2) - Feature 007 interactive maps
    case 'list_map_pins':
      return await handleListMapPins(params);
    case 'create_map_pin':
      return await handleCreateMapPin(params);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
