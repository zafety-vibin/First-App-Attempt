/**
 * Session Prep One-Way Linking Integration Test
 * Feature: 014-create-the-database
 * Task: T061
 *
 * End-to-end test for session prep one-way references to canonical entities.
 * Verifies no reverse lookup fields, stale references acceptable, and hypothetical markers enforced.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { DatabaseService } from '../../src/services/DatabaseService';

let app: Express;
let db: DatabaseService;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-prep-001';
const testUserId = 'user-prep-001';

describe('Session Prep One-Way Linking Integration Test', () => {
  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.init();

    // Create test user and campaign
    await db.run('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [
      testUserId,
      'preptest',
      'preptest@example.com',
    ]);

    await db.run('INSERT INTO campaigns (id, name, user_id) VALUES (?, ?, ?)', [
      testCampaignId,
      'Prep Test Campaign',
      testUserId,
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await db.run('DELETE FROM session_prep WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM npcs WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM locations WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM quests WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM campaigns WHERE id = ?', [testCampaignId]);
    await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    await db.close();
  });

  describe('One-Way References in npcs_to_prep', () => {
    it('should create session prep with npcs_to_prep array', async () => {
      // Create canonical NPCs
      const npc1Res = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'NPC to Prep 1',
        })
        .expect(201);

      const npc2Res = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'NPC to Prep 2',
        })
        .expect(201);

      const npc1Id = npc1Res.body.id;
      const npc2Id = npc2Res.body.id;

      // Create session prep referencing NPCs
      const prepRes = await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Session 10 Prep',
          npcs_to_prep: [npc1Id, npc2Id],
        })
        .expect(201);

      expect(prepRes.body.npcs_to_prep).toEqual([npc1Id, npc2Id]);
    });

    it('should NOT create reverse lookup field on canonical NPCs', async () => {
      // Create NPC
      const npcRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Independent NPC',
        })
        .expect(201);

      const npcId = npcRes.body.id;

      // Create session prep referencing this NPC
      await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Prep Referencing NPC',
          npcs_to_prep: [npcId],
        })
        .expect(201);

      // Verify NPC has NO reverse reference field
      const npcCheck = await request(app)
        .get(`/api/npcs/${npcId}`)
        .set('Authorization', validToken)
        .expect(200);

      expect(npcCheck.body).not.toHaveProperty('session_preps');
      expect(npcCheck.body).not.toHaveProperty('referenced_by_session_prep');
      expect(npcCheck.body).not.toHaveProperty('prep_references');
    });
  });

  describe('Stale References After Deletion', () => {
    it('should allow stale NPC IDs in npcs_to_prep after NPC deletion', async () => {
      // Create NPC
      const npcRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Deletable NPC',
        })
        .expect(201);

      const npcId = npcRes.body.id;

      // Create session prep
      const prepRes = await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Prep With Deletable Reference',
          npcs_to_prep: [npcId],
        })
        .expect(201);

      const prepId = prepRes.body.id;

      // Delete NPC (no CASCADE, one-way only)
      await request(app)
        .delete(`/api/npcs/${npcId}`)
        .set('Authorization', validToken)
        .expect(204);

      // Session prep still exists with stale reference
      const prepCheck = await request(app)
        .get(`/api/session-prep/${prepId}`)
        .set('Authorization', validToken)
        .expect(200);

      expect(prepCheck.body.npcs_to_prep).toEqual([npcId]); // Stale ID still present
    });

    it('should allow stale location IDs in locations_to_prep', async () => {
      // Create location
      const locRes = await request(app)
        .post('/api/locations')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Deletable Location',
          location_type: 'dungeon',
        })
        .expect(201);

      const locId = locRes.body.id;

      // Create prep
      const prepRes = await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Prep With Location',
          locations_to_prep: [locId],
        })
        .expect(201);

      const prepId = prepRes.body.id;

      // Delete location
      await request(app)
        .delete(`/api/locations/${locId}`)
        .set('Authorization', validToken)
        .expect(204);

      // Prep still has stale location ID
      const prepCheck = await request(app)
        .get(`/api/session-prep/${prepId}`)
        .set('Authorization', validToken)
        .expect(200);

      expect(prepCheck.body.locations_to_prep).toEqual([locId]);
    });
  });

  describe('Hypothetical Markers Enforcement', () => {
    it('should enforce player_knowledge=dm_only always', async () => {
      const response = await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Test Prep',
          player_knowledge: 'common_knowledge', // Attempt override
        })
        .expect(201);

      expect(response.body.player_knowledge).toBe('dm_only'); // Enforced
    });

    it('should enforce is_canon=0 always', async () => {
      const response = await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Test Prep 2',
          is_canon: 1, // Attempt override
        })
        .expect(201);

      expect(response.body.is_canon).toBe(0); // Enforced
    });

    it('should enforce canonical_status=hypothetical always', async () => {
      const response = await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Test Prep 3',
          canonical_status: 'canon', // Attempt override
        })
        .expect(201);

      expect(response.body.canonical_status).toBe('hypothetical'); // Enforced
    });

    it('should maintain hypothetical markers on update', async () => {
      const createRes = await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Update Test Prep',
        })
        .expect(201);

      const prepId = createRes.body.id;

      // Attempt to override markers via update
      const updateRes = await request(app)
        .put(`/api/session-prep/${prepId}`)
        .set('Authorization', validToken)
        .send({
          is_canon: 1,
          canonical_status: 'canon',
          player_knowledge: 'common_knowledge',
        })
        .expect(200);

      expect(updateRes.body.is_canon).toBe(0);
      expect(updateRes.body.canonical_status).toBe('hypothetical');
      expect(updateRes.body.player_knowledge).toBe('dm_only');
    });
  });

  describe('Player View Isolation', () => {
    it('should return empty array in player_view (all session prep is dm_only)', async () => {
      // Create session prep
      await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Hidden Prep',
        })
        .expect(201);

      // Query with player_view
      const response = await request(app)
        .get('/api/session-prep')
        .query({ campaign_id: testCampaignId })
        .set('Authorization', validToken)
        .set('X-View-Mode', 'player_view')
        .expect(200);

      expect(response.body.data).toHaveLength(0); // All filtered out
    });

    it('should return 404 in player_view for specific session prep', async () => {
      const createRes = await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Secret Prep',
        })
        .expect(201);

      const prepId = createRes.body.id;

      // Attempt to access with player_view
      await request(app)
        .get(`/api/session-prep/${prepId}`)
        .set('Authorization', validToken)
        .set('X-View-Mode', 'player_view')
        .expect(404); // Not revealed to players
    });
  });
});
