/**
 * Contract tests for MCP Database tools
 * Tests against the JSON Schema contracts in contracts/database-tools.json
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  QueryDatabaseCardInputSchema,
  QueryDatabaseCardOutputSchema,
  CreateDatabaseEntryInputSchema,
  CreateDatabaseEntryOutputSchema,
  UpdateDatabaseEntryInputSchema,
  UpdateDatabaseEntryOutputSchema
} from '../../src/mcp/schemas/database-schemas';

describe('MCP Database Tools Contract Tests', () => {
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

  describe('query_database_card', () => {
    it('should validate input schema with defaults', () => {
      const input = {
        database_id: 10,
        campaign_id: 'test-campaign'
      };

      const result = QueryDatabaseCardInputSchema.parse(input);
      expect(result.sort_order).toBe('asc');
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should validate input schema with filters', () => {
      const validInput = {
        database_id: 10,
        campaign_id: 'test-campaign',
        filters: [
          {
            field: 'status',
            operator: 'equals',
            value: 'active'
          },
          {
            field: 'level',
            operator: 'greater_than',
            value: 5
          }
        ],
        sort_by: 'name',
        sort_order: 'desc',
        limit: 25,
        offset: 10
      };

      const result = QueryDatabaseCardInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid operator', () => {
      const invalidInput = {
        database_id: 10,
        campaign_id: 'test-campaign',
        filters: [
          {
            field: 'status',
            operator: 'invalid_op',
            value: 'active'
          }
        ]
      };

      const result = QueryDatabaseCardInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call query_database_card tool and validate output', async () => {
      const response = await client.callTool('query_database_card', {
        database_id: 10,
        campaign_id: 'test-campaign',
        limit: 10
      });

      const output = JSON.parse(response.content[0].text);
      const result = QueryDatabaseCardOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.database).toBeDefined();
      expect(output.database.id).toBe(10);
      expect(output.database.schema).toBeDefined();
      expect(Array.isArray(output.database.schema.fields)).toBe(true);
      expect(Array.isArray(output.entries)).toBe(true);
      expect(output.total_count).toBeGreaterThanOrEqual(0);
      expect(typeof output.has_more).toBe('boolean');
    });

    it('should call query_database_card with filters', async () => {
      const response = await client.callTool('query_database_card', {
        database_id: 10,
        campaign_id: 'test-campaign',
        filters: [
          {
            field: 'type',
            operator: 'equals',
            value: 'npc'
          }
        ]
      });

      const output = JSON.parse(response.content[0].text);
      const result = QueryDatabaseCardOutputSchema.safeParse(output);
      expect(result.success).toBe(true);

      // All entries should match the filter if any exist
      if (output.entries.length > 0) {
        output.entries.forEach((entry: any) => {
          if (entry.values.type !== undefined) {
            expect(entry.values.type).toBe('npc');
          }
        });
      }
    });
  });

  describe('create_database_entry', () => {
    it('should validate input schema', () => {
      const validInput = {
        database_id: 10,
        campaign_id: 'test-campaign',
        values: {
          name: 'Gandalf',
          type: 'npc',
          level: 20,
          tags: ['wizard', 'mentor'],
          active: true
        }
      };

      const result = CreateDatabaseEntryInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept various value types', () => {
      const validInput = {
        database_id: 10,
        campaign_id: 'test-campaign',
        values: {
          text_field: 'string value',
          number_field: 42,
          boolean_field: true,
          array_field: ['option1', 'option2'],
          null_field: null
        }
      };

      const result = CreateDatabaseEntryInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call create_database_entry tool and validate output', async () => {
      const response = await client.callTool('create_database_entry', {
        database_id: 10,
        campaign_id: 'test-campaign',
        values: {
          name: 'Test Entry',
          description: 'A test database entry'
        }
      });

      const output = JSON.parse(response.content[0].text);
      const result = CreateDatabaseEntryOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.entry).toBeDefined();
      expect(output.entry.id).toBeDefined();
      expect(output.entry.database_id).toBe(10);
      expect(output.entry.values).toBeDefined();
      expect(output.entry.created_at).toBeDefined();
      expect(output.database_title).toBeDefined();
    });
  });

  describe('update_database_entry', () => {
    it('should validate input schema', () => {
      const validInput = {
        database_id: 10,
        entry_id: 'entry-123',
        campaign_id: 'test-campaign',
        values: {
          name: 'Updated Name',
          status: 'inactive'
        }
      };

      const result = UpdateDatabaseEntryInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty entry_id', () => {
      const invalidInput = {
        database_id: 10,
        entry_id: '',
        campaign_id: 'test-campaign',
        values: {
          name: 'Updated'
        }
      };

      const result = UpdateDatabaseEntryInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call update_database_entry tool and validate output', async () => {
      const response = await client.callTool('update_database_entry', {
        database_id: 10,
        entry_id: 'entry-123',
        campaign_id: 'test-campaign',
        values: {
          status: 'completed',
          updated_by: 'DM'
        }
      });

      const output = JSON.parse(response.content[0].text);
      const result = UpdateDatabaseEntryOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.entry).toBeDefined();
      expect(output.entry.id).toBe('entry-123');
      expect(output.entry.database_id).toBe(10);
      expect(output.entry.updated_at).toBeDefined();
      expect(Array.isArray(output.changed_fields)).toBe(true);

      // Changed fields should include the updated fields
      expect(output.changed_fields).toContain('status');
      expect(output.changed_fields).toContain('updated_by');
    });

    it('should handle partial updates', async () => {
      const response = await client.callTool('update_database_entry', {
        database_id: 10,
        entry_id: 'entry-456',
        campaign_id: 'test-campaign',
        values: {
          description: 'Only updating description'
        }
      });

      const output = JSON.parse(response.content[0].text);
      const result = UpdateDatabaseEntryOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.changed_fields).toEqual(['description']);
    });
  });
});