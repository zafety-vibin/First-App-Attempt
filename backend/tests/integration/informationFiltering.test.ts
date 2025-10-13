/**
 * Information Filtering Integration Test
 * Feature: 014-create-the-database
 * Task: T059
 *
 * End-to-end test for information level filtering with X-View-Mode header.
 * Tests NPCs with different player_knowledge levels and dm_* field stripping.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { DatabaseService } from '../../src/services/DatabaseService';

let app: Express;
let db: DatabaseService;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-filtering-001';
const testUserId = 'user-filtering-001';

// NPC IDs
const commonNpcId = 'npc-common-001';
const playerNpcId = 'npc-player-001';
const dmNpcId = 'npc-dm-001';
const nullNpcId = 'npc-null-001';

describe('Information Filtering Integration Test', () => {
  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.init();

    // Create test user
    await db.run('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [
      testUserId,
      'filtertest',
      'filtertest@example.com',
    ]);

    // Create test campaign
    await db.run('INSERT INTO campaigns (id, name, user_id) VALUES (?, ?, ?)', [
      testCampaignId,
      'Filter Test Campaign',
      testUserId,
    ]);

    // Create NPCs with different player_knowledge levels
    await db.run(
      `INSERT INTO npcs (id, campaign_id, name, player_knowledge, dm_secrets, dm_plot_relevance)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [commonNpcId, testCampaignId, 'Common NPC', 'common_knowledge', 'Secret A', 'Plot A']
    );

    await db.run(
      `INSERT INTO npcs (id, campaign_id, name, player_knowledge, dm_secrets, dm_plot_relevance)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [playerNpcId, testCampaignId, 'Player NPC', 'player_knowledge', 'Secret B', 'Plot B']
    );

    await db.run(
      `INSERT INTO npcs (id, campaign_id, name, player_knowledge, dm_secrets, dm_plot_relevance)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dmNpcId, testCampaignId, 'DM Only NPC', 'dm_only', 'Secret C', 'Plot C']
    );

    await db.run(
      `INSERT INTO npcs (id, campaign_id, name, player_knowledge, dm_secrets, dm_plot_relevance)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nullNpcId, testCampaignId, 'Null NPC', null, 'Secret D', 'Plot D']
    );
  });

  afterAll(async () => {
    // Cleanup
    await db.run('DELETE FROM npcs WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM campaigns WHERE id = ?', [testCampaignId]);
    await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    await db.close();
  });

  describe('DM View Mode', () => {
    it('should return all NPCs regardless of player_knowledge', async () => {
      const response = await request(app)
        .get('/api/npcs')
        .query({ campaign_id: testCampaignId })
        .set('Authorization', validToken)
        .set('X-View-Mode', 'dm_view')
        .expect(200);

      expect(response.body.data).toHaveLength(4);
      const npcNames = response.body.data.map((n: any) => n.name);
      expect(npcNames).toContain('Common NPC');
      expect(npcNames).toContain('Player NPC');
      expect(npcNames).toContain('DM Only NPC');
      expect(npcNames).toContain('Null NPC');
    });

    it('should include dm_* fields in dm_view mode', async () => {
      const response = await request(app)
        .get(`/api/npcs/${commonNpcId}`)
        .set('Authorization', validToken)
        .set('X-View-Mode', 'dm_view')
        .expect(200);

      expect(response.body).toHaveProperty('dm_secrets', 'Secret A');
      expect(response.body).toHaveProperty('dm_plot_relevance', 'Plot A');
    });
  });

  describe('Player View Mode', () => {
    it('should filter out dm_only NPCs', async () => {
      const response = await request(app)
        .get('/api/npcs')
        .query({ campaign_id: testCampaignId })
        .set('Authorization', validToken)
        .set('X-View-Mode', 'player_view')
        .expect(200);

      expect(response.body.data).toHaveLength(3); // No dm_only NPC
      const npcNames = response.body.data.map((n: any) => n.name);
      expect(npcNames).toContain('Common NPC');
      expect(npcNames).toContain('Player NPC');
      expect(npcNames).toContain('Null NPC');
      expect(npcNames).not.toContain('DM Only NPC');
    });

    it('should strip dm_* fields from common_knowledge NPC', async () => {
      const response = await request(app)
        .get(`/api/npcs/${commonNpcId}`)
        .set('Authorization', validToken)
        .set('X-View-Mode', 'player_view')
        .expect(200);

      expect(response.body).not.toHaveProperty('dm_secrets');
      expect(response.body).not.toHaveProperty('dm_plot_relevance');
      expect(response.body.name).toBe('Common NPC');
      expect(response.body.player_knowledge).toBe('common_knowledge');
    });

    it('should strip dm_* fields from player_knowledge NPC', async () => {
      const response = await request(app)
        .get(`/api/npcs/${playerNpcId}`)
        .set('Authorization', validToken)
        .set('X-View-Mode', 'player_view')
        .expect(200);

      expect(response.body).not.toHaveProperty('dm_secrets');
      expect(response.body).not.toHaveProperty('dm_plot_relevance');
      expect(response.body.name).toBe('Player NPC');
      expect(response.body.player_knowledge).toBe('player_knowledge');
    });

    it('should strip dm_* fields from null player_knowledge NPC', async () => {
      const response = await request(app)
        .get(`/api/npcs/${nullNpcId}`)
        .set('Authorization', validToken)
        .set('X-View-Mode', 'player_view')
        .expect(200);

      expect(response.body).not.toHaveProperty('dm_secrets');
      expect(response.body).not.toHaveProperty('dm_plot_relevance');
      expect(response.body.name).toBe('Null NPC');
      expect(response.body.player_knowledge).toBeNull();
    });

    it('should return 404 for dm_only NPC (not reveal existence)', async () => {
      await request(app)
        .get(`/api/npcs/${dmNpcId}`)
        .set('Authorization', validToken)
        .set('X-View-Mode', 'player_view')
        .expect(404);
    });
  });

  describe('Default Behavior', () => {
    it('should default to dm_view when X-View-Mode header omitted', async () => {
      const response = await request(app)
        .get('/api/npcs')
        .query({ campaign_id: testCampaignId })
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body.data).toHaveLength(4); // All NPCs
      expect(response.body.data[0]).toHaveProperty('dm_secrets'); // DM fields included
    });
  });

  describe('Filtering Across Multiple Categories', () => {
    it('should filter locations in player_view mode', async () => {
      // Create test locations
      await db.run(
        `INSERT INTO locations (id, campaign_id, name, player_knowledge, dm_secrets)
         VALUES (?, ?, ?, ?, ?)`,
        ['loc-dm-001', testCampaignId, 'Secret Location', 'dm_only', 'Hidden treasure']
      );

      await db.run(
        `INSERT INTO locations (id, campaign_id, name, player_knowledge, dm_secrets)
         VALUES (?, ?, ?, ?, ?)`,
        ['loc-common-001', testCampaignId, 'Public Location', 'common_knowledge', 'Nothing special']
      );

      const response = await request(app)
        .get('/api/locations')
        .query({ campaign_id: testCampaignId })
        .set('Authorization', validToken)
        .set('X-View-Mode', 'player_view')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Public Location');
      expect(response.body.data[0]).not.toHaveProperty('dm_secrets');

      // Cleanup
      await db.run('DELETE FROM locations WHERE campaign_id = ?', [testCampaignId]);
    });
  });
});
