/**
 * Contract tests for MCP Card tools
 * Tests against the JSON Schema contracts in contracts/card-tools.json
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  ReadCardInputSchema,
  ReadCardOutputSchema,
  CreateCardInputSchema,
  CreateCardOutputSchema,
  UpdateCardInputSchema,
  UpdateCardOutputSchema,
  DeleteCardInputSchema,
  DeleteCardOutputSchema,
  SearchCardsInputSchema,
  SearchCardsOutputSchema,
  MoveCardInputSchema,
  MoveCardOutputSchema
} from '../../src/mcp/schemas/card-schemas';

describe('MCP Card Tools Contract Tests', () => {
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

  describe('read_card', () => {
    it('should validate input schema', async () => {
      const validInput = {
        card_id: 1,
        campaign_id: 'test-campaign'
      };

      const result = ReadCardInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid input', () => {
      const invalidInput = {
        card_id: 'not-a-number',
        campaign_id: ''
      };

      const result = ReadCardInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call read_card tool and validate output', async () => {
      const response = await client.callTool('read_card', {
        card_id: 1,
        campaign_id: 'test-campaign'
      });

      // Parse the response
      const output = JSON.parse(response.content[0].text);

      // Validate against output schema
      const result = ReadCardOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });

  describe('create_card', () => {
    it('should validate input schema', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        title: 'New Card',
        card_type: 'text',
        parent_id: null
      };

      const result = CreateCardInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call create_card tool and validate output', async () => {
      const response = await client.callTool('create_card', {
        campaign_id: 'test-campaign',
        title: 'Test Card',
        card_type: 'text',
        content: { type: 'doc', content: [] }
      });

      const output = JSON.parse(response.content[0].text);
      const result = CreateCardOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });

  describe('update_card', () => {
    it('should validate input schema', () => {
      const validInput = {
        card_id: 1,
        campaign_id: 'test-campaign',
        title: 'Updated Title'
      };

      const result = UpdateCardInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call update_card tool and validate output', async () => {
      const response = await client.callTool('update_card', {
        card_id: 1,
        campaign_id: 'test-campaign',
        title: 'Updated Card'
      });

      const output = JSON.parse(response.content[0].text);
      const result = UpdateCardOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });

  describe('delete_card', () => {
    it('should validate input schema', () => {
      const validInput = {
        card_id: 1,
        campaign_id: 'test-campaign'
      };

      const result = DeleteCardInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call delete_card tool and validate output', async () => {
      const response = await client.callTool('delete_card', {
        card_id: 1,
        campaign_id: 'test-campaign'
      });

      const output = JSON.parse(response.content[0].text);
      const result = DeleteCardOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.success).toBeDefined();
      expect(output.deleted_count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('search_cards', () => {
    it('should validate input schema', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        query: 'dragon',
        limit: 10
      };

      const result = SearchCardsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call search_cards tool and validate output', async () => {
      const response = await client.callTool('search_cards', {
        campaign_id: 'test-campaign',
        query: 'test'
      });

      const output = JSON.parse(response.content[0].text);
      const result = SearchCardsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(Array.isArray(output.cards)).toBe(true);
    });
  });

  describe('move_card', () => {
    it('should validate input schema', () => {
      const validInput = {
        card_id: 1,
        campaign_id: 'test-campaign',
        new_parent_id: 2,
        new_position: 0
      };

      const result = MoveCardInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call move_card tool and validate output', async () => {
      const response = await client.callTool('move_card', {
        card_id: 1,
        campaign_id: 'test-campaign',
        new_parent_id: null,
        new_position: 0
      });

      const output = JSON.parse(response.content[0].text);
      const result = MoveCardOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.success).toBeDefined();
    });
  });
});