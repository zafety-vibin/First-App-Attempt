/**
 * Contract tests for Information Levels API
 * Based on: specs/004-create-a-tagging/contracts/information-levels.yaml
 *
 * These tests validate the API contract matches the OpenAPI specification.
 * They MUST fail before implementation (TDD).
 *
 * Tasks: T007, T008, T009, T010
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Phase 3.4
let app: Express;
const validToken = 'Bearer valid_jwt_token';
let testCampaignId: string;
let testCustomLevelId: string;

describe('GET /api/information-levels (T008)', () => {
  it('should return 200 with default + custom levels for campaign', async () => {
    const response = await request(app)
      .get(`/api/information-levels?campaign_id=${testCampaignId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('levels');
    expect(response.body.levels).toBeInstanceOf(Array);
    expect(response.body.levels.length).toBeGreaterThanOrEqual(4); // At least 4 default levels

    // Verify default levels exist
    const defaultLevels = response.body.levels.filter((l: any) => l.type === 'default');
    expect(defaultLevels).toHaveLength(4);
    expect(defaultLevels.map((l: any) => l.id)).toContain('system');
    expect(defaultLevels.map((l: any) => l.id)).toContain('common-knowledge');
    expect(defaultLevels.map((l: any) => l.id)).toContain('player-knowledge');
    expect(defaultLevels.map((l: any) => l.id)).toContain('dm-secret');

    // Verify level structure
    const level = response.body.levels[0];
    expect(level).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      color: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
      hierarchical: expect.any(Boolean),
      type: expect.stringMatching(/^(default|custom)$/),
      campaignId: level.type === 'default' ? null : expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('should require campaign_id query parameter', async () => {
    const response = await request(app)
      .get('/api/information-levels')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get(`/api/information-levels?campaign_id=${testCampaignId}`)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/information-levels (T007)', () => {
  it('should create custom information level and return 201', async () => {
    const response = await request(app)
      .post('/api/information-levels')
      .set('Authorization', validToken)
      .send({
        name: 'Major Spoilers',
        color: '#FF5733',
        hierarchical: true,
        campaign_id: testCampaignId,
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'Major Spoilers',
      color: '#FF5733',
      hierarchical: true,
      type: 'custom',
      campaignId: testCampaignId,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    testCustomLevelId = response.body.id;
  });

  it('should require all required fields', async () => {
    const response = await request(app)
      .post('/api/information-levels')
      .set('Authorization', validToken)
      .send({
        name: 'Incomplete Level',
        // Missing color, hierarchical, campaign_id
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate hex color format', async () => {
    const response = await request(app)
      .post('/api/information-levels')
      .set('Authorization', validToken)
      .send({
        name: 'Invalid Color',
        color: 'not-a-color',
        hierarchical: false,
        campaign_id: testCampaignId,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate name length (max 100 chars)', async () => {
    const response = await request(app)
      .post('/api/information-levels')
      .set('Authorization', validToken)
      .send({
        name: 'a'.repeat(101),
        color: '#FF5733',
        hierarchical: false,
        campaign_id: testCampaignId,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 409 if name already exists', async () => {
    // Create first level
    await request(app)
      .post('/api/information-levels')
      .set('Authorization', validToken)
      .send({
        name: 'Duplicate Test',
        color: '#FF5733',
        hierarchical: false,
        campaign_id: testCampaignId,
      })
      .expect(201);

    // Try to create duplicate
    const response = await request(app)
      .post('/api/information-levels')
      .set('Authorization', validToken)
      .send({
        name: 'Duplicate Test',
        color: '#00FF00',
        hierarchical: false,
        campaign_id: testCampaignId,
      })
      .expect('Content-Type', /json/)
      .expect(409);

    expect(response.body.error).toContain('already exists');
  });

  it('should return 403 for campaign not owned by user', async () => {
    const response = await request(app)
      .post('/api/information-levels')
      .set('Authorization', validToken)
      .send({
        name: 'Forbidden Level',
        color: '#FF5733',
        hierarchical: false,
        campaign_id: 'not-my-campaign-id',
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/information-levels/:id (T009)', () => {
  it('should update custom information level and return 200', async () => {
    const response = await request(app)
      .put(`/api/information-levels/${testCustomLevelId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Spoilers',
        color: '#00FF00',
        hierarchical: false,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: testCustomLevelId,
      name: 'Updated Spoilers',
      color: '#00FF00',
      hierarchical: false,
      type: 'custom',
      updatedAt: expect.any(String),
    });
  });

  it('should allow partial updates', async () => {
    const response = await request(app)
      .put(`/api/information-levels/${testCustomLevelId}`)
      .set('Authorization', validToken)
      .send({
        color: '#0000FF',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.color).toBe('#0000FF');
  });

  it('should return 422 when trying to update default level', async () => {
    const response = await request(app)
      .put('/api/information-levels/system')
      .set('Authorization', validToken)
      .send({
        name: 'Modified System',
      })
      .expect('Content-Type', /json/)
      .expect(422);

    expect(response.body.error).toContain('Cannot modify default');
  });

  it('should validate hex color format on update', async () => {
    const response = await request(app)
      .put(`/api/information-levels/${testCustomLevelId}`)
      .set('Authorization', validToken)
      .send({
        color: 'invalid',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent level', async () => {
    const response = await request(app)
      .put('/api/information-levels/non-existent-id')
      .set('Authorization', validToken)
      .send({
        name: 'Updated',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/information-levels/:id (T010)', () => {
  it('should delete custom level and return reverted_cards_count', async () => {
    const response = await request(app)
      .delete(`/api/information-levels/${testCustomLevelId}?confirm=true`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('reverted_cards_count');
    expect(response.body.reverted_cards_count).toBeGreaterThanOrEqual(0);
    expect(response.body).toHaveProperty('warning');
  });

  it('should require confirm=true query parameter', async () => {
    const response = await request(app)
      .delete(`/api/information-levels/${testCustomLevelId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 422 when trying to delete default level', async () => {
    const response = await request(app)
      .delete('/api/information-levels/system?confirm=true')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(422);

    expect(response.body.error).toContain('Cannot delete default');
  });

  it('should return 404 for non-existent level', async () => {
    const response = await request(app)
      .delete('/api/information-levels/non-existent-id?confirm=true')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });
});
