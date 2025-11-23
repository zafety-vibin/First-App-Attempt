/**
 * PortalAIService
 * Feature 009: Player Question Portal
 *
 * AI question answering with information filtering (CRITICAL SECURITY)
 * Uses GM's BYOLLM credentials, filters dm-secret content, generates citations
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { SessionRecapService } from './SessionRecapService';
import { ItemService } from './ItemService';
import { KnowledgeGraphService } from './KnowledgeGraphService';
import { CitationGeneratorService, CitationSource } from './CitationGeneratorService';
import { PortalTokenTrackerService } from './PortalTokenTrackerService';
import { BYOLLMConfigService } from './BYOLLMConfigService';
import { ProviderClientService } from './ProviderClientService';
import { PortalMessage } from '../models/PortalMessage';
import { RESPONSE_STYLES } from '../models/PortalConfig';

/**
 * T024: Build context from filtered entities
 * T025: Answer questions with BYOLLM integration
 */
export class PortalAIService {
  private citationService: CitationGeneratorService;
  private tokenTracker: PortalTokenTrackerService;
  private byollmService: BYOLLMConfigService;
  private providerClient: ProviderClientService;

  constructor(
    private db: Database.Database,
    private sessionRecapService: SessionRecapService,
    private itemService: ItemService,
    private graphService: KnowledgeGraphService
  ) {
    this.citationService = new CitationGeneratorService();
    this.tokenTracker = new PortalTokenTrackerService(db);
    this.byollmService = new BYOLLMConfigService();
    this.providerClient = new ProviderClientService();
  }

  /**
   * T024: Build context from player-accessible content
   *
   * CRITICAL SECURITY: Information Level Filtering
   * --------------------------------------------
   * This method uses BaseCategoryService.list() with { viewMode: 'player_view' } option
   * to ensure ONLY player-accessible content is included in AI responses.
   *
   * ViewMode Integration (Feature 004):
   * - 'player_view' filters OUT all dm-secret (DM Secret) content
   * - Includes: system, common-knowledge, player-knowledge
   * - Excludes: dm-secret
   * - Implementation: informationFilter middleware strips dm_* fields and filters rows
   *
   * BaseCategoryService Usage (Feature 014):
   * - All 13 category services extend BaseCategoryService
   * - Standardized CRUD interface with viewMode support
   * - Batch fetching to eliminate N+1 queries (performance improvement)
   * - Foreign key relationships resolved in single query
   *
   * Research.md Topic 3: "Use existing viewMode filtering system"
   * - Leverages extractViewMode(), stripDmFields(), getPlayerKnowledgeFilter()
   * - No separate portal filtering needed - reuses Feature 004 architecture
   *
   * @param campaignId - Campaign to build context for
   * @returns Filtered context string and citation sources (player-safe only)
   */
  async buildContext(campaignId: string): Promise<{ context: string; sources: CitationSource[] }> {
    const sources: CitationSource[] = [];

    // SESSION RECAPS: Last 100 sessions filtered by player_view
    // BaseCategoryService.list() automatically applies viewMode filtering
    // SQL: WHERE player_knowledge IN ('system', 'common-knowledge', 'player-knowledge')
    const recaps = await this.sessionRecapService.list(
      { campaign_id: campaignId },
      { limit: 100 },
      'session_number',
      'DESC',
      { viewMode: 'player_view' } // CRITICAL: Filters dm-secret content
    );

    // ITEMS: All player-accessible items
    // Same viewMode filtering as recaps
    const items = await this.itemService.list(
      { campaign_id: campaignId },
      { limit: 100 },
      undefined,
      undefined,
      { viewMode: 'player_view' } // CRITICAL: Filters dm-secret content
    );

    // KNOWLEDGE GRAPH: Relationships filtered by player_knowledge field
    // KnowledgeGraphService.getFilteredNodes() applies same filtering logic
    const graphNodes = await this.graphService.getFilteredNodes(campaignId, 'player_view');

    // Build context string
    let context = '# Campaign Information\n\n';

    // Add session recaps
    if (recaps.length > 0) {
      context += '## Session Recaps\n\n';
      recaps.forEach((recap) => {
        context += `**Session ${recap.session_number}**: ${recap.summary}\n\n`;
        sources.push({
          cardId: recap.id, // Assuming recap has ID that links to card
          cardTitle: `Session ${recap.session_number}`,
        });
      });
    }

    // Add items
    if (items.length > 0) {
      context += '## Items\n\n';
      items.forEach((item) => {
        context += `**${item.name}**: ${item.description || ''}\n\n`;
        sources.push({
          cardId: item.id,
          cardTitle: item.name,
        });
      });
    }

    // Add knowledge graph relationships
    if (graphNodes && graphNodes.length > 0) {
      context += '## Relationships\n\n';
      graphNodes.forEach((node: any) => {
        context += `- ${node.label} (${node.type})\n`;
      });
    }

    return { context, sources };
  }

