import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { createTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { createTestUser, createTestCampaign } from '../helpers/fixtures';
import { AuthRequest } from '../../src/types/auth';

describe('Import API Contract Tests', () => {
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

    // Setup Express app with routes (will be implemented in T047)
    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req: AuthRequest, res, next) => {
      req.user = { sub: userId };
      next();
    });

    // Import routes
    const { importRouter } = await import('../../src/routes/import');
    app.use('/api/import', importRouter);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe('POST /api/import/session', () => {
    it('should create a new import session', async () => {
      const response = await request(app)
        .post('/api/import/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        campaign_id: campaignId,
        status: 'active',
        created_at: expect.any(Number),
        updated_at: expect.any(Number)
      });
    });

    it('should return 404 when campaign not found', async () => {
      const response = await request(app)
        .post('/api/import/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          campaignId: '550e8400-e29b-41d4-a716-446655440999'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when campaignId missing', async () => {
      const response = await request(app)
        .post('/api/import/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/import/upload', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a test session
      const response = await request(app)
        .post('/api/import/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campaignId });

      sessionId = response.body.id;
    });

    it('should upload file to import session', async () => {
      const response = await request(app)
        .post('/api/import/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .attach('file', Buffer.from('Test content'), {
          filename: 'test-recap.md',
          contentType: 'text/markdown'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        sessionId,
        batchId: expect.any(String),
        status: expect.stringMatching(/^(uploading|processing)$/)
      });
    });

    it('should accept raw text without file', async () => {
      const response = await request(app)
        .post('/api/import/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .field('text', 'Raw session recap text')
        .field('fileName', 'session-12-recap.txt');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        sessionId,
        batchId: expect.any(String),
        status: expect.stringMatching(/^(uploading|processing)$/)
      });
    });

    it('should return 404 when session not found', async () => {
      const response = await request(app)
        .post('/api/import/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', '660e8400-e29b-41d4-a716-446655440999')
        .field('text', 'Test content')
        .field('fileName', 'test.txt');

      expect(response.status).toBe(404);
    });

    it('should return 413 when file too large', async () => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 'x');

      const response = await request(app)
        .post('/api/import/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .attach('file', largeBuffer, {
          filename: 'large-file.pdf',
          contentType: 'application/pdf'
        });

      expect(response.status).toBe(413);
    });
  });

  describe('POST /api/import/chat', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create a test session
      const response = await request(app)
        .post('/api/import/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campaignId });

      sessionId = response.body.id;
    });

    it('should send chat message and receive SSE stream', async () => {
      const response = await request(app)
        .post('/api/import/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream')
        .send({
          sessionId,
          message: 'Extract all NPCs and their relationships'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');

      // Parse SSE response
      const events = response.text.split('\n\n').filter(e => e.startsWith('data:'));
      expect(events.length).toBeGreaterThan(0);

      // Check for done event
      const lastEvent = JSON.parse(events[events.length - 1].replace('data: ', ''));
      expect(lastEvent.type).toBe('done');
      expect(lastEvent.sessionId).toBe(sessionId);
    });

    it('should return 400 when message exceeds max length', async () => {
      const longMessage = 'x'.repeat(5001);

      const response = await request(app)
        .post('/api/import/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          message: longMessage
        });

      expect(response.status).toBe(400);
    });

    it('should return 404 when session not found', async () => {
      const response = await request(app)
        .post('/api/import/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: '660e8400-e29b-41d4-a716-446655440999',
          message: 'Test message'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/import/approval-summary', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create and populate a test session
      const response = await request(app)
        .post('/api/import/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campaignId });

      sessionId = response.body.id;

      // Upload content and trigger AI processing
      await request(app)
        .post('/api/import/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .field('text', 'Test content with NPCs and locations')
        .field('fileName', 'test.txt');

      // Send chat to trigger entity extraction
      await request(app)
        .post('/api/import/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
          message: 'Extract entities'
        });
    });

    it('should get approval summary for import session', async () => {
      const response = await request(app)
        .get('/api/import/approval-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sessionId });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        sessionId,
        entities: expect.any(Array),
        nodes: expect.any(Array),
        edges: expect.any(Array),
        cards: expect.any(Array),
        conflicts: expect.any(Array)
      });
    });

    it('should return 404 when session not found', async () => {
      const response = await request(app)
        .get('/api/import/approval-summary')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sessionId: '660e8400-e29b-41d4-a716-446655440999' });

      expect(response.status).toBe(404);
    });

    it('should return 400 when sessionId missing', async () => {
      const response = await request(app)
        .get('/api/import/approval-summary')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/import/approve', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Create and populate a test session
      const response = await request(app)
        .post('/api/import/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campaignId });

      sessionId = response.body.id;

      // Process some entities
      await request(app)
        .post('/api/import/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .field('text', 'Test content')
        .field('fileName', 'test.txt');
    });

    it('should approve import session', async () => {
      const response = await request(app)
        .post('/api/import/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        sessionId,
        status: 'approved',
        batchId: expect.any(String)
      });
    });

    it('should return 404 when session not found', async () => {
      const response = await request(app)
        .post('/api/import/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId: '660e8400-e29b-41d4-a716-446655440999' });

      expect(response.status).toBe(404);
    });

    it('should return 400 when session already approved', async () => {
      // First approval
      await request(app)
        .post('/api/import/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId });

      // Second approval attempt
      const response = await request(app)
        .post('/api/import/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/import/revert', () => {
    let batchId: string;

    beforeEach(async () => {
      // Create, process, and approve a session to get a batch
      const sessionResponse = await request(app)
        .post('/api/import/session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ campaignId });

      const sessionId = sessionResponse.body.id;

      await request(app)
        .post('/api/import/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('sessionId', sessionId)
        .field('text', 'Test content')
        .field('fileName', 'test.txt');

      const approveResponse = await request(app)
        .post('/api/import/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ sessionId });

      batchId = approveResponse.body.batchId;
    });

    it('should revert import batch', async () => {
      const response = await request(app)
        .post('/api/import/revert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ batchId });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        batchId,
        status: 'reverted',
        deletedCount: {
          nodes: expect.any(Number),
          edges: expect.any(Number),
          cards: expect.any(Number)
        }
      });
    });

    it('should return 404 when batch not found', async () => {
      const response = await request(app)
        .post('/api/import/revert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ batchId: '770e8400-e29b-41d4-a716-446655440999' });

      expect(response.status).toBe(404);
    });

    it('should return 400 when batch already reverted', async () => {
      // First revert
      await request(app)
        .post('/api/import/revert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ batchId });

      // Second revert attempt
      const response = await request(app)
        .post('/api/import/revert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ batchId });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});