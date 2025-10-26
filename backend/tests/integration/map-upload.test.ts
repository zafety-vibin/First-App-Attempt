import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../src/services/DatabaseService';
import { LocationMapService } from '../../src/services/LocationMapService';

/**
 * Integration Test: Map Upload Functionality
 *
 * Feature 021: Tests map image storage in locations table
 * Validates JSON storage, base64 data, and multiple maps per location
 */

describe('Map Upload Integration Tests', () => {
  let db: DatabaseService;
  let mapService: LocationMapService;
  let testCampaignId: string;
  let testLocationId: string;

  const validBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const anotherBase64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';

  beforeAll(async () => {
    db = new DatabaseService();
    mapService = new LocationMapService();

    testCampaignId = uuidv4();
    testLocationId = uuidv4();

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
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
  });

  describe('Map Upload to Location', () => {
    it('should upload map and update map_images JSON column', async () => {
      const mapData = {
        name: 'World Map',
        data: validBase64Image,
        width: 2048,
        height: 1536
      };

      const mapId = await mapService.uploadMap(testLocationId, mapData);

      expect(mapId).toBeDefined();

      // Verify map_images column was updated
      const location = db.prepare(`
        SELECT map_images FROM locations WHERE id = ?
      `).get(testLocationId) as any;

      expect(location).toBeDefined();
      const mapImages = JSON.parse(location.map_images || '[]');
      expect(mapImages).toHaveLength(1);
      expect(mapImages[0]).toMatchObject({
        id: mapId,
        name: 'World Map',
        data: validBase64Image,
        width: 2048,
        height: 1536
      });
      expect(mapImages[0].uploaded_at).toBeDefined();
    });

    it('should retrieve map and verify base64 data integrity', async () => {
      const maps = await mapService.getMaps(testLocationId);

      expect(maps).toHaveLength(1);
      expect(maps[0].data).toBe(validBase64Image);

      // Verify base64 can be decoded (basic validation)
      const base64Data = maps[0].data.split(',')[1];
      expect(() => Buffer.from(base64Data, 'base64')).not.toThrow();
    });

    it('should support multiple maps per location', async () => {
      // Add second map
      const secondMap = {
        name: 'City Map',
        data: anotherBase64Image,
        width: 1024,
        height: 768
      };

      const secondMapId = await mapService.uploadMap(testLocationId, secondMap);

      // Add third map
      const thirdMap = {
        name: 'Dungeon Map',
        data: validBase64Image,
        width: 800,
        height: 600
      };

      const thirdMapId = await mapService.uploadMap(testLocationId, thirdMap);

      // Verify all maps are stored
      const maps = await mapService.getMaps(testLocationId);
      expect(maps).toHaveLength(3);

      const mapNames = maps.map(m => m.name);
      expect(mapNames).toContain('World Map');
      expect(mapNames).toContain('City Map');
      expect(mapNames).toContain('Dungeon Map');

      // Verify each map has unique ID
      const mapIds = maps.map(m => m.id);
      expect(new Set(mapIds).size).toBe(3);
    });

    it('should handle map deletion and update JSON array', async () => {
      const maps = await mapService.getMaps(testLocationId);
      const mapToDelete = maps[1]; // Delete middle map

      await mapService.deleteMap(testLocationId, mapToDelete.id);

      // Verify map was removed
      const remainingMaps = await mapService.getMaps(testLocationId);
      expect(remainingMaps).toHaveLength(2);

      const remainingNames = remainingMaps.map(m => m.name);
      expect(remainingNames).not.toContain(mapToDelete.name);
      expect(remainingNames).toContain('World Map');
      expect(remainingNames).toContain('Dungeon Map');
    });

    it('should validate image size limits', async () => {
      // Create large data string (>10MB)
      const largeData = 'data:image/png;base64,' + 'A'.repeat(15 * 1024 * 1024);

      const largeMap = {
        name: 'Too Large',
        data: largeData,
        width: 2048,
        height: 1536
      };

      await expect(mapService.uploadMap(testLocationId, largeMap))
        .rejects.toThrow('too large');
    });

    it('should validate image dimensions', async () => {
      const oversizedMap = {
        name: 'Oversized',
        data: validBase64Image,
        width: 15000, // exceeds 10000 max
        height: 1536
      };

      await expect(mapService.uploadMap(testLocationId, oversizedMap))
        .rejects.toThrow('dimension');
    });

    it('should validate base64 format', async () => {
      const invalidMap = {
        name: 'Invalid',
        data: 'not-a-valid-base64-image',
        width: 1024,
        height: 768
      };

      await expect(mapService.uploadMap(testLocationId, invalidMap))
        .rejects.toThrow('Invalid image data');
    });

    it('should preserve map metadata on location update', async () => {
      // Update location description
      db.prepare(`
        UPDATE locations
        SET description = 'Updated description', updated_at = strftime('%s', 'now')
        WHERE id = ?
      `).run(testLocationId);

      // Verify maps are still intact
      const maps = await mapService.getMaps(testLocationId);
      expect(maps).toHaveLength(2);
      expect(maps[0].name).toBe('World Map');
    });

    it('should handle concurrent map uploads', async () => {
      const location2Id = uuidv4();

      // Create second location
      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Location 2', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(location2Id, testCampaignId);

      // Upload maps concurrently
      const uploads = [
        mapService.uploadMap(location2Id, {
          name: 'Map A',
          data: validBase64Image,
          width: 512,
          height: 512
        }),
        mapService.uploadMap(location2Id, {
          name: 'Map B',
          data: validBase64Image,
          width: 512,
          height: 512
        }),
        mapService.uploadMap(location2Id, {
          name: 'Map C',
          data: validBase64Image,
          width: 512,
          height: 512
        })
      ];

      await Promise.all(uploads);

      // Verify all maps were uploaded
      const maps = await mapService.getMaps(location2Id);
      expect(maps).toHaveLength(3);
      expect(new Set(maps.map(m => m.name))).toEqual(new Set(['Map A', 'Map B', 'Map C']));
    });
  });
});