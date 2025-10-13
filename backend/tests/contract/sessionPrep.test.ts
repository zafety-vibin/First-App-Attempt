/**
 * Contract tests for Session Prep API - Feature 014 (TDD)
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';

describe('GET /api/session-prep', () => {
  it('should list session prep entries', async () => {
    const response = await request(app)
      .get('/api/session-prep')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: expect.any(Object),
    });
  });

  it('should only return dm_only entries (player_knowledge always dm_only)', async () => {
    const response = await request(app)
      .get('/api/session-prep')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((prep: any) => {
      expect(prep.player_knowledge).toBe('dm_only');
    });
  });
});

describe('POST /api/session-prep', () => {
  it('should create session prep and return 201', async () => {
    const response = await request(app)
      .post('/api/session-prep')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Session 15 Prep',
        status: 'draft',
        planned_events: 'Party arrives at castle',
        npcs_to_prep: ['npc-uuid-001', 'npc-uuid-002'],
        locations_to_prep: ['location-uuid-001'],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Session 15 Prep',
      is_canon: 0,
      canonical_status: 'hypothetical',
      player_knowledge: 'dm_only',
      npcs_to_prep: expect.any(Array),
      locations_to_prep: expect.any(Array),
      plot_threads: expect.any(Array),
    });
  });

  it('should enforce is_canon=0 and canonical_status=hypothetical', async () => {
    const response = await request(app)
      .post('/api/session-prep')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Prep',
        is_canon: 1, // Attempt to override
        canonical_status: 'canon', // Attempt to override
      })
      .expect(201);

    // Service layer should enforce these values
    expect(response.body.is_canon).toBe(0);
    expect(response.body.canonical_status).toBe('hypothetical');
  });

  it('should validate status enum', async () => {
    await request(app)
      .post('/api/session-prep')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test',
        status: 'invalid_status',
      })
      .expect(400);
  });
});

describe('GET /api/session-prep/:id', () => {
  it('should return session prep by ID', async () => {
    const response = await request(app)
      .get('/api/session-prep/prep-uuid-123')
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body.player_knowledge).toBe('dm_only');
    expect(response.body.is_canon).toBe(0);
  });

  it('should return 404 in player_view (always dm_only)', async () => {
    await request(app)
      .get('/api/session-prep/prep-uuid-123')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(404);
  });
});

describe('PUT /api/session-prep/:id', () => {
  it('should update session prep', async () => {
    const response = await request(app)
      .put('/api/session-prep/prep-uuid-123')
      .set('Authorization', validToken)
      .send({ status: 'ready' })
      .expect(200);

    expect(response.body.status).toBe('ready');
  });

  it('should maintain is_canon=0 even if update attempts to change it', async () => {
    const response = await request(app)
      .put('/api/session-prep/prep-uuid-123')
      .set('Authorization', validToken)
      .send({ is_canon: 1 })
      .expect(200);

    expect(response.body.is_canon).toBe(0);
  });
});

describe('DELETE /api/session-prep/:id', () => {
  it('should delete session prep and return 204', async () => {
    await request(app)
      .delete('/api/session-prep/prep-to-delete')
      .set('Authorization', validToken)
      .expect(204);
  });
});
