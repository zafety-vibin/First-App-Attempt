/**
 * Contract tests for Locations API
 * Feature 014 - Structured Category Database Foundation
 * These tests MUST fail before implementation (TDD).
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';
const testParentLocationId = 'location-uuid-parent';

describe('GET /api/locations', () => {
  it('should list locations with pagination', async () => {
    const response = await request(app)
      .get('/api/locations')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: expect.any(Object),
    });
  });

  it('should strip dm_secrets in player_view mode', async () => {
    const response = await request(app)
      .get('/api/locations')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    response.body.data.forEach((location: any) => {
      expect(location).not.toHaveProperty('dm_secrets');
    });
  });

  it('should include dm_secrets in dm_view mode', async () => {
    const response = await request(app)
      .get('/api/locations')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    const firstLocation = response.body.data[0];
    if (firstLocation) {
      expect(firstLocation).toHaveProperty('dm_secrets');
    }
  });

  it('should return 401 when not authenticated', async () => {
    await request(app)
      .get('/api/locations')
      .query({ campaign_id: testCampaignId })
      .expect(401);
  });
});

describe('POST /api/locations', () => {
  it('should create location and return 201', async () => {
    const response = await request(app)
      .post('/api/locations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Waterdeep',
        location_type: 'city',
        population: 1500000,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'Waterdeep',
      location_type: 'city',
      population: 1500000,
      notable_npcs: expect.any(Array),
      factions_present: expect.any(Array),
      connected_locations: expect.any(Array),
    });
  });

  it('should create location with parent_location_id', async () => {
    const response = await request(app)
      .post('/api/locations')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Undermountain',
        location_type: 'dungeon',
        parent_location_id: testParentLocationId,
      })
      .expect(201);

    expect(response.body.parent_location_id).toBe(testParentLocationId);
  });

  it('should require name and campaign_id', async () => {
    await request(app)
      .post('/api/locations')
      .set('Authorization', validToken)
      .send({ location_type: 'city' })
      .expect(400);
  });

  it('should return 401 when not authenticated', async () => {
    await request(app)
      .post('/api/locations')
      .send({ campaign_id: testCampaignId, name: 'Test' })
      .expect(401);
  });
});

describe('GET /api/locations/:id', () => {
  it('should return location by ID', async () => {
    const locationId = 'location-uuid-123';

    const response = await request(app)
      .get(`/api/locations/${locationId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toMatchObject({
      id: locationId,
      name: expect.any(String),
      notable_npcs: expect.any(Array),
    });
  });

  it('should strip dm_secrets in player_view mode', async () => {
    const response = await request(app)
      .get('/api/locations/location-uuid-123')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_secrets');
  });

  it('should return 404 for non-existent location', async () => {
    await request(app)
      .get('/api/locations/non-existent')
      .set('Authorization', validToken)
      .expect(404);
  });

  it('should return 401 when not authenticated', async () => {
    await request(app)
      .get('/api/locations/some-uuid')
      .expect(401);
  });
});

describe('PUT /api/locations/:id', () => {
  it('should update location', async () => {
    const locationId = 'location-uuid-123';

    const response = await request(app)
      .put(`/api/locations/${locationId}`)
      .set('Authorization', validToken)
      .send({ name: 'Updated Name', population: 2000000 })
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Updated Name',
      population: 2000000,
    });
  });

  it('should prevent circular parent_location_id reference', async () => {
    const locationId = 'location-uuid-123';

    await request(app)
      .put(`/api/locations/${locationId}`)
      .set('Authorization', validToken)
      .send({ parent_location_id: locationId })
      .expect(400);
  });

  it('should return 404 for non-existent location', async () => {
    await request(app)
      .put('/api/locations/non-existent')
      .set('Authorization', validToken)
      .send({ name: 'Test' })
      .expect(404);
  });

  it('should return 401 when not authenticated', async () => {
    await request(app)
      .put('/api/locations/some-uuid')
      .send({ name: 'Test' })
      .expect(401);
  });
});

describe('DELETE /api/locations/:id', () => {
  it('should delete location and return 204', async () => {
    await request(app)
      .delete('/api/locations/location-to-delete')
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 404 for non-existent location', async () => {
    await request(app)
      .delete('/api/locations/non-existent')
      .set('Authorization', validToken)
      .expect(404);
  });

  it('should return 401 when not authenticated', async () => {
    await request(app)
      .delete('/api/locations/some-uuid')
      .expect(401);
  });
});
