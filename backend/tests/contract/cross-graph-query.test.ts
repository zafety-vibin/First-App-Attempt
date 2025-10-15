/**
 * Contract tests for Cross-Graph Query API
 * Based on: specs/006-create-the-knowledge/contracts/cross-graph-query.yaml
 *
 * Feature 006 - Knowledge Graphs with Confidence Decay
 * These tests validate multi-graph querying with toggle filtering.
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Feature 006
let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';

describe('POST /api/campaigns/:campaignId/graphs/query', () => {
  it('should query across multiple graphs', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({
        query: 'What factions are active in Waterdeep?',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      answer: expect.any(String),
      graphs_used: expect.any(Array),
      cross_references: expect.any(Array),
    });
  });

  it('should use only toggled-on graphs by default', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({
        query: 'Test query',
      })
      .expect(200);

    // All graphs_used should have toggle_state = true
    response.body.graphs_used.forEach((graph: any) => {
      expect(graph).toHaveProperty('graph_id');
      expect(graph).toHaveProperty('graph_name');
      expect(graph).toHaveProperty('graph_type');
    });
  });

  it('should accept specific graph_ids to query', async () => {
    const graphId1 = 'graph-uuid-001';
    const graphId2 = 'graph-uuid-002';

    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({
        query: 'Test query',
        graph_ids: [graphId1, graphId2],
      })
      .expect(200);

    // Should only query specified graphs
    expect(response.body.graphs_used.length).toBeLessThanOrEqual(2);
  });

  it('should respect view_mode parameter (DM vs Player)', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({
        query: 'Test query',
        view_mode: 'player',
      })
      .expect(200);

    // Should filter out DM Secret nodes in player mode
    expect(response.body).toHaveProperty('answer');
  });

  it('should default to dm view_mode', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({
        query: 'Test query',
      })
      .expect(200);

    // Should include all nodes by default
    expect(response.body).toHaveProperty('answer');
  });

  it('should return LLM-generated answer', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({
        query: 'What factions control Waterdeep?',
      })
      .expect(200);

    expect(response.body.answer).toBeTruthy();
    expect(typeof response.body.answer).toBe('string');
  });

  it('should include graphs_used metadata', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({
        query: 'Test query',
      })
      .expect(200);

    if (response.body.graphs_used.length > 0) {
      const graph = response.body.graphs_used[0];
      expect(graph).toMatchObject({
        graph_id: expect.any(String),
        graph_name: expect.any(String),
        graph_type: expect.any(String),
        nodes_referenced: expect.any(Number),
      });
    }
  });

  it('should discover cross_references via observations', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({
        query: 'Where is Lord Neverember?',
      })
      .expect(200);

    // Should find cross-graph observation like "current location: Waterdeep"
    expect(Array.isArray(response.body.cross_references)).toBe(true);

    if (response.body.cross_references.length > 0) {
      const ref = response.body.cross_references[0];
      expect(ref).toMatchObject({
        from_graph: expect.any(String),
        from_node: expect.any(String),
        observation: expect.any(String),
        to_graph: expect.any(String),
      });
    }
  });

  it('should require query field', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate view_mode enum', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .set('Authorization', validToken)
      .send({
        query: 'Test query',
        view_mode: 'invalid',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/query`)
      .send({
        query: 'Test query',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .post('/api/campaigns/other-user-campaign-uuid/graphs/query')
      .set('Authorization', validToken)
      .send({
        query: 'Test query',
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent campaign', async () => {
    const response = await request(app)
      .post('/api/campaigns/non-existent-uuid/graphs/query')
      .set('Authorization', validToken)
      .send({
        query: 'Test query',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/campaigns/:campaignId/graphs/context', () => {
  it('should return serialized graph context for LLM', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/context`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      graphs: expect.any(Array),
      total_nodes: expect.any(Number),
      total_edges: expect.any(Number),
    });
  });

  it('should serialize graph data for LLM consumption', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/context`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.graphs.length > 0) {
      const graph = response.body.graphs[0];
      expect(graph).toMatchObject({
        name: expect.any(String),
        type: expect.any(String),
        nodes: expect.any(Array),
        edges: expect.any(Array),
      });
    }
  });

  it('should include node confidence in context', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/context`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.graphs[0]?.nodes.length > 0) {
      const node = response.body.graphs[0].nodes[0];
      expect(node).toMatchObject({
        type: expect.any(String),
        name: expect.any(String),
        attributes: expect.any(Object),
        confidence: expect.any(Number),
      });
    }
  });

  it('should filter by graph_ids when provided', async () => {
    const graphId1 = 'graph-uuid-001';

    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/context`)
      .query({ graph_ids: [graphId1] })
      .set('Authorization', validToken)
      .expect(200);

    // Should only include specified graphs
    expect(response.body.graphs.length).toBeLessThanOrEqual(1);
  });

  it('should respect view_mode parameter', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/context`)
      .query({ view_mode: 'player' })
      .set('Authorization', validToken)
      .expect(200);

    // Should filter DM Secret nodes in player mode
    expect(response.body).toHaveProperty('graphs');
  });

  it('should default to dm view_mode', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/context`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('graphs');
  });

  it('should use only toggled-on graphs by default', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/context`)
      .set('Authorization', validToken)
      .expect(200);

    // Should only include graphs with toggle_state = true
    expect(response.body).toHaveProperty('graphs');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/context`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get('/api/campaigns/other-user-campaign-uuid/graphs/context')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent campaign', async () => {
    const response = await request(app)
      .get('/api/campaigns/non-existent-uuid/graphs/context')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});
