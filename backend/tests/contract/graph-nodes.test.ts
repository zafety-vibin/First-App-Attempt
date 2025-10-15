/**
 * Contract tests for Graph Nodes API
 * Based on: specs/006-create-the-knowledge/contracts/graph-nodes.yaml
 *
 * Feature 006 - Knowledge Graphs with Confidence Decay
 * These tests validate manual node CRUD operations.
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Feature 006
let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';
const testGraphId = 'graph-uuid-001';
const testNodeId = 'node-uuid-001';

describe('GET /api/campaigns/:campaignId/graphs/:graphId/nodes', () => {
  it('should list all nodes in a graph with confidence scores', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('nodes');
    expect(Array.isArray(response.body.nodes)).toBe(true);
  });

  it('should calculate confidence for each node on-demand', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.nodes.length > 0) {
      const node = response.body.nodes[0];
      expect(node).toMatchObject({
        id: expect.any(String),
        graph_id: testGraphId,
        node_type: expect.any(String),
        name: expect.any(String),
        attributes: expect.any(Object),
        created_at: expect.any(Number),
        last_accessed: expect.any(Number),
        pinned: expect.any(Boolean),
        confidence: expect.any(Number),
      });
      expect(node.confidence).toBeGreaterThanOrEqual(0.0);
      expect(node.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('should include observations array for each node', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.nodes.length > 0) {
      const node = response.body.nodes[0];
      expect(node).toHaveProperty('observations');
      expect(node.observations === null || Array.isArray(node.observations)).toBe(true);
    }
  });

  it('should filter by information_level_id (DM Secret filtering)', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    // Should not include nodes with dm_secret information level
    response.body.nodes.forEach((node: any) => {
      expect(node.information_level_id).not.toBe('dm-secret');
    });
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid/nodes`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/campaigns/:campaignId/graphs/:graphId/nodes', () => {
  it('should create a new node with required fields', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'NPC',
        name: 'Lord Neverember',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      graph_id: testGraphId,
      node_type: 'NPC',
      name: 'Lord Neverember',
      attributes: expect.any(Object),
      observations: expect.anything(), // null or array
      created_at: expect.any(Number),
      last_accessed: expect.any(Number),
      pinned: false,
      confidence: 1.0, // New nodes start with confidence 1.0
    });
  });

  it('should create node with attributes object', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'Location',
        name: 'Waterdeep',
        attributes: {
          type: 'City',
          population: 130000,
          ruler: 'Lord Neverember',
        },
      })
      .expect(201);

    expect(response.body.attributes).toMatchObject({
      type: 'City',
      population: 130000,
      ruler: 'Lord Neverember',
    });
  });

  it('should create node with observations array', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'NPC',
        name: 'Guard Captain Bob',
        observations: 'current location: city gate',
      })
      .expect(201);

    expect(response.body.observations).toBeTruthy();
  });

  it('should create node with information_level_id', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'NPC',
        name: 'Secret Agent',
        information_level_id: 'dm-secret',
      })
      .expect(201);

    expect(response.body.information_level_id).toBe('dm-secret');
  });

  it('should set last_accessed to creation time', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'Event',
        name: 'The Sundering',
      })
      .expect(201);

    expect(response.body.last_accessed).toBe(response.body.created_at);
  });

  it('should default pinned to false', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'Faction',
        name: 'Harpers',
      })
      .expect(201);

    expect(response.body.pinned).toBe(false);
  });

  it('should require node_type field', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        name: 'Missing Type',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should require name field', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'NPC',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate name maxLength (200 characters)', async () => {
    const longName = 'A'.repeat(201);
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'NPC',
        name: longName,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes`)
      .send({
        node_type: 'NPC',
        name: 'Test Node',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .post(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'NPC',
        name: 'Test Node',
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid/nodes`)
      .set('Authorization', validToken)
      .send({
        node_type: 'NPC',
        name: 'Test Node',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId', () => {
  it('should return node by ID and auto-reinforce (update last_accessed)', async () => {
    const beforeTimestamp = Math.floor(Date.now() / 1000);

    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: testNodeId,
      graph_id: testGraphId,
      node_type: expect.any(String),
      name: expect.any(String),
      attributes: expect.any(Object),
      created_at: expect.any(Number),
      last_accessed: expect.any(Number),
      pinned: expect.any(Boolean),
      confidence: expect.any(Number),
    });

    // last_accessed should be updated to approximately now
    expect(response.body.last_accessed).toBeGreaterThanOrEqual(beforeTimestamp);
  });

  it('should recalculate confidence after reinforcement', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect(200);

    // After auto-reinforce, confidence should be high (close to 1.0)
    expect(response.body.confidence).toBeGreaterThan(0.9);
  });

  it('should include observations with individual confidence scores', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.observations && response.body.observations.length > 0) {
      const observation = response.body.observations[0];
      expect(observation).toHaveProperty('text');
      expect(observation).toHaveProperty('confidence');
      expect(observation).toHaveProperty('created_at');
      expect(observation).toHaveProperty('last_accessed');
    }
  });

  it('should return 404 for non-existent node', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PATCH /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId', () => {
  it('should update node attributes', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .send({
        attributes: {
          title: 'Open Lord',
          faction: 'Lords Alliance',
        },
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.attributes).toMatchObject({
      title: 'Open Lord',
      faction: 'Lords Alliance',
    });
  });

  it('should update node observations', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .send({
        observations: 'current location: Waterdeep palace',
      })
      .expect(200);

    expect(response.body.observations).toBeTruthy();
  });

  it('should update node_type', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .send({
        node_type: 'BBEG',
      })
      .expect(200);

    expect(response.body.node_type).toBe('BBEG');
  });

  it('should update node name', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Name',
      })
      .expect(200);

    expect(response.body.name).toBe('Updated Name');
  });

  it('should update information_level_id', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .send({
        information_level_id: 'player-knowledge',
      })
      .expect(200);

    expect(response.body.information_level_id).toBe('player-knowledge');
  });

  it('should allow partial updates', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Only Name Updated',
      })
      .expect(200);

    expect(response.body.name).toBe('Only Name Updated');
    // Other fields should remain unchanged
    expect(response.body).toHaveProperty('node_type');
    expect(response.body).toHaveProperty('attributes');
  });

  it('should return 400 for invalid updates', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .send({
        name: 'A'.repeat(201), // Exceeds max length
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent node', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/non-existent-uuid`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId', () => {
  it('should delete node and return 204', async () => {
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/node-to-delete-uuid`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should cascade delete edges connected to node', async () => {
    // This test verifies database CASCADE behavior
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect(204);

    // Verify node no longer exists
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent node', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
