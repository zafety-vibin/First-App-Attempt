/**
 * Contract Tests: Campaign Setup Wizard API
 * Feature: 016-create-a-campaign
 *
 * Tests for wizard endpoints (T001-T003)
 * These tests MUST FAIL initially - endpoints don't exist yet
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/server';
import { db } from '../../src/services/DatabaseService';

describe('Campaign Wizard API - Contract Tests', () => {
  let testCampaignId: string;
  let testUserId: string;
  let testToken: string;

  beforeAll(async () => {
    // Setup test data
    testUserId = 'test-wizard-user';
    testToken = 'test-wizard-token';

    // Create test user
    db.prepare(`
      INSERT INTO users (user_id, username, email)
      VALUES (?, ?, ?)
    `).run(testUserId, 'wizardtest', 'wizard@test.com');

    // Create test campaign
    const campaignResult = db.prepare(`
      INSERT INTO campaigns (id, name, owner_id)
      VALUES (?, ?, ?)
      RETURNING id
    `).get('test-campaign-wizard', 'Test Wizard Campaign', testUserId) as any;

    testCampaignId = campaignResult.id;

    // Create test session
    db.prepare(`
      INSERT INTO sessions (session_id, user_id, access_token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run('test-session-wizard', testUserId, testToken, Date.now() + 3600000);
  });

  afterAll(() => {
    // Cleanup
    db.prepare('DELETE FROM sessions WHERE session_id = ?').run('test-session-wizard');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
    db.prepare('DELETE FROM users WHERE user_id = ?').run(testUserId);
  });

  // T001: GET /wizard/status contract tests
  describe('GET /api/campaigns/:id/wizard/status', () => {
    it('should return shouldShowWizard=true when no settings exist', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/wizard/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('shouldShowWizard');
      expect(response.body.shouldShowWizard).toBe(true);
      expect(response.body.existingSettings).toBeNull();
    });

    it('should return shouldShowWizard=false when settings exist', async () => {
      // Create campaign settings
      db.prepare(`
        INSERT INTO campaign_settings (campaign_id, theme, category_labels, enabled_categories)
        VALUES (?, ?, ?, ?)
      `).run(
        testCampaignId,
        'high_fantasy',
        JSON.stringify({ npcs: 'Characters' }),
        JSON.stringify(['npcs'])
      );

      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/wizard/status`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.shouldShowWizard).toBe(false);
      expect(response.body.existingSettings).not.toBeNull();
      expect(response.body.existingSettings.theme).toBe('high_fantasy');

      // Cleanup
      db.prepare('DELETE FROM campaign_settings WHERE campaign_id = ?').run(testCampaignId);
    });

    it('should return 401 unauthorized without auth token', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/wizard/status`);

      expect(response.status).toBe(401);
    });

    it('should return 403 forbidden if user does not own campaign', async () => {
      // Create another user
      const otherUserId = 'other-user';
      db.prepare(`INSERT INTO users (user_id, username, email) VALUES (?, ?, ?)`).run(otherUserId, 'other', 'other@test.com');
      db.prepare(`INSERT INTO sessions (session_id, user_id, access_token, expires_at) VALUES (?, ?, ?, ?)`).run('other-session', otherUserId, 'other-token', Date.now() + 3600000);

      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/wizard/status`)
        .set('Authorization', 'Bearer other-token');

      expect(response.status).toBe(403);

      // Cleanup
      db.prepare('DELETE FROM sessions WHERE session_id = ?').run('other-session');
      db.prepare('DELETE FROM users WHERE user_id = ?').run(otherUserId);
    });

    it('should return 404 if campaign not found', async () => {
      const response = await request(app)
        .get('/api/campaigns/nonexistent-campaign/wizard/status')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });
  });

  // T002: GET /wizard/themes contract tests
  describe('GET /api/campaigns/:id/wizard/themes', () => {
    it('should return 5 theme descriptors with correct structure', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/wizard/themes`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('themes');
      expect(response.body.themes).toHaveLength(5);

      const theme = response.body.themes[0];
      expect(theme).toHaveProperty('id');
      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('description');
      expect(theme).toHaveProperty('labels');
      expect(theme).toHaveProperty('previewCategories');
      expect(theme.labels).toHaveProperty('npcs');
      expect(Array.isArray(theme.previewCategories)).toBe(true);
    });

    it('should include all 5 expected themes', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/wizard/themes`)
        .set('Authorization', `Bearer ${testToken}`);

      const themeIds = response.body.themes.map((t: any) => t.id);
      expect(themeIds).toContain('high_fantasy');
      expect(themeIds).toContain('cyberpunk');
      expect(themeIds).toContain('sci_fi');
      expect(themeIds).toContain('modern');
      expect(themeIds).toContain('custom');
    });

    it('should return 401 unauthorized without auth token', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/wizard/themes`);

      expect(response.status).toBe(401);
    });

    it('should return 403 forbidden if user does not own campaign', async () => {
      const otherUserId = 'other-user-themes';
      db.prepare(`INSERT INTO users (user_id, username, email) VALUES (?, ?, ?)`).run(otherUserId, 'otherthemes', 'otherthemes@test.com');
      db.prepare(`INSERT INTO sessions (session_id, user_id, access_token, expires_at) VALUES (?, ?, ?, ?)`).run('other-session-themes', otherUserId, 'other-token-themes', Date.now() + 3600000);

      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/wizard/themes`)
        .set('Authorization', 'Bearer other-token-themes');

      expect(response.status).toBe(403);

      // Cleanup
      db.prepare('DELETE FROM sessions WHERE session_id = ?').run('other-session-themes');
      db.prepare('DELETE FROM users WHERE user_id = ?').run(otherUserId);
    });
  });

  // T003: POST /wizard/complete contract tests
  describe('POST /api/campaigns/:id/wizard/complete', () => {
    it('should create settings + graph + world rules when worldFoundationsAnswers provided', async () => {
      const requestBody = {
        theme: 'high_fantasy',
        categoryLabels: {
          npcs: 'Characters',
          locations: 'Realms',
          factions: 'Kingdoms',
          planar_forces: 'Pantheon',
          items: 'Artifacts',
          creatures: 'Beasts',
          lore: 'Lore',
          world_rules: 'World Rules',
          session_prep: 'Session Prep',
          session_recaps: 'Session Recaps',
          quests: 'Quests',
          player_characters: 'Player Characters',
          custom_mechanics: 'Custom Mechanics'
        },
        enabledCategories: ['npcs', 'locations', 'factions', 'planar_forces', 'items', 'creatures', 'lore', 'world_rules', 'session_prep', 'session_recaps', 'quests', 'player_characters', 'custom_mechanics'],
        worldFoundationsAnswers: [
          { questionId: 1, answer: 'Magic flows through ley lines' },
          { questionId: 2, answer: 'Medieval / Renaissance' }
        ]
      };

      const response = await request(app)
        .post(`/api/campaigns/${testCampaignId}/wizard/complete`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(requestBody);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.settings).toBeDefined();
      expect(response.body.worldFoundationsGraph).toBeDefined();
      expect(response.body.worldRulesCreated).toBe(2);

      // Cleanup
      db.prepare('DELETE FROM campaign_settings WHERE campaign_id = ?').run(testCampaignId);
      db.prepare('DELETE FROM knowledge_graphs WHERE campaign_id = ? AND graph_type = ?').run(testCampaignId, 'World-Foundations');
      db.prepare('DELETE FROM world_rules WHERE campaign_id = ?').run(testCampaignId);
    });

    it('should create settings only when no worldFoundationsAnswers', async () => {
      const requestBody = {
        theme: 'cyberpunk',
        categoryLabels: { npcs: 'NPCs', locations: 'Districts' /* abbreviated */ },
        enabledCategories: ['npcs', 'locations', 'factions', 'lore', 'world_rules', 'session_prep', 'session_recaps', 'quests', 'player_characters', 'custom_mechanics', 'items']
      };

      const response = await request(app)
        .post(`/api/campaigns/${testCampaignId}/wizard/complete`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(requestBody);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.worldFoundationsGraph).toBeUndefined();
      expect(response.body.worldRulesCreated).toBe(0);

      // Cleanup
      db.prepare('DELETE FROM campaign_settings WHERE campaign_id = ?').run(testCampaignId);
    });

    it('should return 400 for invalid theme', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaignId}/wizard/complete`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ theme: 'invalid_theme', categoryLabels: {}, enabledCategories: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 409 if wizard already completed', async () => {
      // Create settings
      db.prepare(`INSERT INTO campaign_settings (campaign_id, theme, category_labels, enabled_categories) VALUES (?, ?, ?, ?)`).run(testCampaignId, 'modern', '{}', '[]');

      const requestBody = {
        theme: 'sci_fi',
        categoryLabels: {},
        enabledCategories: []
      };

      const response = await request(app)
        .post(`/api/campaigns/${testCampaignId}/wizard/complete`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(requestBody);

      expect(response.status).toBe(409);

      // Cleanup
      db.prepare('DELETE FROM campaign_settings WHERE campaign_id = ?').run(testCampaignId);
    });

    it('should return 401 unauthorized without auth token', async () => {
      const response = await request(app)
        .post(`/api/campaigns/${testCampaignId}/wizard/complete`)
        .send({ theme: 'modern', categoryLabels: {}, enabledCategories: [] });

      expect(response.status).toBe(401);
    });
  });
});
