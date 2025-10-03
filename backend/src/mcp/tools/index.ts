/**
 * MCP Tools Registry
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

import {
  databaseToolDefinitions,
  handleQueryDatabaseCard,
  handleCreateDatabaseEntry,
  handleUpdateDatabaseEntry
} from './database-tools';

import {
  mapToolDefinitions,
  handleListMapPins,
  handleCreateMapPin
} from './map-tools';

/**
 * Complete registry of all 22 MCP tools
 * (6 card + 5 hierarchy + 4 graph + 2 recap + 2 info-level + 3 database + 2 map = 24 total)
 */
export const TOOL_REGISTRY = [
  ...cardToolDefinitions,
  ...hierarchyToolDefinitions,
  ...graphToolDefinitions,
  ...recapToolDefinitions,
  ...infoLevelToolDefinitions,
  ...databaseToolDefinitions,
  ...mapToolDefinitions
];

/**
 * Dispatch a tool call to the appropriate handler
 */
export async function dispatchToolCall(name: string, params: any): Promise<any> {
  switch (name) {
    // Card tools (6)
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

    // Hierarchy tools (5)
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

    // Graph tools (4)
    case 'query_graph':
      return await handleQueryGraph(params);
    case 'list_graph_nodes':
      return await handleListGraphNodes(params);
    case 'get_node_relationships':
      return await handleGetNodeRelationships(params);
    case 'update_graph':
      return await handleUpdateGraph(params);

    // Recap tools (2)
    case 'get_session_recaps':
      return await handleGetSessionRecaps(params);
    case 'get_timeline_events':
      return await handleGetTimelineEvents(params);

    // Information level tools (2)
    case 'list_information_levels':
      return await handleListInformationLevels(params);
    case 'get_information_level_by_name':
      return await handleGetInformationLevelByName(params);

    // Database tools (3)
    case 'query_database_card':
      return await handleQueryDatabaseCard(params);
    case 'create_database_entry':
      return await handleCreateDatabaseEntry(params);
    case 'update_database_entry':
      return await handleUpdateDatabaseEntry(params);

    // Map tools (2)
    case 'list_map_pins':
      return await handleListMapPins(params);
    case 'create_map_pin':
      return await handleCreateMapPin(params);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}