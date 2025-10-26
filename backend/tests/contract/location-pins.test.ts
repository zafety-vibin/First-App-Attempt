import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express, { Application } from 'express';
import locationPinsRoutes from '../../src/routes/location-pins';

/**
 * Contract Tests: Location Map Pins API
 *
 * Feature 021: Map pin management for linking locations/NPCs to map coordinates
 * Tests CRUD operations for pins with entity linking and coordinate validation
 *
 * Contract: specs/021-create-a-geographic/contracts/location-pins.yaml
 */

describe('Location Pins API Contract Tests', () => {
  let app: Application;
  let testCampaignId: string;
  let testLocationId: string;
  let testChildLocationId: string;
  let testNPCId: string;
  let testMapId: string;
  let testPinId: string;

  beforeAll(async () => {
    // Initialize test Express app
    app = express();
    app.use(express.json());
    app.use('/api/locations', locationPinsRoutes);

    // Setup test data
    testCampaignId = uuidv4();
    testLocationId = uuidv4();
    testChildLocationId = uuidv4();
    testNPCId = uuidv4();
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

    // Create test location with map
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, description, map_images, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Test Location', 'A test location', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(testLocationId, testCampaignId, JSON.stringify([{
      id: testMapId,
      name: 'Test Map',
      data: 'data:image/png;base64,iVBORw0KGgo=',
      width: 2048,
      height: 1536,
      uploaded_at: Date.now()
    }]));

    // Create child location to link to
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Waterdeep', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(testChildLocationId, testCampaignId, testLocationId);

    // Create test NPC to link to
    db.prepare(`
      INSERT INTO npcs (id, campaign_id, name, description, created_at, updated_at, tags, custom_fields, class, locations)
      VALUES (?, ?, 'Test NPC', 'An NPC', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]')
    `).run(testNPCId, testCampaignId);
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
  });

  describe('POST /api/locations/:id/pins', () => {
    it('should create a pin linked to a location', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/pins`)
        .send({
          map_id: testMapId,
          x: 512,
          y: 384,
          linked_entity_type: 'location',
          linked_entity_id: testChildLocationId,
          icon: 'city',
          color: '#3B82F6',
          label: 'Waterdeep'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        pin: {
          map_id: testMapId,
          x: 512,
          y: 384,
          linked_entity_type: 'location',
          linked_entity_id: testChildLocationId,
          icon: 'city',
          color: '#3B82F6',
          label: 'Waterdeep'
        }
      });
      expect(response.body.pin.id).toBeDefined();
      expect(response.body.pin.created_at).toBeDefined();

      testPinId = response.body.pin.id;
    });

    it('should create a pin linked to an NPC', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/pins`)
        .send({
          map_id: testMapId,
          x: 1024,
          y: 768,
          linked_entity_type: 'npc',
          linked_entity_id: testNPCId,
          icon: 'other',
          label: 'NPC Location'
        });

      expect(response.status).toBe(201);
      expect(response.body.pin.linked_entity_type).toBe('npc');
      expect(response.body.pin.linked_entity_id).toBe(testNPCId);
    });

    it('should reject invalid coordinates', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/pins`)
        .send({
          map_id: testMapId,
          x: -10, // negative coordinate
          y: 384,
          linked_entity_type: 'location',
          linked_entity_id: testChildLocationId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('coordinate');
    });

    it('should reject out-of-bounds coordinates', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/pins`)
        .send({
          map_id: testMapId,
          x: 3000, // exceeds map width (2048)
          y: 384,
          linked_entity_type: 'location',
          linked_entity_id: testChildLocationId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('out of bounds');
    });

    it('should reject invalid entity type', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/pins`)
        .send({
          map_id: testMapId,
          x: 512,
          y: 384,
          linked_entity_type: 'invalid_type',
          linked_entity_id: testChildLocationId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent linked entity', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/pins`)
        .send({
          map_id: testMapId,
          x: 512,
          y: 384,
          linked_entity_type: 'location',
          linked_entity_id: uuidv4() // non-existent
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for non-existent map', async () => {
      const response = await request(app)
        .post(`/api/locations/${testLocationId}/pins`)
        .send({
          map_id: uuidv4(), // non-existent
          x: 512,
          y: 384,
          linked_entity_type: 'location',
          linked_entity_id: testChildLocationId
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Map not found');
    });
  });

  describe('GET /api/locations/:id/pins', () => {
    it('should list all pins for location', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/pins`)
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        pins: expect.any(Array)
      });
      expect(response.body.pins.length).toBeGreaterThan(0);
      expect(response.body.pins[0]).toMatchObject({
        id: testPinId,
        map_id: testMapId,
        linked_entity_type: 'location',
        linked_entity_id: testChildLocationId
      });
    });

    it('should filter pins by map_id', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/pins`)
        .query({ map_id: testMapId });

      expect(response.status).toBe(200);
      expect(response.body.pins).toBeDefined();
      response.body.pins.forEach((pin: any) => {
        expect(pin.map_id).toBe(testMapId);
      });
    });

    it('should filter pins based on linked entity visibility', async () => {
      // Create a dm_only NPC
      const dmNPCId = uuidv4();
      const { db } = await import('../../src/services/DatabaseService');

      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, class, locations)
        VALUES (?, ?, 'Secret NPC', 'dm_only', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]')
      `).run(dmNPCId, testCampaignId);

      // Create pin linking to dm_only NPC
      await request(app)
        .post(`/api/locations/${testLocationId}/pins`)
        .send({
          map_id: testMapId,
          x: 256,
          y: 256,
          linked_entity_type: 'npc',
          linked_entity_id: dmNPCId
        });

      // Player view should not see pins linked to dm_only entities
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/pins`)
        .set('X-View-Mode', 'player_view');

      expect(response.status).toBe(200);
      const dmPins = response.body.pins.filter((p: any) => p.linked_entity_id === dmNPCId);
      expect(dmPins.length).toBe(0);
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .get(`/api/locations/${uuidv4()}/pins`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/locations/:id/pins/:pin_id', () => {
    it('should update pin coordinates', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/pins/${testPinId}`)
        .send({
          x: 600,
          y: 450
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        pin: {
          id: testPinId,
          x: 600,
          y: 450
        }
      });
    });

    it('should update pin visual properties', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/pins/${testPinId}`)
        .send({
          icon: 'castle',
          color: '#EF4444',
          label: 'Red Castle'
        });

      expect(response.status).toBe(200);
      expect(response.body.pin).toMatchObject({
        icon: 'castle',
        color: '#EF4444',
        label: 'Red Castle'
      });
    });

    it('should update linked entity', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/pins/${testPinId}`)
        .send({
          linked_entity_type: 'npc',
          linked_entity_id: testNPCId
        });

      expect(response.status).toBe(200);
      expect(response.body.pin).toMatchObject({
        linked_entity_type: 'npc',
        linked_entity_id: testNPCId
      });
    });

    it('should reject invalid updates', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/pins/${testPinId}`)
        .send({
          x: -100 // invalid coordinate
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 404 for non-existent pin', async () => {
      const response = await request(app)
        .put(`/api/locations/${testLocationId}/pins/${uuidv4()}`)
        .send({ x: 100 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/locations/:id/pins/:pin_id', () => {
    it('should delete a pin', async () => {
      // Create a pin to delete
      const createResponse = await request(app)
        .post(`/api/locations/${testLocationId}/pins`)
        .send({
          map_id: testMapId,
          x: 100,
          y: 100,
          linked_entity_type: 'location',
          linked_entity_id: testChildLocationId
        });

      const pinToDelete = createResponse.body.pin.id;

      // Delete the pin
      const deleteResponse = await request(app)
        .delete(`/api/locations/${testLocationId}/pins/${pinToDelete}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toMatchObject({
        success: true
      });

      // Verify pin is gone
      const listResponse = await request(app)
        .get(`/api/locations/${testLocationId}/pins`);

      const pinIds = listResponse.body.pins.map((p: any) => p.id);
      expect(pinIds).not.toContain(pinToDelete);
    });

    it('should return 404 for non-existent pin', async () => {
      const response = await request(app)
        .delete(`/api/locations/${testLocationId}/pins/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .delete(`/api/locations/${uuidv4()}/pins/${uuidv4()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });
});