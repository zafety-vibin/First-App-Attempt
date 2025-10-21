import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express, { Application } from 'express';
import externalApiRoutes from '../../src/routes/external-api';

/**
 * Contract Tests: External API for Conversational Database Operations
 *
 * Feature 018: Tests 8 endpoint groups from contracts/external-api.yaml
 * These tests validate API schemas, response formats, and error handling.
 *
 * Endpoint Groups:
 * 1. Health - Connection verification
 * 2. Database Query - GET operations with filtering
 * 3. Database Create - POST operations with validation
 * 4. Database Update - PATCH operations
 * 5. Database Delete - DELETE with two-phase confirmation
 * 6. Hierarchy - Navigate parent-child relationships
 * 7. Session Recaps - Timeline queries
 * 8. Knowledge Graphs - Graph operations
 */

// Test server setup
let app: Application;
const BASE_URL = '/api/v1/external';

// Test data IDs
let testCampaignId: string;
let testNPCId: string;
let testLocationId: string;
let testFactionId: string;

beforeAll(async () => {
  // Initialize test Express app
  app = express();
  app.use(express.json());

  // Register external API routes
  app.use(BASE_URL, externalApiRoutes);

  // Test data setup - create test campaign and entities
  testCampaignId = uuidv4();
  testNPCId = uuidv4();
  testLocationId = uuidv4();
  testFactionId = uuidv4();

  // Import database for test data setup
  const { db } = await import('../../src/services/DatabaseService');

  // Create test campaign
  db.prepare(`
    INSERT INTO campaigns (id, owner_id, name, created_at, updated_at)
    VALUES (?, 'test-user-id', 'Test Campaign', strftime('%s', 'now'), strftime('%s', 'now'))
  `).run(testCampaignId);

  // Create test faction
  db.prepare(`
    INSERT INTO factions (id, campaign_id, name, description, created_at, updated_at)
    VALUES (?, ?, 'Test Faction', 'A test faction', strftime('%s', 'now'), strftime('%s', 'now'))
  `).run(testFactionId, testCampaignId);

  // Create test location
  db.prepare(`
    INSERT INTO locations (id, campaign_id, name, description, created_at, updated_at)
    VALUES (?, ?, 'Test Location', 'A test location', strftime('%s', 'now'), strftime('%s', 'now'))
  `).run(testLocationId, testCampaignId);

  // Create test NPC
  db.prepare(`
    INSERT INTO npcs (id, campaign_id, name, description, faction_id, created_at, updated_at)
    VALUES (?, ?, 'Test NPC', 'A test NPC', ?, strftime('%s', 'now'), strftime('%s', 'now'))
  `).run(testNPCId, testCampaignId, testFactionId);
});

afterAll(async () => {
  // Clean up test data (CASCADE deletes all related entities)
  const { db } = await import('../../src/services/DatabaseService');
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
});

beforeEach(async () => {
  // TODO: Reset test data between tests if needed
});

/**
 * GROUP 1: Health Endpoint
 * Validates connection verification and status reporting
 */
