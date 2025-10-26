import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../src/services/DatabaseService';
import { LocationPinService } from '../../src/services/LocationPinService';

/**
 * Integration Test: Pin Navigation Functionality
 *
 * Feature 021: Tests pin creation, entity linking, and coordinate accuracy
 * Validates JSON storage structure and pin-to-entity relationships
 */

describe('Pin Navigation Integration Tests', () => {
  let db: DatabaseService;
  let pinService: LocationPinService;
  let testCampaignId: string;
  let testLocationId: string;
  let childLocation1Id: string;
  let childLocation2Id: string;
  let testNPC1Id: string;
  let testNPC2Id: string;
  let testMapId: string;

  beforeAll(async () => {
    db = new DatabaseService();
    pinService = new LocationPinService();

    testCampaignId = uuidv4();
    testLocationId = uuidv4();
    childLocation1Id = uuidv4();
    childLocation2Id = uuidv4();
    testNPC1Id = uuidv4();
    testNPC2Id = uuidv4();
    testMapId = uuidv4();

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

    // Create parent location with map
    const mapData = {
      id: testMapId,
      name: 'Test Map',
      data: 'data:image/png;base64,iVBORw0KGgo=',
      width: 2048,
      height: 1536,
      uploaded_at: Date.now()
    };

    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, map_images, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Parent Region', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(testLocationId, testCampaignId, JSON.stringify([mapData]));

    // Create child locations
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES
        (?, ?, 'City A', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'City B', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(
      childLocation1Id, testCampaignId, testLocationId,
      childLocation2Id, testCampaignId, testLocationId
    );

    // Create NPCs
    db.prepare(`
      INSERT INTO npcs (id, campaign_id, name, description, created_at, updated_at, tags, custom_fields, class, locations)
      VALUES
        (?, ?, 'Lord Mayor', 'City leader', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '["noble"]', ?),
        (?, ?, 'Guard Captain', 'Military leader', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '["fighter"]', ?)
    `).run(
      testNPC1Id, testCampaignId, JSON.stringify([childLocation1Id]),
      testNPC2Id, testCampaignId, JSON.stringify([childLocation2Id])
    );
  });

  afterAll(async () => {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
  });

  describe('Pin Creation and Linking', () => {
    it('should create pin with exact coordinates', async () => {
      const pinData = {
        map_id: testMapId,
        x: 512.5,
        y: 384.75,
        linked_entity_type: 'location',
        linked_entity_id: childLocation1Id,
        icon: 'city',
        color: '#3B82F6',
        label: 'City A'
      };

      const pinId = await pinService.createPin(testLocationId, pinData);

      expect(pinId).toBeDefined();

      // Verify pin was stored with exact coordinates
      const location = db.prepare(`
        SELECT map_pins FROM locations WHERE id = ?
      `).get(testLocationId) as any;

      const pins = JSON.parse(location.map_pins || '[]');
      expect(pins).toHaveLength(1);
      expect(pins[0]).toMatchObject({
        id: pinId,
        map_id: testMapId,
        x: 512.5,
        y: 384.75,
        linked_entity_type: 'location',
        linked_entity_id: childLocation1Id
      });
    });

    it('should link pin to location entity', async () => {
      const pinData = {
        map_id: testMapId,
        x: 1024,
        y: 768,
        linked_entity_type: 'location',
        linked_entity_id: childLocation2Id,
        icon: 'town',
        label: 'City B'
      };

      const pinId = await pinService.createPin(testLocationId, pinData);

      // Verify linking
      const linkedLocation = db.prepare(`
        SELECT name FROM locations WHERE id = ?
      `).get(childLocation2Id) as any;

      expect(linkedLocation).toBeDefined();
      expect(linkedLocation.name).toBe('City B');

      // Verify pin references correct location
      const pins = await pinService.getPins(testLocationId);
      const cityBPin = pins.find(p => p.id === pinId);
      expect(cityBPin?.linked_entity_id).toBe(childLocation2Id);
    });

    it('should link pin to NPC entity', async () => {
      const pinData = {
        map_id: testMapId,
        x: 600,
        y: 450,
        linked_entity_type: 'npc',
        linked_entity_id: testNPC1Id,
        icon: 'other',
        color: '#EF4444',
        label: 'Lord Mayor'
      };

      const pinId = await pinService.createPin(testLocationId, pinData);

      // Verify NPC linking
      const linkedNPC = db.prepare(`
        SELECT name, locations FROM npcs WHERE id = ?
      `).get(testNPC1Id) as any;

      expect(linkedNPC).toBeDefined();
      expect(linkedNPC.name).toBe('Lord Mayor');

      // Verify pin entity type
      const pins = await pinService.getPins(testLocationId);
      const npcPin = pins.find(p => p.id === pinId);
      expect(npcPin?.linked_entity_type).toBe('npc');
      expect(npcPin?.linked_entity_id).toBe(testNPC1Id);
    });

    it('should verify map_pins JSON structure', async () => {
      const location = db.prepare(`
        SELECT map_pins FROM locations WHERE id = ?
      `).get(testLocationId) as any;

      const pins = JSON.parse(location.map_pins || '[]');
      expect(pins).toHaveLength(3);

      // Verify each pin has required fields
      pins.forEach((pin: any) => {
        expect(pin).toHaveProperty('id');
        expect(pin).toHaveProperty('map_id');
        expect(pin).toHaveProperty('x');
        expect(pin).toHaveProperty('y');
        expect(pin).toHaveProperty('linked_entity_type');
        expect(pin).toHaveProperty('linked_entity_id');
        expect(pin).toHaveProperty('created_at');
      });
    });

    it('should maintain pin coordinate accuracy', async () => {
      // Create pins at precise coordinates
      const preciseCoordinates = [
        { x: 0, y: 0 }, // Origin
        { x: 2047.999, y: 1535.999 }, // Near max
        { x: 1024, y: 768 }, // Center
        { x: 100.123, y: 200.456 }, // Decimal precision
      ];

      for (const coord of preciseCoordinates) {
        await pinService.createPin(testLocationId, {
          map_id: testMapId,
          x: coord.x,
          y: coord.y,
          linked_entity_type: 'location',
          linked_entity_id: childLocation1Id
        });
      }

      const pins = await pinService.getPins(testLocationId);

      // Verify coordinates are preserved exactly
      preciseCoordinates.forEach(coord => {
        const pin = pins.find(p => p.x === coord.x && p.y === coord.y);
        expect(pin).toBeDefined();
        expect(pin!.x).toBe(coord.x);
        expect(pin!.y).toBe(coord.y);
      });
    });

    it('should validate coordinates against map dimensions', async () => {
      // Out of bounds coordinates
      const invalidCoordinates = [
        { x: -1, y: 100 }, // Negative X
        { x: 100, y: -1 }, // Negative Y
        { x: 2049, y: 768 }, // Exceeds width
        { x: 1024, y: 1537 }, // Exceeds height
      ];

      for (const coord of invalidCoordinates) {
        await expect(pinService.createPin(testLocationId, {
          map_id: testMapId,
          x: coord.x,
          y: coord.y,
          linked_entity_type: 'location',
          linked_entity_id: childLocation1Id
        })).rejects.toThrow(/coordinate|bounds/i);
      }
    });

    it('should update pin coordinates', async () => {
      const pins = await pinService.getPins(testLocationId);
      const pinToUpdate = pins[0];

      const newCoords = { x: 1500, y: 1000 };
      await pinService.updatePin(testLocationId, pinToUpdate.id, newCoords);

      const updatedPins = await pinService.getPins(testLocationId);
      const updatedPin = updatedPins.find(p => p.id === pinToUpdate.id);

      expect(updatedPin).toBeDefined();
      expect(updatedPin!.x).toBe(newCoords.x);
      expect(updatedPin!.y).toBe(newCoords.y);
    });

    it('should update pin linked entity', async () => {
      const pins = await pinService.getPins(testLocationId);
      const pinToUpdate = pins.find(p => p.linked_entity_type === 'location');

      await pinService.updatePin(testLocationId, pinToUpdate!.id, {
        linked_entity_type: 'npc',
        linked_entity_id: testNPC2Id
      });

      const updatedPins = await pinService.getPins(testLocationId);
      const updatedPin = updatedPins.find(p => p.id === pinToUpdate!.id);

      expect(updatedPin).toBeDefined();
      expect(updatedPin!.linked_entity_type).toBe('npc');
      expect(updatedPin!.linked_entity_id).toBe(testNPC2Id);
    });

    it('should handle pin deletion', async () => {
      const pins = await pinService.getPins(testLocationId);
      const pinToDelete = pins[pins.length - 1];

      await pinService.deletePin(testLocationId, pinToDelete.id);

      const remainingPins = await pinService.getPins(testLocationId);
      expect(remainingPins.find(p => p.id === pinToDelete.id)).toBeUndefined();
      expect(remainingPins.length).toBe(pins.length - 1);
    });

    it('should validate entity existence before linking', async () => {
      const nonExistentId = uuidv4();

      await expect(pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 100,
        y: 100,
        linked_entity_type: 'location',
        linked_entity_id: nonExistentId
      })).rejects.toThrow(/not found/i);

      await expect(pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 200,
        y: 200,
        linked_entity_type: 'npc',
        linked_entity_id: nonExistentId
      })).rejects.toThrow(/not found/i);
    });
  });
});