/**
 * Contract tests for MCP Information Level tools
 * Tests against the JSON Schema contracts in contracts/info-level-tools.json
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  ListInformationLevelsInputSchema,
  ListInformationLevelsOutputSchema,
  GetInformationLevelByNameInputSchema,
  GetInformationLevelByNameOutputSchema
} from '../../src/mcp/schemas/info-level-schemas';

describe('MCP Information Level Tools Contract Tests', () => {
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

  describe('list_information_levels', () => {
    it('should validate input schema with defaults', () => {
      const input = {
        campaign_id: 'test-campaign'
      };

      const result = ListInformationLevelsInputSchema.parse(input);
      expect(result.include_counts).toBe(false);
    });

    it('should validate input schema with include_counts', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        include_counts: true
      };

      const result = ListInformationLevelsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should call list_information_levels tool and validate output', async () => {
      const response = await client.callTool('list_information_levels', {
        campaign_id: 'test-campaign',
        include_counts: false
      });

      const output = JSON.parse(response.content[0].text);
      const result = ListInformationLevelsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(Array.isArray(output.levels)).toBe(true);
      expect(output.total_count).toBeGreaterThanOrEqual(0);

      // Check for system levels (should always exist)
      const systemLevels = output.levels.filter((l: any) => l.is_system);
      expect(systemLevels.length).toBeGreaterThan(0);

      // Verify known system levels
      const knownSystemLevels = ['System', 'Common Knowledge', 'Player Knowledge', 'DM Secret'];
      knownSystemLevels.forEach(name => {
        const level = output.levels.find((l: any) => l.name === name);
        if (level) {
          expect(level.is_system).toBe(true);
        }
      });
    });

    it('should call list_information_levels with counts', async () => {
      const response = await client.callTool('list_information_levels', {
        campaign_id: 'test-campaign',
        include_counts: true
      });

      const output = JSON.parse(response.content[0].text);
      const result = ListInformationLevelsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);

      // If include_counts is true, card_count should be present
      if (output.levels.length > 0) {
        output.levels.forEach((level: any) => {
          expect(level.card_count).toBeDefined();
          expect(level.card_count).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });

  describe('get_information_level_by_name', () => {
    it('should validate input schema', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        name: 'DM Secret'
      };

      const result = GetInformationLevelByNameInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidInput = {
        campaign_id: 'test-campaign',
        name: ''
      };

      const result = GetInformationLevelByNameInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call get_information_level_by_name for system level', async () => {
      const response = await client.callTool('get_information_level_by_name', {
        campaign_id: 'test-campaign',
        name: 'DM Secret'
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetInformationLevelByNameOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.found).toBe(true);

      if (output.found) {
        expect(output.level).toBeDefined();
        expect(output.level.name).toBe('DM Secret');
        expect(output.level.is_system).toBe(true);
        expect(output.level.color).toBeDefined();
        expect(output.level.icon).toBeDefined();
      }
    });

    it('should call get_information_level_by_name for non-existent level', async () => {
      const response = await client.callTool('get_information_level_by_name', {
        campaign_id: 'test-campaign',
        name: 'NonExistentLevel'
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetInformationLevelByNameOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(output.found).toBe(false);
      expect(output.level).toBe(null);
    });

    it('should call get_information_level_by_name for custom level', async () => {
      const response = await client.callTool('get_information_level_by_name', {
        campaign_id: 'test-campaign',
        name: 'Party Secret'  // Assuming this might be a custom level
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetInformationLevelByNameOutputSchema.safeParse(output);
      expect(result.success).toBe(true);

      if (output.found && output.level) {
        expect(output.level.is_system).toBe(false);
        expect(output.level.created_at).toBeDefined();
        expect(output.level.updated_at).toBeDefined();
      }
    });
  });
});