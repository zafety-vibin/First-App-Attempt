import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express, { Application } from 'express';
import locationMapsRoutes from '../../src/routes/location-maps';

/**
 * Contract Tests: Location Maps API
 *
 * Feature 021: Geographic map system for locations
 * Tests uploading/managing map images as base64 data
 *
 * Contract: specs/021-create-a-geographic/contracts/location-maps.yaml
 */

describe('Location Maps API Contract Tests', () => {
  let app: Application;
  let testCampaignId: string;
  let testLocationId: string;
  let testMapId: string;

  const validBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  beforeAll(async () => {
    // Initialize test Express app
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/locations', locationMapsRoutes);

    // Setup test data
    testCampaignId = uuidv4();
    testLocationId = uuidv4();

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

    // Create test location
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, description, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Test Location', 'A test location', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(testLocationId, testCampaignId);
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
  });

  describe('POST /api/locations/:id/maps', () => {
    it('should upload a new map image', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/maps`)
        .send({
          name: 'Faerûn World Map',
          data: validBase64Image,
          width: 2048,
          height: 1536
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        map: {
          name: 'Faerûn World Map',
          width: 2048,
          height: 1536
        }
      });
      expect(response.body.map.id).toBeDefined();
      expect(response.body.map.data).toBe(validBase64Image);
      expect(response.body.map.uploaded_at).toBeDefined();

      testMapId = response.body.map.id;
    });

    it('should reject invalid image data', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/maps`)
        .send({
          name: 'Bad Map',
          data: 'not-base64-image-data',
          width: 2048,
          height: 1536
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject oversized dimensions', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/maps`)
        .send({
          name: 'Huge Map',
          data: validBase64Image,
          width: 15000, // exceeds 10000 max
          height: 1536
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .post(`/api/locations/${uuidv4()}/maps`)
        .send({
          name: 'Map',
          data: validBase64Image,
          width: 2048,
          height: 1536
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should reject images larger than 10MB', async () => {
      // Create a large base64 string (simulating >10MB image)
      const largeData = 'data:image/png;base64,' + 'A'.repeat(15 * 1024 * 1024);

      const response = await request(app)
        .post(`/api/locations/${testLocationId}/maps`)
        .send({
          name: 'Large Map',
          data: largeData,
          width: 2048,
          height: 1536
        });

      expect(response.status).toBe(413);
      expect(response.body.error).toContain('too large');
    });
  });

  describe('GET /api/locations/:id/maps', () => {
    it('should list all maps for location', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/maps`)
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        maps: expect.any(Array),
        pins: expect.any(Array),
        regions: expect.any(Array)
      });
      expect(response.body.maps.length).toBeGreaterThan(0);
      expect(response.body.maps[0]).toMatchObject({
        id: testMapId,
        name: 'Faerûn World Map'
      });
    });

    it('should filter maps based on X-View-Mode', async () => {
      // Create a dm_only location with map
      const dmLocationId = uuidv4();
      const { db } = await import('../../src/services/DatabaseService');

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Secret Location', 'dm_only', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(dmLocationId, testCampaignId);

      // Player view should not see dm_only locations
      const response = await request(app)
        .get(`/api/locations/${dmLocationId}/maps`)
        .set('X-View-Mode', 'player_view');

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .get(`/api/locations/${uuidv4()}/maps`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/locations/:id/maps/:map_id', () => {
    it('should delete a map and its pins/regions', async () => {
      // First create a new map to delete
      const createResponse = await request(app)
        .post(`/api/locations/${testLocationId}/maps`)
        .send({
          name: 'Map to Delete',
          data: validBase64Image,
          width: 1024,
          height: 768
        });

      const mapToDelete = createResponse.body.map.id;

      // Delete the map
      const deleteResponse = await request(app)
        .delete(`/api/locations/${testLocationId}/maps/${mapToDelete}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toMatchObject({
        success: true,
        deleted_pins: expect.any(Number),
        deleted_regions: expect.any(Number)
      });

      // Verify map is gone
      const listResponse = await request(app)
        .get(`/api/locations/${testLocationId}/maps`);

      const mapIds = listResponse.body.maps.map((m: any) => m.id);
      expect(mapIds).not.toContain(mapToDelete);
    });

    it('should return 404 for non-existent map', async () => {
      const response = await request(app)
        .delete(`/api/locations/${testLocationId}/maps/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .delete(`/api/locations/${uuidv4()}/maps/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });
});