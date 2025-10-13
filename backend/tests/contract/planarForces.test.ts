/**
 * Contract tests for Planar Forces API - Feature 014 (TDD)
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';
const testHighPriestId = 'npc-uuid-001';

describe('GET /api/planar-forces', () => {
  it('should list planar forces with pagination', async () => {
    const response = await request(app)
      .get('/api/planar-forces')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: expect.any(Object),
    });
  });

  it('should strip dm_true_nature in player_view mode', async () => {
    const response = await request(app)
      .get('/api/planar-forces')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    response.body.data.forEach((force: any) => {
      expect(force).not.toHaveProperty('dm_true_nature');
    });
  });
});

describe('POST /api/planar-forces', () => {
  it('should create planar force and return 201', async () => {
    const response = await request(app)
      .post('/api/planar-forces')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Bahamut',
        entity_type: 'deity',
        domains: ['Good', 'Protection', 'Nobility'],
        alignment: 'Lawful Good',
        base_of_power: 'Worship',
        high_priest_id: testHighPriestId,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Bahamut',
      entity_type: 'deity',
      domains: ['Good', 'Protection', 'Nobility'],
      allied_entities: expect.any(Array),
      rival_entities: expect.any(Array),
      religious_orders: expect.any(Array),
    });
  });

  it('should validate domains as JSON array', async () => {
    await request(app)
      .post('/api/planar-forces')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Deity',
        domains: 'not an array',
      })
      .expect(400);
  });
});

describe('GET /api/planar-forces/:id', () => {
  it('should return planar force by ID', async () => {
    const response = await request(app)
      .get('/api/planar-forces/force-uuid-123')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('domains');
  });

  it('should strip dm_true_nature in player_view', async () => {
    const response = await request(app)
      .get('/api/planar-forces/force-uuid-123')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_true_nature');
  });
});

describe('PUT /api/planar-forces/:id', () => {
  it('should update planar force', async () => {
    const response = await request(app)
      .put('/api/planar-forces/force-uuid-123')
      .set('Authorization', validToken)
      .send({ base_of_power: 'Ancient Magic' })
      .expect(200);

    expect(response.body.base_of_power).toBe('Ancient Magic');
  });
});

describe('DELETE /api/planar-forces/:id', () => {
  it('should delete planar force and return 204', async () => {
    await request(app)
      .delete('/api/planar-forces/force-to-delete')
      .set('Authorization', validToken)
      .expect(204);
  });
});
