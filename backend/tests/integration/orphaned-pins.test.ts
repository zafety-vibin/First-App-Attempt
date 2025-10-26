import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../src/services/DatabaseService';
import { LocationPinService } from '../../src/services/LocationPinService';

/**
 * Integration Test: Orphaned Pin Handling
 *
 * Feature 021: Tests behavior when linked entities are deleted
 * Validates orphaned pin detection and cleanup strategies
 */

describe('Orphaned Pins Integration Tests', () => {
  let db: DatabaseService;
  let pinService: LocationPinService;
  let testCampaignId: string;
  let testLocationId: string;
  let testMapId: string;

  beforeAll(async () => {
    db = new DatabaseService();
    pinService = new LocationPinService();

    testCampaignId = uuidv4();
    testLocationId = uuidv4();
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
      INSERT INTO locations (id, campaign_id, name, map_images, map_pins, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Main Region', ?, '[]', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(testLocationId, testCampaignId, JSON.stringify([mapData]));
  });

  afterAll(async () => {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
  });

  describe('Orphaned Pin Detection', () => {
    it('should handle deletion of linked location', async () => {
      // Create location to link to
      const linkedLocationId = uuidv4();
      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'City to Delete', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(linkedLocationId, testCampaignId);

      // Create pin linking to location
      const pinId = await pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 100,
        y: 100,
        linked_entity_type: 'location',
        linked_entity_id: linkedLocationId,
        label: 'City Pin'
      });

      // Verify pin exists
      let pins = await pinService.getPins(testLocationId);
      expect(pins.find(p => p.id === pinId)).toBeDefined();

      // Delete the linked location
      db.prepare(`DELETE FROM locations WHERE id = ?`).run(linkedLocationId);

      // Check orphaned pin behavior
      const orphanedPins = await pinService.getOrphanedPins(testLocationId);
      expect(orphanedPins).toContain(pinId);

      // Verify service handles orphaned pin gracefully
      pins = await pinService.getPins(testLocationId);
      const orphanedPin = pins.find(p => p.id === pinId);

      if (orphanedPin) {
        // Option 1: Pin still exists but marked as orphaned
        expect(orphanedPin.linked_entity_id).toBe(linkedLocationId);
        // Service should indicate entity doesn't exist
        const entityExists = await pinService.validateLinkedEntity(
          orphanedPin.linked_entity_type,
          orphanedPin.linked_entity_id
        );
        expect(entityExists).toBe(false);
      } else {
        // Option 2: Pin was auto-removed
        expect(pins.find(p => p.id === pinId)).toBeUndefined();
      }
    });

    it('should handle deletion of linked NPC', async () => {
      // Create NPC to link to
      const linkedNPCId = uuidv4();
      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at, tags, custom_fields, class, locations)
        VALUES (?, ?, 'NPC to Delete', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]')
      `).run(linkedNPCId, testCampaignId);

      // Create pin linking to NPC
      const pinId = await pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 200,
        y: 200,
        linked_entity_type: 'npc',
        linked_entity_id: linkedNPCId,
        label: 'NPC Pin'
      });

      // Delete the linked NPC
      db.prepare(`DELETE FROM npcs WHERE id = ?`).run(linkedNPCId);

      // Check orphaned pin
      const orphanedPins = await pinService.getOrphanedPins(testLocationId);
      expect(orphanedPins).toContain(pinId);
    });

    it('should detect multiple orphaned pins', async () => {
      // Create multiple entities
      const location1Id = uuidv4();
      const location2Id = uuidv4();
      const npc1Id = uuidv4();

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES
          (?, ?, 'Location 1', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
          (?, ?, 'Location 2', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(location1Id, testCampaignId, location2Id, testCampaignId);

      db.prepare(`
        INSERT INTO npcs (id, campaign_id, name, created_at, updated_at, tags, custom_fields, class, locations)
        VALUES (?, ?, 'NPC 1', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]')
      `).run(npc1Id, testCampaignId);

      // Create pins for each entity
      const pin1Id = await pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 300,
        y: 300,
        linked_entity_type: 'location',
        linked_entity_id: location1Id
      });

      const pin2Id = await pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 400,
        y: 400,
        linked_entity_type: 'location',
        linked_entity_id: location2Id
      });

      const pin3Id = await pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 500,
        y: 500,
        linked_entity_type: 'npc',
        linked_entity_id: npc1Id
      });

      // Delete all entities
      db.prepare(`DELETE FROM locations WHERE id IN (?, ?)`).run(location1Id, location2Id);
      db.prepare(`DELETE FROM npcs WHERE id = ?`).run(npc1Id);

      // All pins should be orphaned
      const orphanedPins = await pinService.getOrphanedPins(testLocationId);
      expect(orphanedPins).toContain(pin1Id);
      expect(orphanedPins).toContain(pin2Id);
      expect(orphanedPins).toContain(pin3Id);
    });

    it('should provide cleanup warnings', async () => {
      // Create and link entities
      const locationId = uuidv4();
      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Temp Location', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(locationId, testCampaignId);

      await pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 600,
        y: 600,
        linked_entity_type: 'location',
        linked_entity_id: locationId,
        label: 'Temp Pin'
      });

      // Get cleanup warning before deletion
      const warnings = await pinService.getDeletionWarnings(locationId);
      expect(warnings).toBeDefined();
      expect(warnings.affectedPins).toBeGreaterThan(0);
      expect(warnings.message).toContain('pin');
    });

    it('should support auto-removal of orphaned pins', async () => {
      // Create location
      const locationId = uuidv4();
      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Auto-Remove Location', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(locationId, testCampaignId);

      const pinId = await pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 700,
        y: 700,
        linked_entity_type: 'location',
        linked_entity_id: locationId
      });

      // Delete location
      db.prepare(`DELETE FROM locations WHERE id = ?`).run(locationId);

      // Clean up orphaned pins
      const removedCount = await pinService.removeOrphanedPins(testLocationId);
      expect(removedCount).toBeGreaterThan(0);

      // Verify pin was removed
      const pins = await pinService.getPins(testLocationId);
      expect(pins.find(p => p.id === pinId)).toBeUndefined();
    });

    it('should handle cascade deletion from campaign', async () => {
      // Create separate campaign for cascade test
      const cascadeCampaignId = uuidv4();
      const cascadeLocationId = uuidv4();
      const cascadeMapId = uuidv4();

      db.prepare(`
        INSERT INTO campaigns (id, owner_id, name, created_at, updated_at)
        VALUES (?, 'test-user', 'Cascade Campaign', strftime('%s', 'now'), strftime('%s', 'now'))
      `).run(cascadeCampaignId);

      // Create location with map and pins
      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, map_images, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Cascade Location', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(cascadeLocationId, cascadeCampaignId, JSON.stringify([{
        id: cascadeMapId,
        name: 'Map',
        data: 'data:image/png;base64,test',
        width: 1024,
        height: 768
      }]));

      // Create child location
      const childLocationId = uuidv4();
      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Child', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(childLocationId, cascadeCampaignId, cascadeLocationId);

      // Create pin
      const pins = [{
        id: uuidv4(),
        map_id: cascadeMapId,
        x: 100,
        y: 100,
        linked_entity_type: 'location',
        linked_entity_id: childLocationId,
        created_at: Date.now()
      }];

      db.prepare(`
        UPDATE locations SET map_pins = ? WHERE id = ?
      `).run(JSON.stringify(pins), cascadeLocationId);

      // Delete campaign (CASCADE should delete everything)
      db.prepare(`DELETE FROM campaigns WHERE id = ?`).run(cascadeCampaignId);

      // Verify everything was cascade deleted
      const location = db.prepare(`
        SELECT * FROM locations WHERE id = ?
      `).get(cascadeLocationId);
      expect(location).toBeUndefined();

      const child = db.prepare(`
        SELECT * FROM locations WHERE id = ?
      `).get(childLocationId);
      expect(child).toBeUndefined();
    });

    it('should handle partial entity updates', async () => {
      // Create location
      const locationId = uuidv4();
      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Update Test Location', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(locationId, testCampaignId);

      const pinId = await pinService.createPin(testLocationId, {
        map_id: testMapId,
        x: 800,
        y: 800,
        linked_entity_type: 'location',
        linked_entity_id: locationId,
        label: 'Original Label'
      });

      // Update location name
      db.prepare(`
        UPDATE locations SET name = 'Updated Name' WHERE id = ?
      `).run(locationId);

      // Pin should still be valid
      const pins = await pinService.getPins(testLocationId);
      const pin = pins.find(p => p.id === pinId);
      expect(pin).toBeDefined();
      expect(pin?.linked_entity_id).toBe(locationId);

      // Verify entity still exists
      const entityExists = await pinService.validateLinkedEntity('location', locationId);
      expect(entityExists).toBe(true);
    });

    it('should report orphaned pins in batch operations', async () => {
      // Create multiple locations
      const locationIds = Array.from({ length: 5 }, () => uuidv4());

      for (const id of locationIds) {
        db.prepare(`
          INSERT INTO locations (id, campaign_id, name, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
          VALUES (?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
        `).run(id, testCampaignId, `Location ${id.slice(0, 8)}`);

        await pinService.createPin(testLocationId, {
          map_id: testMapId,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
          linked_entity_type: 'location',
          linked_entity_id: id
        });
      }

      // Delete half the locations
      const toDelete = locationIds.slice(0, 3);
      db.prepare(`
        DELETE FROM locations WHERE id IN (${toDelete.map(() => '?').join(',')})
      `).run(...toDelete);

      // Get orphaned pins report
      const orphanedPins = await pinService.getOrphanedPins(testLocationId);
      const orphanedCount = orphanedPins.length;

      // Should have orphaned pins for deleted locations
      expect(orphanedCount).toBeGreaterThanOrEqual(3);

      // Batch cleanup
      const cleanedCount = await pinService.removeOrphanedPins(testLocationId);
      expect(cleanedCount).toBe(orphanedCount);
    });
  });
});