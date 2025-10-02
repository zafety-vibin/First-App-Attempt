/**
 * Contract tests for Authentication API
 * Based on: specs/002-create-the-authentication/contracts/auth.yaml
 *
 * These tests validate the API contract matches the OpenAPI specification.
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Phase 3.4
let app: Express;

describe('POST /api/auth/login', () => {
  it('should return 200 with user and session on valid token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ token: 'valid_jwt_token_here' })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('session');
    expect(response.body.user).toMatchObject({
      id: expect.any(String),
      username: expect.any(String),
      email: expect.any(String),
      createdAt: expect.any(String),
    });
    expect(response.body.session).toMatchObject({
      sessionId: expect.any(String),
      userId: expect.any(String),
      expiresAt: expect.any(String),
      createdAt: expect.any(String),
    });
  });

  it('should return 401 on invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ token: 'invalid_token' })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 when token is missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/auth/logout', () => {
  it('should return 204 on successful logout with valid token', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer valid_token')
      .expect(204);
  });

  it('should return 401 when no auth token provided', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 on invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer invalid_token')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/auth/validate', () => {
  it('should return 200 with valid=true and user info on valid token', async () => {
    const response = await request(app)
      .get('/api/auth/validate')
      .set('Authorization', 'Bearer valid_token')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      valid: true,
      user: {
        id: expect.any(String),
        username: expect.any(String),
        email: expect.any(String),
        createdAt: expect.any(String),
      },
      expiresAt: expect.any(String),
    });
  });

  it('should return 401 with valid=false on invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/validate')
      .set('Authorization', 'Bearer invalid_token')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toMatchObject({
      valid: false,
      error: expect.any(String),
    });
  });

  it('should return 401 when no auth token provided', async () => {
    const response = await request(app)
      .get('/api/auth/validate')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toMatchObject({
      valid: false,
      error: expect.any(String),
    });
  });
});
