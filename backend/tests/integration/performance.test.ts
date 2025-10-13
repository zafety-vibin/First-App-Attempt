/**
 * Performance Validation Integration Test
 * Feature: 014-create-the-database
 * Task: T063
 *
 * Performance tests for all 13 category tables.
 * Validates single entity read <100ms and list queries <500ms for 100 results.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { DatabaseService } from '../../src/services/DatabaseService';

let app: Express;
let db: DatabaseService;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-perf-001';
const testUserId = 'user-perf-001';

// Performance targets from plan.md FR-053
const SINGLE_READ_TARGET_MS = 100;
const LIST_QUERY_TARGET_MS = 500;
const ENTITY_COUNT = 100;

// Store created entity IDs for cleanup
const createdEntities: {
  factions: string[];
  npcs: string[];
  locations: string[];
  session_recaps: string[];
  quests: string[];
  player_characters: string[];
  lore_entries: string[];
  world_rules: string[];
  planar_forces: string[];
  session_prep: string[];
  custom_mechanics: string[];
  items: string[];
  creatures: string[];
} = {
  factions: [],
  npcs: [],
  locations: [],
  session_recaps: [],
  quests: [],
  player_characters: [],
  lore_entries: [],
  world_rules: [],
  planar_forces: [],
  session_prep: [],
  custom_mechanics: [],
  items: [],
  creatures: [],
};

describe('Performance Validation Integration Test', () => {
  beforeAll(async () => {
    db = DatabaseService.getInstance();
    await db.init();

    // Create test user and campaign
    await db.run('INSERT INTO users (id, username, email) VALUES (?, ?, ?)', [
      testUserId,
      'perftest',
      'perftest@example.com',
    ]);

    await db.run('INSERT INTO campaigns (id, name, user_id) VALUES (?, ?, ?)', [
      testCampaignId,
      'Performance Test Campaign',
      testUserId,
    ]);

    // Create 100 entities for each category
    console.log('Creating 100 entities per category for performance testing...');

    // Factions
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/factions')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Faction ${i}`,
          description: `Description for faction ${i}`,
        });
      createdEntities.factions.push(res.body.id);
    }

    // NPCs
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/npcs')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `NPC ${i}`,
          description: `Description for NPC ${i}`,
          race: 'Human',
          class: ['Fighter'],
        });
      createdEntities.npcs.push(res.body.id);
    }

    // Locations
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/locations')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Location ${i}`,
          description: `Description for location ${i}`,
          location_type: 'city',
        });
      createdEntities.locations.push(res.body.id);
    }

    // Session Recaps
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/session-recaps')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Session ${i}`,
          description: `Recap for session ${i}`,
          session_number: i + 1,
        });
      createdEntities.session_recaps.push(res.body.id);
    }

    // Quests
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/quests')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Quest ${i}`,
          description: `Description for quest ${i}`,
          quest_status: 'active',
        });
      createdEntities.quests.push(res.body.id);
    }

    // Player Characters
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/player-characters')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `PC ${i}`,
          description: `Description for PC ${i}`,
          race: 'Elf',
          class: ['Wizard'],
        });
      createdEntities.player_characters.push(res.body.id);
    }

    // Lore Entries
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/lore-entries')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Lore ${i}`,
          description: `Description for lore ${i}`,
          lore_category: 'history',
        });
      createdEntities.lore_entries.push(res.body.id);
    }

    // World Rules
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/world-rules')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Rule ${i}`,
          description: `Description for rule ${i}`,
          rule_category: 'magic',
        });
      createdEntities.world_rules.push(res.body.id);
    }

    // Planar Forces
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/planar-forces')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Planar Force ${i}`,
          description: `Description for planar force ${i}`,
          force_type: 'deity',
        });
      createdEntities.planar_forces.push(res.body.id);
    }

    // Session Prep
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/session-prep')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Prep ${i}`,
          description: `Description for prep ${i}`,
        });
      createdEntities.session_prep.push(res.body.id);
    }

    // Custom Mechanics
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/custom-mechanics')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Mechanic ${i}`,
          description: `Description for mechanic ${i}`,
          mechanic_type: 'combat',
        });
      createdEntities.custom_mechanics.push(res.body.id);
    }

    // Items
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Item ${i}`,
          description: `Description for item ${i}`,
          item_type: 'weapon',
        });
      createdEntities.items.push(res.body.id);
    }

    // Creatures
    for (let i = 0; i < ENTITY_COUNT; i++) {
      const res = await request(app)
        .post('/api/creatures')
        .set('Authorization', validToken)
        .send({
          campaign_id: testCampaignId,
          name: `Creature ${i}`,
          description: `Description for creature ${i}`,
          creature_type: 'beast',
        });
      createdEntities.creatures.push(res.body.id);
    }

    console.log('Entity creation complete.');
  });

  afterAll(async () => {
    // Cleanup all created entities
    console.log('Cleaning up performance test entities...');

    await db.run('DELETE FROM creatures WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM items WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM custom_mechanics WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM session_prep WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM planar_forces WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM world_rules WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM lore_entries WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM player_characters WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM quests WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM session_recaps WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM locations WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM npcs WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM factions WHERE campaign_id = ?', [testCampaignId]);
    await db.run('DELETE FROM campaigns WHERE id = ?', [testCampaignId]);
    await db.run('DELETE FROM users WHERE id = ?', [testUserId]);

    await db.close();
  });

  describe('Single Entity Read Performance (<100ms)', () => {
    it('should read single faction in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/factions/${createdEntities.factions[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Faction single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single NPC in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/npcs/${createdEntities.npcs[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`NPC single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single location in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/locations/${createdEntities.locations[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Location single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single session recap in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/session-recaps/${createdEntities.session_recaps[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Session recap single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single quest in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/quests/${createdEntities.quests[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Quest single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single player character in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/player-characters/${createdEntities.player_characters[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Player character single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single lore entry in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/lore-entries/${createdEntities.lore_entries[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Lore entry single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single world rule in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/world-rules/${createdEntities.world_rules[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`World rule single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single planar force in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/planar-forces/${createdEntities.planar_forces[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Planar force single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single session prep in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/session-prep/${createdEntities.session_prep[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Session prep single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single custom mechanic in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/custom-mechanics/${createdEntities.custom_mechanics[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Custom mechanic single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single item in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/items/${createdEntities.items[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Item single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });

    it('should read single creature in <100ms', async () => {
      const start = Date.now();
      await request(app)
        .get(`/api/creatures/${createdEntities.creatures[50]}`)
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Creature single read: ${duration}ms`);
      expect(duration).toBeLessThan(SINGLE_READ_TARGET_MS);
    });
  });

  describe('List Query Performance (<500ms for 100 results)', () => {
    it('should list 100 factions in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/factions')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Factions list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 NPCs in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/npcs')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`NPCs list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 locations in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/locations')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Locations list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 session recaps in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/session-recaps')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Session recaps list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 quests in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/quests')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Quests list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 player characters in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/player-characters')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Player characters list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 lore entries in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/lore-entries')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Lore entries list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 world rules in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/world-rules')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`World rules list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 planar forces in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/planar-forces')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Planar forces list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 session prep in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/session-prep')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Session prep list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 custom mechanics in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/custom-mechanics')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Custom mechanics list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 items in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/items')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Items list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should list 100 creatures in <500ms', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/creatures')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Creatures list query (${response.body.data.length} results): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });
  });

  describe('Pagination Performance', () => {
    it('should handle offset pagination efficiently', async () => {
      // Test retrieving second page (offset 100)
      const start = Date.now();
      await request(app)
        .get('/api/npcs')
        .query({ campaign_id: testCampaignId, limit: 50, offset: 50 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`NPCs offset pagination (50 results, offset 50): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
    });

    it('should return correct pagination metadata', async () => {
      const response = await request(app)
        .get('/api/factions')
        .query({ campaign_id: testCampaignId, limit: 25, offset: 0 })
        .set('Authorization', validToken)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        limit: 25,
        offset: 0,
        total: 100,
      });
    });
  });

  describe('Filtering Performance', () => {
    it('should filter by core_status efficiently', async () => {
      const start = Date.now();
      const response = await request(app)
        .get('/api/npcs')
        .query({ campaign_id: testCampaignId, core_status: 'active', limit: 100 })
        .set('Authorization', validToken)
        .expect(200);
      const duration = Date.now() - start;

      console.log(`NPCs filtered by core_status: ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
      expect(response.body.data.length).toBe(100);
    });

    it('should filter by player_knowledge efficiently', async () => {
      const start = Date.now();
      await request(app)
        .get('/api/locations')
        .query({ campaign_id: testCampaignId, limit: 100 })
        .set('Authorization', validToken)
        .set('X-View-Mode', 'player_view')
        .expect(200);
      const duration = Date.now() - start;

      console.log(`Locations filtered by player_knowledge (player_view): ${duration}ms`);
      expect(duration).toBeLessThan(LIST_QUERY_TARGET_MS);
    });
  });
});
