/**
 * Geographic Hierarchy Navigator REST API Routes
 * Feature: 021-create-a-geographic
 * Task: T018
 * Contract: specs/021-create-a-geographic/contracts/hierarchy-navigator.yaml
 */

import express, { Request, Response } from 'express';
import { LocationService } from '../services/LocationService';
import { protect } from '../middleware/auth';
import { extractViewMode, getPlayerKnowledgeFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();
const locationService = new LocationService(db);

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);

/**
 * LocationTreeNode interface (matches contract schema)
 */
interface LocationTreeNode {
  location: {
    id: string;
    campaign_id: string;
    name: string;
    location_type: string | null;
    parent_location_id: string | null;
    player_knowledge: string | null;
    tags: string[];
    map_count: number;
    created_at: number;
    updated_at: number;
  };
  children: LocationTreeNode[];
  depth: number;
  has_map: boolean;
  has_cycle: boolean;
}

/**
 * GET /api/campaigns/:campaignId/locations/hierarchy
 * Get location hierarchy tree
 */
router.get('/campaigns/:campaignId/locations/hierarchy', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Validate campaign ownership
    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaignId, userId);

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Build WHERE clause with player_knowledge filter
    const playerKnowledgeFilter = getPlayerKnowledgeFilter(viewMode);
    const whereClause = playerKnowledgeFilter
      ? `campaign_id = ? AND (${playerKnowledgeFilter})`
      : 'campaign_id = ?';

    // Fetch all locations for campaign (filtered by view mode)
    const locations = db
      .prepare(`SELECT * FROM ${whereClause}`)
      .all(campaignId) as any[];

    // Parse JSON fields
    const parsedLocations = locations.map(loc => ({
      ...loc,
      tags: loc.tags ? JSON.parse(loc.tags) : [],
      map_images: loc.map_images ? JSON.parse(loc.map_images) : [],
    }));

    // Build location map
    const locationMap = new Map<string, any>();
    parsedLocations.forEach(loc => locationMap.set(loc.id, loc));

    // Build tree with cycle detection
    const rootNodes: LocationTreeNode[] = [];
    const cyclesDetected: Array<{ location_id: string; cycle_path: string[] }> = [];
    const processed = new Set<string>();

    function buildNode(location: any, visited: Set<string>, depth: number): LocationTreeNode | null {
      // Detect cycle
      if (visited.has(location.id)) {
        cyclesDetected.push({
          location_id: location.id,
          cycle_path: Array.from(visited).concat([location.id])
        });

        return {
          location: {
            id: location.id,
            campaign_id: location.campaign_id,
            name: location.name,
            location_type: location.location_type,
            parent_location_id: location.parent_location_id,
            player_knowledge: location.player_knowledge,
            tags: location.tags,
            map_count: location.map_images.length,
            created_at: location.created_at,
            updated_at: location.updated_at,
          },
          children: [],
          depth,
          has_map: location.map_images.length > 0,
          has_cycle: true,
        };
      }

      const newVisited = new Set(visited);
      newVisited.add(location.id);

      // Find children
      const children = parsedLocations
        .filter(loc => loc.parent_location_id === location.id)
        .map(child => buildNode(child, newVisited, depth + 1))
        .filter(Boolean) as LocationTreeNode[];

      return {
        location: {
          id: location.id,
          campaign_id: location.campaign_id,
          name: location.name,
          location_type: location.location_type,
          parent_location_id: location.parent_location_id,
          player_knowledge: location.player_knowledge,
          tags: location.tags,
          map_count: location.map_images.length,
          created_at: location.created_at,
          updated_at: location.updated_at,
        },
        children,
        depth,
        has_map: location.map_images.length > 0,
        has_cycle: false,
      };
    }

    // Build tree from root nodes (parent_location_id = null)
    parsedLocations
      .filter(loc => !loc.parent_location_id)
      .forEach(rootLoc => {
        const node = buildNode(rootLoc, new Set(), 0);
        if (node) {
          rootNodes.push(node);
        }
      });

    res.status(200).json({
      tree: rootNodes,
      total_locations: parsedLocations.length,
      cycles_detected: cyclesDetected,
    });
  } catch (error: any) {
    console.error('Get hierarchy error:', error);
    res.status(500).json({ error: 'Failed to build hierarchy tree' });
  }
});

/**
 * GET /api/locations/:id/breadcrumb
 * Get breadcrumb path for location
 */
router.get('/locations/:id/breadcrumb', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Validate location exists and user has access
    const location = locationService.findById(id);
    if (!location) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(location.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Build breadcrumb path
    const breadcrumb: Array<{
      location_id: string;
      name: string;
      location_type: string | null;
      has_map: boolean;
      depth: number;
    }> = [];

    let currentId: string | null = id;
    let depth = 0;
    const visited = new Set<string>();
    let hasCycle = false;

    while (currentId) {
      // Detect cycle
      if (visited.has(currentId)) {
        hasCycle = true;
        break;
      }

      visited.add(currentId);

      const loc = locationService.findById(currentId);
      if (!loc) break;

      // Check view mode visibility
      if (viewMode === 'player_view') {
        if (loc.player_knowledge && !['common_knowledge', 'player_knowledge'].includes(loc.player_knowledge)) {
          break; // Stop traversal if parent is dm_only
        }
      }

      // Parse map_images
      const row = db
        .prepare('SELECT map_images FROM locations WHERE id = ?')
        .get(currentId) as { map_images: string } | undefined;

      const mapImages = row && row.map_images ? JSON.parse(row.map_images) : [];

      breadcrumb.unshift({
        location_id: loc.id,
        name: loc.name,
        location_type: loc.location_type,
        has_map: mapImages.length > 0,
        depth: depth,
      });

      currentId = loc.parent_location_id;
      depth++;
    }

    // Reverse depth (root = 0)
    breadcrumb.forEach((item, index) => {
      item.depth = index;
    });

    res.status(200).json({
      breadcrumb,
      has_cycle: hasCycle,
    });
  } catch (error: any) {
    console.error('Get breadcrumb error:', error);
    res.status(500).json({ error: 'Failed to build breadcrumb' });
  }
});

/**
 * GET /api/locations/:id/children
 * Get immediate child locations
 */
router.get('/locations/:id/children', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Validate location exists and user has access
    const location = locationService.findById(id);
    if (!location) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    const campaign = db
      .prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(location.campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Build WHERE clause with parent filter and player_knowledge filter
    const playerKnowledgeFilter = getPlayerKnowledgeFilter(viewMode);
    const whereClause = playerKnowledgeFilter
      ? `parent_location_id = ? AND (${playerKnowledgeFilter})`
      : 'parent_location_id = ?';

    // Fetch child locations
    const children = db
      .prepare(`SELECT * FROM locations WHERE ${whereClause}`)
      .all(id) as any[];

    // Parse JSON and add map_count
    const childrenSummary = children.map(child => {
      const mapImages = child.map_images ? JSON.parse(child.map_images) : [];
      const tags = child.tags ? JSON.parse(child.tags) : [];

      return {
        id: child.id,
        campaign_id: child.campaign_id,
        name: child.name,
        location_type: child.location_type,
        parent_location_id: child.parent_location_id,
        player_knowledge: child.player_knowledge,
        tags,
        map_count: mapImages.length,
        created_at: child.created_at,
        updated_at: child.updated_at,
      };
    });

    res.status(200).json({
      children: childrenSummary,
      count: childrenSummary.length,
    });
  } catch (error: any) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to get child locations' });
  }
});

export default router;
