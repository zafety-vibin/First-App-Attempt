/**
 * Contract tests for MCP Hierarchy tools
 * Tests against the JSON Schema contracts in contracts/hierarchy-tools.json
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  GetCardPathInputSchema,
  GetCardPathOutputSchema,
  GetSubtreeInputSchema,
  GetSubtreeOutputSchema,
  ListChildrenInputSchema,
  ListChildrenOutputSchema,
  GetSiblingsInputSchema,
  GetSiblingsOutputSchema,
  GetAncestorInputSchema,
  GetAncestorOutputSchema
} from '../../src/mcp/schemas/hierarchy-schemas';

describe('MCP Hierarchy Tools Contract Tests', () => {
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

  describe('get_card_path', () => {
    it('should validate input schema', () => {
      const validInput = {
        card_id: 5,
        campaign_id: 'test-campaign'
      };

      const result = GetCardPathInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call get_card_path tool and validate output', async () => {
      const response = await client.callTool('get_card_path', {
        card_id: 5,
        campaign_id: 'test-campaign'
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetCardPathOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(Array.isArray(output.path)).toBe(true);
      expect(typeof output.full_path).toBe('string');
    });
  });

  describe('get_subtree', () => {
    it('should validate input schema', () => {
      const validInput = {
        card_id: 1,
        campaign_id: 'test-campaign',
        max_depth: 3,
        include_content: false
      };

      const result = GetSubtreeInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid max_depth', () => {
      const invalidInput = {
        card_id: 1,
        campaign_id: 'test-campaign',
        max_depth: 15 // exceeds max of 10
      };

      const result = GetSubtreeInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call get_subtree tool and validate output', async () => {
      const response = await client.callTool('get_subtree', {
        card_id: 1,
        campaign_id: 'test-campaign',
        max_depth: 2
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetSubtreeOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.tree).toBeDefined();
      expect(output.total_nodes).toBeGreaterThanOrEqual(1);
    });
  });

  describe('list_children', () => {
    it('should validate input schema', () => {
      const validInput = {
        parent_id: 1,
        campaign_id: 'test-campaign'
      };

      const result = ListChildrenInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept null parent_id for root cards', () => {
      const validInput = {
        parent_id: null,
        campaign_id: 'test-campaign'
      };

      const result = ListChildrenInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call list_children tool and validate output', async () => {
      const response = await client.callTool('list_children', {
        parent_id: null,
        campaign_id: 'test-campaign'
      });

      const output = JSON.parse(response.content[0].text);
      const result = ListChildrenOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(Array.isArray(output.children)).toBe(true);
      expect(output.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('get_siblings', () => {
    it('should validate input schema', () => {
      const validInput = {
        card_id: 5,
        campaign_id: 'test-campaign'
      };

      const result = GetSiblingsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call get_siblings tool and validate output', async () => {
      const response = await client.callTool('get_siblings', {
        card_id: 5,
        campaign_id: 'test-campaign'
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetSiblingsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(Array.isArray(output.siblings)).toBe(true);

      // Check that one sibling is marked as current
      const currentSibling = output.siblings.find((s: any) => s.is_current);
      expect(currentSibling).toBeDefined();
    });
  });

  describe('get_ancestor', () => {
    it('should validate input schema', () => {
      const validInput = {
        card_id: 10,
        campaign_id: 'test-campaign',
        ancestor_type: 'database'
      };

      const result = GetAncestorInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid ancestor_type', () => {
      const invalidInput = {
        card_id: 10,
        campaign_id: 'test-campaign',
        ancestor_type: 'invalid-type'
      };

      const result = GetAncestorInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call get_ancestor tool and validate output', async () => {
      const response = await client.callTool('get_ancestor', {
        card_id: 10,
        campaign_id: 'test-campaign',
        ancestor_type: 'database'
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetAncestorOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(typeof output.found).toBe('boolean');

      if (output.found) {
        expect(output.ancestor).toBeDefined();
        expect(output.ancestor.card_type).toBe('database');
      }
    });
  });
});