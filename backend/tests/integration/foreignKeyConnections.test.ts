/**
 * Foreign Key Connections Integration Test
 * Feature: 014-create-the-database
 * Task: T060
 *
 * End-to-end test for explicit foreign key relationships and CASCADE/SET NULL behavior.
 * Tests: NPC→Faction, NPC→NPC, Location→Location, Faction→NPC, Quest→NPC/SessionRecap.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { DatabaseService } from '../../src/services/DatabaseService';

let app: Express;
let db: DatabaseService;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-fk-001';
const testUserId = 'user-fk-001';

describe('Foreign Key Connections Integration Test', () => {
  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.init();

    // Create test user and campaign
    await db.run('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [
      testUserId,
      'fktest',
      'fktest@example.com',
    ]);

    await db.run('INSERT INTO campaigns (id, name, user_id) VALUES (?, ?, ?)', [
      testCampaignId,
      'FK Test Campaign',
      testUserId,
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await db.run('DELETE FROM quests WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM npcs WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM locations WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM factions WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM session_recaps WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM campaigns WHERE id = ?', [testCampaignId]);
    await db.run('DELETE FROM users WHERE id = ?', [testUserId]);
    await db.close();
  });

  describe('NPC → Faction (faction_id FK)', () => {
    it('should create NPC with valid faction_id', async () => {
      // Create faction first
      const factionRes = await request(app)
        .post('/api/factions')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Test Faction',
        })
        .expect(201);

      const factionId = factionRes.body.id;

      // Create NPC with faction_id
      const npcRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Faction Member',
          faction_id: factionId,
        })
        .expect(201);

      expect(npcRes.body.faction_id).toBe(factionId);
    });

    it('should SET NULL on faction deletion', async () => {
      // Create faction and NPC
      const factionRes = await request(app)
        .post('/api/factions')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Deletable Faction',
        })
        .expect(201);

      const factionId = factionRes.body.id;

      const npcRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Orphaned NPC',
          faction_id: factionId,
        })
        .expect(201);

      const npcId = npcRes.body.id;

      // Delete faction
      await request(app)
        .delete(`/api/factions/${factionId}`)
        .set('Authorization', validToken)
        .expect(204);

      // Check NPC faction_id is now null
      const updatedNpc = await request(app)
        .get(`/api/npcs/${npcId}`)
        .set('Authorization', validToken)
        .expect(200);

      expect(updatedNpc.body.faction_id).toBeNull();
    });
  });

  describe('NPC → NPC (superior_npc_id self-referential FK)', () => {
    it('should create NPC hierarchy', async () => {
      // Create superior NPC
      const superiorRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Superior NPC',
        })
        .expect(201);

      const superiorId = superiorRes.body.id;

      // Create subordinate NPC
      const subordinateRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Subordinate NPC',
          superior_npc_id: superiorId,
        })
        .expect(201);

      expect(subordinateRes.body.superior_npc_id).toBe(superiorId);
    });

    it('should SET NULL on superior NPC deletion', async () => {
      // Create hierarchy
      const superiorRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Deletable Superior',
        })
        .expect(201);

      const superiorId = superiorRes.body.id;

      const subordinateRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Will Be Orphaned',
          superior_npc_id: superiorId,
        })
        .expect(201);

      const subordinateId = subordinateRes.body.id;

      // Delete superior
      await request(app)
        .delete(`/api/npcs/${superiorId}`)
        .set('Authorization', validToken)
        .expect(204);

      // Check subordinate superior_npc_id is null
      const updatedSubordinate = await request(app)
        .get(`/api/npcs/${subordinateId}`)
        .set('Authorization', validToken)
        .expect(200);

      expect(updatedSubordinate.body.superior_npc_id).toBeNull();
    });
  });

  describe('Location → Location (parent_location_id self-referential FK)', () => {
    it('should create location hierarchy', async () => {
      // Create parent location
      const parentRes = await request(app)
        .post('/api/locations')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Parent Region',
          location_type: 'region',
        })
        .expect(201);

      const parentId = parentRes.body.id;

      // Create child location
      const childRes = await request(app)
        .post('/api/locations')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Child City',
          location_type: 'city',
          parent_location_id: parentId,
        })
        .expect(201);

      expect(childRes.body.parent_location_id).toBe(parentId);
    });

    it('should prevent circular reference', async () => {
      // Create parent and child
      const parentRes = await request(app)
        .post('/api/locations')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Parent A',
          location_type: 'region',
        })
        .expect(201);

      const parentId = parentRes.body.id;

      const childRes = await request(app)
        .post('/api/locations')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Child B',
          location_type: 'city',
          parent_location_id: parentId,
        })
        .expect(201);

      const childId = childRes.body.id;

      // Attempt to make parent a child of child (circular)
      await request(app)
        .put(`/api/locations/${parentId}`)
        .set('Authorization', validToken)
        .send({
          parent_location_id: childId,
        })
        .expect(400); // Should fail with circular reference error
    });
  });

  describe('Quest → NPC/SessionRecap (multiple FKs)', () => {
    it('should create quest with quest_giver_id', async () => {
      // Create NPC
      const npcRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Quest Giver',
        })
        .expect(201);

      const npcId = npcRes.body.id;

      // Create quest
      const questRes = await request(app)
        .post('/api/quests')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Test Quest',
          quest_giver_id: npcId,
        })
        .expect(201);

      expect(questRes.body.quest_giver_id).toBe(npcId);
    });

    it('should link quest to session recaps', async () => {
      // Create session recaps
      const startSessionRes = await request(app)
        .post('/api/session-recaps')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Session 1',
        })
        .expect(201);

      const startSessionId = startSessionRes.body.id;

      const endSessionRes = await request(app)
        .post('/api/session-recaps')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Session 5',
        })
        .expect(201);

      const endSessionId = endSessionRes.body.id;

      // Create quest with both sessions
      const questRes = await request(app)
        .post('/api/quests')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Multi-Session Quest',
          started_session_id: startSessionId,
          completed_session_id: endSessionId,
        })
        .expect(201);

      expect(questRes.body.started_session_id).toBe(startSessionId);
      expect(questRes.body.completed_session_id).toBe(endSessionId);
    });

    it('should SET NULL when quest_giver NPC deleted', async () => {
      // Create NPC and quest
      const npcRes = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Deletable Quest Giver',
        })
        .expect(201);

      const npcId = npcRes.body.id;

      const questRes = await request(app)
        .post('/api/quests')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: 'Orphaned Quest',
          quest_giver_id: npcId,
        })
        .expect(201);

      const questId = questRes.body.id;

      // Delete NPC
      await request(app)
        .delete(`/api/npcs/${npcId}`)
        .set('Authorization', validToken)
        .expect(204);

      // Check quest quest_giver_id is null
      const updatedQuest = await request(app)
        .get(`/api/quests/${questId}`)
        .set('Authorization', validToken)
        .expect(200);

      expect(updatedQuest.body.quest_giver_id).toBeNull();
    });
  });

  describe('Campaign CASCADE deletion', () => {
    it('should CASCADE delete all entities when campaign deleted', async () => {
      // Create temporary campaign
      const tempCampaignRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', validToken)
        .send({
          name: 'Temporary Campaign',
        })
        .expect(201);

      const tempCampaignId = tempCampaignRes.body.id;

      // Create entities
      await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: tempCampaignId,
          name: 'Temp NPC',
        })
        .expect(201);

      await request(app)
        .post('/api/locations')
        .set('Authorization', validToken)
        .send({
          campaign_id: tempCampaignId,
          name: 'Temp Location',
          location_type: 'city',
        })
        .expect(201);

      // Delete campaign
      await request(app)
        .delete(`/api/campaigns/${tempCampaignId}`)
        .set('Authorization', validToken)
        .expect(204);

      // Verify entities are deleted (CASCADE)
      const npcs = await db.all('SELECT * FROM npcs WHERE campaign_id = ?', [tempCampaignId]);
      const locations = await db.all('SELECT * FROM locations WHERE campaign_id = ?', [
        tempCampaignId,
      ]);

      expect(npcs).toHaveLength(0);
      expect(locations).toHaveLength(0);
    });
  });
});
