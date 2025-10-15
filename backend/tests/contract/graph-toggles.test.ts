/**
 * Contract tests for Graph Toggle API
 * Based on: specs/006-create-the-knowledge/contracts/graph-toggles.yaml
 *
 * Feature 006 - Knowledge Graphs with Confidence Decay
 * These tests validate toggle state management for AI access control.
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

describe('GET /api/campaigns/:campaignId/graphs/toggles', () => {
  it('should return toggle states for all graphs', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/toggles`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('toggles');
    expect(Array.isArray(response.body.toggles)).toBe(true);
  });

  it('should include graph metadata with toggle state', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/toggles`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.toggles.length > 0) {
      const toggle = response.body.toggles[0];
      expect(toggle).toMatchObject({
        graph_id: expect.any(String),
        graph_name: expect.any(String),
        graph_type: expect.any(String),
        toggle_state: expect.any(Boolean),
      });
    }
  });

  it('should return empty array for campaign with no graphs', async () => {
    const response = await request(app)
      .get('/api/campaigns/empty-campaign-uuid/graphs/toggles')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.toggles).toEqual([]);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/toggles`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get('/api/campaigns/other-user-campaign-uuid/graphs/toggles')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent campaign', async () => {
    const response = await request(app)
      .get('/api/campaigns/non-existent-uuid/graphs/toggles')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/campaigns/:campaignId/graphs/active', () => {
  it('should return only toggled-on graphs', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/active`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('graphs');
    expect(Array.isArray(response.body.graphs)).toBe(true);

    // All returned graphs should have toggle_state = true
    response.body.graphs.forEach((graph: any) => {
      expect(graph.toggle_state).toBe(true);
    });
  });

  it('should exclude toggled-off graphs', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/active`)
      .set('Authorization', validToken)
      .expect(200);

    // Verify no graph has toggle_state = false
    response.body.graphs.forEach((graph: any) => {
      expect(graph.toggle_state).not.toBe(false);
    });
  });

  it('should return empty array when all graphs are toggled off', async () => {
    const response = await request(app)
      .get('/api/campaigns/all-graphs-off-campaign-uuid/graphs/active')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.graphs).toEqual([]);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/active`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .get('/api/campaigns/other-user-campaign-uuid/graphs/active')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent campaign', async () => {
    const response = await request(app)
      .get('/api/campaigns/non-existent-uuid/graphs/active')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PATCH /api/campaigns/:campaignId/graphs/:graphId/toggle', () => {
  it('should toggle graph on (AI can access)', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({
        toggle_state: true,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      graph_id: testGraphId,
      graph_name: expect.any(String),
      toggle_state: true,
      updated_at: expect.any(Number),
    });
  });

  it('should toggle graph off (AI cannot access)', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({
        toggle_state: false,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      graph_id: testGraphId,
      toggle_state: false,
      updated_at: expect.any(Number),
    });
  });

  it('should update graph updated_at timestamp', async () => {
    const beforeTimestamp = Math.floor(Date.now() / 1000);

    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({
        toggle_state: true,
      })
      .expect(200);

    expect(response.body.updated_at).toBeGreaterThanOrEqual(beforeTimestamp);
  });

  it('should allow toggling multiple times', async () => {
    // Toggle off
    await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({ toggle_state: false })
      .expect(200);

    // Toggle on
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({ toggle_state: true })
      .expect(200);

    expect(response.body.toggle_state).toBe(true);
  });

  it('should be idempotent (setting same state twice)', async () => {
    // Set to true
    const firstResponse = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({ toggle_state: true })
      .expect(200);

    // Set to true again
    const secondResponse = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({ toggle_state: true })
      .expect(200);

    expect(secondResponse.body.toggle_state).toBe(true);
    expect(secondResponse.body.updated_at).toBeGreaterThanOrEqual(firstResponse.body.updated_at);
  });

  it('should require toggle_state field', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate toggle_state is boolean', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({
        toggle_state: 'invalid',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid/toggle`)
      .set('Authorization', validToken)
      .send({
        toggle_state: true,
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .send({
        toggle_state: true,
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when user does not own campaign', async () => {
    const response = await request(app)
      .patch(`/api/campaigns/other-user-campaign-uuid/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({
        toggle_state: true,
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('Toggle State Persistence', () => {
  it('should persist toggle state across graph queries', async () => {
    // Toggle off
    await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({ toggle_state: false })
      .expect(200);

    // Verify graph shows toggle_state = false
    const graphResponse = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken);

    expect(graphResponse.body.toggle_state).toBe(false);
  });

  it('should reflect toggle state in active graphs list', async () => {
    // Toggle off
    await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({ toggle_state: false })
      .expect(200);

    // Verify graph not in active list
    const activeResponse = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/active`)
      .set('Authorization', validToken);

    const foundGraph = activeResponse.body.graphs.find((g: any) => g.id === testGraphId);
    expect(foundGraph).toBeUndefined();
  });

  it('should reflect toggle state in all graphs list', async () => {
    // Toggle on
    await request(app)
      .patch(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/toggle`)
      .set('Authorization', validToken)
      .send({ toggle_state: true })
      .expect(200);

    // Verify graph in all graphs list with correct state
    const allGraphsResponse = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs`)
      .set('Authorization', validToken);

    const foundGraph = allGraphsResponse.body.graphs.find((g: any) => g.id === testGraphId);
    expect(foundGraph?.toggle_state).toBe(true);
  });
});
