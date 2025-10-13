/**
 * Contract tests for Lore Entries API - Feature 014 (TDD)
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';

describe('GET /api/lore-entries', () => {
  it('should list lore entries with pagination', async () => {
    const response = await request(app)
      .get('/api/lore-entries')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: expect.any(Object),
    });
  });

  it('should return 401 when not authenticated', async () => {
    await request(app).get('/api/lore-entries').expect(401);
  });
});

describe('POST /api/lore-entries', () => {
  it('should create lore entry and return 201', async () => {
    const response = await request(app)
      .post('/api/lore-entries')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'The Dragon Wars',
        category: 'history',
        era_period: 'Age of Dragons',
        historical_accuracy: 'documented',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'The Dragon Wars',
      category: 'history',
      related_npcs: expect.any(Array),
      related_locations: expect.any(Array),
      related_factions: expect.any(Array),
    });
  });

  it('should require name and campaign_id', async () => {
    await request(app)
      .post('/api/lore-entries')
      .set('Authorization', validToken)
      .send({ category: 'history' })
      .expect(400);
  });
});

describe('GET /api/lore-entries/:id', () => {
  it('should return lore entry by ID', async () => {
    const response = await request(app)
      .get('/api/lore-entries/lore-uuid-123')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('name');
  });

  it('should return 404 for non-existent entry', async () => {
    await request(app)
      .get('/api/lore-entries/non-existent')
      .set('Authorization', validToken)
      .expect(404);
  });
});

describe('PUT /api/lore-entries/:id', () => {
  it('should update lore entry', async () => {
    const response = await request(app)
      .put('/api/lore-entries/lore-uuid-123')
      .set('Authorization', validToken)
      .send({ historical_accuracy: 'legend' })
      .expect(200);

    expect(response.body.historical_accuracy).toBe('legend');
  });
});

describe('DELETE /api/lore-entries/:id', () => {
  it('should delete lore entry and return 204', async () => {
    await request(app)
      .delete('/api/lore-entries/lore-to-delete')
      .set('Authorization', validToken)
      .expect(204);
  });
});
