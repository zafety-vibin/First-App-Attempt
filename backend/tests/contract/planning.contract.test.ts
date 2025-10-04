import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { createTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { createTestUser, createTestCampaign } from '../helpers/fixtures';
import { AuthRequest } from '../../src/types/auth';

describe('Planning API Contract Tests', () => {
  let app: express.Application;
  let db: Database.Database;
  let authToken: string;
  let userId: string;
  let campaignId: string;

  beforeAll(async () => {
    // Setup test database
    db = await createTestDatabase();

    // Create test user and campaign
    const user = createTestUser();
    userId = user.id;
    authToken = user.token;

    const campaign = createTestCampaign(userId);
    campaignId = campaign.id;

    // Setup Express app with routes (will be implemented in T048)
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req: AuthRequest, res, next) => {
      req.user = { sub: userId };
      next();
    });

    // Planning routes
    const { planningRouter } = await import('../../src/routes/planning');
    app.use('/api/planning', planningRouter);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe('POST /api/planning/session', () => {
    it('should create a new planning session', async () => {
      const response = await request(app)
        .post('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          initialPrompt: "I'm planning session 13. The party is about to enter the Shadowfell."
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        campaign_id: campaignId,
        status: 'active',
        chat_history: expect.any(Array),
        graph_updates: expect.any(Array),
        created_at: expect.any(Number),
        updated_at: expect.any(Number)
      });

      // Should include the initial prompt in chat history
      expect(response.body.chat_history).toHaveLength(1);
      expect(response.body.chat_history[0]).toMatchObject({
        role: 'user',
        content: expect.stringContaining('session 13')
      });
    });

    it('should create session without initial prompt', async () => {
      const response = await request(app)
        .post('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId
        });

      expect(response.status).toBe(201);
      expect(response.body.chat_history).toHaveLength(0);
    });

    it('should return 404 when campaign not found', async () => {
      const response = await request(app)
        .post('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId: '550e8400-e29b-41d4-a716-446655440999'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when campaignId missing', async () => {
      const response = await request(app)
        .post('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/planning/session', () => {
    beforeEach(async () => {
      // Create multiple test sessions
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/planning/session')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            campaignId,
            initialPrompt: `Planning session ${i + 1}`
          });
      }
    });

    it('should list planning sessions for campaign', async () => {
      const response = await request(app)
        .get('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ campaignId });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        sessions: expect.any(Array),
        total: expect.any(Number)
      });
      expect(response.body.sessions.length).toBeGreaterThan(0);
      expect(response.body.total).toBeGreaterThanOrEqual(5);

      // Should be ordered by creation date (newest first)
      const dates = response.body.sessions.map((s: any) => s.created_at);
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          campaignId,
          status: 'active'
        });

      expect(response.status).toBe(200);
      response.body.sessions.forEach((session: any) => {
        expect(session.status).toBe('active');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          campaignId,
          limit: 2,
          offset: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.sessions.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array when no sessions exist', async () => {
      const newCampaign = createTestCampaign(userId);

      const response = await request(app)
        .get('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ campaignId: newCampaign.id });

      expect(response.status).toBe(200);
      expect(response.body.sessions).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should return 400 when campaignId missing', async () => {
      const response = await request(app)
        .get('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/planning/chat', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a test session
      const response = await request(app)
        .post('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campaignId });

      sessionId = response.body.id;
    });

    it('should send chat message and receive SSE stream', async () => {
      const response = await request(app)
        .post('/api/planning/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream')
        .send({
          sessionId,
          message: 'The party needs to find the portal to escape the Shadowfell'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');

      // Parse SSE response
      const events = response.text.split('\n\n').filter(e => e.startsWith('data:'));
      expect(events.length).toBeGreaterThan(0);

      // Should have both chunk and graph_update events
      const eventTypes = events.map(e => {
        const data = JSON.parse(e.replace('data: ', ''));
        return data.type;
      });

      expect(eventTypes).toContain('chunk');
      expect(eventTypes).toContain('graph_update');
      expect(eventTypes).toContain('done');

      // Check done event
      const lastEvent = JSON.parse(events[events.length - 1].replace('data: ', ''));
      expect(lastEvent.type).toBe('done');
      expect(lastEvent.sessionId).toBe(sessionId);
    });

    it('should immediately update graphs without approval', async () => {
      const response = await request(app)
        .post('/api/planning/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream')
        .send({
          sessionId,
          message: 'Add a new NPC named Shadowkeeper who guards the portal'
        });

      expect(response.status).toBe(200);

      // Parse graph_update events
      const events = response.text.split('\n\n')
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.replace('data: ', '')))
        .filter(e => e.type === 'graph_update');

      expect(events.length).toBeGreaterThan(0);

      // Graph updates should contain the new NPC information
      const updates = events.map(e => e.update);
      expect(updates.some(u =>
        u.node && u.node.name && u.node.name.includes('Shadowkeeper')
      )).toBe(true);
    });

    it('should return 400 when message exceeds max length', async () => {
      const longMessage = 'x'.repeat(5001);

      const response = await request(app)
        .post('/api/planning/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          message: longMessage
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 when session not found', async () => {
      const response = await request(app)
        .post('/api/planning/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: '660e8400-e29b-41d4-a716-446655440999',
          message: 'Test message'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/planning/session/{sessionId}', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a test session with some chat history
      const createResponse = await request(app)
        .post('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId,
          initialPrompt: 'Planning the finale'
        });

      sessionId = createResponse.body.id;

      // Add some chat messages
      await request(app)
        .post('/api/planning/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          message: 'The BBEG needs a dramatic entrance'
        });
    });

    it('should get specific planning session', async () => {
      const response = await request(app)
        .get(`/api/planning/session/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: sessionId,
        campaign_id: campaignId,
        status: 'active',
        chat_history: expect.any(Array),
        graph_updates: expect.any(Array)
      });

      expect(response.body.chat_history.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 404 when session not found', async () => {
      const response = await request(app)
        .get('/api/planning/session/660e8400-e29b-41d4-a716-446655440999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/planning/session/{sessionId}/complete', () => {
    let sessionId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/planning/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campaignId });

      sessionId = response.body.id;
    });

    it('should mark planning session as completed', async () => {
      const response = await request(app)
        .post(`/api/planning/session/${sessionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: sessionId,
        status: 'completed'
      });
    });

    it('should return 404 when session not found', async () => {
      const response = await request(app)
        .post('/api/planning/session/660e8400-e29b-41d4-a716-446655440999/complete')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 when session already completed', async () => {
      // First completion
      await request(app)
        .post(`/api/planning/session/${sessionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      // Second completion attempt
      const response = await request(app)
        .post(`/api/planning/session/${sessionId}/complete`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});