describe('Health Endpoint', () => {
  it('GET /health - should return 200 with status healthy', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/health`)
      .expect(200)
      .expect('Content-Type', /json/);

    expect(response.body).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      version: expect.any(String),
      uptime_seconds: expect.any(Number)
    });

    // Validate timestamp is ISO 8601 format
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);

    // Validate uptime is positive integer
    expect(response.body.uptime_seconds).toBeGreaterThan(0);
  });

  it('GET /health - should return valid version string', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/health`)
      .expect(200);

    expect(response.body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

/**
 * GROUP 2: Database Query Operations
 * Validates GET /campaigns/:id/database/:category with filtering
 */
describe('Database Query Operations', () => {
  it('GET /database/:category - should return 200 with QueryResponse schema', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .expect(200)
      .expect('Content-Type', /json/);

    // Validate QueryResponse schema
    expect(response.body).toEqual({
      success: true,
      data: expect.any(Array),
      pagination: {
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        total_pages: expect.any(Number)
      },
      operation_id: expect.any(String),
      execution_time_ms: expect.any(Number)
    });

    // Validate execution_time_ms is positive
    expect(response.body.execution_time_ms).toBeGreaterThanOrEqual(0);
  });

  it('GET /database/:category - should support filter parameter (JSON)', async () => {
    const filterJSON = JSON.stringify({ core_status: 'active', tags: ['important'] });

    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .query({ filter: filterJSON })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });

  it('GET /database/:category - should support search parameter', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/locations`)
      .query({ search: 'Thieves Guild' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });

  it('GET /database/:category - should support pagination (page, limit)', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .query({ page: 2, limit: 10 })
      .expect(200);

    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: expect.any(Number),
      total_pages: expect.any(Number)
    });
  });

  it('GET /database/:category - should support sort parameter', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .query({ sort: '-created_at' })
      .expect(200);

    expect(response.body.success).toBe(true);
    // Note: Descending order indicated by '-' prefix
  });

  it('GET /database/:category - should respect X-View-Mode: dm_view header', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    expect(response.body.success).toBe(true);
    // dm_view should return all entries including dm_only
  });

  it('GET /database/:category - should respect X-View-Mode: player_view header', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body.success).toBe(true);
    // player_view should filter out dm_only entries
    // TODO: Verify dm_* fields are stripped from response
  });

  it('GET /database/:category - should return 400 for invalid filter JSON', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .query({ filter: '{invalid-json' })
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        details: expect.any(Object),
        suggestion: expect.any(String)
      },
      operation_id: expect.any(String)
    });
  });

  it('GET /database/:category - should return 404 for invalid category', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/invalid_category`)
      .expect(404);

    expect(response.body.error.code).toBe('INVALID_CATEGORY');
  });

  it('GET /database/:category - should return 404 for non-existent campaign', async () => {
    const fakeCampaignId = uuidv4();

    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${fakeCampaignId}/database/npcs`)
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

/**
 * GROUP 3: Database Create Operations
 * Validates POST /campaigns/:id/database/:category with validation
 */
describe('Database Create Operations', () => {
  it('POST /database/:category - should return 201 with CreateResponse schema', async () => {
    const npcData = {
      name: 'Marcus the Merchant',
      description: 'A wealthy trader who deals in rare goods',
      race: 'Human',
      player_knowledge: 'common_knowledge',
      tags: ['merchant', 'quest-giver']
    };

    const response = await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .send(npcData)
      .expect(201)
      .expect('Content-Type', /json/);

    // Validate CreateResponse schema
    expect(response.body).toEqual({
      success: true,
      data: expect.any(Object),
      operation_id: expect.any(String),
      execution_time_ms: expect.any(Number)
    });

    // Validate auto-populated fields
    expect(response.body.data).toMatchObject({
      id: expect.any(String),
      campaign_id: testCampaignId,
      name: 'Marcus the Merchant',
      created_at: expect.any(Number),
      updated_at: expect.any(Number)
    });
  });

  it('POST /database/:category - should auto-populate id, created_at, updated_at', async () => {
    const locationData = {
      name: 'The Rusty Anchor',
      description: 'A weathered tavern in the docks district',
      location_type: 'tavern'
    };

    const response = await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/locations`)
      .send(locationData)
      .expect(201);

    const { data } = response.body;

    // Validate UUID format for id
    expect(data.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Validate timestamps are Unix timestamps
    expect(data.created_at).toBeGreaterThan(1600000000); // After Sep 2020
    expect(data.updated_at).toBe(data.created_at);
  });

  it('POST /database/:category - should return 400 for missing required field (name)', async () => {
    const invalidData = {
      description: 'Missing name field'
    };

    const response = await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .send(invalidData)
      .expect(400);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('name'),
        details: expect.any(Object),
        suggestion: expect.stringContaining('name')
      },
      operation_id: expect.any(String)
    });
  });

  it('POST /database/:category - should validate foreign key constraints', async () => {
    const npcData = {
      name: 'Test NPC',
      faction_id: uuidv4() // Non-existent faction
    };

    const response = await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .send(npcData)
      .expect(400);

    expect(response.body.error.code).toBe('CONSTRAINT_VIOLATION');
  });

  it('POST /database/:category - should return 404 for invalid category', async () => {
    const response = await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/invalid_category`)
      .send({ name: 'Test' })
      .expect(404);

    expect(response.body.error.code).toBe('INVALID_CATEGORY');
  });
});

/**
 * GROUP 4: Database Update Operations
 * Validates PATCH /campaigns/:id/database/:category/:entryId
 */
describe('Database Update Operations', () => {
  beforeEach(async () => {
    // Create test NPC for update tests
    // TODO: Setup test data
  });

  it('PATCH /database/:category/:entryId - should return 200 with UpdateResponse schema', async () => {
    const updateData = {
      description: 'A fallen knight corrupted by dark magic',
      alignment: 'Chaotic Evil',
      tags: ['corrupted', 'antagonist']
    };

    const response = await request(app)
      .patch(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${testNPCId}`)
      .send(updateData)
      .expect(200)
      .expect('Content-Type', /json/);

    // Validate UpdateResponse schema
    expect(response.body).toEqual({
      success: true,
      data: expect.any(Object),
      operation_id: expect.any(String),
      execution_time_ms: expect.any(Number)
    });

    // Validate updated fields
    expect(response.body.data.description).toBe('A fallen knight corrupted by dark magic');
    expect(response.body.data.tags).toEqual(['corrupted', 'antagonist']);
  });

  it('PATCH /database/:category/:entryId - should support partial updates', async () => {
    const partialUpdate = {
      description: 'Updated description only'
    };

    const response = await request(app)
      .patch(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${testNPCId}`)
      .send(partialUpdate)
      .expect(200);

    expect(response.body.data.description).toBe('Updated description only');
    // Other fields should remain unchanged
  });

  it('PATCH /database/:category/:entryId - should auto-refresh updated_at timestamp', async () => {
    // Get current NPC data
    const beforeResponse = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .query({ filter: JSON.stringify({ id: testNPCId }) });

    const originalUpdatedAt = beforeResponse.body.data[0].updated_at;

    // Wait 1 second to ensure timestamp differs
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update NPC
    const updateResponse = await request(app)
      .patch(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${testNPCId}`)
      .send({ description: 'New description' })
      .expect(200);

    expect(updateResponse.body.data.updated_at).toBeGreaterThan(originalUpdatedAt);
  });

  it('PATCH /database/:category/:entryId - should return 404 for non-existent entry', async () => {
    const fakeId = uuidv4();

    const response = await request(app)
      .patch(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${fakeId}`)
      .send({ description: 'Update' })
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /database/:category/:entryId - should validate constraint violations', async () => {
    const invalidUpdate = {
      faction_id: uuidv4() // Non-existent faction
    };

    const response = await request(app)
      .patch(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${testNPCId}`)
      .send(invalidUpdate)
      .expect(400);

    expect(response.body.error.code).toBe('CONSTRAINT_VIOLATION');
  });
});

