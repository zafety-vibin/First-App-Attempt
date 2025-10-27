import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express, { Application } from 'express';
import hierarchyNavigatorRoutes from '../../src/routes/hierarchy-navigator';
import { createTestUser, cleanupTestUser, getAuthHeader, TestUser } from '../helpers/testAuth';

/**
 * Contract Tests: Geographic Hierarchy Navigator API
 *
 * Feature 021: Location hierarchy tree and breadcrumb navigation
 * Tests tree building, cycle detection, and parent-child traversal
 *
 * Contract: specs/021-create-a-geographic/contracts/hierarchy-navigator.yaml
 */

describe('Hierarchy Navigator API Contract Tests', () => {
  let app: Application;
  let testUser: TestUser;
  let testCampaignId: string;
  let rootLocationId: string;
  let continentId: string;
  let regionId: string;
  let cityId: string;
  let districtId: string;
  let cycleLocation1Id: string;
  let cycleLocation2Id: string;
  let cycleLocation3Id: string;

  beforeAll(async () => {
    // Initialize test Express app
    app = express();
    app.use(express.json());
    app.use('/api', hierarchyNavigatorRoutes);

    // Create test user with auth session
    testUser = createTestUser();

    // Setup test data
    testCampaignId = uuidv4();
    rootLocationId = uuidv4();
    continentId = uuidv4();
    regionId = uuidv4();
    cityId = uuidv4();
    districtId = uuidv4();
    cycleLocation1Id = uuidv4();
    cycleLocation2Id = uuidv4();
    cycleLocation3Id = uuidv4();

    const { db } = await import('../../src/services/DatabaseService');

    // Create test campaign
    db.prepare(`
      INSERT INTO campaigns (id, owner_id, name, created_at, updated_at)
      VALUES (?, ?, 'Test Campaign', strftime('%s', 'now'), strftime('%s', 'now'))
    `).run(testCampaignId, testUser.id);

    // Create location hierarchy (root → continent → region → city → district)
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, location_type, parent_location_id, map_images, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES
        (?, ?, 'Toril', 'planet', NULL, '[]', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'Faerûn', 'continent', ?, '[{"id":"map1","name":"Faerûn Map"}]', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'Sword Coast', 'region', ?, '[]', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'Waterdeep', 'city', ?, '[{"id":"map2","name":"City Map"}]', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'Castle Ward', 'district', ?, '[]', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(
      rootLocationId, testCampaignId,
      continentId, testCampaignId, rootLocationId,
      regionId, testCampaignId, continentId,
      cityId, testCampaignId, regionId,
      districtId, testCampaignId, cityId
    );

    // Create circular reference chain (A → B → C → A)
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES
        (?, ?, 'Cycle A', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'Cycle B', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'Cycle C', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(
      cycleLocation1Id, testCampaignId, cycleLocation2Id,
      cycleLocation2Id, testCampaignId, cycleLocation3Id,
      cycleLocation3Id, testCampaignId, cycleLocation1Id
    );

    // Create dm_only location
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, parent_location_id, player_knowledge, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Secret Dungeon', ?, 'dm_only', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(uuidv4(), testCampaignId, cityId);
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
    cleanupTestUser(testUser.id);
  });

  describe('GET /api/campaigns/:campaign_id/locations/hierarchy', () => {
    it('should build complete hierarchy tree', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/locations/hierarchy`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        tree: expect.any(Array),
        total_locations: expect.any(Number),
        cycles_detected: expect.any(Array)
      });

      // Should have root location at top level
      const root = response.body.tree.find((n: any) => n.location.id === rootLocationId);
      expect(root).toBeDefined();
      expect(root.location.name).toBe('Toril');
      expect(root.depth).toBe(0);
      expect(root.has_map).toBe(false);

      // Check nested structure
      expect(root.children).toBeDefined();
      const continent = root.children.find((n: any) => n.location.id === continentId);
      expect(continent).toBeDefined();
      expect(continent.location.name).toBe('Faerûn');
      expect(continent.depth).toBe(1);
      expect(continent.has_map).toBe(true);

      // Check deep nesting
      const region = continent.children.find((n: any) => n.location.id === regionId);
      const city = region?.children.find((n: any) => n.location.id === cityId);
      const district = city?.children.find((n: any) => n.location.id === districtId);
      expect(district).toBeDefined();
      expect(district.depth).toBe(4);
    });

    it('should detect circular references', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/locations/hierarchy`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);
      expect(response.body.cycles_detected).toBeDefined();
      expect(response.body.cycles_detected.length).toBeGreaterThan(0);

      // Check cycle detection includes our circular chain
      const cycle = response.body.cycles_detected.find((c: any) =>
        c.cycle_path.includes(cycleLocation1Id)
      );
      expect(cycle).toBeDefined();
      expect(cycle.cycle_path).toContain(cycleLocation2Id);
      expect(cycle.cycle_path).toContain(cycleLocation3Id);
    });

    it('should filter locations by X-View-Mode', async () => {
      const dmResponse = await request(app)
        .get(`/api/campaigns/${testCampaignId}/locations/hierarchy`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'dm_view');

      const playerResponse = await request(app)
        .get(`/api/campaigns/${testCampaignId}/locations/hierarchy`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'player_view');

      expect(dmResponse.status).toBe(200);
      expect(playerResponse.status).toBe(200);

      // DM view should have more locations (includes dm_only)
      expect(dmResponse.body.total_locations).toBeGreaterThan(playerResponse.body.total_locations);
    });

    it('should mark locations with cycles', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${testCampaignId}/locations/hierarchy`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);

      // Find a node in the cycle
      const findNodeWithCycle = (nodes: any[]): any => {
        for (const node of nodes) {
          if (node.has_cycle) return node;
          if (node.children) {
            const found = findNodeWithCycle(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const cycleNode = findNodeWithCycle(response.body.tree);
      expect(cycleNode).toBeDefined();
      expect(cycleNode.has_cycle).toBe(true);
    });

    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get(`/api/campaigns/${uuidv4()}/locations/hierarchy`)
        .set(getAuthHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/locations/:id/breadcrumb', () => {
    it('should build breadcrumb path from leaf to root', async () => {
      const response = await request(app)
        .get(`/api/locations/${districtId}/breadcrumb`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        breadcrumb: expect.any(Array),
        has_cycle: false
      });

      // Breadcrumb should be ordered from root to current
      expect(response.body.breadcrumb).toHaveLength(5);
      expect(response.body.breadcrumb[0]).toMatchObject({
        location_id: rootLocationId,
        name: 'Toril',
        location_type: 'planet',
        depth: 0,
        has_map: false
      });
      expect(response.body.breadcrumb[1]).toMatchObject({
        location_id: continentId,
        name: 'Faerûn',
        location_type: 'continent',
        depth: 1,
        has_map: true
      });
      expect(response.body.breadcrumb[4]).toMatchObject({
        location_id: districtId,
        name: 'Castle Ward',
        location_type: 'district',
        depth: 4,
        has_map: false
      });
    });

    it('should handle root location breadcrumb', async () => {
      const response = await request(app)
        .get(`/api/locations/${rootLocationId}/breadcrumb`)
        .set(getAuthHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.breadcrumb).toHaveLength(1);
      expect(response.body.breadcrumb[0]).toMatchObject({
        location_id: rootLocationId,
        name: 'Toril',
        depth: 0
      });
    });

    it('should detect cycles in breadcrumb path', async () => {
      const response = await request(app)
        .get(`/api/locations/${cycleLocation1Id}/breadcrumb`)
        .set(getAuthHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.has_cycle).toBe(true);
      // Breadcrumb should still be returned but truncated at cycle point
      expect(response.body.breadcrumb).toBeDefined();
    });

    it('should filter breadcrumb by X-View-Mode', async () => {
      // Create location under dm_only parent
      const childOfSecretId = uuidv4();
      const { db } = await import('../../src/services/DatabaseService');

      const secretId = db.prepare(`
        SELECT id FROM locations WHERE campaign_id = ? AND player_knowledge = 'dm_only'
      `).get(testCampaignId) as any;

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Child of Secret', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(childOfSecretId, testCampaignId, secretId.id);

      // Player view should not be able to access breadcrumb through dm_only parent
      const response = await request(app)
        .get(`/api/locations/${childOfSecretId}/breadcrumb`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'player_view');

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .get(`/api/locations/${uuidv4()}/breadcrumb`)
        .set(getAuthHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/locations/:id/children', () => {
    it('should list immediate child locations', async () => {
      const response = await request(app)
        .get(`/api/locations/${regionId}/children`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'dm_view');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        children: expect.any(Array),
        count: expect.any(Number)
      });

      // Should only have Waterdeep as direct child
      expect(response.body.count).toBeGreaterThanOrEqual(1);
      const waterdeep = response.body.children.find((c: any) => c.id === cityId);
      expect(waterdeep).toBeDefined();
      expect(waterdeep).toMatchObject({
        id: cityId,
        name: 'Waterdeep',
        location_type: 'city',
        parent_location_id: regionId,
        map_count: 1
      });
    });

    it('should return empty array for leaf locations', async () => {
      const response = await request(app)
        .get(`/api/locations/${districtId}/children`)
        .set(getAuthHeader(testUser.token));

      expect(response.status).toBe(200);
      expect(response.body.children).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should filter children by X-View-Mode', async () => {
      // City has both regular and dm_only children
      const dmResponse = await request(app)
        .get(`/api/locations/${cityId}/children`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'dm_view');

      const playerResponse = await request(app)
        .get(`/api/locations/${cityId}/children`)
        .set(getAuthHeader(testUser.token))
        .set('X-View-Mode', 'player_view');

      expect(dmResponse.status).toBe(200);
      expect(playerResponse.status).toBe(200);

      // DM should see more children (includes Secret Dungeon)
      expect(dmResponse.body.count).toBeGreaterThan(playerResponse.body.count);

      // Player should not see Secret Dungeon
      const secretInPlayer = playerResponse.body.children.find((c: any) =>
        c.name === 'Secret Dungeon'
      );
      expect(secretInPlayer).toBeUndefined();
    });

    it('should include map_count for each child', async () => {
      const response = await request(app)
        .get(`/api/locations/${continentId}/children`)
        .set(getAuthHeader(testUser.token));

      expect(response.status).toBe(200);
      response.body.children.forEach((child: any) => {
        expect(child.map_count).toBeDefined();
        expect(typeof child.map_count).toBe('number');
      });
    });

    it('should return 404 for non-existent location', async () => {
      const response = await request(app)
        .get(`/api/locations/${uuidv4()}/children`)
        .set(getAuthHeader(testUser.token));

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });
});
