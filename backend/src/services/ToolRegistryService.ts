/**
 * Tool Registry Service
 * Feature: 005-create-the-ai
 * Wraps Feature 011 MCP tool handlers with Zod validation
 */

import { z } from 'zod';
import { dispatchToolCall } from '../mcp/tools/index';
import { loadToolSchemas, zodToOpenAISchema, zodToAnthropicSchema } from './FunctionCallingService';

/**
 * Tool definition with Zod schema
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (params: any) => Promise<any>;
}

/**
 * Tool Registry Service
 * Maps tool names to Feature 011 handlers and provides validation
 * Reference: research.md lines 16-78
 */
export class ToolRegistryService {
  private tools: Map<string, ToolDefinition> = new Map();
  private schemas: any = {};

  /**
   * Initialize the registry with all MCP tools
   */
  async initialize() {
    // Load all schemas
    this.schemas = await loadToolSchemas();

    // Register card tools
    this.registerTool({
      name: 'search_cards',
      description: 'Search for cards in a campaign by title or content',
      inputSchema: this.schemas.SearchCardsInputSchema,
      handler: async (params) => dispatchToolCall('search_cards', params),
    });

    this.registerTool({
      name: 'create_card',
      description: 'Create a new card in the campaign',
      inputSchema: this.schemas.CreateCardInputSchema,
      handler: async (params) => dispatchToolCall('create_card', params),
    });

    this.registerTool({
      name: 'update_card',
      description: 'Update an existing card',
      inputSchema: this.schemas.UpdateCardInputSchema,
      handler: async (params) => dispatchToolCall('update_card', params),
    });

    this.registerTool({
      name: 'read_card',
      description: 'Read a specific card by ID',
      inputSchema: this.schemas.ReadCardInputSchema,
      handler: async (params) => dispatchToolCall('read_card', params),
    });

    this.registerTool({
      name: 'delete_card',
      description: 'Delete a card and its subtree',
      inputSchema: this.schemas.DeleteCardInputSchema,
      handler: async (params) => dispatchToolCall('delete_card', params),
    });

    this.registerTool({
      name: 'move_card',
      description: 'Move a card to a new parent or position',
      inputSchema: this.schemas.MoveCardInputSchema,
      handler: async (params) => dispatchToolCall('move_card', params),
    });

    // Register graph tools
    this.registerTool({
      name: 'query_graph',
      description: 'Query nodes and edges from a knowledge graph',
      inputSchema: this.schemas.QueryGraphInputSchema,
      handler: async (params) => dispatchToolCall('query_graph', params),
    });

    this.registerTool({
      name: 'update_graph',
      description: 'Update a knowledge graph with new nodes and edges',
      inputSchema: this.schemas.UpdateGraphInputSchema,
      handler: async (params) => dispatchToolCall('update_graph', params),
    });

    this.registerTool({
      name: 'list_graph_nodes',
      description: 'List all nodes in a specific graph type',
      inputSchema: this.schemas.ListGraphNodesInputSchema,
      handler: async (params) => dispatchToolCall('list_graph_nodes', params),
    });

    this.registerTool({
      name: 'get_node_relationships',
      description: 'Get all relationships for a specific node',
      inputSchema: this.schemas.GetNodeRelationshipsInputSchema,
      handler: async (params) => dispatchToolCall('get_node_relationships', params),
    });

    // Register hierarchy tools
    this.registerTool({
      name: 'get_card_path',
      description: 'Get the path from root to a specific card',
      inputSchema: this.schemas.GetCardPathInputSchema,
      handler: async (params) => dispatchToolCall('get_card_path', params),
    });

    this.registerTool({
      name: 'get_subtree',
      description: 'Get all descendants of a card',
      inputSchema: this.schemas.GetSubtreeInputSchema,
      handler: async (params) => dispatchToolCall('get_subtree', params),
    });

    this.registerTool({
      name: 'list_children',
      description: 'List immediate children of a card',
      inputSchema: this.schemas.ListChildrenInputSchema,
      handler: async (params) => dispatchToolCall('list_children', params),
    });

    this.registerTool({
      name: 'get_siblings',
      description: 'Get sibling cards',
      inputSchema: this.schemas.GetSiblingsInputSchema,
      handler: async (params) => dispatchToolCall('get_siblings', params),
    });

    this.registerTool({
      name: 'get_ancestor',
      description: 'Find the first ancestor matching criteria',
      inputSchema: this.schemas.GetAncestorInputSchema,
      handler: async (params) => dispatchToolCall('get_ancestor', params),
    });

    // Register recap tools
    this.registerTool({
      name: 'get_session_recaps',
      description: 'Get session recap summaries',
      inputSchema: this.schemas.GetSessionRecapsInputSchema,
      handler: async (params) => dispatchToolCall('get_session_recaps', params),
    });

    this.registerTool({
      name: 'get_timeline_events',
      description: 'Get timeline events from session recaps',
      inputSchema: this.schemas.GetTimelineEventsInputSchema,
      handler: async (params) => dispatchToolCall('get_timeline_events', params),
    });

    // Register information level tools
    this.registerTool({
      name: 'list_information_levels',
      description: 'List all available information levels',
      inputSchema: this.schemas.ListInformationLevelsInputSchema,
      handler: async (params) => dispatchToolCall('list_information_levels', params),
    });

    this.registerTool({
      name: 'get_information_level_by_name',
      description: 'Get information level by name',
      inputSchema: this.schemas.GetInformationLevelByNameInputSchema,
      handler: async (params) => dispatchToolCall('get_information_level_by_name', params),
    });

    // Register database tools
    this.registerTool({
      name: 'query_database',
      description: 'Query entries from a database card',
      inputSchema: this.schemas.QueryDatabaseCardInputSchema,
      handler: async (params) => dispatchToolCall('query_database_card', params),
    });

    this.registerTool({
      name: 'create_database_entry',
      description: 'Create a new database entry',
      inputSchema: this.schemas.CreateDatabaseEntryInputSchema,
      handler: async (params) => dispatchToolCall('create_database_entry', params),
    });

    this.registerTool({
      name: 'update_database_entry',
      description: 'Update a database entry',
      inputSchema: this.schemas.UpdateDatabaseEntryInputSchema,
      handler: async (params) => dispatchToolCall('update_database_entry', params),
    });

    // Register map tools
    this.registerTool({
      name: 'list_map_pins',
      description: 'List all pins on a map',
      inputSchema: this.schemas.ListMapPinsInputSchema,
      handler: async (params) => dispatchToolCall('list_map_pins', params),
    });

    this.registerTool({
      name: 'create_map_pin',
      description: 'Create a new pin on a map',
      inputSchema: this.schemas.CreateMapPinInputSchema,
      handler: async (params) => dispatchToolCall('create_map_pin', params),
    });
  }

  /**
   * Register a tool definition
   */
  private registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Execute a tool with validation
   */
  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate parameters with Zod
    try {
      const validatedParams = tool.inputSchema.parse(params);
      return await tool.handler(validatedParams);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid parameters for ${name}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get tool definitions for OpenAI
   */
  getOpenAITools(): any[] {
    const tools: any[] = [];
    for (const [name, tool] of this.tools) {
      tools.push({
        name: name,
        description: tool.description,
        parameters: zodToOpenAISchema(tool.inputSchema),
      });
    }
    return tools;
  }

  /**
   * Get tool definitions for Anthropic
   */
  getAnthropicTools(): any[] {
    const tools: any[] = [];
    for (const [name, tool] of this.tools) {
      tools.push({
        name: name,
        description: tool.description,
        input_schema: zodToAnthropicSchema(tool.inputSchema),
      });
    }
    return tools;
  }

  /**
   * Get a subset of tools by name
   */
  getToolsSubset(names: string[]): ToolDefinition[] {
    return names.map(name => {
      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }
      return tool;
    });
  }
}