/**
 * GROUP 5: Database Delete Operations
 * Validates DELETE with two-phase confirmation workflow
 */
describe('Database Delete Operations', () => {
  let deleteTestNPCId: string;
  let confirmationToken: string;

  beforeEach(async () => {
    // Create test NPC for deletion
    deleteTestNPCId = uuidv4();
    // TODO: Create test data
  });

  it('DELETE /database/:category/:entryId - Phase 1: should return 200 with DeletePreviewResponse', async () => {
    const response = await request(app)
      .delete(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${deleteTestNPCId}`)
      .expect(200)
      .expect('Content-Type', /json/);

    // Validate DeletePreviewResponse schema
    expect(response.body).toEqual({
      success: true,
      message: expect.stringContaining('preview'),
      preview: {
        entry: expect.any(Object),
        affected_references: expect.any(Array),
        will_cascade: expect.any(Boolean)
      },
      confirmation_token: expect.any(String),
      expires_at: expect.any(String)
    });

    // Store confirmation token for Phase 2
    confirmationToken = response.body.confirmation_token;

    // Validate expires_at is future timestamp
    const expiresAt = new Date(response.body.expires_at);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('DELETE /database/:category/:entryId - Phase 2: should return 204 with confirm=true', async () => {
    // Phase 1: Get confirmation token
    const previewResponse = await request(app)
      .delete(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${deleteTestNPCId}`)
      .expect(200);

    const token = previewResponse.body.confirmation_token;

    // Phase 2: Confirm deletion
    await request(app)
      .delete(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${deleteTestNPCId}`)
      .query({ confirm: true })
      .set('X-Confirmation-Token', token)
      .expect(204);

    // Verify entry deleted
    await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .query({ filter: JSON.stringify({ id: deleteTestNPCId }) })
      .expect(200)
      .then(res => {
        expect(res.body.data).toHaveLength(0);
      });
  });

  it('DELETE /database/:category/:entryId - should return 400 for expired confirmation token', async () => {
    // Phase 1: Get confirmation token
    const previewResponse = await request(app)
      .delete(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${deleteTestNPCId}`)
      .expect(200);

    const token = previewResponse.body.confirmation_token;

    // Mock 61 seconds delay (token expiry is 60 seconds)
    // TODO: Implement time mocking

    // Phase 2: Attempt confirmation with expired token
    const response = await request(app)
      .delete(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${deleteTestNPCId}`)
      .query({ confirm: true })
      .set('X-Confirmation-Token', token)
      .expect(400);

    expect(response.body.error.code).toBe('CONFIRMATION_EXPIRED');
  });

  it('DELETE /database/:category/:entryId - should show affected_references for entities with dependencies', async () => {
    // Create faction
    const factionResponse = await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/factions`)
      .send({ name: 'Test Faction' })
      .expect(201);

    const factionId = factionResponse.body.data.id;

    // Create NPC referencing faction
    await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .send({ name: 'Test NPC', faction_id: factionId })
      .expect(201);

    // Phase 1: Delete faction
    const previewResponse = await request(app)
      .delete(`${BASE_URL}/campaigns/${testCampaignId}/database/factions/${factionId}`)
      .expect(200);

    // Verify affected_references shows NPCs count
    expect(previewResponse.body.preview.affected_references).toContainEqual({
      table: 'npcs',
      field: 'faction_id',
      count: expect.any(Number)
    });
  });

  it('DELETE /database/:category/:entryId - should return 404 for non-existent entry', async () => {
    const fakeId = uuidv4();

    const response = await request(app)
      .delete(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${fakeId}`)
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

/**
 * GROUP 6: Hierarchy Navigation Operations
 * Validates GET /campaigns/:id/database/:category/:entryId/children
 */
describe('Hierarchy Navigation Operations', () => {
  let cityLocationId: string;
  let districtLocationId: string;

  beforeEach(async () => {
    // Create location hierarchy: City → District → Tavern
    // TODO: Setup test hierarchy
  });

  it('GET /database/:category/:entryId/children - should return 200 with HierarchyResponse schema', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/locations/${cityLocationId}/children`)
      .expect(200)
      .expect('Content-Type', /json/);

    // Validate HierarchyResponse schema
    expect(response.body).toEqual({
      success: true,
      data: {
        parent: expect.any(Object),
        children: expect.any(Array),
        depth: expect.any(Number)
      },
      operation_id: expect.any(String),
      execution_time_ms: expect.any(Number)
    });
  });

  it('GET /database/:category/:entryId/children - should support depth parameter', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/locations/${cityLocationId}/children`)
      .query({ depth: 2 })
      .expect(200);

    expect(response.body.data.depth).toBe(2);
    // Should traverse 2 levels: District (level 1) → Tavern (level 2)
  });

  it('GET /database/:category/:entryId/children - should work for NPC superior_npc_id hierarchy', async () => {
    // Create NPC chain of command
    const commanderResponse = await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .send({ name: 'Commander' })
      .expect(201);

    const commanderId = commanderResponse.body.data.id;

    await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .send({ name: 'Lieutenant', superior_npc_id: commanderId })
      .expect(201);

    // Get children
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs/${commanderId}/children`)
      .expect(200);

    expect(response.body.data.children).toHaveLength(1);
    expect(response.body.data.children[0].name).toBe('Lieutenant');
  });

  it('GET /database/:category/:entryId/children - should return 400 for categories without hierarchy support', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/quests/${uuidv4()}/children`)
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_CATEGORY');
    expect(response.body.error.suggestion).toContain('hierarchy');
  });

  it('GET /database/:category/:entryId/children - should return 404 for non-existent parent', async () => {
    const fakeId = uuidv4();

    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/locations/${fakeId}/children`)
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

