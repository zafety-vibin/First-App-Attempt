/**
 * Planning AI Service
 * Feature: 005-create-the-ai
 * Handles planning chat, graph context, and immediate updates without approval
 */

import Database from 'better-sqlite3';
import { ToolRegistryService } from './ToolRegistryService';
import { LLMOrchestrationService } from './LLMOrchestrationService';
import crypto from 'crypto';
import { PlanningSession, GraphUpdate } from '../../shared/types/PlanningSession';
import { ChatMessage } from '../../shared/types/ImportSession';

/**
 * Configuration for Planning AI
 */
interface PlanningAIConfig {
  llmConfig: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model: string;
  };
  activeFilterEnabled: boolean; // For Political-Web and Campaign-Story graphs
}

/**
 * Planning AI Service
 * Reference: research-part2.md lines 246-563
 */
export class PlanningAIService {
  private toolRegistry: ToolRegistryService;
  private llmService: LLMOrchestrationService;

  constructor(
    private db: Database.Database,
    private config: PlanningAIConfig
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
   * Create a new planning session
   */
  async createSession(campaignId: string): Promise<PlanningSession> {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);

    this.db.prepare(`
      INSERT INTO planning_sessions (
        id, campaign_id, status, chat_history, graph_updates, created_at, completed_at
      )
      VALUES (?, ?, 'active', '[]', '[]', ?, NULL)
    `).run(sessionId, campaignId, timestamp);

    return {
      id: sessionId,
      campaignId,
      status: 'active',
      chatHistory: [],
      graphUpdates: [],
      createdAt: new Date(timestamp * 1000).toISOString()
    };
  }

