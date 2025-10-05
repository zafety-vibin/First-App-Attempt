/**
 * Import AI Service
 * Feature: 005-create-the-ai
 * Handles entity extraction, deduplication, and approval summary generation
 */

import Database from 'better-sqlite3';
import { ToolRegistryService } from './ToolRegistryService';
import { LLMOrchestrationService } from './LLMOrchestrationService';
import crypto from 'crypto';

// Simple Levenshtein distance implementation
const levenshtein = {
  get(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[len1][len2];
  }
};
import {
  ChatMessage,
  AIApprovalSummary,
  EntityExtractionResult,
  TimelineConflict
} from '../../shared/types/ImportSession';
// import type { ImportSession } from '../../shared/types/ImportSession'; // For future use
// import { GraphNode, GraphEdge } from '../../shared/types/KnowledgeGraph'; // Reserved for future use

/**
 * Configuration for Import AI
 */
interface ImportAIConfig {
  llmConfig: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model: string;
  };
  deduplicationThreshold: number; // Default: 0.7
}

/**
 * Import AI Service
 * Reference: research-part2.md lines 8-245
 */
export class ImportAIService {
  private toolRegistry: ToolRegistryService;
  private llmService: LLMOrchestrationService;

  constructor(
    private db: Database.Database,
    private config: ImportAIConfig
  ) {
    this.toolRegistry = new ToolRegistryService();
    this.llmService = new LLMOrchestrationService(this.config.llmConfig);
  }

  /**
   * Initialize the service
   */
  async initialize() {
    await this.toolRegistry.initialize();
  }

