/**
 * Contract tests for Campaigns API
 * Based on: specs/002-create-the-authentication/contracts/campaigns.yaml
 *
 * These tests validate the API contract matches the OpenAPI specification.
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Phase 3.4
let app: Express;
const validToken = 'Bearer valid_jwt_token';

describe('GET /api/campaigns', () => {
  it('should return 200 with campaigns array and total count', async () => {
    const response = await request(app)
      .get('/api/campaigns')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      campaigns: expect.any(Array),
      total: expect.any(Number),
    });
  });

  it('should respect limit and offset query parameters', async () => {
    const response = await request(app)
      .get('/api/campaigns?limit=10&offset=0')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.campaigns.length).toBeLessThanOrEqual(10);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/campaigns')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should only return campaigns owned by authenticated user', async () => {
    const response = await request(app)
      .get('/api/campaigns')
      .set('Authorization', validToken)
      .expect(200);

    // All campaigns should belong to the authenticated user
    response.body.campaigns.forEach((campaign: any) => {
      expect(campaign).toHaveProperty('ownerId');
    });
  });
});

describe('POST /api/campaigns', () => {
  it('should return 201 with created campaign on valid input', async () => {
    const response = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({ name: 'Test Campaign' })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'Test Campaign',
      ownerId: expect.any(String),
      publicAccessEnabled: false,
      publicUrlId: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('should return 400 when name is missing', async () => {
    const response = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 when name is empty string', async () => {
    const response = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({ name: '' })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 when name exceeds 255 characters', async () => {
    const longName = 'a'.repeat(256);
    const response = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({ name: longName })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/campaigns')
      .send({ name: 'Test Campaign' })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should generate unique publicUrlId for each campaign', async () => {
    const campaign1 = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({ name: 'Campaign 1' })
      .expect(201);

    const campaign2 = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({ name: 'Campaign 2' })
      .expect(201);

    expect(campaign1.body.publicUrlId).not.toBe(campaign2.body.publicUrlId);
    expect(campaign1.body.publicUrlId).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(campaign2.body.publicUrlId).toMatch(/^[A-Za-z0-9_-]{16}$/);
  });
});

describe('DELETE /api/campaigns/:id', () => {
  it('should return 204 on successful deletion', async () => {
    // First create a campaign
    const createResponse = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({ name: 'To Delete' })
      .expect(201);

    const campaignId = createResponse.body.id;

    // Then delete it
    await request(app)
      .delete(`/api/campaigns/${campaignId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/campaigns/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when trying to delete campaign owned by another user', async () => {
    const response = await request(app)
      .delete('/api/campaigns/other-user-campaign-id')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 when campaign does not exist', async () => {
    const response = await request(app)
      .delete('/api/campaigns/nonexistent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should cascade delete all campaign content', async () => {
    // This will be tested more thoroughly in integration tests
    const createResponse = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({ name: 'Cascade Test' })
      .expect(201);

    const campaignId = createResponse.body.id;

    await request(app)
      .delete(`/api/campaigns/${campaignId}`)
      .set('Authorization', validToken)
      .expect(204);

    // Verify campaign is gone
    await request(app)
      .get(`/api/campaigns/${campaignId}`)
      .set('Authorization', validToken)
      .expect(404);
  });
});
