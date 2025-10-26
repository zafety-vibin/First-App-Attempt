import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express, { Application } from 'express';
import factionRegionsRoutes from '../../src/routes/faction-regions';

/**
 * Contract Tests: Faction Territory Regions API
 *
 * Feature 021: Faction territory polygons on maps
 * Tests CRUD operations for polygon regions linked to factions
 *
 * Contract: specs/021-create-a-geographic/contracts/faction-regions.yaml
 */

describe('Faction Regions API Contract Tests', () => {
  let app: Application;
  let testCampaignId: string;
  let testLocationId: string;
  let testFactionId: string;
  let testFaction2Id: string;
  let testMapId: string;
  let testRegionId: string;

  beforeAll(async () => {
    // Initialize test Express app
    app = express();
    app.use(express.json());
    app.use('/api/locations', factionRegionsRoutes);

    // Setup test data
    testCampaignId = uuidv4();
    testLocationId = uuidv4();
    testFactionId = uuidv4();
    testFaction2Id = uuidv4();
    testMapId = uuidv4();

    const { db } = await import('../../src/services/DatabaseService');

    // Create test user
    db.prepare(`
      INSERT OR IGNORE INTO users (user_id, username, email, created_at)
      VALUES ('test-user', 'testuser', 'test@example.com', strftime('%s', 'now'))
    `).run();

    // Create test campaign
    db.prepare(`
      INSERT INTO campaigns (id, owner_id, name, created_at, updated_at)
      VALUES (?, 'test-user', 'Test Campaign', strftime('%s', 'now'), strftime('%s', 'now'))
    `).run(testCampaignId);

    // Create test factions
    db.prepare(`
      INSERT INTO factions (id, campaign_id, name, description, created_at, updated_at, tags, custom_fields, key_members, allied_factions, rival_factions, territory)
      VALUES (?, ?, 'Zhentarim', 'Shadow network', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]', '[]')
    `).run(testFactionId, testCampaignId);

    db.prepare(`
      INSERT INTO factions (id, campaign_id, name, description, created_at, updated_at, tags, custom_fields, key_members, allied_factions, rival_factions, territory)
      VALUES (?, ?, 'Harpers', 'Secret society', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]', '[]')
    `).run(testFaction2Id, testCampaignId);

    // Create test location with map
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, description, map_images, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Sword Coast', 'A region', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(testLocationId, testCampaignId, JSON.stringify([{
      id: testMapId,
      name: 'Sword Coast Map',
      data: 'data:image/png;base64,iVBORw0KGgo=',
      width: 2048,
      height: 1536,
      uploaded_at: Date.now()
    }]));
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
  });

  describe('POST /api/locations/:id/regions', () => {
    it('should create a faction region polygon', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/regions`)
        .send({
          map_id: testMapId,
          vertices: [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 200, y: 200 },
            { x: 100, y: 200 }
          ],
          faction_id: testFactionId,
          color: '#EF4444',
          label: 'Zhentarim Territory',
          z_order: 1
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        region: {
          map_id: testMapId,
          faction_id: testFactionId,
          color: '#EF4444',
          label: 'Zhentarim Territory',
          z_order: 1
        }
      });
      expect(response.body.region.id).toBeDefined();
      expect(response.body.region.vertices).toHaveLength(4);
      expect(response.body.region.created_at).toBeDefined();

      testRegionId = response.body.region.id;
    });

    it('should create a region with minimum 3 vertices', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/regions`)
        .send({
          map_id: testMapId,
          vertices: [
            { x: 300, y: 300 },
            { x: 400, y: 300 },
            { x: 350, y: 400 }
          ],
          faction_id: testFaction2Id,
          color: '#3B82F6'
        });

      expect(response.status).toBe(201);
      expect(response.body.region.vertices).toHaveLength(3);
    });

    it('should reject regions with less than 3 vertices', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/regions`)
        .send({
          map_id: testMapId,
          vertices: [
            { x: 100, y: 100 },
            { x: 200, y: 200 }
          ],
          faction_id: testFactionId,
          color: '#EF4444'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('minimum 3');
    });

    it('should reject vertices out of map bounds', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/regions`)
        .send({
          map_id: testMapId,
          vertices: [
            { x: 100, y: 100 },
            { x: 3000, y: 100 }, // exceeds map width
            { x: 200, y: 200 }
          ],
          faction_id: testFactionId,
          color: '#EF4444'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('out of bounds');
    });

    it('should reject invalid color format', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/regions`)
        .send({
          map_id: testMapId,
          vertices: [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 150, y: 150 }
          ],
          faction_id: testFactionId,
          color: 'red' // invalid format
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('color');
    });

    it('should return 404 for non-existent faction', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/regions`)
        .send({
          map_id: testMapId,
          vertices: [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 150, y: 150 }
          ],
          faction_id: uuidv4(), // non-existent
          color: '#EF4444'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Faction not found');
    });

    it('should return 404 for non-existent map', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/regions`)
        .send({
          map_id: uuidv4(), // non-existent
          vertices: [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 150, y: 150 }
          ],
          faction_id: testFactionId,
          color: '#EF4444'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Map not found');
    });
  });

  describe('GET /api/locations/:id/regions', () => {
    it('should list all regions sorted by z_order', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/regions`)
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        regions: expect.any(Array)
      });
      expect(response.body.regions.length).toBeGreaterThan(0);

      // Check z_order sorting (ascending)
      for (let i = 1; i < response.body.regions.length; i++) {
        expect(response.body.regions[i].z_order).toBeGreaterThanOrEqual(
          response.body.regions[i - 1].z_order
        );
      }
    });

    it('should filter regions by map_id', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/regions`)
        .query({ map_id: testMapId });

      expect(response.status).toBe(200);
      response.body.regions.forEach((region: any) => {
        expect(region.map_id).toBe(testMapId);
      });
    });

    it('should filter regions based on faction visibility', async () => {
      // Create a dm_only faction
      const dmFactionId = uuidv4();
      const { db } = await import('../../src/services/DatabaseService');

      db.prepare(`
        INSERT INTO factions (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, key_members, allied_factions, rival_factions, territory)
        VALUES (?, ?, 'Secret Faction', 'dm_only', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]', '[]')
      `).run(dmFactionId, testCampaignId);

      // Create region for dm_only faction
      await request(app)
        .post(`/api/locations/${testLocationId}/regions`)
        .send({
          map_id: testMapId,
          vertices: [
            { x: 500, y: 500 },
            { x: 600, y: 500 },
            { x: 550, y: 600 }
          ],
          faction_id: dmFactionId,
          color: '#000000'
        });

      // Player view should not see regions of dm_only factions
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/regions`)
        .set('X-View-Mode', 'player_view');

      expect(response.status).toBe(200);
      const dmRegions = response.body.regions.filter((r: any) => r.faction_id === dmFactionId);
      expect(dmRegions.length).toBe(0);
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .get(`/api/locations/${uuidv4()}/regions`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/locations/:id/regions/:region_id', () => {
    it('should update region vertices', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/regions/${testRegionId}`)
        .send({
          vertices: [
            { x: 150, y: 150 },
            { x: 250, y: 150 },
            { x: 250, y: 250 },
            { x: 150, y: 250 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        region: {
          id: testRegionId,
          vertices: expect.any(Array)
        }
      });
      expect(response.body.region.vertices).toHaveLength(4);
    });

    it('should update region visual properties', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/regions/${testRegionId}`)
        .send({
          color: '#10B981',
          label: 'Updated Territory',
          z_order: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.region).toMatchObject({
        color: '#10B981',
        label: 'Updated Territory',
        z_order: 5
      });
    });

    it('should update faction association', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/regions/${testRegionId}`)
        .send({
          faction_id: testFaction2Id
        });

      expect(response.status).toBe(200);
      expect(response.body.region.faction_id).toBe(testFaction2Id);
    });

    it('should reject invalid updates', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/regions/${testRegionId}`)
        .send({
          vertices: [
            { x: 100, y: 100 },
            { x: 200, y: 200 } // only 2 vertices
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('minimum 3');
    });

    it('should return 404 for non-existent region', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/regions/${uuidv4()}`)
        .send({ color: '#FF0000' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/locations/:id/regions/:region_id', () => {
    it('should delete a region', async () => {
      // Create a region to delete
      const createResponse = await request(app)
        .post(`/api/locations/${testLocationId}/regions`)
        .send({
          map_id: testMapId,
          vertices: [
            { x: 700, y: 700 },
            { x: 800, y: 700 },
            { x: 750, y: 800 }
          ],
          faction_id: testFactionId,
          color: '#FF0000'
        });

      const regionToDelete = createResponse.body.region.id;

      // Delete the region
      const deleteResponse = await request(app)
        .delete(`/api/locations/${testLocationId}/regions/${regionToDelete}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toMatchObject({
        success: true
      });

      // Verify region is gone
      const listResponse = await request(app)
        .get(`/api/locations/${testLocationId}/regions`);

      const regionIds = listResponse.body.regions.map((r: any) => r.id);
      expect(regionIds).not.toContain(regionToDelete);
    });

    it('should return 404 for non-existent region', async () => {
      const response = await request(app)
        .delete(`/api/locations/${testLocationId}/regions/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .delete(`/api/locations/${uuidv4()}/regions/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });
});