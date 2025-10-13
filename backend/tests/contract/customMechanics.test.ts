/**
 * Contract tests for Custom Mechanics API - Feature 014 (TDD)
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';

describe('GET /api/custom-mechanics', () => {
  it('should list custom mechanics with pagination', async () => {
    const response = await request(app)
      .get('/api/custom-mechanics')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: expect.any(Object),
    });
  });
});

describe('POST /api/custom-mechanics', () => {
  it('should create custom mechanic and return 201', async () => {
    const response = await request(app)
      .post('/api/custom-mechanics')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Critical Fumble Table',
        mechanic_type: 'combat',
        rules_text: 'On natural 1, roll on fumble table',
        source: 'Homebrew',
        related_rules: [],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Critical Fumble Table',
      mechanic_type: 'combat',
      related_rules: expect.any(Array),
    });
  });

  it('should support self-referential related_rules', async () => {
    const response = await request(app)
      .post('/api/custom-mechanics')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Advanced Combat',
        related_rules: ['mechanic-uuid-001'],
      })
      .expect(201);

    expect(response.body.related_rules).toEqual(['mechanic-uuid-001']);
  });
});

describe('GET /api/custom-mechanics/:id', () => {
  it('should return custom mechanic by ID', async () => {
    const response = await request(app)
      .get('/api/custom-mechanics/mechanic-uuid-123')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('related_rules');
  });
});

describe('PUT /api/custom-mechanics/:id', () => {
  it('should update custom mechanic', async () => {
    const response = await request(app)
      .put('/api/custom-mechanics/mechanic-uuid-123')
      .set('Authorization', validToken)
      .send({ rules_text: 'Updated rules' })
      .expect(200);

    expect(response.body.rules_text).toBe('Updated rules');
  });
});

describe('DELETE /api/custom-mechanics/:id', () => {
  it('should delete custom mechanic and return 204', async () => {
    await request(app)
      .delete('/api/custom-mechanics/mechanic-to-delete')
      .set('Authorization', validToken)
      .expect(204);
  });
});
