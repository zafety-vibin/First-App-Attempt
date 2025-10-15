/**
 * Contract tests for Graph Edges API
 * Based on: specs/006-create-the-knowledge/contracts/graph-edges.yaml
 *
 * Feature 006 - Knowledge Graphs with Confidence Decay
 * These tests validate manual edge CRUD operations.
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
const testEdgeId = 'edge-uuid-001';
const testSourceNodeId = 'node-uuid-001';
const testTargetNodeId = 'node-uuid-002';

describe('GET /api/campaigns/:campaignId/graphs/:graphId/edges', () => {
  it('should list all edges in a graph', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('edges');
    expect(Array.isArray(response.body.edges)).toBe(true);
  });

  it('should include edge confidence scores (average of connected nodes)', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.edges.length > 0) {
      const edge = response.body.edges[0];
      expect(edge).toMatchObject({
        id: expect.any(String),
        graph_id: testGraphId,
        edge_type: expect.any(String),
        source_node_id: expect.any(String),
        target_node_id: expect.any(String),
        directed: expect.any(Boolean),
        created_at: expect.any(Number),
        confidence: expect.any(Number),
      });
      expect(edge.confidence).toBeGreaterThanOrEqual(0.0);
      expect(edge.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('should include metadata field (nullable)', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.edges.length > 0) {
      const edge = response.body.edges[0];
      expect(edge).toHaveProperty('metadata');
      expect(edge.metadata === null || typeof edge.metadata === 'object').toBe(true);
    }
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid/edges`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/campaigns/:campaignId/graphs/:graphId/edges', () => {
  it('should create a new edge with required fields', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'allied with',
        source_node_id: testSourceNodeId,
        target_node_id: testTargetNodeId,
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      graph_id: testGraphId,
      edge_type: 'allied with',
      source_node_id: testSourceNodeId,
      target_node_id: testTargetNodeId,
      directed: expect.any(Boolean),
      created_at: expect.any(Number),
      confidence: expect.any(Number),
    });
  });

  it('should default directed to true', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'leads to',
        source_node_id: testSourceNodeId,
        target_node_id: testTargetNodeId,
      })
      .expect(201);

    expect(response.body.directed).toBe(true);
  });

  it('should create undirected edge when directed=false', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'knows',
        source_node_id: testSourceNodeId,
        target_node_id: testTargetNodeId,
        directed: false,
      })
      .expect(201);

    expect(response.body.directed).toBe(false);
  });

  it('should create edge with metadata', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'allied with',
        source_node_id: testSourceNodeId,
        target_node_id: testTargetNodeId,
        metadata: {
          strength: 0.8,
          description: 'secret alliance',
          established_date: 'Year 1489 DR',
        },
      })
      .expect(201);

    expect(response.body.metadata).toMatchObject({
      strength: 0.8,
      description: 'secret alliance',
      established_date: 'Year 1489 DR',
    });
  });

  it('should validate source_node_id exists', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'allied with',
        source_node_id: 'non-existent-uuid',
        target_node_id: testTargetNodeId,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate target_node_id exists', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'allied with',
        source_node_id: testSourceNodeId,
        target_node_id: 'non-existent-uuid',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should prevent self-referential edges', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'related to',
        source_node_id: testSourceNodeId,
        target_node_id: testSourceNodeId, // Same as source
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should require edge_type field', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        source_node_id: testSourceNodeId,
        target_node_id: testTargetNodeId,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should require source_node_id field', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'allied with',
        target_node_id: testTargetNodeId,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should require target_node_id field', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'allied with',
        source_node_id: testSourceNodeId,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .send({
        edge_type: 'allied with',
        source_node_id: testSourceNodeId,
        target_node_id: testTargetNodeId,
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .post(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'allied with',
        source_node_id: testSourceNodeId,
        target_node_id: testTargetNodeId,
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid/edges`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'allied with',
        source_node_id: testSourceNodeId,
        target_node_id: testTargetNodeId,
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/campaigns/:campaignId/graphs/:graphId/edges/:edgeId', () => {
  it('should return edge by ID', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: testEdgeId,
      graph_id: testGraphId,
      edge_type: expect.any(String),
      source_node_id: expect.any(String),
      target_node_id: expect.any(String),
      directed: expect.any(Boolean),
      created_at: expect.any(Number),
      confidence: expect.any(Number),
    });
  });

  it('should include metadata field', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('metadata');
  });

  it('should update last_accessed for both connected nodes (reinforcement)', async () => {
    const beforeTimestamp = Math.floor(Date.now() / 1000);

    await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .expect(200);

    // Verify source and target nodes have updated last_accessed
    const sourceNode = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testSourceNodeId}`)
      .set('Authorization', validToken);

    expect(sourceNode.body.last_accessed).toBeGreaterThanOrEqual(beforeTimestamp);

    const targetNode = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testTargetNodeId}`)
      .set('Authorization', validToken);

    expect(targetNode.body.last_accessed).toBeGreaterThanOrEqual(beforeTimestamp);
  });

  it('should return 404 for non-existent edge', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PATCH /api/campaigns/:campaignId/graphs/:graphId/edges/:edgeId', () => {
  it('should update edge_type', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'opposes',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.edge_type).toBe('opposes');
  });

  it('should update source_node_id', async () => {
    const newSourceId = 'node-uuid-003';
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .send({
        source_node_id: newSourceId,
      })
      .expect(200);

    expect(response.body.source_node_id).toBe(newSourceId);
  });

  it('should update target_node_id', async () => {
    const newTargetId = 'node-uuid-004';
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .send({
        target_node_id: newTargetId,
      })
      .expect(200);

    expect(response.body.target_node_id).toBe(newTargetId);
  });

  it('should update directed flag', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .send({
        directed: false,
      })
      .expect(200);

    expect(response.body.directed).toBe(false);
  });

  it('should update metadata', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .send({
        metadata: {
          strength: 0.9,
          new_field: 'new value',
        },
      })
      .expect(200);

    expect(response.body.metadata).toMatchObject({
      strength: 0.9,
      new_field: 'new value',
    });
  });

  it('should allow partial updates', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'Only Type Updated',
      })
      .expect(200);

    expect(response.body.edge_type).toBe('Only Type Updated');
    // Other fields should remain unchanged
    expect(response.body).toHaveProperty('source_node_id');
    expect(response.body).toHaveProperty('target_node_id');
  });

  it('should validate updated source_node_id exists', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .send({
        source_node_id: 'non-existent-uuid',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate updated target_node_id exists', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .send({
        target_node_id: 'non-existent-uuid',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent edge', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/non-existent-uuid`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'Updated Type',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .send({
        edge_type: 'Updated Type',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .send({
        edge_type: 'Updated Type',
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/campaigns/:campaignId/graphs/:graphId/edges/:edgeId', () => {
  it('should delete edge and return 204', async () => {
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/edge-to-delete-uuid`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should not affect connected nodes when edge is deleted', async () => {
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .expect(204);

    // Verify source and target nodes still exist
    await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testSourceNodeId}`)
      .set('Authorization', validToken)
      .expect(200);

    await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testTargetNodeId}`)
      .set('Authorization', validToken)
      .expect(200);
  });

  it('should return 404 for non-existent edge', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/non-existent-uuid`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${testEdgeId}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .delete(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/edges/${testEdgeId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
