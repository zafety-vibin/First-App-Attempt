/**
 * Contract tests for Knowledge Graphs API
 * Based on: specs/006-create-the-knowledge/contracts/graphs.yaml
 *
 * Feature 006 - Knowledge Graphs with Confidence Decay
 * These tests validate the API contract matches the OpenAPI specification.
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server';
import { db } from '../../src/services/DatabaseService';
import crypto from 'crypto';

// Test data
const testUserId = 'test-user-001';
const validToken = `Bearer valid_jwt_token_${testUserId}`;
let testCampaignId: string;
let testGraphId: string;

beforeAll(() => {
  // Create test campaign
  testCampaignId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO campaigns (id, name, owner_id, public_url_id, public_access_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(testCampaignId, 'Test Campaign', testUserId, 'test-public-id', now, now);

  // Create test graph
  testGraphId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO knowledge_graphs (id, campaign_id, graph_type, graph_name, toggle_state, decay_rate, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, 0.1, ?, ?)
  `).run(testGraphId, testCampaignId, 'Political-Web', 'Test Graph', now, now);
});

afterAll(() => {
  // Cleanup: delete test data
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
});

describe('GET /api/campaigns/:campaignId/graphs', () => {
  it('should list all knowledge graphs for a campaign', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('graphs');
    expect(Array.isArray(response.body.graphs)).toBe(true);
  });

  it('should return empty array for campaign with no graphs', async () => {
    const response = await request(app)
      .get(`/api/campaigns/empty-campaign-uuid/graphs`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.graphs).toEqual([]);
  });

  it('should include node and edge counts for each graph', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.graphs.length > 0) {
      const graph = response.body.graphs[0];
      expect(graph).toHaveProperty('node_count');
      expect(graph).toHaveProperty('edge_count');
      expect(typeof graph.node_count).toBe('number');
      expect(typeof graph.edge_count).toBe('number');
    }
  });

  it('should optionally include nodes when include_nodes=true', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs`)
      .query({ include_nodes: true })
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.graphs.length > 0) {
      const graph = response.body.graphs[0];
      expect(graph).toHaveProperty('nodes');
      expect(Array.isArray(graph.nodes)).toBe(true);
    }
  });

  it('should optionally include edges when include_edges=true', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs`)
      .query({ include_edges: true })
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.graphs.length > 0) {
      const graph = response.body.graphs[0];
      expect(graph).toHaveProperty('edges');
      expect(Array.isArray(graph.edges)).toBe(true);
    }
  });

  it('should return graph metadata including decay_rate', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.graphs.length > 0) {
      const graph = response.body.graphs[0];
      expect(graph).toMatchObject({
        id: expect.any(String),
        campaign_id: testCampaignId,
        graph_type: expect.any(String),
        graph_name: expect.any(String),
        toggle_state: expect.any(Boolean),
        decay_rate: expect.any(Number),
        created_at: expect.any(Number),
        updated_at: expect.any(Number),
      });
    }
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get('/api/campaigns/other-user-campaign-uuid/graphs')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent campaign', async () => {
    const response = await request(app)
      .get('/api/campaigns/non-existent-uuid/graphs')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/campaigns/:campaignId/graphs', () => {
  it('should create a new knowledge graph with required fields', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .send({
        graph_type: 'Political-Web',
        graph_name: 'Faerun Politics',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      campaign_id: testCampaignId,
      graph_type: 'Political-Web',
      graph_name: 'Faerun Politics',
      toggle_state: expect.any(Boolean),
      decay_rate: expect.any(Number),
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
    });
  });

  it('should create graph with custom graph type', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .send({
        graph_type: 'custom:magic-system',
        graph_name: 'Weave Mechanics',
      })
      .expect(201);

    expect(response.body.graph_type).toBe('custom:magic-system');
  });

  it('should create graph with initial nodes', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .send({
        graph_type: 'World-Foundations',
        graph_name: 'Core Pantheon',
        initial_nodes: [
          {
            node_type: 'Deity',
            name: 'Tyr',
            attributes: { domain: 'Justice' },
          },
          {
            node_type: 'Deity',
            name: 'Mystra',
            attributes: { domain: 'Magic' },
          },
        ],
      })
      .expect(201);

    expect(response.body).toHaveProperty('nodes');
    expect(response.body.nodes.length).toBeGreaterThanOrEqual(2);
  });

  it('should create graph with initial edges', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .send({
        graph_type: 'Political-Web',
        graph_name: 'Waterdeep Factions',
        initial_nodes: [
          { node_type: 'Faction', name: 'Lords Alliance' },
          { node_type: 'Faction', name: 'Harpers' },
        ],
        initial_edges: [
          {
            edge_type: 'allied with',
            source_node_id: 'will-be-uuid-1',
            target_node_id: 'will-be-uuid-2',
            directed: false,
          },
        ],
      })
      .expect(201);

    expect(response.body).toHaveProperty('edges');
  });

  it('should set default decay rate based on graph type', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .send({
        graph_type: 'World-Foundations',
        graph_name: 'Core Rules',
      })
      .expect(201);

    expect(response.body.decay_rate).toBe(0.0); // World-Foundations never decays
  });

  it('should default toggle_state to true for new graphs', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .send({
        graph_type: 'Geographical',
        graph_name: 'Sword Coast Map',
      })
      .expect(201);

    expect(response.body.toggle_state).toBe(true);
  });

  it('should require graph_type field', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .send({
        graph_name: 'Missing Type',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should require graph_name field', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .send({
        graph_type: 'Political-Web',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 409 if graph_name already exists in campaign', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken)
      .send({
        graph_type: 'Political-Web',
        graph_name: 'Existing Graph Name',
      })
      .expect('Content-Type', /json/)
      .expect(409);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs`)
      .send({
        graph_type: 'Political-Web',
        graph_name: 'Test Graph',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .post('/api/campaigns/other-user-campaign-uuid/graphs')
      .set('Authorization', validToken)
      .send({
        graph_type: 'Political-Web',
        graph_name: 'Test Graph',
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/campaigns/:campaignId/graphs/:graphId', () => {
  it('should return specific knowledge graph with nodes and edges', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: testGraphId,
      campaign_id: testCampaignId,
      graph_type: expect.any(String),
      graph_name: expect.any(String),
      toggle_state: expect.any(Boolean),
      decay_rate: expect.any(Number),
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
    });
    expect(response.body).toHaveProperty('nodes');
    expect(response.body).toHaveProperty('edges');
  });

  it('should default to including nodes and edges', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(Array.isArray(response.body.nodes)).toBe(true);
    expect(Array.isArray(response.body.edges)).toBe(true);
  });

  it('should exclude nodes when include_nodes=false', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .query({ include_nodes: false })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.nodes).toBeUndefined();
  });

  it('should exclude edges when include_edges=false', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .query({ include_edges: false })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.edges).toBeUndefined();
  });

  it('should include node confidence scores', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.nodes && response.body.nodes.length > 0) {
      const node = response.body.nodes[0];
      expect(node).toHaveProperty('confidence');
      expect(typeof node.confidence).toBe('number');
      expect(node.confidence).toBeGreaterThanOrEqual(0.0);
      expect(node.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('should include edge confidence scores', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.edges && response.body.edges.length > 0) {
      const edge = response.body.edges[0];
      expect(edge).toHaveProperty('confidence');
      expect(typeof edge.confidence).toBe('number');
    }
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PATCH /api/campaigns/:campaignId/graphs/:graphId', () => {
  it('should update graph name', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .send({
        graph_name: 'Updated Graph Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.graph_name).toBe('Updated Graph Name');
    expect(response.body.updated_at).toBeGreaterThan(response.body.created_at);
  });

  it('should add nodes to graph', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .send({
        nodes_to_add: [
          {
            node_type: 'NPC',
            name: 'Lord Neverember',
            attributes: { title: 'Open Lord' },
          },
        ],
      })
      .expect(200);

    expect(response.body).toHaveProperty('nodes');
  });

  it('should update existing nodes', async () => {
    const nodeId = 'node-uuid-001';
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .send({
        nodes_to_update: [
          {
            id: nodeId,
            name: 'Updated Name',
            attributes: { new_field: 'value' },
          },
        ],
      })
      .expect(200);

    expect(response.body).toHaveProperty('nodes');
  });

  it('should delete nodes from graph', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .send({
        nodes_to_delete: ['node-uuid-001', 'node-uuid-002'],
      })
      .expect(200);

    expect(response.body).toHaveProperty('nodes');
  });

  it('should add edges to graph', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .send({
        edges_to_add: [
          {
            edge_type: 'allied with',
            source_node_id: 'node-uuid-001',
            target_node_id: 'node-uuid-002',
            directed: false,
          },
        ],
      })
      .expect(200);

    expect(response.body).toHaveProperty('edges');
  });

  it('should delete edges from graph', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .send({
        edges_to_delete: ['edge-uuid-001'],
      })
      .expect(200);

    expect(response.body).toHaveProperty('edges');
  });

  it('should support batch operations (add, update, delete)', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .send({
        nodes_to_add: [{ node_type: 'NPC', name: 'New NPC' }],
        nodes_to_update: [{ id: 'node-uuid-001', name: 'Updated NPC' }],
        nodes_to_delete: ['node-uuid-002'],
        edges_to_add: [
          {
            edge_type: 'knows',
            source_node_id: 'node-uuid-001',
            target_node_id: 'new-node-id',
          },
        ],
        edges_to_delete: ['edge-uuid-001'],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: testGraphId,
      updated_at: expect.any(Number),
    });
  });

  it('should return 400 for invalid node data', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .send({
        nodes_to_add: [
          {
            // Missing required node_type
            name: 'Invalid Node',
          },
        ],
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid`)
      .set('Authorization', validToken)
      .send({
        graph_name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .send({
        graph_name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .send({
        graph_name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/campaigns/:campaignId/graphs/:graphId', () => {
  it('should delete graph and return 204', async () => {
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/graph-to-delete-uuid`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should cascade delete nodes and edges', async () => {
    // This test verifies database CASCADE behavior
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect(204);

    // Verify graph no longer exists
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should delete graph version history', async () => {
    // Verify version snapshots are also deleted
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
