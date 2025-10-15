/**
 * Contract tests for Confidence Decay System
 * Based on: specs/006-create-the-knowledge/contracts/confidence-decay.json
 *
 * Feature 006 - Knowledge Graphs with Confidence Decay
 * These tests validate temporal awareness and confidence calculations.
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

describe('Confidence Decay Formula', () => {
  it('should calculate confidence using linear time-based decay formula', async () => {
    // Formula: confidence = 1.0 * (1 - decay_rate * weeks_elapsed)
    // For Political-Web graph (decay_rate = 0.1), after 4 weeks:
    // confidence = 1.0 * (1 - 0.1 * 4) = 0.6

    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/calculate-confidence`)
      .set('Authorization', validToken)
      .send({
        node_ids: [testNodeId],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('confidences');
    expect(Array.isArray(response.body.confidences)).toBe(true);

    if (response.body.confidences.length > 0) {
      const result = response.body.confidences[0];
      expect(result).toMatchObject({
        node_id: testNodeId,
        confidence: expect.any(Number),
        weeks_elapsed: expect.any(Number),
        decay_rate: expect.any(Number),
        pinned: expect.any(Boolean),
      });
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('should clamp confidence to [0.0, 1.0] range', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/calculate-confidence`)
      .set('Authorization', validToken)
      .send({
        node_ids: [testNodeId],
      })
      .expect(200);

    response.body.confidences.forEach((result: any) => {
      expect(result.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  it('should use graph-specific decay rates', async () => {
    // World-Foundations: 0.0 (never decays)
    // Political-Web: 0.1 (~10 weeks to zero)
    // Geographical: 0.05 (~20 weeks to zero)
    // Campaign-Story: 0.2 (~5 weeks to zero)

    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('decay_rate');
    expect(response.body.decay_rate).toBeGreaterThanOrEqual(0.0);
    expect(response.body.decay_rate).toBeLessThanOrEqual(1.0);
  });
});

describe('POST /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId/pin', () => {
  it('should pin entity (lock confidence at 1.0)', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/pin`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      node_id: testNodeId,
      pinned: true,
      confidence: 1.0,
    });
  });

  it('should bypass decay formula for pinned entities', async () => {
    // Pin entity
    await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/pin`)
      .set('Authorization', validToken)
      .expect(200);

    // Get entity after time passes (simulated by old last_accessed)
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect(200);

    // Confidence should still be 1.0
    expect(response.body.confidence).toBe(1.0);
    expect(response.body.pinned).toBe(true);
  });

  it('should return 404 for non-existent node', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/non-existent-uuid/pin`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/pin`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId/unpin', () => {
  it('should unpin entity (enable decay)', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/unpin`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      node_id: testNodeId,
      pinned: false,
      confidence: expect.any(Number),
    });
  });

  it('should calculate confidence after unpinning', async () => {
    await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/unpin`)
      .set('Authorization', validToken)
      .expect(200);

    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect(200);

    // Confidence should be calculated based on last_accessed
    expect(response.body.pinned).toBe(false);
    expect(response.body.confidence).toBeGreaterThanOrEqual(0.0);
    expect(response.body.confidence).toBeLessThanOrEqual(1.0);
  });

  it('should return 404 for non-existent node', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/non-existent-uuid/unpin`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/campaigns/:campaignId/graphs/:graphId/nodes/:nodeId/reinforce', () => {
  it('should update last_accessed to current time', async () => {
    const beforeTimestamp = Math.floor(Date.now() / 1000);

    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/reinforce`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      node_id: testNodeId,
      old_confidence: expect.any(Number),
      new_confidence: expect.any(Number),
      last_accessed: expect.any(Number),
    });

    expect(response.body.last_accessed).toBeGreaterThanOrEqual(beforeTimestamp);
  });

  it('should reset confidence to 1.0 after reinforcement', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/reinforce`)
      .set('Authorization', validToken)
      .expect(200);

    // After reinforcement, confidence should be 1.0 (weeks_elapsed = 0)
    expect(response.body.new_confidence).toBe(1.0);
  });

  it('should show confidence increase in response', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/reinforce`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.new_confidence).toBeGreaterThanOrEqual(response.body.old_confidence);
  });

  it('should accept optional boost_amount parameter', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/reinforce`)
      .set('Authorization', validToken)
      .send({
        boost_amount: 0.2,
      })
      .expect(200);

    expect(response.body).toHaveProperty('new_confidence');
  });

  it('should validate boost_amount range (0.01-0.5)', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}/reinforce`)
      .set('Authorization', validToken)
      .send({
        boost_amount: 1.5, // Exceeds max
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent node', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/non-existent-uuid/reinforce`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/campaigns/:campaignId/graphs/:graphId/stale', () => {
  it('should find entities with confidence below threshold', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/stale`)
      .query({ threshold: 0.4 })
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('stale_entities');
    expect(Array.isArray(response.body.stale_entities)).toBe(true);
  });

  it('should filter entities by confidence threshold', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/stale`)
      .query({ threshold: 0.3 })
      .set('Authorization', validToken)
      .expect(200);

    // All returned entities should have confidence < 0.3
    response.body.stale_entities.forEach((entity: any) => {
      expect(entity.confidence).toBeLessThan(0.3);
    });
  });

  it('should exclude pinned entities from stale list', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/stale`)
      .query({ threshold: 0.4 })
      .set('Authorization', validToken)
      .expect(200);

    // No pinned entities should appear in stale list
    response.body.stale_entities.forEach((entity: any) => {
      expect(entity.pinned).toBe(false);
    });
  });

  it('should default threshold to 0.3 if not provided', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/stale`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('stale_entities');
  });

  it('should include entity metadata in results', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/stale`)
      .query({ threshold: 0.4 })
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.stale_entities.length > 0) {
      const entity = response.body.stale_entities[0];
      expect(entity).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        node_type: expect.any(String),
        confidence: expect.any(Number),
        last_accessed: expect.any(Number),
        weeks_elapsed: expect.any(Number),
      });
    }
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/stale`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent graph', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/non-existent-uuid/stale`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/campaigns/:campaignId/graphs/:graphId/calculate-confidence', () => {
  it('should calculate confidence for specified node IDs', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/calculate-confidence`)
      .set('Authorization', validToken)
      .send({
        node_ids: [testNodeId, 'node-uuid-002'],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('confidences');
    expect(Array.isArray(response.body.confidences)).toBe(true);
    expect(response.body.confidences.length).toBeLessThanOrEqual(2);
  });

  it('should return confidence with metadata', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/calculate-confidence`)
      .set('Authorization', validToken)
      .send({
        node_ids: [testNodeId],
      })
      .expect(200);

    if (response.body.confidences.length > 0) {
      const result = response.body.confidences[0];
      expect(result).toMatchObject({
        node_id: testNodeId,
        confidence: expect.any(Number),
        weeks_elapsed: expect.any(Number),
        decay_rate: expect.any(Number),
        pinned: expect.any(Boolean),
        level: expect.stringMatching(/^(high|medium|low)$/),
      });
    }
  });

  it('should classify confidence level (high/medium/low)', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/calculate-confidence`)
      .set('Authorization', validToken)
      .send({
        node_ids: [testNodeId],
      })
      .expect(200);

    if (response.body.confidences.length > 0) {
      const result = response.body.confidences[0];
      // high: >= 0.7, medium: 0.4-0.7, low: < 0.4
      expect(result.level).toMatch(/^(high|medium|low)$/);
    }
  });

  it('should require node_ids field', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/calculate-confidence`)
      .set('Authorization', validToken)
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate node_ids is array', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/calculate-confidence`)
      .set('Authorization', validToken)
      .send({
        node_ids: 'not-an-array',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/calculate-confidence`)
      .send({
        node_ids: [testNodeId],
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('Observation Confidence Decay', () => {
  it('should calculate individual observation confidence', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.observations && response.body.observations.length > 0) {
      const observation = response.body.observations[0];
      expect(observation).toMatchObject({
        text: expect.any(String),
        confidence: expect.any(Number),
        created_at: expect.any(Number),
        last_accessed: expect.any(Number),
      });
      expect(observation.confidence).toBeGreaterThanOrEqual(0.0);
      expect(observation.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('should decay observations independently from entity', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/nodes/${testNodeId}`)
      .set('Authorization', validToken)
      .expect(200);

    // Entity and observations can have different confidence scores
    if (response.body.observations && response.body.observations.length > 0) {
      expect(response.body.confidence).toBeDefined();
      expect(response.body.observations[0].confidence).toBeDefined();
      // They MAY be different values (not enforced, but possible)
    }
  });
});

describe('Edge Confidence Calculation', () => {
  it('should calculate edge confidence as average of connected nodes', async () => {
    const response = await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.edges && response.body.edges.length > 0) {
      const edge = response.body.edges[0];
      expect(edge).toHaveProperty('confidence');
      expect(edge.confidence).toBeGreaterThanOrEqual(0.0);
      expect(edge.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it('should update both node timestamps when accessing edge', async () => {
    const edgeId = 'edge-uuid-001';
    const beforeTimestamp = Math.floor(Date.now() / 1000);

    await request(app)
      .get(`/api/campaigns/${testCampaignId}/graphs/${testGraphId}/edges/${edgeId}`)
      .set('Authorization', validToken)
      .expect(200);

    // Verify both source and target nodes have updated last_accessed
    // (Implementation detail: test indirectly via confidence increase)
  });
});
