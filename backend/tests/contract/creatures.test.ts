/**
 * Contract tests for Creatures API - Feature 014 (TDD)
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';

describe('GET /api/creatures', () => {
  it('should list creatures with pagination', async () => {
    const response = await request(app)
      .get('/api/creatures')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: expect.any(Object),
    });
  });

  it('should strip dm_behavior_notes in player_view', async () => {
    const response = await request(app)
      .get('/api/creatures')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    response.body.data.forEach((creature: any) => {
      expect(creature).not.toHaveProperty('dm_behavior_notes');
    });
  });
});

describe('POST /api/creatures', () => {
  it('should create creature and return 201', async () => {
    const response = await request(app)
      .post('/api/creatures')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Ancient Red Dragon',
        creature_type: 'dragon',
        challenge_rating: '24',
        abilities: 'Fire Breath, Legendary Resistance, Frightful Presence',
        habitats: ['location-uuid-001', 'location-uuid-002'],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Ancient Red Dragon',
      creature_type: 'dragon',
      challenge_rating: '24',
      habitats: expect.any(Array),
    });
  });

  it('should validate habitats as JSON array', async () => {
    await request(app)
      .post('/api/creatures')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Creature',
        habitats: 'not an array',
      })
      .expect(400);
  });
});

describe('GET /api/creatures/:id', () => {
  it('should return creature by ID', async () => {
    const response = await request(app)
      .get('/api/creatures/creature-uuid-123')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('habitats');
  });

  it('should strip dm_behavior_notes in player_view', async () => {
    const response = await request(app)
      .get('/api/creatures/creature-uuid-123')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_behavior_notes');
  });
});

describe('PUT /api/creatures/:id', () => {
  it('should update creature', async () => {
    const response = await request(app)
      .put('/api/creatures/creature-uuid-123')
      .set('Authorization', validToken)
      .send({ challenge_rating: '25' })
      .expect(200);

    expect(response.body.challenge_rating).toBe('25');
  });
});

describe('DELETE /api/creatures/:id', () => {
  it('should delete creature and return 204', async () => {
    await request(app)
      .delete('/api/creatures/creature-to-delete')
      .set('Authorization', validToken)
      .expect(204);
  });
});
