/**
 * Spatial Navigator REST API Routes
 * Feature: 021-create-a-geographic (Spatial Navigator)
 *
 * Provides endpoints for scale-based geographic navigation using knowledge graph.
 */

import express, { Request, Response } from 'express';
import { GeographicNavigatorService } from '../services/GeographicNavigatorService';
import { protect } from '../middleware/auth';
import { db } from '../services/DatabaseService';

const router = express.Router();
const navigatorService = new GeographicNavigatorService(db);

router.use(protect);

/**
 * GET /api/campaigns/:campaignId/geographic/hierarchy
 * Get complete geographic hierarchy tree from knowledge graph
 */
router.get('/campaigns/:campaignId/geographic/hierarchy', (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    // Get geographic graph
    const graph = navigatorService.getGeographicGraph(campaignId);

    if (!graph) {
      res.status(404).json({ error: 'Geographic knowledge graph not found for this campaign' });
      return;
    }

    // Get all nodes and build tree
    const nodes = navigatorService.getGeographicNodes(graph.id);
    const tree = navigatorService.buildScaleTree(nodes);

    res.status(200).json({
      graph_id: graph.id,
      graph_name: graph.name,
      tree,
      total_nodes: nodes.length,
    });
  } catch (error: any) {
    console.error('Get geographic hierarchy error:', error);
    res.status(500).json({ error: 'Failed to get geographic hierarchy' });
  }
});

/**
 * GET /api/campaigns/:campaignId/geographic/scale/:parentId?
 * Get children at specific scale level
 * parentId=null or omitted → root nodes (Plane View)
 *
 * Returns:
 * - scale_nodes: array of child nodes with coordinates and child counts
 * - parent_location: parent location data with maps (if parentId provided)
 * - parent_id: the parent node ID
 */
router.get('/campaigns/:campaignId/geographic/scale/:parentId?', (req: Request, res: Response) => {
  try {
    const { campaignId, parentId } = req.params;

    const graph = navigatorService.getGeographicGraph(campaignId);

    if (!graph) {
      res.status(404).json({ error: 'Geographic knowledge graph not found' });
      return;
    }

    const children = navigatorService.getNodeChildren(graph.id, parentId || null);

    // Sort: node with most children goes last (will be at bottom of ring)
    const childrenWithCounts = children.map((child) => {
      const allNodes = navigatorService.getGeographicNodes(graph.id);
      const descendants = allNodes.filter((n) => n.parent_location_id === child.id);
      return {
        ...child,
        child_count: descendants.length,
      };
    });

    childrenWithCounts.sort((a, b) => a.child_count - b.child_count);

    // If parentId provided, fetch parent location with maps
    let parentLocation = null;
    if (parentId) {
      const parentGraphNode = db.prepare('SELECT name FROM graph_nodes WHERE id = ?').get(parentId) as any;
      if (parentGraphNode) {
        const location = db.prepare(`
          SELECT id, name, map_images, map_pins, faction_regions
          FROM locations
          WHERE name = ?
        `).get(parentGraphNode.name) as any;

        if (location) {
          parentLocation = {
            id: location.id,
            name: location.name,
            maps: location.map_images ? JSON.parse(location.map_images) : [],
            pins: location.map_pins ? JSON.parse(location.map_pins) : [],
            regions: location.faction_regions ? JSON.parse(location.faction_regions) : [],
          };
        }
      }
    }

    res.status(200).json({
      scale_nodes: childrenWithCounts,
      parent_location: parentLocation,
      parent_id: parentId || null,
    });
  } catch (error: any) {
    console.error('Get scale nodes error:', error);
    res.status(500).json({ error: 'Failed to get scale nodes' });
  }
});

/**
 * PUT /api/locations/:locationId/pin-coordinates
 * Update where this location is pinned on its parent's map
 */
router.put('/locations/:locationId/pin-coordinates', (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const { x, y } = req.body;

    // Allow null to unpin (remove coordinates)
    if (x === null && y === null) {
      db.prepare('UPDATE locations SET map_pin_x = NULL, map_pin_y = NULL, updated_at = ? WHERE id = ?')
        .run(Math.floor(Date.now() / 1000), locationId);

      res.status(200).json({ success: true, x: null, y: null, message: 'Unpinned' });
      return;
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      res.status(400).json({ error: 'x and y coordinates must be numbers or both null to unpin' });
      return;
    }

    if (x < 0 || y < 0) {
      res.status(400).json({ error: 'Coordinates must be non-negative' });
      return;
    }

    const updated = db
      .prepare('UPDATE locations SET map_pin_x = ?, map_pin_y = ?, updated_at = ? WHERE id = ?')
      .run(x, y, Math.floor(Date.now() / 1000), locationId);

    if (updated.changes === 0) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }

    res.status(200).json({ success: true, x, y });
  } catch (error: any) {
    console.error('Update pin coordinates error:', error);
    res.status(500).json({ error: 'Failed to update coordinates' });
  }
});

export default router;
