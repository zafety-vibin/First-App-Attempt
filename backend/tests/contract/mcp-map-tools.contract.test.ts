/**
 * Contract tests for MCP Map tools
 * Tests against the JSON Schema contracts in contracts/map-tools.json
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  ListMapPinsInputSchema,
  ListMapPinsOutputSchema,
  CreateMapPinInputSchema,
  CreateMapPinOutputSchema
} from '../../src/mcp/schemas/map-schemas';

describe('MCP Map Tools Contract Tests', () => {
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

  describe('list_map_pins', () => {
    it('should validate input schema', () => {
      const validInput = {
        map_id: 15,
        campaign_id: 'test-campaign'
      };

      const result = ListMapPinsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate input schema with optional parameters', () => {
      const validInput = {
        map_id: 15,
        campaign_id: 'test-campaign',
        layer_id: 2,
        bounds: {
          min_x: 0,
          min_y: 0,
          max_x: 1000,
          max_y: 1000
        }
      };

      const result = ListMapPinsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid bounds', () => {
      const invalidInput = {
        map_id: 15,
        campaign_id: 'test-campaign',
        bounds: {
          min_x: -10, // negative not allowed
          min_y: 0,
          max_x: 1000,
          max_y: 1000
        }
      };

      const result = ListMapPinsInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call list_map_pins tool and validate output', async () => {
      const response = await client.callTool('list_map_pins', {
        map_id: 15,
        campaign_id: 'test-campaign'
      });

      const output = JSON.parse(response.content[0].text);
      const result = ListMapPinsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);

      // Validate map information
      expect(output.map).toBeDefined();
      expect(output.map.id).toBe(15);
      expect(output.map.title).toBeDefined();
      expect(output.map.image_url).toBeDefined();
      expect(output.map.width).toBeGreaterThan(0);
      expect(output.map.height).toBeGreaterThan(0);

      // Validate arrays
      expect(Array.isArray(output.pins)).toBe(true);
      expect(Array.isArray(output.zones)).toBe(true);
      expect(Array.isArray(output.layers)).toBe(true);

      // Check pin structure if any exist
      if (output.pins.length > 0) {
        const pin = output.pins[0];
        expect(pin.id).toBeDefined();
        expect(pin.title).toBeDefined();
        expect(pin.x).toBeGreaterThanOrEqual(0);
        expect(pin.y).toBeGreaterThanOrEqual(0);
        expect(pin.icon).toBeDefined();
        expect(pin.color).toBeDefined();
      }

      // Check zone structure if any exist
      if (output.zones.length > 0) {
        const zone = output.zones[0];
        expect(zone.id).toBeDefined();
        expect(zone.name).toBeDefined();
        expect(Array.isArray(zone.vertices)).toBe(true);
        expect(zone.fill_color).toBeDefined();
        expect(zone.opacity).toBeGreaterThanOrEqual(0);
        expect(zone.opacity).toBeLessThanOrEqual(1);
      }
    });

    it('should call list_map_pins with bounds filter', async () => {
      const response = await client.callTool('list_map_pins', {
        map_id: 15,
        campaign_id: 'test-campaign',
        bounds: {
          min_x: 100,
          min_y: 100,
          max_x: 500,
          max_y: 500
        }
      });

      const output = JSON.parse(response.content[0].text);
      const result = ListMapPinsOutputSchema.safeParse(output);
      expect(result.success).toBe(true);

      // All pins should be within bounds if any exist
      if (output.pins.length > 0) {
        output.pins.forEach((pin: any) => {
          expect(pin.x).toBeGreaterThanOrEqual(100);
          expect(pin.x).toBeLessThanOrEqual(500);
          expect(pin.y).toBeGreaterThanOrEqual(100);
          expect(pin.y).toBeLessThanOrEqual(500);
        });
      }
    });
  });

  describe('create_map_pin', () => {
    it('should validate input schema with defaults', () => {
      const input = {
        map_id: 15,
        campaign_id: 'test-campaign',
        title: 'Dragon\'s Lair',
        x: 250,
        y: 350
      };

      const result = CreateMapPinInputSchema.parse(input);
      expect(result.icon).toBe('default');
      expect(result.color).toBe('#FF0000');
    });

    it('should validate input schema with all parameters', () => {
      const validInput = {
        map_id: 15,
        campaign_id: 'test-campaign',
        title: 'Ancient Tower',
        x: 450,
        y: 600,
        icon: 'tower',
        color: '#0000FF',
        layer_id: 2,
        references_card_id: 42,
        description: 'A mysterious tower from ages past'
      };

      const result = CreateMapPinInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject negative coordinates', () => {
      const invalidInput = {
        map_id: 15,
        campaign_id: 'test-campaign',
        title: 'Invalid Pin',
        x: -10,
        y: 100
      };

      const result = CreateMapPinInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject title exceeding max length', () => {
      const invalidInput = {
        map_id: 15,
        campaign_id: 'test-campaign',
        title: 'A'.repeat(256), // exceeds 255 character limit
        x: 100,
        y: 100
      };

      const result = CreateMapPinInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should call create_map_pin tool and validate output', async () => {
      const response = await client.callTool('create_map_pin', {
        map_id: 15,
        campaign_id: 'test-campaign',
        title: 'Test Pin',
        x: 300,
        y: 400,
        icon: 'marker',
        color: '#00FF00'
      });

      const output = JSON.parse(response.content[0].text);
      const result = CreateMapPinOutputSchema.safeParse(output);
      expect(result.success).toBe(true);

      // Validate pin creation
      expect(output.pin).toBeDefined();
      expect(output.pin.id).toBeDefined();
      expect(output.pin.map_id).toBe(15);
      expect(output.pin.title).toBe('Test Pin');
      expect(output.pin.x).toBe(300);
      expect(output.pin.y).toBe(400);
      expect(output.pin.icon).toBe('marker');
      expect(output.pin.color).toBe('#00FF00');
      expect(output.pin.created_at).toBeDefined();
    });

    it('should handle pin with card reference', async () => {
      const response = await client.callTool('create_map_pin', {
        map_id: 15,
        campaign_id: 'test-campaign',
        title: 'City Gate',
        x: 150,
        y: 200,
        references_card_id: 25,
        description: 'Main entrance to the city'
      });

      const output = JSON.parse(response.content[0].text);
      const result = CreateMapPinOutputSchema.safeParse(output);
      expect(result.success).toBe(true);

      expect(output.pin.references_card_id).toBe(25);
      expect(output.pin.description).toBe('Main entrance to the city');

      // Check for warnings if referenced card doesn't exist
      if (output.warnings) {
        expect(Array.isArray(output.warnings)).toBe(true);
      }
    });

    it('should handle orphaned pin warning', async () => {
      const response = await client.callTool('create_map_pin', {
        map_id: 15,
        campaign_id: 'test-campaign',
        title: 'Orphaned Location',
        x: 500,
        y: 500,
        references_card_id: 99999 // Non-existent card ID
      });

      const output = JSON.parse(response.content[0].text);
      const result = CreateMapPinOutputSchema.safeParse(output);
      expect(result.success).toBe(true);

      // Should have a warning about orphaned reference
      if (output.warnings) {
        expect(output.warnings.length).toBeGreaterThan(0);
        const orphanWarning = output.warnings.find((w: string) =>
          w.includes('orphan') || w.includes('not found') || w.includes('exist')
        );
        expect(orphanWarning).toBeDefined();
      }
    });
  });
});