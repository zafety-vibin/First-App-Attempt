import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { createTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { createTestUser, createTestCampaign } from '../helpers/fixtures';
import { AuthRequest } from '../../src/types/auth';

describe('Knowledge Graphs API Contract Tests', () => {
  let app: express.Application;
  let db: Database.Database;
  let authToken: string;
  let userId: string;
  let campaignId: string;

  beforeAll(async () => {
    // Setup test database
    db = await createTestDatabase();

    // Create test user and campaign
    const user = createTestUser();
    userId = user.id;
    authToken = user.token;

    const campaign = createTestCampaign(userId);
    campaignId = campaign.id;

    // Setup Express app with routes (will be implemented in T049)
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req: AuthRequest, res, next) => {
      req.user = { sub: userId };
      next();
    });

    // Knowledge graph routes
    const { knowledgeGraphsRouter } = await import('../../src/routes/knowledge-graphs');
    app.use('/api/graphs', knowledgeGraphsRouter);

    // Initialize the 4 default knowledge graphs for the campaign
    const timestamp = Math.floor(Date.now() / 1000);
    const graphTypes = ['geographical', 'political_web', 'world_foundations', 'campaign_story'];
    for (const type of graphTypes) {
      db.prepare(`
        INSERT INTO knowledge_graphs (id, campaign_id, type, last_updated, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(`test-graph-${type}`, campaignId, type, timestamp, timestamp);
    }
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe('GET /api/graphs', () => {
    it('should list all 4 knowledge graphs for campaign', async () => {
      const response = await request(app)
        .get('/api/graphs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ campaignId });

      expect(response.status).toBe(200);
      expect(response.body.graphs).toHaveLength(4);

      // Should have all 4 graph types
      const graphTypes = response.body.graphs.map((g: any) => g.type);
      expect(graphTypes).toContain('geographical');
      expect(graphTypes).toContain('political-web');
      expect(graphTypes).toContain('world-foundations');
      expect(graphTypes).toContain('campaign-story');

      // Each graph should have the correct structure
      response.body.graphs.forEach((graph: any) => {
        expect(graph).toMatchObject({
          id: expect.any(String),
          campaign_id: campaignId,
          type: expect.any(String),
          node_count: expect.any(Number),
          edge_count: expect.any(Number),
          created_at: expect.any(Number),
          updated_at: expect.any(Number)
        });
      });
    });

    it('should return 404 when campaign not found', async () => {
      const response = await request(app)
        .get('/api/graphs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ campaignId: '550e8400-e29b-41d4-a716-446655440999' });

      expect(response.status).toBe(404);
    });

    it('should return 400 when campaignId missing', async () => {
      const response = await request(app)
        .get('/api/graphs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/graphs/{type}', () => {
    it('should get geographical graph with all nodes and edges', async () => {
      const response = await request(app)
        .get('/api/graphs/geographical')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ campaignId });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        campaign_id: campaignId,
        type: 'geographical',
        nodes: expect.any(Array),
        edges: expect.any(Array)
      });

      // Check node structure
      if (response.body.nodes.length > 0) {
        expect(response.body.nodes[0]).toMatchObject({
          id: expect.any(String),
          graph_id: expect.any(String),
          type: expect.any(String),
          name: expect.any(String),
          attributes: expect.any(Object),
          created_at: expect.any(Number)
        });
      }

      // Check edge structure
      if (response.body.edges.length > 0) {
        expect(response.body.edges[0]).toMatchObject({
          id: expect.any(String),
          graph_id: expect.any(String),
          source_node_id: expect.any(String),
          target_node_id: expect.any(String),
          type: expect.any(String),
          attributes: expect.any(Object),
          created_at: expect.any(Number)
        });
      }
    });

    it('should support active filtering for political-web graph', async () => {
      const response = await request(app)
        .get('/api/graphs/political-web')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          campaignId,
          filter: 'active'
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('political-web');

      // Active filter should only return nodes/edges with active tags or recent session recaps
      response.body.nodes.forEach((node: any) => {
        const tags = node.attributes?.tags || [];
        const isActive = tags.includes('active') || tags.includes('party-relevant');
        const isRecent = node.attributes?.last_mentioned_session &&
          node.attributes.last_mentioned_session >= -5; // Within last 5 sessions

        expect(isActive || isRecent).toBe(true);
      });
    });

    it('should support active filtering for campaign-story graph', async () => {
      const response = await request(app)
        .get('/api/graphs/campaign-story')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          campaignId,
          filter: 'active'
        });

      expect(response.status).toBe(200);
      expect(response.body.type).toBe('campaign-story');

      // Active filter should apply to Campaign-Story as well
      response.body.nodes.forEach((node: any) => {
        const tags = node.attributes?.tags || [];
        const isActive = tags.includes('active') || tags.includes('party-relevant');
        const isRecent = node.attributes?.last_mentioned_session &&
          node.attributes.last_mentioned_session >= -5;

        expect(isActive || isRecent).toBe(true);
      });
    });

    it('should not support active filtering for geographical graph', async () => {
      const response = await request(app)
        .get('/api/graphs/geographical')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          campaignId,
          filter: 'active'
        });

      // Should either ignore the filter or return all nodes
      expect(response.status).toBe(200);
      // Geographical graphs don't support active filtering
      // so it should return all nodes regardless
    });

    it('should not support active filtering for world-foundations graph', async () => {
      const response = await request(app)
        .get('/api/graphs/world-foundations')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          campaignId,
          filter: 'active'
        });

      // Should either ignore the filter or return all nodes
      expect(response.status).toBe(200);
      // World-Foundations graphs don't support active filtering
    });

    it('should return 404 for invalid graph type', async () => {
      const response = await request(app)
        .get('/api/graphs/invalid-type')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ campaignId });

      expect(response.status).toBe(404);
    });

    it('should return 400 when campaignId missing', async () => {
      const response = await request(app)
        .get('/api/graphs/geographical')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/graphs/{type}/nodes', () => {
    it('should create a new node in the graph', async () => {
      const response = await request(app)
        .post('/api/graphs/political-web/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          type: 'npc',
          name: 'Lord Blackwood',
          attributes: {
            title: 'Duke of the Northern Realm',
            alignment: 'Lawful Evil',
            tags: ['nobility', 'antagonist']
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        graph_id: expect.any(String),
        type: 'npc',
        name: 'Lord Blackwood',
        attributes: expect.objectContaining({
          title: 'Duke of the Northern Realm'
        })
      });
    });

    it('should return 400 for invalid node data', async () => {
      const response = await request(app)
        .post('/api/graphs/political-web/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          // Missing required fields: type, name
          attributes: {}
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 for invalid graph type', async () => {
      const response = await request(app)
        .post('/api/graphs/invalid-type/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          type: 'npc',
          name: 'Test NPC'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/graphs/{type}/edges', () => {
    let nodeId1: string;
    let nodeId2: string;

    beforeEach(async () => {
      // Create two nodes to connect
      const node1Response = await request(app)
        .post('/api/graphs/political-web/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          type: 'npc',
          name: 'Queen Elysia'
        });

      const node2Response = await request(app)
        .post('/api/graphs/political-web/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          type: 'npc',
          name: 'Prince Aldric'
        });

      nodeId1 = node1Response.body.id;
      nodeId2 = node2Response.body.id;
    });

    it('should create a new edge between nodes', async () => {
      const response = await request(app)
        .post('/api/graphs/political-web/edges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          sourceNodeId: nodeId1,
          targetNodeId: nodeId2,
          type: 'family',
          attributes: {
            relationship: 'mother-son'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        graph_id: expect.any(String),
        source_node_id: nodeId1,
        target_node_id: nodeId2,
        type: 'family',
        attributes: expect.objectContaining({
          relationship: 'mother-son'
        })
      });
    });

    it('should return 400 when nodes not in same graph', async () => {
      // Create a node in a different graph
      const geoNodeResponse = await request(app)
        .post('/api/graphs/geographical/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          type: 'location',
          name: 'Castle Blackstone'
        });

      const response = await request(app)
        .post('/api/graphs/political-web/edges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          sourceNodeId: nodeId1,
          targetNodeId: geoNodeResponse.body.id,
          type: 'resides-in'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when nodes not found', async () => {
      const response = await request(app)
        .post('/api/graphs/political-web/edges')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          sourceNodeId: '880e8400-e29b-41d4-a716-446655440999',
          targetNodeId: '990e8400-e29b-41d4-a716-446655440999',
          type: 'alliance'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/graphs/{type}/nodes/{nodeId}', () => {
    let nodeId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/graphs/campaign-story/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          type: 'plot-point',
          name: 'The Betrayal'
        });

      nodeId = response.body.id;
    });

    it('should delete a node and its edges', async () => {
      const response = await request(app)
        .delete(`/api/graphs/campaign-story/nodes/${nodeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ campaignId });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        deleted: true,
        nodeId,
        edgesDeleted: expect.any(Number)
      });
    });

    it('should return 404 when node not found', async () => {
      const response = await request(app)
        .delete('/api/graphs/campaign-story/nodes/880e8400-e29b-41d4-a716-446655440999')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ campaignId });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/graphs/{type}/nodes/{nodeId}', () => {
    let nodeId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/graphs/world-foundations/nodes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          type: 'concept',
          name: 'Magic System',
          attributes: {
            description: 'Initial description'
          }
        });

      nodeId = response.body.id;
    });

    it('should update node attributes', async () => {
      const response = await request(app)
        .put(`/api/graphs/world-foundations/nodes/${nodeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          attributes: {
            description: 'Updated magic system description',
            power_source: 'Ley lines',
            limitations: ['Cannot resurrect the dead', 'Requires verbal components']
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.attributes).toMatchObject({
        description: 'Updated magic system description',
        power_source: 'Ley lines',
        limitations: expect.arrayContaining(['Cannot resurrect the dead'])
      });
    });

    it('should merge attributes, not replace', async () => {
      const response = await request(app)
        .put(`/api/graphs/world-foundations/nodes/${nodeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          attributes: {
            new_field: 'New value'
          }
        });

      expect(response.status).toBe(200);
      // Should still have the original description
      expect(response.body.attributes).toHaveProperty('description');
      expect(response.body.attributes).toHaveProperty('new_field', 'New value');
    });

    it('should return 404 when node not found', async () => {
      const response = await request(app)
        .put('/api/graphs/world-foundations/nodes/880e8400-e29b-41d4-a716-446655440999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          attributes: { updated: true }
        });

      expect(response.status).toBe(404);
    });
  });
});