  /**
   * Extract entities from text using function calling
   */
  async extractEntities(
    _sessionId: string,
    campaignId: string,
    text: string
  ): Promise<EntityExtractionResult[]> {
    const entities: EntityExtractionResult[] = [];

    // System prompt for entity extraction
    const systemPrompt = `You are an AI assistant helping to extract entities from TTRPG session recaps.
    Extract the following types of entities:
    - NPCs (characters)
    - Locations (places, buildings, regions)
    - Factions (organizations, groups)
    - Items (notable objects, artifacts)
    - Events (significant occurrences)

    For each entity, determine:
    1. Name
    2. Type
    3. Relevant details

    Use the search_cards tool to check if similar entities already exist.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
      { role: 'user', content: `Extract entities from this text:\n\n${text}`, timestamp: new Date().toISOString() }
    ];

    // Tools for entity extraction
    // const tools = this.toolRegistry.getToolsSubset(['search_cards', 'list_information_levels']); // Will be used when tool selection is implemented

    // Track entities found
    const entityBuffer: any[] = [];

    // Function handler for tool calls
    const functionHandler = async (name: string, params: any) => {
      // Add campaign_id to params
      const enrichedParams = { ...params, campaign_id: campaignId };
      const result = await this.toolRegistry.executeTool(name, enrichedParams);

      // If search_cards returns results, track them for deduplication
      if (name === 'search_cards' && result.cards) {
        for (const card of result.cards) {
          entityBuffer.push({
            id: card.id,
            title: card.title,
            type: card.card_type
          });
        }
      }

      return result;
    };

    // Stream the extraction process
    const extractedText: string[] = [];
    for await (const chunk of this.llmService.streamChatCompletion(
      messages,
      this.config.llmConfig.provider === 'openai'
        ? this.toolRegistry.getOpenAITools()
        : this.toolRegistry.getAnthropicTools(),
      functionHandler
    )) {
      extractedText.push(chunk);
    }

    // Parse the extracted entities from the response
    const fullResponse = extractedText.join('');
    const extractedEntities = this.parseEntityResponse(fullResponse);

    // Deduplicate against existing entities
    for (const entity of extractedEntities) {
      const deduped = await this.deduplicateEntity(entity, entityBuffer, campaignId);
      entities.push(deduped);
    }

    return entities;
  }

  /**
   * Parse entity extraction response
   */
  private parseEntityResponse(response: string): EntityExtractionResult[] {
    const entities: EntityExtractionResult[] = [];

    // Try to parse structured JSON if present
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed)) {
          return parsed.map(e => ({
            name: e.name,
            type: e.type,
            confidence: e.confidence || 0.8
          }));
        }
      } catch (e) {
        // Fall back to text parsing
      }
    }

    // Parse from text format (fallback)
    const lines = response.split('\n');
    for (const line of lines) {
      // Look for patterns like "- Name: X, Type: Y"
      const match = line.match(/[-*]\s*(?:Name|Entity):\s*([^,]+),\s*Type:\s*(\w+)/i);
      if (match) {
        entities.push({
          name: match[1].trim(),
          type: match[2].toLowerCase(),
          confidence: 0.7
        });
      }
    }

    return entities;
  }

  /**
   * Deduplicate an entity against existing ones
   */
  private async deduplicateEntity(
    entity: EntityExtractionResult,
    existingBuffer: any[],
    campaignId: string
  ): Promise<EntityExtractionResult> {
    // Check buffer first
    for (const existing of existingBuffer) {
      const similarity = this.calculateSimilarity(entity.name, existing.title);
      if (similarity >= this.config.deduplicationThreshold) {
        return {
          ...entity,
          fuzzyMatchScore: similarity,
          existingEntityId: existing.id
        };
      }
    }

    // Query database for similar entities
    const searchQuery = `
      SELECT id, title FROM cards
      WHERE campaign_id = ?
      AND title LIKE ?
      LIMIT 10
    `;

    const searchPattern = `%${entity.name.split(' ')[0]}%`;
    const rows = this.db.prepare(searchQuery).all(campaignId, searchPattern) as any[];

    for (const row of rows) {
      const similarity = this.calculateSimilarity(entity.name, row.title);
      if (similarity >= this.config.deduplicationThreshold) {
        return {
          ...entity,
          fuzzyMatchScore: similarity,
          existingEntityId: row.id.toString()
        };
      }
    }

    return entity;
  }

  /**
   * Calculate Levenshtein similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const distance = levenshtein.get(str1.toLowerCase(), str2.toLowerCase());
    const maxLen = Math.max(str1.length, str2.length);
    return 1 - (distance / maxLen);
  }

  /**
   * Generate approval summary for extracted entities
   */
  async generateApprovalSummary(
    _sessionId: string,
    entities: EntityExtractionResult[],
    campaignId: string
  ): Promise<AIApprovalSummary> {
    const summary: AIApprovalSummary = {
      entitiesExtracted: entities,
      nodesAdded: [],
      edgesAdded: [],
      cardsCreated: [],
      potentialConflicts: []
    };

    // Group entities by type for graph assignment
    const entityGroups = new Map<string, EntityExtractionResult[]>();
    for (const entity of entities) {
      if (!entity.existingEntityId) { // Only new entities
        const group = entityGroups.get(entity.type) || [];
        group.push(entity);
        entityGroups.set(entity.type, group);
      }
    }

    // Assign to appropriate graphs
    for (const [type, groupEntities] of entityGroups) {
      const graphType = this.getGraphTypeForEntity(type);

      for (const entity of groupEntities) {
        // Generate IDs for preview
        const nodeId = crypto.randomBytes(8).toString('hex');
        const cardId = crypto.randomBytes(8).toString('hex');

        // Add to nodes
        summary.nodesAdded.push({
          graphType,
          nodeType: type,
          name: entity.name,
          nodeId
        });

        // Add to cards
        summary.cardsCreated.push({
          title: entity.name,
          category: type,
          cardId
        });
      }
    }

    // Detect potential relationships/edges
    summary.edgesAdded = await this.detectRelationships(entities, campaignId);

    // Check for timeline conflicts
    summary.potentialConflicts = await this.detectTimelineConflicts(entities, campaignId);

    return summary;
  }

  /**
   * Determine which graph type an entity belongs to
   */
  private getGraphTypeForEntity(entityType: string): AIApprovalSummary['nodesAdded'][0]['graphType'] {
    switch (entityType.toLowerCase()) {
      case 'location':
      case 'place':
      case 'region':
        return 'geographical';
      case 'npc':
      case 'faction':
      case 'organization':
        return 'political_web';
      case 'event':
      case 'plot':
        return 'campaign_story';
      default:
        return 'world_foundations';
    }
  }

  /**
   * Detect potential relationships between entities
   */
  private async detectRelationships(
    entities: EntityExtractionResult[],
    _campaignId: string
  ): Promise<AIApprovalSummary['edgesAdded']> {
    const edges: AIApprovalSummary['edgesAdded'] = [];

    // Simple relationship detection based on co-occurrence
    // In production, this would use more sophisticated NLP
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];

        // Example: NPCs and factions are often allied
        if (entity1.type === 'npc' && entity2.type === 'faction') {
          edges.push({
            graphType: 'political_web',
            relationshipType: 'member_of',
            source: entity1.name,
            target: entity2.name,
            edgeId: crypto.randomBytes(8).toString('hex')
          });
        }

        // Example: NPCs and locations
        if (entity1.type === 'npc' && entity2.type === 'location') {
          edges.push({
            graphType: 'geographical',
            relationshipType: 'located_at',
            source: entity1.name,
            target: entity2.name,
            edgeId: crypto.randomBytes(8).toString('hex')
          });
        }
      }
    }

    return edges;
  }

  /**
   * Detect potential timeline conflicts with existing session recaps
   */
  private async detectTimelineConflicts(
    entities: EntityExtractionResult[],
    campaignId: string
  ): Promise<TimelineConflict[]> {
    const conflicts: TimelineConflict[] = [];

    // Query existing session recaps
    const recapsQuery = `
      SELECT id, title, content
      FROM cards
      WHERE campaign_id = ?
      AND card_type = 'text'
      AND title LIKE '%Session%'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const recaps = this.db.prepare(recapsQuery).all(campaignId) as any[];

    // Check for conflicts (simplified version)
    for (const entity of entities) {
      if (entity.type === 'event') {
        for (const recap of recaps) {
          const content = JSON.stringify(recap.content);
          // Check if event is mentioned with different details
          if (content.includes(entity.name)) {
            conflicts.push({
              description: `Event "${entity.name}" may conflict with existing recap`,
              sourceCardId: '', // Would be set from actual card
              conflictingRecapId: recap.id.toString(),
              severity: 'medium'
            });
          }
        }
      }
    }

    return conflicts;
  }
}