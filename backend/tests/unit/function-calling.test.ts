import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FunctionCallingService } from '../../src/services/FunctionCallingService';
import { ToolRegistryService } from '../../src/services/ToolRegistryService';
import { z } from 'zod';

describe('FunctionCallingService', () => {
  let functionCallingService: FunctionCallingService;
  let toolRegistryService: ToolRegistryService;

  beforeEach(() => {
    toolRegistryService = new ToolRegistryService();
    functionCallingService = new FunctionCallingService(toolRegistryService);
  });

  describe('zodToOpenAISchema', () => {
    it('should convert simple Zod schema to OpenAI function schema', () => {
      const zodSchema = z.object({
        name: z.string().describe('The name of the entity'),
        type: z.enum(['npc', 'location', 'item']).describe('Entity type'),
        level: z.number().optional().describe('Power level')
      });

      const openAISchema = functionCallingService.zodToOpenAISchema(
        'create_entity',
        'Creates a new entity in the campaign',
        zodSchema
      );

      expect(openAISchema).toEqual({
        type: 'function',
        function: {
          name: 'create_entity',
          description: 'Creates a new entity in the campaign',
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The name of the entity'
              },
              type: {
                type: 'string',
                enum: ['npc', 'location', 'item'],
                description: 'Entity type'
              },
              level: {
                type: 'number',
                description: 'Power level'
              }
            },
            required: ['name', 'type']
          }
        }
      });
    });

    it('should handle nested objects in Zod schema', () => {
      const zodSchema = z.object({
        card: z.object({
          title: z.string(),
          content: z.string(),
          tags: z.array(z.string())
        }),
        metadata: z.object({
          source: z.string(),
          confidence: z.number()
        }).optional()
      });

      const openAISchema = functionCallingService.zodToOpenAISchema(
        'create_card',
        'Creates a card with metadata',
        zodSchema
      );

      expect(openAISchema.function.parameters.properties).toHaveProperty('card');
      expect(openAISchema.function.parameters.properties.card).toMatchObject({
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['title', 'content', 'tags']
      });
    });

    it('should convert Zod schema to Anthropic tool schema', () => {
      const zodSchema = z.object({
        query: z.string().describe('Search query'),
        limit: z.number().default(10).describe('Max results'),
        tags: z.array(z.string()).optional()
      });

      const anthropicSchema = functionCallingService.zodToAnthropicSchema(
        'search_cards',
        'Search for cards in the campaign',
        zodSchema
      );

      expect(anthropicSchema).toEqual({
        name: 'search_cards',
        description: 'Search for cards in the campaign',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            },
            limit: {
              type: 'number',
              description: 'Max results',
              default: 10
            },
            tags: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['query']
        }
      });
    });
  });

  describe('registerMCPTools', () => {
    it('should register tools from Feature 011 MCP handlers', async () => {
      // Mock the MCP tool handlers
      const mockHandlers = {
        search_cards: vi.fn().mockResolvedValue({ results: [] }),
        create_card: vi.fn().mockResolvedValue({ id: 'card-123' }),
        update_graph: vi.fn().mockResolvedValue({ success: true }),
        query_graph: vi.fn().mockResolvedValue({ nodes: [], edges: [] })
      };

      // Register tools
      await functionCallingService.registerMCPTools(mockHandlers);

      // Verify tools are registered
      expect(toolRegistryService.hasHandler('search_cards')).toBe(true);
      expect(toolRegistryService.hasHandler('create_card')).toBe(true);
      expect(toolRegistryService.hasHandler('update_graph')).toBe(true);
      expect(toolRegistryService.hasHandler('query_graph')).toBe(true);
    });

    it('should convert MCP Zod schemas to OpenAI/Anthropic formats', async () => {
      const mockHandlers = {
        search_cards: vi.fn()
      };

      await functionCallingService.registerMCPTools(mockHandlers);

      const openAITools = functionCallingService.getOpenAITools();
      const anthropicTools = functionCallingService.getAnthropicTools();

      expect(openAITools).toContainEqual(
        expect.objectContaining({
          type: 'function',
          function: expect.objectContaining({
            name: 'search_cards'
          })
        })
      );

      expect(anthropicTools).toContainEqual(
        expect.objectContaining({
          name: 'search_cards'
        })
      );
    });
  });

  describe('executeFunctionCall', () => {
    it('should execute registered function and return result', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        cards: [
          { id: '1', title: 'NPC 1' },
          { id: '2', title: 'NPC 2' }
        ]
      });

      toolRegistryService.registerHandler('search_npcs', mockHandler);

      const result = await functionCallingService.executeFunctionCall(
        'search_npcs',
        { query: 'goblin', limit: 5 },
        { campaignId: 'campaign-123', userId: 'user-456' }
      );

      expect(mockHandler).toHaveBeenCalledWith(
        { query: 'goblin', limit: 5 },
        { campaignId: 'campaign-123', userId: 'user-456' }
      );

      expect(result).toEqual({
        cards: [
          { id: '1', title: 'NPC 1' },
          { id: '2', title: 'NPC 2' }
        ]
      });
    });

    it('should throw error for unregistered function', async () => {
      await expect(
        functionCallingService.executeFunctionCall(
          'non_existent_function',
          {},
          {}
        )
      ).rejects.toThrow('Function not registered: non_existent_function');
    });

    it('should handle function execution errors', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Database error'));

      toolRegistryService.registerHandler('failing_function', mockHandler);

      await expect(
        functionCallingService.executeFunctionCall(
          'failing_function',
          {},
          {}
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('batchExecuteFunctions', () => {
    it('should execute multiple functions in parallel', async () => {
      const searchHandler = vi.fn().mockResolvedValue({ cards: [] });
      const createHandler = vi.fn().mockResolvedValue({ id: 'new-card' });
      const updateHandler = vi.fn().mockResolvedValue({ success: true });

      toolRegistryService.registerHandler('search_cards', searchHandler);
      toolRegistryService.registerHandler('create_card', createHandler);
      toolRegistryService.registerHandler('update_graph', updateHandler);

      const calls = [
        { name: 'search_cards', arguments: { query: 'test' } },
        { name: 'create_card', arguments: { title: 'New Card' } },
        { name: 'update_graph', arguments: { nodeId: 'node-1' } }
      ];

      const results = await functionCallingService.batchExecuteFunctions(
        calls,
        { campaignId: 'campaign-123', userId: 'user-456' }
      );

      expect(results).toHaveLength(3);
      expect(searchHandler).toHaveBeenCalled();
      expect(createHandler).toHaveBeenCalled();
      expect(updateHandler).toHaveBeenCalled();

      expect(results[0]).toEqual({ cards: [] });
      expect(results[1]).toEqual({ id: 'new-card' });
      expect(results[2]).toEqual({ success: true });
    });

    it('should handle partial failures in batch execution', async () => {
      const successHandler = vi.fn().mockResolvedValue({ success: true });
      const failHandler = vi.fn().mockRejectedValue(new Error('Failed'));

      toolRegistryService.registerHandler('success_function', successHandler);
      toolRegistryService.registerHandler('fail_function', failHandler);

      const calls = [
        { name: 'success_function', arguments: {} },
        { name: 'fail_function', arguments: {} },
        { name: 'success_function', arguments: {} }
      ];

      const results = await functionCallingService.batchExecuteFunctions(
        calls,
        {},
        { continueOnError: true }
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ success: true });
      expect(results[1]).toBeInstanceOf(Error);
      expect(results[2]).toEqual({ success: true });
    });
  });
});