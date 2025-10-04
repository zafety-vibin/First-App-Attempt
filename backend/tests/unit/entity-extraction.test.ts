import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityExtractionService } from '../../src/services/EntityExtractionService';
import { FunctionCallingService } from '../../src/services/FunctionCallingService';
import { LLMOrchestrationService } from '../../src/services/LLMOrchestrationService';

describe('EntityExtractionService', () => {
  let entityExtractionService: EntityExtractionService;
  let functionCallingService: FunctionCallingService;
  let llmOrchestrationService: LLMOrchestrationService;

  beforeEach(() => {
    functionCallingService = new FunctionCallingService();
    llmOrchestrationService = new LLMOrchestrationService();
    entityExtractionService = new EntityExtractionService(
      functionCallingService,
      llmOrchestrationService
    );
  });

  describe('extractEntitiesFromText', () => {
    it('should extract NPCs from session recap text', async () => {
      const text = `
        The party met with Lord Blackwood at his castle.
        He introduced them to his advisor, Sage Eldara, who warned them about
        the goblin king Grukk who controls the northern passes.
      `;

      // Mock LLM response with function calls
      vi.spyOn(llmOrchestrationService, 'generateWithFunctions').mockResolvedValue({
        content: 'I found 3 NPCs in the text.',
        function_calls: [
          {
            name: 'create_entity',
            arguments: {
              type: 'npc',
              name: 'Lord Blackwood',
              attributes: {
                title: 'Lord',
                location: 'Blackwood Castle',
                role: 'Noble'
              }
            }
          },
          {
            name: 'create_entity',
            arguments: {
              type: 'npc',
              name: 'Sage Eldara',
              attributes: {
                title: 'Sage',
                role: 'Advisor to Lord Blackwood'
              }
            }
          },
          {
            name: 'create_entity',
            arguments: {
              type: 'npc',
              name: 'Grukk',
              attributes: {
                title: 'Goblin King',
                location: 'Northern Passes',
                role: 'Antagonist'
              }
            }
          }
        ]
      });

      const entities = await entityExtractionService.extractEntitiesFromText(
        text,
        'campaign-123'
      );

      expect(entities).toHaveLength(3);
      expect(entities[0]).toMatchObject({
        type: 'npc',
        name: 'Lord Blackwood',
        attributes: expect.objectContaining({
          title: 'Lord'
        })
      });
    });

    it('should extract locations from text', async () => {
      const text = `
        The journey took them from the Port of Shadows through the Whispering Woods
        to reach the ancient Tower of Stars.
      `;

      vi.spyOn(llmOrchestrationService, 'generateWithFunctions').mockResolvedValue({
        content: 'I found 3 locations.',
        function_calls: [
          {
            name: 'create_entity',
            arguments: {
              type: 'location',
              name: 'Port of Shadows',
              attributes: { type: 'port' }
            }
          },
          {
            name: 'create_entity',
            arguments: {
              type: 'location',
              name: 'Whispering Woods',
              attributes: { type: 'forest' }
            }
          },
          {
            name: 'create_entity',
            arguments: {
              type: 'location',
              name: 'Tower of Stars',
              attributes: { type: 'landmark', age: 'ancient' }
            }
          }
        ]
      });

      const entities = await entityExtractionService.extractEntitiesFromText(
        text,
        'campaign-123'
      );

      expect(entities).toHaveLength(3);
      expect(entities.map(e => e.name)).toContain('Port of Shadows');
      expect(entities.map(e => e.name)).toContain('Whispering Woods');
      expect(entities.map(e => e.name)).toContain('Tower of Stars');
    });

    it('should extract relationships between entities', async () => {
      const text = `
        Queen Elysia rules from the Crystal Palace. Her son, Prince Aldric,
        commands the Royal Guard. They are opposed by Duke Malachar.
      `;

      vi.spyOn(llmOrchestrationService, 'generateWithFunctions').mockResolvedValue({
        content: 'Extracted entities and relationships.',
        function_calls: [
          {
            name: 'create_entity',
            arguments: {
              type: 'npc',
              name: 'Queen Elysia',
              id: 'npc-1'
            }
          },
          {
            name: 'create_entity',
            arguments: {
              type: 'npc',
              name: 'Prince Aldric',
              id: 'npc-2'
            }
          },
          {
            name: 'create_relationship',
            arguments: {
              source_id: 'npc-1',
              target_id: 'npc-2',
              type: 'family',
              attributes: { relation: 'mother-son' }
            }
          }
        ]
      });

      const result = await entityExtractionService.extractEntitiesWithRelationships(
        text,
        'campaign-123'
      );

      expect(result.entities).toHaveLength(2);
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0]).toMatchObject({
        source_id: 'npc-1',
        target_id: 'npc-2',
        type: 'family'
      });
    });
  });

  describe('deduplicateEntities', () => {
    it('should merge duplicate entities using Levenshtein distance', () => {
      const entities = [
        { type: 'npc', name: 'Lord Blackwood', attributes: { title: 'Lord' } },
        { type: 'npc', name: 'Lord Blackwod', attributes: { location: 'Castle' } }, // Typo
        { type: 'npc', name: 'Sage Eldara', attributes: {} },
        { type: 'npc', name: 'Eldara the Sage', attributes: { role: 'Advisor' } } // Same person
      ];

      const deduplicated = entityExtractionService.deduplicateEntities(
        entities,
        0.7 // 70% similarity threshold
      );

      // Should merge similar names
      expect(deduplicated).toHaveLength(2);

      // Check that attributes were merged
      const blackwood = deduplicated.find(e => e.name.includes('Blackwood'));
      expect(blackwood?.attributes).toHaveProperty('title');
      expect(blackwood?.attributes).toHaveProperty('location');
    });

    it('should not merge entities of different types', () => {
      const entities = [
        { type: 'npc', name: 'Shadowkeep', attributes: {} },
        { type: 'location', name: 'Shadowkeep', attributes: {} }
      ];

      const deduplicated = entityExtractionService.deduplicateEntities(entities);

      expect(deduplicated).toHaveLength(2);
    });

    it('should calculate Levenshtein distance correctly', () => {
      const distance = entityExtractionService.levenshteinDistance(
        'kitten',
        'sitting'
      );
      expect(distance).toBe(3);

      const similarity = entityExtractionService.calculateSimilarity(
        'Lord Blackwood',
        'Lord Blackwod'
      );
      expect(similarity).toBeGreaterThan(0.9); // Very similar

      const lowSimilarity = entityExtractionService.calculateSimilarity(
        'Queen Elysia',
        'Duke Malachar'
      );
      expect(lowSimilarity).toBeLessThan(0.3); // Very different
    });
  });

  describe('findExistingEntities', () => {
    it('should find existing cards that match extracted entities', async () => {
      const entities = [
        { type: 'npc', name: 'Lord Blackwood', attributes: {} },
        { type: 'location', name: 'Crystal Palace', attributes: {} }
      ];

      // Mock search_cards function calls
      vi.spyOn(functionCallingService, 'executeFunctionCall')
        .mockImplementation(async (name, params) => {
          if (name === 'search_cards' && params.query === 'Lord Blackwood') {
            return {
              cards: [
                { id: 'card-1', title: 'Lord Blackwood', type: 'npc' }
              ]
            };
          }
          if (name === 'search_cards' && params.query === 'Crystal Palace') {
            return {
              cards: [
                { id: 'card-2', title: 'The Crystal Palace', type: 'location' }
              ]
            };
          }
          return { cards: [] };
        });

      const matches = await entityExtractionService.findExistingEntities(
        entities,
        'campaign-123'
      );

      expect(matches).toHaveLength(2);
      expect(matches[0]).toMatchObject({
        entity: expect.objectContaining({ name: 'Lord Blackwood' }),
        existing_card: expect.objectContaining({ id: 'card-1' }),
        similarity: expect.any(Number)
      });
    });

    it('should handle partial matches with similarity scores', async () => {
      const entities = [
        { type: 'npc', name: 'Lord Blackwood', attributes: {} }
      ];

      vi.spyOn(functionCallingService, 'executeFunctionCall')
        .mockResolvedValue({
          cards: [
            { id: 'card-1', title: 'Lord Edmund Blackwood III', type: 'npc' },
            { id: 'card-2', title: 'Lady Blackwood', type: 'npc' }
          ]
        });

      const matches = await entityExtractionService.findExistingEntities(
        entities,
        'campaign-123'
      );

      // Should find partial matches
      expect(matches).toHaveLength(1);
      expect(matches[0].potential_duplicates).toHaveLength(2);
      expect(matches[0].potential_duplicates[0].similarity).toBeGreaterThan(0.5);
    });
  });

  describe('generateApprovalSummary', () => {
    it('should generate structured approval summary', async () => {
      const extractedData = {
        entities: [
          { type: 'npc', name: 'Lord Blackwood', attributes: {} },
          { type: 'location', name: 'Crystal Palace', attributes: {} }
        ],
        relationships: [
          {
            source_id: 'npc-1',
            target_id: 'loc-1',
            type: 'resides',
            attributes: {}
          }
        ],
        existing_matches: [
          {
            entity: { type: 'npc', name: 'Lord Blackwood' },
            existing_card: { id: 'card-1', title: 'Lord Blackwood' },
            similarity: 1.0
          }
        ]
      };

      const summary = await entityExtractionService.generateApprovalSummary(
        extractedData,
        'campaign-123',
        'import-session-123'
      );

      expect(summary).toMatchObject({
        session_id: 'import-session-123',
        campaign_id: 'campaign-123',
        new_entities: expect.arrayContaining([
          expect.objectContaining({ name: 'Crystal Palace' })
        ]),
        updated_entities: expect.arrayContaining([
          expect.objectContaining({
            card_id: 'card-1',
            updates: expect.any(Object)
          })
        ]),
        relationships: expect.any(Array),
        conflicts: expect.any(Array),
        statistics: {
          total_entities: 2,
          new_entities: 1,
          updated_entities: 1,
          relationships: 1
        }
      });
    });

    it('should detect timeline conflicts against session recaps', async () => {
      const extractedData = {
        entities: [
          {
            type: 'npc',
            name: 'King Aldric',
            attributes: {
              status: 'alive',
              session_mentioned: 15
            }
          }
        ],
        relationships: []
      };

      // Mock session recap that says the king died
      vi.spyOn(functionCallingService, 'executeFunctionCall')
        .mockResolvedValue({
          recaps: [
            {
              session_number: 10,
              content: 'King Aldric was killed in battle',
              date: '2024-01-01'
            }
          ]
        });

      const summary = await entityExtractionService.generateApprovalSummary(
        extractedData,
        'campaign-123',
        'import-session-123'
      );

      expect(summary.conflicts).toHaveLength(1);
      expect(summary.conflicts[0]).toMatchObject({
        type: 'timeline',
        entity: 'King Aldric',
        conflict: expect.stringContaining('killed'),
        session: 10
      });
    });
  });
});