/**
 * GROUP 7: Session Recap Timeline Operations
 * Validates GET /campaigns/:id/recaps with timeline queries
 */
describe('Session Recap Timeline Operations', () => {
  beforeEach(async () => {
    // Create 5 session recaps
    // TODO: Setup test session recaps
  });

  it('GET /recaps - should return 200 with RecapsResponse schema', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/recaps`)
      .expect(200)
      .expect('Content-Type', /json/);

    // Validate RecapsResponse schema
    expect(response.body).toEqual({
      success: true,
      data: expect.any(Array),
      pagination: {
        limit: expect.any(Number),
        total: expect.any(Number)
      },
      operation_id: expect.any(String),
      execution_time_ms: expect.any(Number)
    });
  });

  it('GET /recaps - should support start_session and end_session range query', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/recaps`)
      .query({ start_session: 2, end_session: 4 })
      .expect(200);

    // Should return sessions 2, 3, 4
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((recap: any) =>
      recap.session_number >= 2 && recap.session_number <= 4
    )).toBe(true);
  });

  it('GET /recaps - should support search query', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/recaps`)
      .query({ search: 'Dragon of Ash Peak' })
      .expect(200);

    expect(response.body.success).toBe(true);
    // Should return only sessions mentioning Dragon of Ash Peak
  });

  it('GET /recaps - should support limit parameter', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/recaps`)
      .query({ limit: 3 })
      .expect(200);

    expect(response.body.pagination.limit).toBe(3);
    expect(response.body.data.length).toBeLessThanOrEqual(3);
  });

  it('GET /recaps - should default to descending session_number sort', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/recaps`)
      .expect(200);

    // Verify sessions ordered by session_number DESC (newest first)
    const sessionNumbers = response.body.data.map((recap: any) => recap.session_number);
    const sortedDesc = [...sessionNumbers].sort((a, b) => b - a);
    expect(sessionNumbers).toEqual(sortedDesc);
  });

  it('GET /recaps - should return 404 for non-existent campaign', async () => {
    const fakeCampaignId = uuidv4();

    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${fakeCampaignId}/recaps`)
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

