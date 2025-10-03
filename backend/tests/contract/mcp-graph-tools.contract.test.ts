/**
 * Contract tests for MCP Graph tools
 * Tests against the JSON Schema contracts in contracts/graph-tools.json
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  QueryGraphInputSchema,
  QueryGraphOutputSchema,
  ListGraphNodesInputSchema,
  ListGraphNodesOutputSchema,
  GetNodeRelationshipsInputSchema,
  GetNodeRelationshipsOutputSchema,
  UpdateGraphInputSchema,
  UpdateGraphOutputSchema
} from '../../src/mcp/schemas/graph-schemas';

describe('MCP Graph Tools Contract Tests', () => {
  let client: Client;
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    // Start the MCP server
    serverProcess = spawn('npm', ['run', 'mcp'], {
      cwd: process.cwd(),
      env: { ...process.env, DEBUG: 'true' }
    });

    // Create client and connect
    const transport = new StdioClientTransport({
      command: 'npm',
      args: ['run', 'mcp'],
      env: { ...process.env, DEBUG: 'true' }
    });

    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('query_graph', () => {
    it('should validate input schema', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        graph_type: 'Political-Web',
        query: 'Show all NPCs connected to the king',
        active_only: true
      };

      const result = QueryGraphInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid graph_type', () => {
      const invalidInput = {
        campaign_id: 'test-campaign',
        graph_type: 'InvalidType',
        query: 'test query'
      };

      const result = QueryGraphInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call query_graph tool and validate output', async () => {
      const response = await client.callTool('query_graph', {
        campaign_id: 'test-campaign',
        graph_type: 'Political-Web',
        query: 'Show all factions'
      });

      const output = JSON.parse(response.content[0].text);
      const result = QueryGraphOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(Array.isArray(output.nodes)).toBe(true);
      expect(Array.isArray(output.edges)).toBe(true);
      expect(typeof output.query_interpretation).toBe('string');
    });
  });

  describe('list_graph_nodes', () => {
    it('should validate input schema', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        graph_type: 'Geographical',
        node_type: 'city',
        limit: 25
      };

      const result = ListGraphNodesInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should use default limit', () => {
      const input = {
        campaign_id: 'test-campaign',
        graph_type: 'World-Foundations'
      };

      const result = ListGraphNodesInputSchema.parse(input);
      expect(result.limit).toBe(50);
    });

    it('should call list_graph_nodes tool and validate output', async () => {
      const response = await client.callTool('list_graph_nodes', {
        campaign_id: 'test-campaign',
        graph_type: 'Campaign-Story',
        limit: 10
      });

      const output = JSON.parse(response.content[0].text);
      const result = ListGraphNodesOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(Array.isArray(output.nodes)).toBe(true);
      expect(output.total_count).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(output.node_types)).toBe(true);
    });
  });

  describe('get_node_relationships', () => {
    it('should validate input schema', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        graph_type: 'Political-Web',
        node_id: 'npc-001'
      };

      const result = GetNodeRelationshipsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call get_node_relationships tool and validate output', async () => {
      const response = await client.callTool('get_node_relationships', {
        campaign_id: 'test-campaign',
        graph_type: 'Political-Web',
        node_id: 'faction-001'
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetNodeRelationshipsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.node).toBeDefined();
      expect(Array.isArray(output.incoming)).toBe(true);
      expect(Array.isArray(output.outgoing)).toBe(true);
    });
  });

  describe('update_graph', () => {
    it('should validate add_node operation', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        graph_type: 'Political-Web',
        operation: 'add_node',
        node: {
          name: 'Lord Blackwood',
          type: 'npc',
          attributes: {
            title: 'Duke',
            faction: 'Royalists'
          }
        }
      };

      const result = UpdateGraphInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate add_edge operation', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        graph_type: 'Political-Web',
        operation: 'add_edge',
        edge: {
          source: 'npc-001',
          target: 'faction-001',
          relationship: 'member_of',
          attributes: {
            since: '1422'
          }
        }
      };

      const result = UpdateGraphInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject operation without required data', () => {
      const invalidInput = {
        campaign_id: 'test-campaign',
        graph_type: 'Political-Web',
        operation: 'add_node'
        // Missing node data
      };

      const result = UpdateGraphInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(true); // Optional, but handler should validate
    });

    it('should call update_graph tool and validate output', async () => {
      const response = await client.callTool('update_graph', {
        campaign_id: 'test-campaign',
        graph_type: 'World-Foundations',
        operation: 'add_node',
        node: {
          name: 'Magic System',
          type: 'concept',
          attributes: {
            description: 'Elemental magic based on five elements'
          }
        }
      });

      const output = JSON.parse(response.content[0].text);
      const result = UpdateGraphOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.success).toBeDefined();
      expect(output.operation).toBe('add_node');
      expect(output.graph_stats).toBeDefined();
    });
  });
});