  /**
   * T025: Answer player question with AI
   *
   * BYOLLM Integration (Feature 008)
   * --------------------------------
   * Player Portal is the ONLY feature that still uses BYOLLM.
   * General AI features (Import/Planning) were removed to avoid GM responsibility.
   * Portal was kept because it's "cool" and GMs can opt-in to set it up.
   *
   * Research.md Topic 3: "BYOLLM EXCLUSIVE to Player Portal"
   * - Uses BYOLLMConfigService.getConfig() to get GM's LLM credentials
   * - Scope: 'campaign' (each campaign has own BYOLLM config)
   * - OAuth 2.0 + PKCE flow (Feature 008)
   * - AES-256-GCM encrypted credentials
   * - No separate portal credentials - reuses campaign BYOLLM
   *
   * ProviderClientService (Feature 008):
   * - Unified client for OpenAI, Anthropic, custom endpoints
   * - Handles API key injection, rate limiting, error handling
   * - Returns usage tokens for cost tracking
   *
   * Citation Generation (T022):
   * - CitationGeneratorService creates numbered [1][2][3] links
   * - Links to /cards/{cardId} from Feature 003
   * - Top 5 sources to avoid overwhelming player
   *
   * Token Tracking (T023):
   * - PortalTokenTrackerService records per-player usage
   * - GM monitors in PortalMonitoring component (T031)
   * - Warning displayed to players about GM's credentials (T041)
   *
   * @param campaignId - Campaign ID
   * @param playerId - Player who asked question
   * @param conversationId - Conversation thread ID
   * @param question - Player's question
   * @param responseStyle - Tone of AI response (friendly-sage, scholarly-tome, etc.)
   * @returns PortalMessage with AI response, citations, and token count
   */
  async answerQuestion(
    campaignId: string,
    playerId: string,
    conversationId: string,
    question: string,
    responseStyle: string = 'friendly-sage'
  ): Promise<PortalMessage> {
    // STEP 1: Build filtered context (see buildContext() documentation above)
    // This ensures ONLY player-accessible content is provided to the AI
    const { context, sources } = await this.buildContext(campaignId);

    // STEP 2: Get GM's BYOLLM config
    // BYOLLMConfigService.getConfig() retrieves campaign-scoped LLM credentials
    // Throws error if GM hasn't configured BYOLLM (required for portal to function)
    const byollmConfig = await this.byollmService.getConfig({
      scope: 'campaign',
      campaignId,
    });

    if (!byollmConfig) {
      throw new Error('GM must configure BYOLLM for Player Portal to function');
    }

    // STEP 3: Build system prompt based on response style
    // Different styles: friendly-sage (warm), scholarly-tome (formal),
    // tavern-gossip (casual), factual (concise)
    const systemPrompt = this.buildSystemPrompt(responseStyle, context);

    // STEP 4: Query LLM using ProviderClientService
    // Handles API calls to OpenAI/Anthropic/custom endpoints
    // Automatically injects API keys, handles rate limiting, returns usage
    const llmResponse = await this.providerClient.chat({
      configId: byollmConfig.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
    });

    // STEP 5: Generate citations
    // Top 5 sources to avoid overwhelming player
    // CitationGeneratorService creates [1][2][3] numbered links to /cards/{cardId}
    const citations = this.citationService.generate(sources.slice(0, 5));

    // STEP 6: Create message record
    const messageId = randomUUID();
    const message: PortalMessage = {
      id: messageId,
      conversationId,
      playerId,
      question,
      response: llmResponse.content,
      citations,
      tokenCount: llmResponse.usage?.total_tokens || 0,
      createdAt: Date.now(),
    };

    // STEP 7: Track token usage for GM monitoring
    // PortalTokenTrackerService.record() updates portal_token_usage table
    // GM can see per-player costs in PortalMonitoring (T031)
    this.tokenTracker.record(playerId, campaignId, messageId, message.tokenCount);

    return message;
  }

  /**
   * Build system prompt based on response style
   */
  private buildSystemPrompt(responseStyle: string, context: string): string {
    const stylePrompts = {
      'friendly-sage':
        'You are a warm, helpful librarian guiding players through campaign lore. Be welcoming and encouraging.',
      'scholarly-tome':
        'You are a formal academic authority on this campaign world. Be precise and authoritative.',
      'tavern-gossip':
        'You are a casual storyteller sharing tales over drinks. Be conversational and colorful.',
      factual: 'Provide straightforward, concise answers. Just the facts.',
    };

    const styleInstruction =
      stylePrompts[responseStyle as keyof typeof stylePrompts] || stylePrompts['friendly-sage'];

    return `${styleInstruction}

Answer player questions about the campaign using ONLY the following information. Do not make up or invent details not present in this context.

If you don't have information to answer a question, say "I don't have information about that in the campaign records."

Cite sources by mentioning the session number or item name when referencing specific information.

${context}`;
  }
}
