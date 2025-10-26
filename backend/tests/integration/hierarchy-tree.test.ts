import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../src/services/DatabaseService';
import { HierarchyNavigatorService } from '../../src/services/HierarchyNavigatorService';

/**
 * Integration Test: Location Hierarchy Tree Building
 *
 * Feature 021: Tests tree construction, cycle detection, and deep nesting
 * Validates parent_location_id relationships and breadcrumb computation
 */

describe('Hierarchy Tree Integration Tests', () => {
  let db: DatabaseService;
  let hierarchyService: HierarchyNavigatorService;
  let testCampaignId: string;
  let deepHierarchyIds: string[] = [];
  let cycleLocationIds: string[] = [];

  beforeAll(async () => {
    db = new DatabaseService();
    hierarchyService = new HierarchyNavigatorService();

    testCampaignId = uuidv4();

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

    // Create deep hierarchy (12 levels)
    for (let i = 0; i < 12; i++) {
      deepHierarchyIds.push(uuidv4());
    }

    for (let i = 0; i < deepHierarchyIds.length; i++) {
      const parentId = i === 0 ? null : deepHierarchyIds[i - 1];
      const locationType = ['world', 'continent', 'region', 'province', 'county', 'city', 'district', 'neighborhood', 'street', 'building', 'floor', 'room'][i];

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, location_type, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(deepHierarchyIds[i], testCampaignId, `Level ${i}`, locationType, parentId);
    }

    // Create circular reference chain (A → B → C → D → B)
    cycleLocationIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];

    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES
        (?, ?, 'Cycle A', NULL, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'Cycle B', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'Cycle C', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
        (?, ?, 'Cycle D', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(
      cycleLocationIds[0], testCampaignId,
      cycleLocationIds[1], testCampaignId, cycleLocationIds[0],
      cycleLocationIds[2], testCampaignId, cycleLocationIds[1],
      cycleLocationIds[3], testCampaignId, cycleLocationIds[2]
    );

    // Now create the cycle by updating B's parent to D
    db.prepare(`
      UPDATE locations SET parent_location_id = ? WHERE id = ?
    `).run(cycleLocationIds[3], cycleLocationIds[1]);
  });

  afterAll(async () => {
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(testCampaignId);
  });

  describe('Tree Building from parent_location_id', () => {
    it('should build complete hierarchy tree', async () => {
      const tree = await hierarchyService.buildHierarchyTree(testCampaignId);

      expect(tree).toBeDefined();
      expect(tree.tree).toBeInstanceOf(Array);
      expect(tree.total_locations).toBeGreaterThan(0);

      // Find root of deep hierarchy
      const root = tree.tree.find((node: any) => node.location.id === deepHierarchyIds[0]);
      expect(root).toBeDefined();
      expect(root.depth).toBe(0);
      expect(root.location.name).toBe('Level 0');
    });

    it('should handle deep nesting (10+ levels)', async () => {
      const tree = await hierarchyService.buildHierarchyTree(testCampaignId);

      // Traverse deep hierarchy
      let currentNode = tree.tree.find((node: any) => node.location.id === deepHierarchyIds[0]);
      expect(currentNode).toBeDefined();

      for (let i = 1; i < deepHierarchyIds.length; i++) {
        expect(currentNode.children).toBeDefined();
        expect(currentNode.children.length).toBeGreaterThan(0);

        currentNode = currentNode.children.find((node: any) =>
          node.location.id === deepHierarchyIds[i]
        );

        expect(currentNode).toBeDefined();
        expect(currentNode.depth).toBe(i);
        expect(currentNode.location.name).toBe(`Level ${i}`);
      }

      // Last level should have no children
      expect(currentNode.children).toEqual([]);
      expect(currentNode.depth).toBe(11);
    });

    it('should detect circular references', async () => {
      const tree = await hierarchyService.buildHierarchyTree(testCampaignId);

      expect(tree.cycles_detected).toBeDefined();
      expect(tree.cycles_detected.length).toBeGreaterThan(0);

      // Find our specific cycle
      const ourCycle = tree.cycles_detected.find((cycle: any) =>
        cycle.cycle_path.includes(cycleLocationIds[1])
      );

      expect(ourCycle).toBeDefined();
      expect(ourCycle.cycle_path).toContain(cycleLocationIds[1]);
      expect(ourCycle.cycle_path).toContain(cycleLocationIds[2]);
      expect(ourCycle.cycle_path).toContain(cycleLocationIds[3]);
    });

    it('should mark nodes in cycles', async () => {
      const tree = await hierarchyService.buildHierarchyTree(testCampaignId);

      // Find Cycle A (root of cycle chain)
      const cycleRoot = tree.tree.find((node: any) =>
        node.location.id === cycleLocationIds[0]
      );

      expect(cycleRoot).toBeDefined();

      // At least one node in the chain should be marked with has_cycle
      const findCycleNode = (node: any): boolean => {
        if (node.has_cycle) return true;
        if (node.children) {
          return node.children.some((child: any) => findCycleNode(child));
        }
        return false;
      };

      expect(findCycleNode(cycleRoot)).toBe(true);
    });

    it('should compute accurate breadcrumb paths', async () => {
      // Get breadcrumb for deepest level
      const deepestId = deepHierarchyIds[deepHierarchyIds.length - 1];
      const breadcrumb = await hierarchyService.getBreadcrumb(deepestId);

      expect(breadcrumb).toBeDefined();
      expect(breadcrumb.breadcrumb).toHaveLength(12);
      expect(breadcrumb.has_cycle).toBe(false);

      // Verify order (root to leaf)
      for (let i = 0; i < deepHierarchyIds.length; i++) {
        expect(breadcrumb.breadcrumb[i].location_id).toBe(deepHierarchyIds[i]);
        expect(breadcrumb.breadcrumb[i].name).toBe(`Level ${i}`);
        expect(breadcrumb.breadcrumb[i].depth).toBe(i);
      }
    });

    it('should handle breadcrumb for locations in cycles', async () => {
      const breadcrumb = await hierarchyService.getBreadcrumb(cycleLocationIds[2]);

      expect(breadcrumb).toBeDefined();
      expect(breadcrumb.has_cycle).toBe(true);

      // Breadcrumb should be truncated at cycle detection point
      expect(breadcrumb.breadcrumb).toBeDefined();
      expect(breadcrumb.breadcrumb.length).toBeLessThanOrEqual(cycleLocationIds.length);
    });

    it('should handle multiple root locations', async () => {
      // Create additional root locations
      const root2Id = uuidv4();
      const root3Id = uuidv4();

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES
          (?, ?, 'Root 2', NULL, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]'),
          (?, ?, 'Root 3', NULL, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(root2Id, testCampaignId, root3Id, testCampaignId);

      const tree = await hierarchyService.buildHierarchyTree(testCampaignId);

      // Should have multiple root nodes
      const rootNodes = tree.tree.filter((node: any) =>
        node.location.parent_location_id === null
      );

      expect(rootNodes.length).toBeGreaterThanOrEqual(3);

      const rootNames = rootNodes.map((n: any) => n.location.name);
      expect(rootNames).toContain('Level 0');
      expect(rootNames).toContain('Root 2');
      expect(rootNames).toContain('Root 3');
    });

    it('should get children for a location', async () => {
      const parentId = deepHierarchyIds[5]; // City level
      const children = await hierarchyService.getChildren(parentId);

      expect(children).toBeDefined();
      expect(children.children).toHaveLength(1);
      expect(children.children[0].id).toBe(deepHierarchyIds[6]);
      expect(children.children[0].name).toBe('Level 6');
      expect(children.count).toBe(1);
    });

    it('should handle orphaned locations gracefully', async () => {
      // Create location with non-existent parent
      const orphanId = uuidv4();
      const fakeParentId = uuidv4();

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Orphan', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(orphanId, testCampaignId, fakeParentId);

      const tree = await hierarchyService.buildHierarchyTree(testCampaignId);

      // Orphaned location should be treated as root or excluded
      const orphanNode = tree.tree.find((node: any) => node.location.id === orphanId);

      if (orphanNode) {
        // If included, should be at root level
        expect(orphanNode.depth).toBe(0);
      }

      // Breadcrumb for orphan should handle missing parent
      const breadcrumb = await hierarchyService.getBreadcrumb(orphanId);
      expect(breadcrumb).toBeDefined();
      expect(breadcrumb.breadcrumb[0].location_id).toBe(orphanId);
    });

    it('should handle self-referencing locations', async () => {
      // Create location that is its own parent
      const selfRefId = uuidv4();

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Self Reference', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(selfRefId, testCampaignId, selfRefId);

      const tree = await hierarchyService.buildHierarchyTree(testCampaignId);

      // Should detect this as a cycle
      const selfCycle = tree.cycles_detected.find((cycle: any) =>
        cycle.location_id === selfRefId
      );

      expect(selfCycle).toBeDefined();
    });

    it('should handle complex multi-branch trees', async () => {
      // Create a more complex tree structure
      const complexRoot = uuidv4();
      const branch1 = [uuidv4(), uuidv4()];
      const branch2 = [uuidv4(), uuidv4(), uuidv4()];

      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, 'Complex Root', NULL, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(complexRoot, testCampaignId);

      // Branch 1
      for (let i = 0; i < branch1.length; i++) {
        const parentId = i === 0 ? complexRoot : branch1[i - 1];
        db.prepare(`
          INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
          VALUES (?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
        `).run(branch1[i], testCampaignId, `Branch1-${i}`, parentId);
      }

      // Branch 2
      for (let i = 0; i < branch2.length; i++) {
        const parentId = i === 0 ? complexRoot : branch2[i - 1];
        db.prepare(`
          INSERT INTO locations (id, campaign_id, name, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
          VALUES (?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
        `).run(branch2[i], testCampaignId, `Branch2-${i}`, parentId);
      }

      const tree = await hierarchyService.buildHierarchyTree(testCampaignId);

      const complexNode = tree.tree.find((node: any) => node.location.id === complexRoot);
      expect(complexNode).toBeDefined();
      expect(complexNode.children).toHaveLength(2);

      // Verify both branches exist
      const b1Node = complexNode.children.find((n: any) => n.location.name === 'Branch1-0');
      const b2Node = complexNode.children.find((n: any) => n.location.name === 'Branch2-0');
      expect(b1Node).toBeDefined();
      expect(b2Node).toBeDefined();

      // Verify branch depths
      expect(b1Node.children).toHaveLength(1);
      expect(b2Node.children[0].children).toHaveLength(1);
    });
  });
});