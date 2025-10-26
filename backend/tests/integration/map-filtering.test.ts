import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
import express, { Application } from 'express';
import { DatabaseService } from '../../src/services/DatabaseService';
import locationMapsRoutes from '../../src/routes/location-maps';
import locationPinsRoutes from '../../src/routes/location-pins';
import factionRegionsRoutes from '../../src/routes/faction-regions';

/**
 * Integration Test: Map Filtering by Information Level
 *
 * Feature 021: Tests X-View-Mode filtering for pins and regions
 * Validates that dm_only entities are hidden in player view
 */

describe('Map Filtering Integration Tests', () => {
  let app: Application;
  let db: DatabaseService;
  let testCampaignId: string;
  let testLocationId: string;
  let testMapId: string;

  // Public entities
  let publicLocationId: string;
  let publicNPCId: string;
  let publicFactionId: string;

  // DM-only entities
  let dmOnlyLocationId: string;
  let dmOnlyNPCId: string;
  let dmOnlyFactionId: string;

  // Pin/Region IDs
  let publicLocationPinId: string;
  let publicNPCPinId: string;
  let dmOnlyLocationPinId: string;
  let dmOnlyNPCPinId: string;
  let publicFactionRegionId: string;
  let dmOnlyFactionRegionId: string;

  beforeAll(async () => {
    // Initialize Express app
    app = express();
    app.use(express.json());
    app.use('/api/locations', locationMapsRoutes);
    app.use('/api/locations', locationPinsRoutes);
    app.use('/api/locations', factionRegionsRoutes);

    db = new DatabaseService();

    testCampaignId = uuidv4();
    testLocationId = uuidv4();
    testMapId = uuidv4();

    publicLocationId = uuidv4();
    publicNPCId = uuidv4();
    publicFactionId = uuidv4();

    dmOnlyLocationId = uuidv4();
    dmOnlyNPCId = uuidv4();
    dmOnlyFactionId = uuidv4();

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

    // Create main location with map
    const mapData = {
      id: testMapId,
      name: 'Test Map',
      data: 'data:image/png;base64,iVBORw0KGgo=',
      width: 2048,
      height: 1536,
      uploaded_at: Date.now()
    };

    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, map_images, map_pins, faction_regions, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Main Region', ?, '[]', '[]', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(testLocationId, testCampaignId, JSON.stringify([mapData]));

    // Create public entities
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Public City', 'full', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(publicLocationId, testCampaignId);

    db.prepare(`
      INSERT INTO npcs (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, class, locations)
      VALUES (?, ?, 'Public NPC', 'full', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]')
    `).run(publicNPCId, testCampaignId);

    db.prepare(`
      INSERT INTO factions (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, key_members, allied_factions, rival_factions, territory)
      VALUES (?, ?, 'Public Faction', 'full', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]', '[]')
    `).run(publicFactionId, testCampaignId);

    // Create DM-only entities
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Secret Hideout', 'dm_only', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(dmOnlyLocationId, testCampaignId);

    db.prepare(`
      INSERT INTO npcs (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, class, locations)
      VALUES (?, ?, 'Secret Boss', 'dm_only', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]')
    `).run(dmOnlyNPCId, testCampaignId);

    db.prepare(`
      INSERT INTO factions (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, key_members, allied_factions, rival_factions, territory)
      VALUES (?, ?, 'Secret Cult', 'dm_only', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]', '[]')
    `).run(dmOnlyFactionId, testCampaignId);

    // Create pins linking to entities
    const pins = [
      {
        id: uuidv4(),
        map_id: testMapId,
        x: 100,
        y: 100,
        linked_entity_type: 'location',
        linked_entity_id: publicLocationId,
        label: 'Public City',
        created_at: Date.now()
      },
      {
        id: uuidv4(),
        map_id: testMapId,
        x: 200,
        y: 200,
        linked_entity_type: 'npc',
        linked_entity_id: publicNPCId,
        label: 'Public NPC',
        created_at: Date.now()
      },
      {
        id: uuidv4(),
        map_id: testMapId,
        x: 300,
        y: 300,
        linked_entity_type: 'location',
        linked_entity_id: dmOnlyLocationId,
        label: 'Secret Hideout',
        created_at: Date.now()
      },
      {
        id: uuidv4(),
        map_id: testMapId,
        x: 400,
        y: 400,
        linked_entity_type: 'npc',
        linked_entity_id: dmOnlyNPCId,
        label: 'Secret Boss',
        created_at: Date.now()
      }
    ];

    publicLocationPinId = pins[0].id;
    publicNPCPinId = pins[1].id;
    dmOnlyLocationPinId = pins[2].id;
    dmOnlyNPCPinId = pins[3].id;

    // Create regions linking to factions
    const regions = [
      {
        id: uuidv4(),
        map_id: testMapId,
        vertices: [
          { x: 500, y: 500 },
          { x: 700, y: 500 },
          { x: 600, y: 700 }
        ],
        faction_id: publicFactionId,
        color: '#3B82F6',
        label: 'Public Territory',
        z_order: 1,
        created_at: Date.now()
      },
      {
        id: uuidv4(),
        map_id: testMapId,
        vertices: [
          { x: 800, y: 800 },
          { x: 1000, y: 800 },
          { x: 900, y: 1000 }
        ],
        faction_id: dmOnlyFactionId,
        color: '#EF4444',
        label: 'Secret Territory',
        z_order: 2,
        created_at: Date.now()
      }
    ];

    publicFactionRegionId = regions[0].id;
    dmOnlyFactionRegionId = regions[1].id;

    // Update location with pins and regions
    db.prepare(`
      UPDATE locations
      SET map_pins = ?, faction_regions = ?
      WHERE id = ?
    `).run(JSON.stringify(pins), JSON.stringify(regions), testLocationId);
  });

  afterAll(async () => {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
  });

  describe('Pin Filtering by View Mode', () => {
    it('should show all pins in dm_view', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/pins`)
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);
      expect(response.body.pins).toHaveLength(4);

      const pinIds = response.body.pins.map((p: any) => p.id);
      expect(pinIds).toContain(publicLocationPinId);
      expect(pinIds).toContain(publicNPCPinId);
      expect(pinIds).toContain(dmOnlyLocationPinId);
      expect(pinIds).toContain(dmOnlyNPCPinId);
    });

    it('should hide pins linking to dm_only locations in player_view', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/pins`)
        .set('X-View-Mode', 'player_view');

      expect(response.status).toBe(200);

      const pinIds = response.body.pins.map((p: any) => p.id);

      // Should include public pins
      expect(pinIds).toContain(publicLocationPinId);

      // Should NOT include dm_only location pin
      expect(pinIds).not.toContain(dmOnlyLocationPinId);
    });

    it('should hide pins linking to dm_only NPCs in player_view', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/pins`)
        .set('X-View-Mode', 'player_view');

      expect(response.status).toBe(200);

      const pinIds = response.body.pins.map((p: any) => p.id);

      // Should include public NPC pin
      expect(pinIds).toContain(publicNPCPinId);

      // Should NOT include dm_only NPC pin
      expect(pinIds).not.toContain(dmOnlyNPCPinId);
    });

    it('should filter pins when retrieving maps', async () => {
      const dmResponse = await request(app)
        .get(`/api/locations/${testLocationId}/maps`)
        .set('X-View-Mode', 'dm_view');

      const playerResponse = await request(app)
        .get(`/api/locations/${testLocationId}/maps`)
        .set('X-View-Mode', 'player_view');

      expect(dmResponse.status).toBe(200);
      expect(playerResponse.status).toBe(200);

      // DM should see more pins
      expect(dmResponse.body.pins.length).toBe(4);
      expect(playerResponse.body.pins.length).toBe(2);
    });
  });

  describe('Region Filtering by View Mode', () => {
    it('should show all regions in dm_view', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/regions`)
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);
      expect(response.body.regions).toHaveLength(2);

      const regionIds = response.body.regions.map((r: any) => r.id);
      expect(regionIds).toContain(publicFactionRegionId);
      expect(regionIds).toContain(dmOnlyFactionRegionId);
    });

    it('should hide regions of dm_only factions in player_view', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/regions`)
        .set('X-View-Mode', 'player_view');

      expect(response.status).toBe(200);

      const regionIds = response.body.regions.map((r: any) => r.id);

      // Should include public faction region
      expect(regionIds).toContain(publicFactionRegionId);

      // Should NOT include dm_only faction region
      expect(regionIds).not.toContain(dmOnlyFactionRegionId);
    });

    it('should filter regions when retrieving maps', async () => {
      const dmResponse = await request(app)
        .get(`/api/locations/${testLocationId}/maps`)
        .set('X-View-Mode', 'dm_view');

      const playerResponse = await request(app)
        .get(`/api/locations/${testLocationId}/maps`)
        .set('X-View-Mode', 'player_view');

      expect(dmResponse.status).toBe(200);
      expect(playerResponse.status).toBe(200);

      // DM should see more regions
      expect(dmResponse.body.regions.length).toBe(2);
      expect(playerResponse.body.regions.length).toBe(1);

      // Player should only see public faction region
      const playerRegionFactionIds = playerResponse.body.regions.map((r: any) => r.faction_id);
      expect(playerRegionFactionIds).toContain(publicFactionId);
      expect(playerRegionFactionIds).not.toContain(dmOnlyFactionId);
    });
  });

  describe('Mixed Visibility Scenarios', () => {
    it('should handle partial visibility correctly', async () => {
      // Create NPC with partial visibility
      const partialNPCId = uuidv4();
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, class, locations)
        VALUES (?, ?, 'Partial NPC', 'partial', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]')
      `).run(partialNPCId, testCampaignId);

      // Add pin for partial NPC
      const pins = JSON.parse(db.prepare(`
        SELECT map_pins FROM locations WHERE id = ?
      `).get(testLocationId).map_pins);

      pins.push({
        id: uuidv4(),
        map_id: testMapId,
        x: 150,
        y: 150,
        linked_entity_type: 'npc',
        linked_entity_id: partialNPCId,
        label: 'Partial NPC',
        created_at: Date.now()
      });

      db.prepare(`
        UPDATE locations SET map_pins = ? WHERE id = ?
      `).run(JSON.stringify(pins), testLocationId);

      // Player should see partial visibility entities
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/pins`)
        .set('X-View-Mode', 'player_view');

      const partialPin = response.body.pins.find((p: any) =>
        p.linked_entity_id === partialNPCId
      );
      expect(partialPin).toBeDefined();
    });

    it('should default to dm_view when X-View-Mode not specified', async () => {
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/pins`);

      expect(response.status).toBe(200);
      expect(response.body.pins).toHaveLength(5); // All pins including the partial one
    });

    it('should handle empty player_knowledge as visible', async () => {
      // Create entity with null player_knowledge
      const nullVisibilityNPCId = uuidv4();
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, class, locations)
        VALUES (?, ?, 'Null Visibility NPC', NULL, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]')
      `).run(nullVisibilityNPCId, testCampaignId);

      // Add pin
      const pins = JSON.parse(db.prepare(`
        SELECT map_pins FROM locations WHERE id = ?
      `).get(testLocationId).map_pins);

      pins.push({
        id: uuidv4(),
        map_id: testMapId,
        x: 250,
        y: 250,
        linked_entity_type: 'npc',
        linked_entity_id: nullVisibilityNPCId,
        created_at: Date.now()
      });

      db.prepare(`
        UPDATE locations SET map_pins = ? WHERE id = ?
      `).run(JSON.stringify(pins), testLocationId);

      // Should be visible in player view (null = public)
      const response = await request(app)
        .get(`/api/locations/${testLocationId}/pins`)
        .set('X-View-Mode', 'player_view');

      const nullPin = response.body.pins.find((p: any) =>
        p.linked_entity_id === nullVisibilityNPCId
      );
      expect(nullPin).toBeDefined();
    });
  });
});