/**
 * GROUP 8: Knowledge Graph Operations
 * Validates GET /campaigns/:id/graphs with graph queries
 */
describe('Knowledge Graph Operations', () => {
  beforeEach(async () => {
    // Create test knowledge graphs
    // TODO: Setup test graphs (Political-Web, World-Foundations)
  });

  it('GET /graphs - should return 200 with GraphsResponse schema', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/graphs`)
      .expect(200)
      .expect('Content-Type', /json/);

    // Validate GraphsResponse schema
    expect(response.body).toEqual({
      success: true,
      data: expect.any(Array),
      operation_id: expect.any(String),
      execution_time_ms: expect.any(Number)
    });

    // Validate graph structure
    if (response.body.data.length > 0) {
      expect(response.body.data[0]).toEqual({
        graph_type: expect.any(String),
        nodes: expect.any(Array),
        edges: expect.any(Array)
      });
    }
  });

  it('GET /graphs - should support graph_type filter', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/graphs`)
      .query({ graph_type: 'Political-Web' })
      .expect(200);

    expect(response.body.success).toBe(true);
    // All returned graphs should be Political-Web type
    expect(response.body.data.every((graph: any) => graph.graph_type === 'Political-Web')).toBe(true);
  });

  it('GET /graphs - should support node_type filter', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/graphs`)
      .query({ node_type: 'faction' })
      .expect(200);

    expect(response.body.success).toBe(true);
    // Should return graphs with faction nodes
  });

  it('GET /graphs - should support include_edges parameter', async () => {
    // Test with edges included
    const withEdgesResponse = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/graphs`)
      .query({ include_edges: true })
      .expect(200);

    if (withEdgesResponse.body.data.length > 0) {
      expect(withEdgesResponse.body.data[0].edges).toBeDefined();
    }

    // Test with edges excluded
    const withoutEdgesResponse = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/graphs`)
      .query({ include_edges: false })
      .expect(200);

    if (withoutEdgesResponse.body.data.length > 0) {
      expect(withoutEdgesResponse.body.data[0].edges).toEqual([]);
    }
  });

  it('GET /graphs - should return 404 for non-existent campaign', async () => {
    const fakeCampaignId = uuidv4();

    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${fakeCampaignId}/graphs`)
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /graphs - should return 400 for invalid graph_type', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/graphs`)
      .query({ graph_type: 'InvalidType' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

/**
 * Cross-Cutting Concerns Tests
 * Validates audit logging and operation tracking
 */
describe('Audit Logging & Operation Tracking', () => {
  it('All endpoints should return operation_id in response', async () => {
    // Test multiple endpoints
    const endpoints = [
      { method: 'get', url: `${BASE_URL}/health` },
      { method: 'get', url: `${BASE_URL}/campaigns/${testCampaignId}/database/npcs` },
      { method: 'get', url: `${BASE_URL}/campaigns/${testCampaignId}/recaps` }
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)[endpoint.method](endpoint.url);

      if (response.body.operation_id) {
        expect(response.body.operation_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      }
    }
  });

  it('All endpoints should return execution_time_ms in response', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .expect(200);

    expect(response.body.execution_time_ms).toBeGreaterThanOrEqual(0);
    expect(typeof response.body.execution_time_ms).toBe('number');
  });
});

/**
 * Error Response Format Tests
 * Validates consistent error structure across all endpoints
 */
describe('Error Response Format', () => {
  it('404 errors should follow ErrorResponse schema', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${uuidv4()}/database/npcs`)
      .expect(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: expect.any(String),
        message: expect.any(String),
        details: expect.any(Object),
        suggestion: expect.any(String)
      },
      operation_id: expect.any(String)
    });
  });

  it('400 errors should include AI-friendly suggestions', async () => {
    const response = await request(app)
      .post(`${BASE_URL}/campaigns/${testCampaignId}/database/npcs`)
      .send({}) // Missing required 'name' field
      .expect(400);

    expect(response.body.error.suggestion).toBeTruthy();
    expect(typeof response.body.error.suggestion).toBe('string');
  });

  it('Error codes should be from enumerated set', async () => {
    const validErrorCodes = [
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'PERMISSION_DENIED',
      'CONSTRAINT_VIOLATION',
      'INTERNAL_ERROR',
      'INVALID_CATEGORY',
      'CONFIRMATION_EXPIRED'
    ];

    // Trigger various errors and verify codes
    const response404 = await request(app)
      .get(`${BASE_URL}/campaigns/${uuidv4()}/database/npcs`)
      .expect(404);

    expect(validErrorCodes).toContain(response404.body.error.code);
  });
});
