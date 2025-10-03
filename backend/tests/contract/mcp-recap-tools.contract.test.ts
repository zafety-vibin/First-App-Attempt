/**
 * Contract tests for MCP Recap tools
 * Tests against the JSON Schema contracts in contracts/recap-tools.json
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  GetSessionRecapsInputSchema,
  GetSessionRecapsOutputSchema,
  GetTimelineEventsInputSchema,
  GetTimelineEventsOutputSchema
} from '../../src/mcp/schemas/recap-schemas';

describe('MCP Recap Tools Contract Tests', () => {
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

  describe('get_session_recaps', () => {
    it('should validate input schema with defaults', () => {
      const input = {
        campaign_id: 'test-campaign'
      };

      const result = GetSessionRecapsInputSchema.parse(input);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
      expect(result.include_content).toBe(true);
    });

    it('should validate input schema with custom values', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        limit: 20,
        offset: 10,
        include_content: false
      };

      const result = GetSessionRecapsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject limit exceeding maximum', () => {
      const invalidInput = {
        campaign_id: 'test-campaign',
        limit: 100 // exceeds max of 50
      };

      const result = GetSessionRecapsInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call get_session_recaps tool and validate output', async () => {
      const response = await client.callTool('get_session_recaps', {
        campaign_id: 'test-campaign',
        limit: 5,
        include_content: true
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetSessionRecapsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(Array.isArray(output.recaps)).toBe(true);
      expect(output.total_count).toBeGreaterThanOrEqual(0);
      expect(typeof output.has_more).toBe('boolean');

      // Check recap structure if any exist
      if (output.recaps.length > 0) {
        const recap = output.recaps[0];
        expect(recap.id).toBeDefined();
        expect(recap.session_number).toBeGreaterThan(0);
        expect(recap.title).toBeDefined();
      }
    });
  });

  describe('get_timeline_events', () => {
    it('should validate input schema with defaults', () => {
      const input = {
        campaign_id: 'test-campaign'
      };

      const result = GetTimelineEventsInputSchema.parse(input);
      expect(result.limit).toBe(50);
    });

    it('should validate input schema with date range', () => {
      const validInput = {
        campaign_id: 'test-campaign',
        start_date: 1609459200, // Jan 1, 2021
        end_date: 1640995199,   // Dec 31, 2021
        event_type: 'battle',
        limit: 25
      };

      const result = GetTimelineEventsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject limit exceeding maximum', () => {
      const invalidInput = {
        campaign_id: 'test-campaign',
        limit: 150 // exceeds max of 100
      };

      const result = GetTimelineEventsInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call get_timeline_events tool and validate output', async () => {
      const response = await client.callTool('get_timeline_events', {
        campaign_id: 'test-campaign',
        limit: 20
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetTimelineEventsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      expect(Array.isArray(output.events)).toBe(true);
      expect(output.timeline_summary).toBeDefined();
      expect(output.timeline_summary.total_events).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(output.timeline_summary.event_types)).toBe(true);

      // Check event structure if any exist
      if (output.events.length > 0) {
        const event = output.events[0];
        expect(event.id).toBeDefined();
        expect(event.event_date).toBeDefined();
        expect(event.title).toBeDefined();
        expect(typeof event.is_canon).toBe('boolean');
      }
    });

    it('should call get_timeline_events with date filter', async () => {
      const response = await client.callTool('get_timeline_events', {
        campaign_id: 'test-campaign',
        start_date: 1609459200,
        end_date: 1640995199,
        event_type: 'quest'
      });

      const output = JSON.parse(response.content[0].text);
      const result = GetTimelineEventsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);

      // All events should be within the date range if any exist
      if (output.events.length > 0) {
        output.events.forEach((event: any) => {
          expect(event.event_date).toBeGreaterThanOrEqual(1609459200);
          expect(event.event_date).toBeLessThanOrEqual(1640995199);
        });
      }
    });
  });
});