  /**
   * Handle a chat message with immediate graph updates
   */
  async handleChat(
    sessionId: string,
    campaignId: string,
    userMessage: string
  ): Promise<AsyncGenerator<string, void, unknown>> {
    // Get session
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Build context from graphs
    const graphContext = await this.buildGraphContext(campaignId);

    // System prompt for planning
    const systemPrompt = `You are a Planning AI assistant for a TTRPG campaign.
    You help the Game Master plan future sessions and maintain the campaign's knowledge graphs.

    Current Knowledge Graph Context:
    ${graphContext}

    You have access to tools to:
    - Query and update knowledge graphs
    - Search for cards and information
    - Create relationships between entities
    - View session recaps and timeline

    When the GM discusses planning:
    1. Use query_graph to understand current state
    2. Use update_graph to immediately apply changes
    3. Use search_cards to find existing content
    4. Maintain consistency with session recaps

    Updates are applied immediately without approval.
    Be proactive in suggesting connections and plot developments.`;

    // Build message history
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt, timestamp: new Date().toISOString() },
      ...session.chatHistory,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
    ];

    // Tools for planning
    const tools = this.toolRegistry.getToolsSubset([
      'query_graph',
      'update_graph',
      'list_graph_nodes',
      'get_node_relationships',
      'search_cards',
      'create_card',
      'update_card',
      'get_session_recaps',
      'get_timeline_events'
    ]);

    // Track graph updates
    const graphUpdates: GraphUpdate[] = [];

    // Function handler for tool calls
    const functionHandler = async (name: string, params: any) => {
      // Add campaign_id to params
      const enrichedParams = { ...params, campaign_id: campaignId };

      // Apply active filtering for certain graph types
      if (this.config.activeFilterEnabled &&
          (params.graph_type === 'political_web' || params.graph_type === 'campaign_story')) {
        enrichedParams.active_only = true;
      }

      const result = await this.toolRegistry.executeTool(name, enrichedParams);

      // Track graph updates
      if (name === 'update_graph' && result.success) {
        const updates = this.extractGraphUpdates(params, result);
        graphUpdates.push(...updates);

        // Save updates immediately
        await this.saveGraphUpdates(sessionId, updates);
      }

      return result;
    };

    // Create generator for streaming
    return this.streamChat(
      messages,
      tools,
      functionHandler,
      sessionId,
      userMessage
    );
  }

  /**
   * Stream chat with LLM
   */
  private async *streamChat(
    messages: ChatMessage[],
    _tools: any[],
    functionHandler: (name: string, params: any) => Promise<any>,
    sessionId: string,
    userMessage: string
  ): AsyncGenerator<string, void, unknown> {
    const responseChunks: string[] = [];

    try {
      for await (const chunk of this.llmService.streamChatCompletion(
        messages,
        this.config.llmConfig.provider === 'openai'
          ? this.toolRegistry.getOpenAITools()
          : this.toolRegistry.getAnthropicTools(),
        functionHandler
      )) {
        responseChunks.push(chunk);
        yield chunk;
      }

      // Save chat history
      const fullResponse = responseChunks.join('');
      await this.updateChatHistory(sessionId, userMessage, fullResponse);
    } catch (error: any) {
      yield `Error: ${error.message}`;
    }
  }

  /**
   * Build context from knowledge graphs
   */
  private async buildGraphContext(campaignId: string): Promise<string> {
    const context: string[] = [];

    // Get graph summaries
    const graphs = this.db.prepare(`
      SELECT type,
             (SELECT COUNT(*) FROM graph_nodes WHERE graph_id = kg.id) as node_count,
             (SELECT COUNT(*) FROM graph_edges WHERE graph_id = kg.id) as edge_count
      FROM knowledge_graphs kg
      WHERE campaign_id = ?
    `).all(campaignId) as any[];

    for (const graph of graphs) {
      context.push(`${graph.type}: ${graph.node_count} nodes, ${graph.edge_count} edges`);
    }

    // Get recent session recaps for timeline context
    const recentRecaps = this.db.prepare(`
      SELECT title, created_at
      FROM cards
      WHERE campaign_id = ?
      AND card_type = 'text'
      AND title LIKE '%Session%'
      ORDER BY created_at DESC
      LIMIT 5
    `).all(campaignId) as any[];

    if (recentRecaps.length > 0) {
      context.push('\nRecent Sessions:');
      for (const recap of recentRecaps) {
        const date = new Date(recap.created_at * 1000).toLocaleDateString();
        context.push(`- ${recap.title} (${date})`);
      }
    }

    // Apply active filtering if enabled
    if (this.config.activeFilterEnabled) {
      const activeNodes = this.getActiveNodes(campaignId);
      if (activeNodes.length > 0) {
        context.push('\nActive/Party-Relevant:');
        for (const node of activeNodes) {
          context.push(`- ${node.name} (${node.type})`);
        }
      }
    }

    return context.join('\n');
  }

  /**
   * Get active nodes for Political-Web and Campaign-Story graphs
   */
  private getActiveNodes(campaignId: string): any[] {
    // Get last 5 session recaps
    const recentSessionIds = this.db.prepare(`
      SELECT id FROM cards
      WHERE campaign_id = ?
      AND card_type = 'text'
      AND title LIKE '%Session%'
      ORDER BY created_at DESC
      LIMIT 5
    `).all(campaignId).map((r: any) => r.id);

    if (recentSessionIds.length === 0) {
      return [];
    }

    // Get nodes tagged as active or referenced in recent sessions
    const activeNodes = this.db.prepare(`
      SELECT DISTINCT n.name, n.type, g.type as graph_type
      FROM graph_nodes n
      JOIN knowledge_graphs g ON n.graph_id = g.id
      WHERE g.campaign_id = ?
      AND g.type IN ('political_web', 'campaign_story')
      AND (
        json_extract(n.attributes, '$.tags') LIKE '%active%'
        OR json_extract(n.attributes, '$.tags') LIKE '%party-relevant%'
        OR n.source_card_id IN (${recentSessionIds.map(() => '?').join(',')})
      )
      LIMIT 20
    `).all(campaignId, ...recentSessionIds) as any[];

    return activeNodes;
  }

  /**
   * Extract graph updates from tool results
   */
  private extractGraphUpdates(params: any, result: any): GraphUpdate[] {
    const updates: GraphUpdate[] = [];
    const timestamp = new Date().toISOString();

    if (params.operations) {
      for (const op of params.operations) {
        if (op.type === 'add_node') {
          updates.push({
            type: 'node_add',
            graphType: params.graph_type,
            nodeId: result.node_ids?.[updates.filter(u => u.type === 'node_add').length],
            data: op.data,
            appliedAt: timestamp
          });
        } else if (op.type === 'update_node') {
          updates.push({
            type: 'node_update',
            graphType: params.graph_type,
            nodeId: op.node_id,
            data: op.data,
            appliedAt: timestamp
          });
        } else if (op.type === 'add_edge') {
          updates.push({
            type: 'edge_add',
            graphType: params.graph_type,
            edgeId: result.edge_ids?.[updates.filter(u => u.type === 'edge_add').length],
            data: op.data,
            appliedAt: timestamp
          });
        } else if (op.type === 'delete_edge') {
          updates.push({
            type: 'edge_delete',
            graphType: params.graph_type,
            edgeId: op.edge_id,
            data: {},
            appliedAt: timestamp
          });
        }
      }
    }

    return updates;
  }

  /**
   * Save graph updates to session
   */
  private async saveGraphUpdates(sessionId: string, updates: GraphUpdate[]): Promise<void> {
    const session = this.db.prepare(`
      SELECT graph_updates FROM planning_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (session) {
      const existingUpdates = JSON.parse(session.graph_updates) as GraphUpdate[];
      const allUpdates = [...existingUpdates, ...updates];

      this.db.prepare(`
        UPDATE planning_sessions
        SET graph_updates = ?
        WHERE id = ?
      `).run(JSON.stringify(allUpdates), sessionId);
    }
  }

  /**
   * Update chat history
   */
  private async updateChatHistory(
    sessionId: string,
    userMessage: string,
    assistantMessage: string
  ): Promise<void> {
    const session = this.db.prepare(`
      SELECT chat_history FROM planning_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (session) {
      const chatHistory = JSON.parse(session.chat_history) as ChatMessage[];
      chatHistory.push(
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
      );

      this.db.prepare(`
        UPDATE planning_sessions
        SET chat_history = ?
        WHERE id = ?
      `).run(JSON.stringify(chatHistory), sessionId);
    }
  }

  /**
   * Get a planning session
   */
  private getSession(sessionId: string): PlanningSession | null {
    const row = this.db.prepare(`
      SELECT * FROM planning_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (!row) return null;

    return {
      id: row.id,
      campaignId: row.campaign_id,
      status: row.status,
      chatHistory: JSON.parse(row.chat_history),
      graphUpdates: JSON.parse(row.graph_updates),
      createdAt: new Date(row.created_at * 1000).toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at * 1000).toISOString() : undefined
    };
  }

  /**
   * Complete a planning session
   */
  async completeSession(sessionId: string): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);

    this.db.prepare(`
      UPDATE planning_sessions
      SET status = 'completed', completed_at = ?
      WHERE id = ?
    `).run(timestamp, sessionId);
  }
}