#!/usr/bin/env node
/**
 * MCP Server for Wrldbldr MCP Manager
 * Provides Model Context Protocol tools for TTRPG campaign management
 * Communicates via stdio transport (stdin/stdout)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Initialize logging to stderr (stdout is reserved for MCP communication)
const logger = {
  info: (message: string, ...args: any[]) => {
    console.error(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  }
};

// Create the MCP server instance
const server = new Server(
  {
    name: 'wrldbldr-mcp-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    },
  }
);

// Error handling
server.onerror = (error: Error) => {
  logger.error('Server error:', error);
};

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

/**
 * Main function to start the MCP server
 */
async function main() {
  try {
    logger.info('Starting Wrldbldr MCP Manager MCP Server...');

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Import tool registry and dispatcher
    const { TOOL_REGISTRY, dispatchToolCall } = await import('./tools/index');

    // Import resource registry and dispatcher
    const { RESOURCE_REGISTRY, handleReadResource } = await import('./resources/index');

    // Import prompt registry and dispatcher
    const { PROMPT_REGISTRY, handleGetPrompt } = await import('./prompts/index');

    // Register tool listing handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug(`Listing ${TOOL_REGISTRY.length} available tools`);
      return {
        tools: TOOL_REGISTRY
      };
    });

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: params } = request.params;
      logger.debug(`Tool call: ${name}`, params);

      try {
        const result = await dispatchToolCall(name, params);
        logger.debug(`Tool ${name} completed successfully`);
        return result;
      } catch (error: any) {
        logger.error(`Tool ${name} failed:`, error);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'TOOL_ERROR',
              message: error.message || 'Unknown error occurred'
            })
          }]
        };
      }
    });

    // Register resource listing handler
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug(`Listing ${RESOURCE_REGISTRY.length} available resources`);
      return {
        resources: RESOURCE_REGISTRY.map(r => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType
        }))
      };
    });

    // Register resource read handler
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      logger.debug(`Resource read: ${uri}`);

      try {
        const result = await handleReadResource(uri);
        logger.debug(`Resource ${uri} read successfully`);
        return result;
      } catch (error: any) {
        logger.error(`Resource ${uri} failed:`, error);
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: 'RESOURCE_ERROR',
              message: error.message || 'Unknown error occurred'
            })
          }]
        };
      }
    });

    // Register prompt listing handler
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      logger.debug(`Listing ${PROMPT_REGISTRY.length} available prompts`);
      return {
        prompts: PROMPT_REGISTRY.map(p => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments
        }))
      };
    });

    // Register prompt get handler
    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.debug(`Prompt get: ${name}`, args);

      try {
        const result = await handleGetPrompt(name, args);
        logger.debug(`Prompt ${name} retrieved successfully`);
        return result;
      } catch (error: any) {
        logger.error(`Prompt ${name} failed:`, error);
        throw error; // GetPromptRequestSchema expects errors to be thrown
      }
    });

    // Connect the transport to the server
    await server.connect(transport);

    logger.info(`MCP Server started successfully with ${TOOL_REGISTRY.length} tools, ${RESOURCE_REGISTRY.length} resources, and ${PROMPT_REGISTRY.length} prompts`);
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});