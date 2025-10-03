/**
 * BYOLLM Configuration API Contract Tests
 * Feature: 008-create-byollm-configuration
 *
 * Tests API endpoints against OpenAPI spec (contracts/byollm.yaml)
 *
 * IMPORTANT: These tests MUST FAIL until implementation is complete (TDD)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/server';
import { db } from '../../src/services/DatabaseService';

describe('BYOLLM Configuration API Contract Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testCampaignId: string;

  beforeAll(async () => {
    // Setup: Create test user and campaign
    testUserId = 'test-user-byollm';
    testCampaignId = 'test-campaign-byollm';

    // Insert test user
    db.prepare(`
      INSERT OR REPLACE INTO users (user_id, username, email, created_at)
      VALUES (?, ?, ?, strftime('%s', 'now'))
    `).run(testUserId, 'test-byollm-user', 'test-byollm@example.com');

    // Insert test campaign
    db.prepare(`
      INSERT OR REPLACE INTO campaigns (id, owner_id, name, created_at, updated_at)
      VALUES (?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
    `).run(testCampaignId, testUserId, 'Test BYOLLM Campaign');

    // Create test session token
    const sessionId = 'test-session-byollm';
    const accessToken = 'test-token-byollm';

    db.prepare(`
      INSERT OR REPLACE INTO sessions (session_id, user_id, access_token, refresh_token, expires_at, created_at)
      VALUES (?, ?, ?, ?, strftime('%s', 'now') + 3600, strftime('%s', 'now'))
    `).run(sessionId, testUserId, accessToken, null);

    authToken = accessToken;
  });

  afterAll(() => {
    // Cleanup: Remove test data
    db.prepare('DELETE FROM byollm_configs WHERE campaign_id = ? OR scope = ?').run(testCampaignId, 'global');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE user_id = ?').run(testUserId);
  });

  // T009: Contract test POST /api/byollm/oauth/initiate
  describe('POST /api/byollm/oauth/initiate', () => {
    it('should initiate OAuth flow for Anthropic with global scope', async () => {
      const response = await request(app)
        .post('/api/byollm/oauth/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'anthropic',
          scope: 'global',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authorization_url');
      expect(response.body).toHaveProperty('state');
      expect(response.body.authorization_url).toContain('console.anthropic.com');
    });

    it('should initiate OAuth flow for Anthropic with campaign scope', async () => {
      const response = await request(app)
        .post('/api/byollm/oauth/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'anthropic',
          scope: 'campaign',
          campaign_id: testCampaignId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authorization_url');
      expect(response.body).toHaveProperty('state');
    });

    it('should return 400 for missing provider', async () => {
      const response = await request(app)
        .post('/api/byollm/oauth/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scope: 'global',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for campaign scope without campaign_id', async () => {
      const response = await request(app)
        .post('/api/byollm/oauth/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'anthropic',
          scope: 'campaign',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/byollm/oauth/initiate')
        .send({
          provider: 'anthropic',
          scope: 'global',
        });

      expect(response.status).toBe(401);
    });
  });

  // T010: Contract test GET /api/byollm/oauth/callback
  describe('GET /api/byollm/oauth/callback', () => {
    it('should handle valid OAuth callback and redirect', async () => {
      // First, initiate OAuth to get a valid state
      const initiateResponse = await request(app)
        .post('/api/byollm/oauth/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'anthropic',
          scope: 'global',
        });

      const { state } = initiateResponse.body;

      // Simulate OAuth callback
      const response = await request(app)
        .get('/api/byollm/oauth/callback')
        .query({
          code: 'test-auth-code',
          state: state,
        });

      // Should redirect to settings page
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/settings');
    });

    it('should return 400 for invalid state (CSRF protection)', async () => {
      const response = await request(app)
        .get('/api/byollm/oauth/callback')
        .query({
          code: 'test-auth-code',
          state: 'invalid-state-csrf-fail',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing code', async () => {
      const response = await request(app)
        .get('/api/byollm/oauth/callback')
        .query({
          state: 'some-state',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  // T011: Contract test POST /api/byollm/config
  describe('POST /api/byollm/config', () => {
    it('should create global BYOLLM config with API key (Anthropic)', async () => {
      const response = await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' })
        .send({
          provider: 'anthropic',
          auth_method: 'api_key',
          credentials: {
            api_key: 'sk-ant-test-key-123',
          },
          model_name: 'claude-3-5-sonnet-20241022',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.scope).toBe('global');
      expect(response.body.provider).toBe('anthropic');
      expect(response.body.auth_method).toBe('api_key');
      expect(response.body.model_name).toBe('claude-3-5-sonnet-20241022');
      // Credentials should NOT be in response (encrypted in DB)
      expect(response.body).not.toHaveProperty('credentials');
      expect(response.body).not.toHaveProperty('encrypted_credentials');
    });

    it('should create per-campaign BYOLLM config', async () => {
      const response = await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'campaign', campaign_id: testCampaignId })
        .send({
          provider: 'anthropic',
          auth_method: 'api_key',
          credentials: {
            api_key: 'sk-ant-campaign-key-456',
          },
          model_name: 'claude-3-5-sonnet-20241022',
        });

      expect(response.status).toBe(201);
      expect(response.body.scope).toBe('campaign');
      expect(response.body.campaign_id).toBe(testCampaignId);
    });

    it('should update existing config (upsert behavior)', async () => {
      // Create initial config
      await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' })
        .send({
          provider: 'anthropic',
          auth_method: 'api_key',
          credentials: { api_key: 'sk-ant-old-key' },
          model_name: 'claude-3-haiku-20240307',
        });

      // Update with new model
      const response = await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' })
        .send({
          provider: 'anthropic',
          auth_method: 'api_key',
          credentials: { api_key: 'sk-ant-new-key' },
          model_name: 'claude-3-5-sonnet-20241022',
        });

      expect(response.status).toBe(200); // 200 for update
      expect(response.body.model_name).toBe('claude-3-5-sonnet-20241022');
    });

    it('should validate custom endpoint requires custom_endpoint_url', async () => {
      const response = await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' })
        .send({
          provider: 'custom',
          auth_method: 'api_key',
          credentials: { api_key: '' },
          model_name: 'llama-3-8b',
          // Missing custom_endpoint_url
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('custom_endpoint_url');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/byollm/config')
        .query({ scope: 'global' })
        .send({
          provider: 'anthropic',
          auth_method: 'api_key',
          credentials: { api_key: 'sk-ant-test' },
          model_name: 'claude-3-5-sonnet-20241022',
        });

      expect(response.status).toBe(401);
    });
  });

  // T012: Contract test GET /api/byollm/config
  describe('GET /api/byollm/config', () => {
    beforeAll(async () => {
      // Create global config for retrieval tests
      await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' })
        .send({
          provider: 'anthropic',
          auth_method: 'api_key',
          credentials: { api_key: 'sk-ant-get-test' },
          model_name: 'claude-3-5-sonnet-20241022',
        });
    });

    it('should retrieve global BYOLLM config', async () => {
      const response = await request(app)
        .get('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' });

      expect(response.status).toBe(200);
      expect(response.body.scope).toBe('global');
      expect(response.body.provider).toBe('anthropic');
      expect(response.body.model_name).toBe('claude-3-5-sonnet-20241022');
    });

    it('should retrieve per-campaign config (campaign overrides global)', async () => {
      // Create campaign-specific config
      await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'campaign', campaign_id: testCampaignId })
        .send({
          provider: 'custom',
          auth_method: 'api_key',
          credentials: { api_key: '' },
          model_name: 'llama-3-8b',
          custom_endpoint_url: 'http://localhost:11434',
        });

      // Get campaign config - should return campaign-specific, NOT global
      const response = await request(app)
        .get('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'campaign', campaign_id: testCampaignId });

      expect(response.status).toBe(200);
      expect(response.body.scope).toBe('campaign');
      expect(response.body.provider).toBe('custom');
      expect(response.body.model_name).toBe('llama-3-8b');
    });

    it('should fallback to global if no campaign config exists', async () => {
      const nonExistentCampaignId = 'campaign-no-config';

      // Create campaign without config
      db.prepare(`
        INSERT OR REPLACE INTO campaigns (id, owner_id, name, created_at, updated_at)
        VALUES (?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))
      `).run(nonExistentCampaignId, testUserId, 'No Config Campaign');

      const response = await request(app)
        .get('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'campaign', campaign_id: nonExistentCampaignId });

      // Should return global config as fallback
      expect(response.status).toBe(200);
      expect(response.body.scope).toBe('global');

      // Cleanup
      db.prepare('DELETE FROM campaigns WHERE id = ?').run(nonExistentCampaignId);
    });

    it('should return 404 if no global config exists', async () => {
      // Delete global config
      db.prepare('DELETE FROM byollm_configs WHERE scope = ?').run('global');

      const response = await request(app)
        .get('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('No configuration found');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/byollm/config')
        .query({ scope: 'global' });

      expect(response.status).toBe(401);
    });
  });

  // T013: Contract test POST /api/byollm/test-connection (MCP validation)
  describe('POST /api/byollm/test-connection', () => {
    beforeAll(async () => {
      // Create valid config for connection tests
      await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' })
        .send({
          provider: 'anthropic',
          auth_method: 'api_key',
          credentials: { api_key: 'sk-ant-connection-test' },
          model_name: 'claude-3-5-sonnet-20241022',
        });
    });

    it('should test connection and validate MCP bulk operations', async () => {
      const response = await request(app)
        .post('/api/byollm/test-connection')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');

      if (response.body.success) {
        expect(response.body.details).toHaveProperty('provider');
        expect(response.body.details).toHaveProperty('model_name');
        expect(response.body.details).toHaveProperty('context_window');
      }
    });

    it('should return 404 if no config exists', async () => {
      db.prepare('DELETE FROM byollm_configs WHERE scope = ?').run('global');

      const response = await request(app)
        .post('/api/byollm/test-connection')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('No configuration found');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/byollm/test-connection')
        .query({ scope: 'global' });

      expect(response.status).toBe(401);
    });
  });

  // T014: Contract test GET /api/byollm/credits
  describe('GET /api/byollm/credits', () => {
    beforeAll(async () => {
      // Create config for credits tests
      await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' })
        .send({
          provider: 'anthropic',
          auth_method: 'api_key',
          credentials: { api_key: 'sk-ant-credits-test' },
          model_name: 'claude-3-5-sonnet-20241022',
        });
    });

    it('should fetch credits from Anthropic API', async () => {
      const response = await request(app)
        .get('/api/byollm/credits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('currency');
      expect(response.body).toHaveProperty('organization_name');
      expect(response.body).toHaveProperty('last_fetched_at');
      expect(typeof response.body.balance).toBe('number');
    });

    it('should cache credits for 5 minutes', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/byollm/credits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' });

      const lastFetched1 = response1.body.last_fetched_at;

      // Second request immediately after
      const response2 = await request(app)
        .get('/api/byollm/credits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' });

      const lastFetched2 = response2.body.last_fetched_at;

      // Should return cached value (same timestamp)
      expect(lastFetched2).toBe(lastFetched1);
    });

    it('should return 400 for custom endpoint (no credits)', async () => {
      // Create custom endpoint config
      await request(app)
        .post('/api/byollm/config')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' })
        .send({
          provider: 'custom',
          auth_method: 'api_key',
          credentials: { api_key: '' },
          model_name: 'llama-3-8b',
          custom_endpoint_url: 'http://localhost:11434',
        });

      const response = await request(app)
        .get('/api/byollm/credits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Custom endpoint does not have credits');
    });

    it('should return 404 if no config exists', async () => {
      db.prepare('DELETE FROM byollm_configs WHERE scope = ?').run('global');

      const response = await request(app)
        .get('/api/byollm/credits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ scope: 'global' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/byollm/credits')
        .query({ scope: 'global' });

      expect(response.status).toBe(401);
    });
  });
});
