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

    res.status(200).json({
      scale_nodes: childrenWithCounts,
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

    if (typeof x !== 'number' || typeof y !== 'number') {
      res.status(400).json({ error: 'x and y coordinates are required as numbers' });
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
