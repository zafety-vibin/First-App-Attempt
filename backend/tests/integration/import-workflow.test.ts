import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ImportAIService } from '../../src/services/ImportAIService';
import { ImportBatchService } from '../../src/services/ImportBatchService';
import { KnowledgeGraphService } from '../../src/services/KnowledgeGraphService';
import { FunctionCallingService } from '../../src/services/FunctionCallingService';
import { LLMOrchestrationService } from '../../src/services/LLMOrchestrationService';
import { FileParseService } from '../../src/services/FileParseService';
import { createTestDatabase, cleanupTestDatabase } from '../helpers/database';

describe('Import Workflow Integration', () => {
  let db: Database.Database;
  let importService: ImportAIService;
  let batchService: ImportBatchService;
  let graphService: KnowledgeGraphService;
  let fileParseService: FileParseService;
  let campaignId: string;
  let userId: string;

  beforeAll(async () => {
    // Setup test database with all required tables
    db = await createTestDatabase();

    // Initialize services
    const functionCallingService = new FunctionCallingService();
    const llmService = new LLMOrchestrationService();

    fileParseService = new FileParseService();
    graphService = new KnowledgeGraphService(db);
    importService = new ImportAIService(
      db,
      functionCallingService,
      llmService,
      graphService
    );
    batchService = new ImportBatchService(db, graphService);

    // Create test campaign
    campaignId = 'test-campaign-' + Date.now();
    userId = 'test-user-' + Date.now();

    db.prepare(`
      INSERT INTO campaigns (id, name, owner_id, created_at)
      VALUES (?, 'Test Campaign', ?, unixepoch())
    `).run(campaignId, userId);

    // Initialize knowledge graphs
    await graphService.initializeGraphsForCampaign(campaignId);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe('Complete Import Session Flow', () => {
    it('should handle file upload → entity extraction → approval → commit', async () => {
      // Step 1: Create import session
      const session = await importService.createSession(campaignId, userId);
      expect(session.id).toBeTruthy();
      expect(session.status).toBe('active');

      // Step 2: Parse file content
      const fileContent = `
        # Session 12 Recap

        The party met with Lord Blackwood at his castle in the Northern Wastes.
        He revealed that the ancient artifact they seek is guarded by the dragon
        Pyraxis in the Crystal Caverns. His advisor, Sage Eldara, provided them
        with a map and warned about the goblin tribes in the mountain passes.

        NPCs encountered:
        - Lord Edmund Blackwood: Noble ruler of the Northern Wastes
        - Sage Eldara: Court wizard and advisor
        - Pyraxis: Ancient red dragon

        Locations visited:
        - Blackwood Castle
        - Northern Wastes
        - Crystal Caverns (mentioned)
      `;

      const parsedContent = await fileParseService.parseText(
        fileContent,
        'session-12-recap.md'
      );

      // Step 3: Process with Import AI for entity extraction
      const extractionResult = await importService.processContent(
        session.id,
        parsedContent,
        {
          instructions: 'Extract all NPCs, locations, and their relationships'
        }
      );

      expect(extractionResult.entities).toBeDefined();
      expect(extractionResult.entities.length).toBeGreaterThan(0);

      // Verify NPCs were extracted
      const npcs = extractionResult.entities.filter(e => e.type === 'npc');
      expect(npcs.length).toBeGreaterThanOrEqual(3);
      expect(npcs.some(n => n.name.includes('Blackwood'))).toBe(true);
      expect(npcs.some(n => n.name.includes('Eldara'))).toBe(true);
      expect(npcs.some(n => n.name.includes('Pyraxis'))).toBe(true);

      // Verify locations were extracted
      const locations = extractionResult.entities.filter(e => e.type === 'location');
      expect(locations.length).toBeGreaterThanOrEqual(3);

      // Step 4: Generate approval summary
      const approvalSummary = await importService.generateApprovalSummary(session.id);

      expect(approvalSummary).toMatchObject({
        session_id: session.id,
        campaign_id: campaignId,
        new_entities: expect.any(Array),
        relationships: expect.any(Array),
        statistics: expect.objectContaining({
          total_entities: expect.any(Number),
          new_entities: expect.any(Number)
        })
      });

      // Step 5: Approve and commit
      const batch = await importService.approveSession(session.id);

      expect(batch.id).toBeTruthy();
      expect(batch.status).toBe('approved');
      expect(batch.import_session_id).toBe(session.id);

      // Step 6: Verify entities were created in knowledge graphs
      const politicalWeb = await graphService.getGraphWithNodes(
        campaignId,
        'political-web'
      );

      expect(politicalWeb.nodes.length).toBeGreaterThan(0);

      const blackwoodNode = politicalWeb.nodes.find(n =>
        n.name.includes('Blackwood')
      );
      expect(blackwoodNode).toBeTruthy();

      // Step 7: Verify cards were created
      const cards = db.prepare(`
        SELECT * FROM cards
        WHERE campaign_id = ? AND import_batch_id = ?
      `).all(campaignId, batch.id);

      expect(cards.length).toBeGreaterThan(0);
    });

    it('should handle batch revert correctly', async () => {
      // Create and approve an import session
      const session = await importService.createSession(campaignId, userId);

      const content = `
        Test content with NPC: The Merchant Guild Leader
        and location: The Grand Marketplace
      `;

      await importService.processContent(session.id, { text: content });
      const batch = await importService.approveSession(session.id);

      // Get counts before revert
      const nodesBefore = db.prepare(`
        SELECT COUNT(*) as count FROM graph_nodes
        WHERE graph_id IN (
          SELECT id FROM knowledge_graphs WHERE campaign_id = ?
        )
      `).get(campaignId);

      const cardsBefore = db.prepare(`
        SELECT COUNT(*) as count FROM cards
        WHERE campaign_id = ? AND import_batch_id = ?
      `).get(campaignId, batch.id);

      expect(nodesBefore.count).toBeGreaterThan(0);
      expect(cardsBefore.count).toBeGreaterThan(0);

      // Revert the batch
      const revertResult = await batchService.revertBatch(batch.id);

      expect(revertResult.success).toBe(true);
      expect(revertResult.deleted_count).toMatchObject({
        nodes: expect.any(Number),
        edges: expect.any(Number),
        cards: expect.any(Number)
      });

      // Verify entities were deleted
      const cardsAfter = db.prepare(`
        SELECT COUNT(*) as count FROM cards
        WHERE campaign_id = ? AND import_batch_id = ?
      `).get(campaignId, batch.id);

      expect(cardsAfter.count).toBe(0);

      // Verify batch status updated
      const revertedBatch = db.prepare(`
        SELECT status FROM import_batches WHERE id = ?
      `).get(batch.id);

      expect(revertedBatch.status).toBe('reverted');
    });
  });

  describe('Deduplication and Conflict Detection', () => {
    it('should detect and merge duplicate entities', async () => {
      const session = await importService.createSession(campaignId, userId);

      // Content with similar entity names (typos/variations)
      const content = `
        The party met Lord Blackwood, also known as Edmund Blackwood.
        Later they encountered Lord Blackwod (a typo) at the castle.
        Edmund Blackwood the Third was mentioned by the guards.
      `;

      const result = await importService.processContent(
        session.id,
        { text: content },
        { deduplication_threshold: 0.8 }
      );

      // Should merge similar names into one entity
      const blackwoodEntities = result.entities.filter(e =>
        e.name.toLowerCase().includes('blackwood')
      );

      expect(blackwoodEntities.length).toBe(1);
      expect(blackwoodEntities[0].aliases).toContain('Lord Blackwod');
    });

    it('should detect timeline conflicts with existing session recaps', async () => {
      // Create a session recap that establishes a fact
      const recap = {
        session_number: 10,
        campaign_id: campaignId,
        content: 'King Aldric died heroically defending the city.',
        created_at: Date.now() - 86400000 // 1 day ago
      };

      db.prepare(`
        INSERT INTO session_recaps (id, session_number, campaign_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'recap-' + Date.now(),
        recap.session_number,
        recap.campaign_id,
        recap.content,
        recap.created_at
      );

      // Now try to import content that contradicts this
      const session = await importService.createSession(campaignId, userId);

      const conflictingContent = `
        Session 15: King Aldric summoned the party to his throne room
        and commanded them to retrieve the Crystal of Power.
      `;

      const result = await importService.processContent(
        session.id,
        { text: conflictingContent }
      );

      const summary = await importService.generateApprovalSummary(session.id);

      // Should detect the timeline conflict
      expect(summary.conflicts).toBeDefined();
      expect(summary.conflicts.length).toBeGreaterThan(0);

      const conflict = summary.conflicts[0];
      expect(conflict.type).toBe('timeline');
      expect(conflict.entity).toContain('Aldric');
      expect(conflict.conflict_description).toContain('died');
      expect(conflict.conflicting_session).toBe(10);
    });
  });

  describe('Multi-file Import Session', () => {
    it('should handle multiple file uploads in single session', async () => {
      const session = await importService.createSession(campaignId, userId);

      // Upload first file
      const file1 = `
        # Northern Regions
        The Northern Wastes are ruled by House Blackwood.
        Key locations: Frozen Peak, Ice Citadel, Tundra Outpost
      `;

      await importService.processContent(
        session.id,
        { text: file1, filename: 'northern-regions.md' }
      );

      // Upload second file
      const file2 = `
        # Southern Kingdoms
        The Southern Kingdoms are a collection of city-states.
        Major cities: Sunhaven, Goldport, Verdant Valley
      `;

      await importService.processContent(
        session.id,
        { text: file2, filename: 'southern-kingdoms.md' }
      );

      // Get approval summary for entire session
      const summary = await importService.generateApprovalSummary(session.id);

      // Should have entities from both files
      const locationEntities = summary.new_entities.filter(e => e.type === 'location');

      const northernLocations = locationEntities.filter(l =>
        ['Frozen Peak', 'Ice Citadel', 'Tundra Outpost'].some(name =>
          l.name.includes(name)
        )
      );

      const southernLocations = locationEntities.filter(l =>
        ['Sunhaven', 'Goldport', 'Verdant Valley'].some(name =>
          l.name.includes(name)
        )
      );

      expect(northernLocations.length).toBeGreaterThan(0);
      expect(southernLocations.length).toBeGreaterThan(0);

      // Approve entire session at once
      const batch = await importService.approveSession(session.id);

      // Verify all entities from both files were committed
      const geoGraph = await graphService.getGraphWithNodes(
        campaignId,
        'geographical'
      );

      expect(geoGraph.nodes.some(n => n.name.includes('Frozen Peak'))).toBe(true);
      expect(geoGraph.nodes.some(n => n.name.includes('Sunhaven'))).toBe(true);
    });
  });

  describe('Entity Relationship Extraction', () => {
    it('should extract and create relationships between entities', async () => {
      const session = await importService.createSession(campaignId, userId);

      const content = `
        Queen Elysia rules from the Crystal Palace. Her son, Prince Aldric,
        commands the Royal Guard and is betrothed to Lady Rosalind of House Storm.
        The Queen's advisor, Magister Theron, secretly plots with Duke Malachar
        to overthrow the throne.
      `;

      await importService.processContent(session.id, { text: content });
      const batch = await importService.approveSession(session.id);

      // Check that relationships were created in the graph
      const politicalWeb = await graphService.getGraphWithNodes(
        campaignId,
        'political-web'
      );

      // Should have family relationship
      const familyEdge = politicalWeb.edges.find(e =>
        e.type === 'family' &&
        politicalWeb.nodes.some(n => n.id === e.source_node_id && n.name.includes('Elysia')) &&
        politicalWeb.nodes.some(n => n.id === e.target_node_id && n.name.includes('Aldric'))
      );
      expect(familyEdge).toBeTruthy();

      // Should have alliance/betrayal relationships
      const conspiracyEdge = politicalWeb.edges.find(e =>
        e.type === 'conspiracy' || e.type === 'alliance'
      );
      expect(conspiracyEdge).toBeTruthy();
    });
  });
});