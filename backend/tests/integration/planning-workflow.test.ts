import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { PlanningAIService } from '../../src/services/PlanningAIService';
import { KnowledgeGraphService } from '../../src/services/KnowledgeGraphService';
import { ActiveFilteringService } from '../../src/services/ActiveFilteringService';
import { FunctionCallingService } from '../../src/services/FunctionCallingService';
import { LLMOrchestrationService } from '../../src/services/LLMOrchestrationService';
import { createTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { EventEmitter } from 'events';

describe('Planning Workflow Integration', () => {
  let db: Database.Database;
  let planningService: PlanningAIService;
  let graphService: KnowledgeGraphService;
  let activeFilteringService: ActiveFilteringService;
  let campaignId: string;
  let userId: string;

  beforeAll(async () => {
    // Setup test database with all required tables
    db = await createTestDatabase();

    // Initialize services
    const functionCallingService = new FunctionCallingService();
    const llmService = new LLMOrchestrationService();

    activeFilteringService = new ActiveFilteringService(db);
    graphService = new KnowledgeGraphService(db, activeFilteringService);
    planningService = new PlanningAIService(
      db,
      functionCallingService,
      llmService,
      graphService
    );

    // Create test campaign
    campaignId = 'test-campaign-' + Date.now();
    userId = 'test-user-' + Date.now();

    db.prepare(`
      INSERT INTO campaigns (id, name, owner_id, created_at)
      VALUES (?, 'Test Campaign', ?, unixepoch())
    `).run(campaignId, userId);

    // Initialize knowledge graphs
    await graphService.initializeGraphsForCampaign(campaignId);

    // Add some existing data to graphs
    await setupExistingGraphData();
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  async function setupExistingGraphData() {
    // Add some existing nodes to work with
    const politicalWeb = db.prepare(`
      SELECT id FROM knowledge_graphs
      WHERE campaign_id = ? AND type = 'political-web'
    `).get(campaignId);

    const campaignStory = db.prepare(`
      SELECT id FROM knowledge_graphs
      WHERE campaign_id = ? AND type = 'campaign-story'
    `).get(campaignId);

    // Add NPCs to political web
    await graphService.addNode(politicalWeb.id, {
      type: 'npc',
      name: 'King Aldric',
      attributes: {
        title: 'King of the Realm',
        status: 'alive',
        tags: ['royalty', 'active']
      }
    });

    await graphService.addNode(politicalWeb.id, {
      type: 'npc',
      name: 'Duke Malachar',
      attributes: {
        title: 'Duke of the Eastern Province',
        alignment: 'Lawful Evil',
        tags: ['nobility', 'antagonist', 'active']
      }
    });

    // Add plot points to campaign story
    await graphService.addNode(campaignStory.id, {
      type: 'plot-point',
      name: 'The Stolen Crown',
      attributes: {
        description: 'The royal crown has been stolen',
        session_introduced: 5,
        tags: ['main-quest', 'active']
      }
    });
  }

  describe('Complete Planning Session Flow', () => {
    it('should handle chat → immediate graph updates → no approval needed', async () => {
      // Step 1: Create planning session
      const session = await planningService.createSession(
        campaignId,
        userId,
        'Planning session 13 - The party will confront Duke Malachar'
      );

      expect(session.id).toBeTruthy();
      expect(session.status).toBe('active');
      expect(session.chat_history).toHaveLength(1);

      // Step 2: Send planning message (streaming response)
      const streamEmitter = new EventEmitter();
      const chunks: any[] = [];
      const graphUpdates: any[] = [];

      streamEmitter.on('chunk', (data) => chunks.push(data));
      streamEmitter.on('graph_update', (data) => graphUpdates.push(data));

      await planningService.sendMessage(
        session.id,
        `The party will discover that Duke Malachar has secretly allied with
         the Shadow Council. They'll find evidence in his study that reveals
         his plan to assassinate the king during the harvest festival.`,
        streamEmitter
      );

      // Step 3: Verify immediate graph updates (no approval needed)
      expect(graphUpdates.length).toBeGreaterThan(0);

      // Check that new nodes were added immediately
      const politicalWeb = await graphService.getGraphWithNodes(
        campaignId,
        'political-web'
      );

      // Should have added Shadow Council
      const shadowCouncil = politicalWeb.nodes.find(n =>
        n.name.includes('Shadow Council')
      );
      expect(shadowCouncil).toBeTruthy();

      // Should have created conspiracy relationship
      const conspiracyEdge = politicalWeb.edges.find(e =>
        e.type === 'conspiracy' || e.type === 'alliance'
      );
      expect(conspiracyEdge).toBeTruthy();

      // Step 4: Check campaign story was updated
      const campaignStory = await graphService.getGraphWithNodes(
        campaignId,
        'campaign-story'
      );

      // Should have added assassination plot
      const assassinationPlot = campaignStory.nodes.find(n =>
        n.name.includes('assassination') || n.name.includes('Assassination')
      );
      expect(assassinationPlot).toBeTruthy();

      // Step 5: Verify session updated with graph changes
      const updatedSession = await planningService.getSession(session.id);

      expect(updatedSession.graph_updates).toHaveLength(graphUpdates.length);
      expect(updatedSession.chat_history.length).toBeGreaterThan(1);
    });

    it('should maintain context across multiple messages', async () => {
      const session = await planningService.createSession(campaignId, userId);

      // First message
      await planningService.sendMessage(
        session.id,
        'The party needs to infiltrate Duke Malachar\'s castle'
      );

      // Second message building on first
      await planningService.sendMessage(
        session.id,
        'They could disguise themselves as merchants delivering goods for the harvest festival'
      );

      // Third message referencing both previous
      const streamEmitter = new EventEmitter();
      const graphUpdates: any[] = [];
      streamEmitter.on('graph_update', (data) => graphUpdates.push(data));

      await planningService.sendMessage(
        session.id,
        'Create a new NPC: Garrett the Merchant who can provide the disguises'
      );

      // Check that new NPC was added with context
      const politicalWeb = await graphService.getGraphWithNodes(
        campaignId,
        'political-web'
      );

      const garrett = politicalWeb.nodes.find(n =>
        n.name.includes('Garrett')
      );

      expect(garrett).toBeTruthy();
      expect(garrett.attributes).toMatchObject({
        role: expect.stringContaining('merchant'),
        plot_relevance: expect.stringContaining('disguise')
      });

      // Session should maintain full chat history
      const updatedSession = await planningService.getSession(session.id);
      expect(updatedSession.chat_history.length).toBeGreaterThanOrEqual(6); // 3 user + 3 assistant
    });
  });

  describe('Active Filtering Integration', () => {
    beforeEach(async () => {
      // Add more nodes with different active states
      const politicalWeb = db.prepare(`
        SELECT id FROM knowledge_graphs
        WHERE campaign_id = ? AND type = 'political-web'
      `).get(campaignId);

      // Add inactive NPCs
      await graphService.addNode(politicalWeb.id, {
        type: 'npc',
        name: 'Retired General Marcus',
        attributes: {
          tags: ['retired', 'inactive'],
          last_mentioned_session: -10
        }
      });

      await graphService.addNode(politicalWeb.id, {
        type: 'npc',
        name: 'The Mysterious Stranger',
        attributes: {
          tags: ['party-relevant', 'mysterious'],
          last_mentioned_session: -2
        }
      });
    });

    it('should use active filtering when providing context to Planning AI', async () => {
      const session = await planningService.createSession(campaignId, userId);

      // Request information about active NPCs
      const context = await planningService.getActiveContext(
        session.id,
        ['political-web', 'campaign-story']
      );

      // Should include only active/recent nodes
      expect(context.political_web_nodes).toBeDefined();

      const nodeNames = context.political_web_nodes.map(n => n.name);

      // Should include active and party-relevant
      expect(nodeNames).toContain('King Aldric');
      expect(nodeNames).toContain('Duke Malachar');
      expect(nodeNames).toContain('The Mysterious Stranger');

      // Should NOT include inactive
      expect(nodeNames).not.toContain('Retired General Marcus');
    });

    it('should update node activity based on Planning AI mentions', async () => {
      const session = await planningService.createSession(campaignId, userId);

      // Mention an inactive NPC in planning
      await planningService.sendMessage(
        session.id,
        `The party could seek help from Retired General Marcus,
         pulling him out of retirement for one last mission`
      );

      // Check that the node was updated to active
      const politicalWeb = await graphService.getGraphWithNodes(
        campaignId,
        'political-web'
      );

      const marcus = politicalWeb.nodes.find(n =>
        n.name.includes('General Marcus')
      );

      expect(marcus).toBeTruthy();
      expect(marcus.attributes.tags).toContain('active');
      expect(marcus.attributes.last_mentioned_session).toBeGreaterThanOrEqual(-1);
    });
  });

  describe('Graph Update Patterns', () => {
    it('should handle complex graph operations from natural language', async () => {
      const session = await planningService.createSession(campaignId, userId);

      const complexRequest = `
        Create a new faction called the Order of the Silver Dawn.
        They oppose Duke Malachar and secretly support the King.
        Their leader is High Priestess Celeste who has a network of spies.
        Connect them to the existing plot about the assassination attempt -
        they're trying to prevent it.
      `;

      const streamEmitter = new EventEmitter();
      const graphUpdates: any[] = [];
      streamEmitter.on('graph_update', (data) => graphUpdates.push(data));

      await planningService.sendMessage(session.id, complexRequest, streamEmitter);

      // Verify complex graph structure was created
      const politicalWeb = await graphService.getGraphWithNodes(
        campaignId,
        'political-web'
      );

      // Check faction node
      const orderNode = politicalWeb.nodes.find(n =>
        n.name.includes('Order of the Silver Dawn')
      );
      expect(orderNode).toBeTruthy();
      expect(orderNode.type).toBe('faction');

      // Check leader node
      const celesteNode = politicalWeb.nodes.find(n =>
        n.name.includes('Celeste')
      );
      expect(celesteNode).toBeTruthy();

      // Check relationships
      const opposesEdge = politicalWeb.edges.find(e =>
        e.type === 'opposes' &&
        politicalWeb.nodes.some(n => n.id === e.source_node_id && n.name.includes('Order')) &&
        politicalWeb.nodes.some(n => n.id === e.target_node_id && n.name.includes('Malachar'))
      );
      expect(opposesEdge).toBeTruthy();

      const supportsEdge = politicalWeb.edges.find(e =>
        e.type === 'supports' &&
        politicalWeb.nodes.some(n => n.id === e.source_node_id && n.name.includes('Order')) &&
        politicalWeb.nodes.some(n => n.id === e.target_node_id && n.name.includes('King'))
      );
      expect(supportsEdge).toBeTruthy();
    });

    it('should update existing nodes when mentioned with new information', async () => {
      const session = await planningService.createSession(campaignId, userId);

      // Add new information about existing NPC
      await planningService.sendMessage(
        session.id,
        `Duke Malachar has a secret weakness - he's terrified of divine magic
         due to a curse placed on him in his youth. He also has a daughter,
         Lady Seraphina, who he keeps hidden from the court.`
      );

      // Check that Duke Malachar node was updated
      const politicalWeb = await graphService.getGraphWithNodes(
        campaignId,
        'political-web'
      );

      const malachar = politicalWeb.nodes.find(n =>
        n.name.includes('Duke Malachar')
      );

      expect(malachar.attributes).toMatchObject({
        weaknesses: expect.arrayContaining(['divine magic']),
        curse: expect.any(String)
      });

      // Check that daughter was added and connected
      const seraphina = politicalWeb.nodes.find(n =>
        n.name.includes('Seraphina')
      );
      expect(seraphina).toBeTruthy();

      const familyEdge = politicalWeb.edges.find(e =>
        e.type === 'family' &&
        e.source_node_id === malachar.id &&
        e.target_node_id === seraphina.id
      );
      expect(familyEdge).toBeTruthy();
    });
  });

  describe('Session Completion and History', () => {
    it('should properly complete planning session', async () => {
      const session = await planningService.createSession(campaignId, userId);

      await planningService.sendMessage(
        session.id,
        'Add three random encounters for the journey to the castle'
      );

      // Complete the session
      const completed = await planningService.completeSession(session.id);

      expect(completed.status).toBe('completed');
      expect(completed.completed_at).toBeTruthy();

      // Should not allow new messages to completed session
      await expect(
        planningService.sendMessage(session.id, 'New message')
      ).rejects.toThrow('Session is not active');
    });

    it('should maintain planning history for campaign', async () => {
      // Create multiple sessions
      const session1 = await planningService.createSession(
        campaignId,
        userId,
        'Planning for castle infiltration'
      );
      await planningService.completeSession(session1.id);

      const session2 = await planningService.createSession(
        campaignId,
        userId,
        'Planning for harvest festival'
      );
      await planningService.completeSession(session2.id);

      const session3 = await planningService.createSession(
        campaignId,
        userId,
        'Planning for final confrontation'
      );

      // Get session history
      const sessions = await planningService.getSessionsForCampaign(
        campaignId,
        { limit: 10 }
      );

      expect(sessions.length).toBeGreaterThanOrEqual(3);

      // Should be ordered newest first
      const timestamps = sessions.map(s => s.created_at);
      const sortedTimestamps = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(sortedTimestamps);

      // Can filter by status
      const activeSessions = await planningService.getSessionsForCampaign(
        campaignId,
        { status: 'active' }
      );

      expect(activeSessions.every(s => s.status === 'active')).toBe(true);
    });
  });
});