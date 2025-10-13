/**
 * Contract tests for World Rules API - Feature 014 (TDD)
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';

describe('GET /api/world-rules', () => {
  it('should list world rules with pagination', async () => {
    const response = await request(app)
      .get('/api/world-rules')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: expect.any(Object),
    });
  });
});

describe('POST /api/world-rules', () => {
  it('should create world rule and return 201', async () => {
    const response = await request(app)
      .post('/api/world-rules')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Magic System',
        rule_type: 'magic',
        exceptions: 'Dead magic zones exist',
        related_rules: [],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Magic System',
      rule_type: 'magic',
      related_rules: expect.any(Array),
    });
  });

  it('should support self-referential related_rules array', async () => {
    const response = await request(app)
      .post('/api/world-rules')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Gravity Rule',
        related_rules: ['rule-uuid-001', 'rule-uuid-002'],
      })
      .expect(201);

    expect(response.body.related_rules).toEqual(['rule-uuid-001', 'rule-uuid-002']);
  });
});

describe('GET /api/world-rules/:id', () => {
  it('should return world rule by ID', async () => {
    const response = await request(app)
      .get('/api/world-rules/rule-uuid-123')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('related_rules');
  });
});

describe('PUT /api/world-rules/:id', () => {
  it('should update world rule', async () => {
    const response = await request(app)
      .put('/api/world-rules/rule-uuid-123')
      .set('Authorization', validToken)
      .send({ exceptions: 'New exceptions' })
      .expect(200);

    expect(response.body.exceptions).toBe('New exceptions');
  });
});

describe('DELETE /api/world-rules/:id', () => {
  it('should delete world rule and return 204', async () => {
    await request(app)
      .delete('/api/world-rules/rule-to-delete')
      .set('Authorization', validToken)
      .expect(204);
  });
});
