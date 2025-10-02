/**
 * Contract tests for Settings API
 * Based on: specs/003-create-a-notion/contracts/settings.yaml
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

describe('POST /api/settings', () => {
  it('should create setting and return 201 with Setting object', async () => {
    const response = await request(app)
      .post('/api/settings')
      .set('Authorization', validToken)
      .send({
        name: 'Forgotten Realms',
        description: 'High fantasy setting with magic',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      ownerId: expect.any(String),
      name: 'Forgotten Realms',
      description: 'High fantasy setting with magic',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('should require name field', async () => {
    const response = await request(app)
      .post('/api/settings')
      .set('Authorization', validToken)
      .send({
        description: 'Missing name',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should allow null description', async () => {
    const response = await request(app)
      .post('/api/settings')
      .set('Authorization', validToken)
      .send({
        name: 'Test Setting',
        description: null,
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.description).toBeNull();
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/settings')
      .send({
        name: 'Test Setting',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/settings', () => {
  it('should return 200 with settings array', async () => {
    const response = await request(app)
      .get('/api/settings')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      settings: expect.any(Array),
    });
  });

  it('should only return settings owned by authenticated user', async () => {
    const response = await request(app)
      .get('/api/settings')
      .set('Authorization', validToken)
      .expect(200);

    // All returned settings should belong to the authenticated user
    response.body.settings.forEach((setting: any) => {
      expect(setting).toHaveProperty('ownerId');
    });
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/settings')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/settings/:id', () => {
  it('should return 200 with Setting object', async () => {
    const settingId = 'valid-uuid';

    const response = await request(app)
      .get(`/api/settings/${settingId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: settingId,
      ownerId: expect.any(String),
      name: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('should return 404 for non-existent setting', async () => {
    const response = await request(app)
      .get('/api/settings/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when accessing setting owned by another user', async () => {
    const otherUserSettingId = 'other-user-setting-uuid';

    const response = await request(app)
      .get(`/api/settings/${otherUserSettingId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/settings/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/settings/:id', () => {
  it('should update setting and return 200 with updated Setting object', async () => {
    const settingId = 'valid-uuid';

    const response = await request(app)
      .put(`/api/settings/${settingId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Name',
        description: 'Updated description',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: settingId,
      name: 'Updated Name',
      description: 'Updated description',
      updatedAt: expect.any(String),
    });
  });

  it('should allow partial updates', async () => {
    const settingId = 'valid-uuid';

    const response = await request(app)
      .put(`/api/settings/${settingId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Only Name Updated',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.name).toBe('Only Name Updated');
  });

  it('should return 404 for non-existent setting', async () => {
    const response = await request(app)
      .put('/api/settings/non-existent-uuid')
      .set('Authorization', validToken)
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when updating setting owned by another user', async () => {
    const otherUserSettingId = 'other-user-setting-uuid';

    const response = await request(app)
      .put(`/api/settings/${otherUserSettingId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Attempted Update',
      })
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .put('/api/settings/some-uuid')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/settings/:id', () => {
  it('should delete setting and return 200 with deleted counts', async () => {
    const settingId = 'valid-uuid';

    const response = await request(app)
      .delete(`/api/settings/${settingId}?confirm=true`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      deleted_campaigns: expect.any(Number),
      deleted_cards: expect.any(Number),
    });
  });

  it('should require confirm=true query parameter', async () => {
    const settingId = 'valid-uuid';

    const response = await request(app)
      .delete(`/api/settings/${settingId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent setting', async () => {
    const response = await request(app)
      .delete('/api/settings/non-existent-uuid?confirm=true')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when deleting setting owned by another user', async () => {
    const otherUserSettingId = 'other-user-setting-uuid';

    const response = await request(app)
      .delete(`/api/settings/${otherUserSettingId}?confirm=true`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/settings/some-uuid?confirm=true')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/settings/:id/campaigns', () => {
  it('should return 200 with campaigns array', async () => {
    const settingId = 'valid-uuid';

    const response = await request(app)
      .get(`/api/settings/${settingId}/campaigns`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      campaigns: expect.any(Array),
    });
  });

  it('should return 404 for non-existent setting', async () => {
    const response = await request(app)
      .get('/api/settings/non-existent-uuid/campaigns')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when accessing setting owned by another user', async () => {
    const otherUserSettingId = 'other-user-setting-uuid';

    const response = await request(app)
      .get(`/api/settings/${otherUserSettingId}/campaigns`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/settings/some-uuid/campaigns')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});
