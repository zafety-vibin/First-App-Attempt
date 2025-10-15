/**
 * Campaign-Story Session Routes
 * Feature 006 Extension: Dual-Tier Timeline System
 *
 * Endpoints for session finalization and bulk import
 * Supports bulk timeline reconstruction from existing database
 */

import express, { Request, Response } from 'express';
import { db } from '../services/DatabaseService';
import { getDatabaseChangeDetectionService } from '../services/DatabaseChangeDetectionService';
import { getSessionImportService } from '../services/SessionImportService';

const router = express.Router();

/**
 * POST /api/campaigns/:campaignId/graphs/:graphId/sessions/finalize
 * Finalize a session import after Import AI approval
 *
 * Request body:
 * {
 *   "name": "Session 5: The Fall of Zhaerith",
 *   "temporal_anchors": {
 *     "session_number": 5,
 *     "in_game_date": "3/15/500",
 *     "real_world_date": "2025-04-20",
 *     "days_elapsed_total": 6
 *   },
 *   "observations": ["Party defeated Zhaerith", "Vein destroyed"],
 *   "tags": ["combat", "vein-destruction"],
 *   "detect_changes": true
 * }
 */
router.post('/api/campaigns/:campaignId/graphs/:graphId/sessions/finalize', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const { name, temporal_anchors, observations, tags, detect_changes } = req.body;

    // Validate required fields
    if (!name || !temporal_anchors || !observations) {
      res.status(400).json({
        error: 'Missing required fields: name, temporal_anchors, observations'
      });
      return;
    }

    if (!temporal_anchors.session_number || !temporal_anchors.real_world_date) {
      res.status(400).json({
        error: 'temporal_anchors must include session_number and real_world_date'
      });
      return;
    }

    // Get service
    const sessionImportService = getSessionImportService();

    // Finalize session import
    const result = sessionImportService.finalizeSessionImport(campaignId, graphId, {
      name,
      temporal_anchors,
      observations,
      tags,
      detect_changes
    });

    res.status(201).json({
      recap_node: result.recapNode,
      batch_node: result.batchNode,
      changes: result.changes,
      pruned: result.pruned,
      summary: result.batchNode
        ? `Created session recap with ${result.changes.additions.length + result.changes.modifications.length} database changes logged`
        : 'Created session recap (no database changes detected)'
    });
  } catch (error: any) {
    console.error('Failed to finalize session:', error);
    res.status(500).json({
      error: 'Failed to finalize session',
      details: error.message
    });
  }
});

/**
 * POST /api/campaigns/:campaignId/graphs/:graphId/sessions/bulk-import
 * One-click import: Rebuild entire Campaign-Story timeline from session_recaps table
 *
 * Uses created_at timestamps to attribute entity additions to session windows
 */
router.post('/api/campaigns/:campaignId/graphs/:graphId/sessions/bulk-import', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;

    // Validate graph exists and is Campaign-Story type
    const graph = db.prepare(`
      SELECT * FROM knowledge_graphs
      WHERE id = ? AND campaign_id = ?
    `).get(graphId, campaignId) as any;

    if (!graph) {
      res.status(404).json({ error: 'Graph not found' });
      return;
    }

    if (graph.graph_type !== 'Campaign-Story') {
      res.status(400).json({
        error: 'Bulk import only supported for Campaign-Story graphs'
      });
      return;
    }

    // Check if timeline already exists
    const existingRecaps = db.prepare(`
      SELECT COUNT(*) as count
      FROM graph_nodes
      WHERE graph_id = ? AND node_type = 'session_recap'
    `).get(graphId) as { count: number };

    if (existingRecaps.count > 0) {
      res.status(409).json({
        error: 'Timeline already exists. Delete existing session recap nodes before bulk import.',
        existing_sessions: existingRecaps.count
      });
      return;
    }

    // Get service
    const sessionImportService = getSessionImportService();

    // Perform bulk import
    const result = sessionImportService.bulkImportFromDatabase(campaignId, graphId);

    res.status(201).json({
      sessions_imported: result.sessionsImported,
      metadata_nodes_created: result.metadataNodesCreated,
      entities_logged: result.entitiesLogged,
      recap_nodes: result.recapNodes,
      summary: `Imported ${result.sessionsImported} sessions with ${result.entitiesLogged} entity additions logged`
    });
    return;
  } catch (error: any) {
    console.error('Failed to bulk import sessions:', error);
    res.status(500).json({
      error: 'Failed to bulk import sessions',
      details: error.message
    });
    return;
  }
});

/**
 * GET /api/campaigns/:campaignId/graphs/:graphId/sessions/timeline
 * Get session timeline with optional tier filtering
 *
 * Query params:
 * - tier: 'narrative' | 'metadata' | 'all' (default: 'narrative')
 */
router.get('/api/campaigns/:campaignId/graphs/:graphId/sessions/timeline', async (req: Request, res: Response) => {
  try {
    const { campaignId, graphId } = req.params;
    const { tier = 'narrative' } = req.query;

    // Validate tier parameter
    if (tier !== 'narrative' && tier !== 'metadata' && tier !== 'all') {
      res.status(400).json({
        error: 'Invalid tier parameter. Must be: narrative, metadata, or all'
      });
      return;
    }

    // Build query based on tier filter
    let nodeQuery = `
      SELECT * FROM graph_nodes
      WHERE graph_id = ?
    `;

    if (tier !== 'all') {
      nodeQuery += ` AND JSON_EXTRACT(attributes, '$.tier') = ?`;
    }

    nodeQuery += ` ORDER BY JSON_EXTRACT(attributes, '$.session_number') ASC`;

    const nodes = tier === 'all'
      ? db.prepare(nodeQuery).all(graphId)
      : db.prepare(nodeQuery).all(graphId, tier);

    // Get all edges
    const edges = db.prepare(`
      SELECT * FROM graph_edges
      WHERE graph_id = ?
    `).all(graphId);

    // Parse JSON fields
    const parsedNodes = (nodes as any[]).map(n => ({
      ...n,
      attributes: JSON.parse(n.attributes),
      observations: n.observations ? JSON.parse(n.observations) : null
    }));

    const parsedEdges = (edges as any[]).map(e => ({
      ...e,
      metadata: e.metadata ? JSON.parse(e.metadata) : null
    }));

    res.json({
      nodes: parsedNodes,
      edges: parsedEdges,
      tier_filter: tier
    });
    return;
  } catch (error: any) {
    console.error('Failed to get timeline:', error);
    res.status(500).json({
      error: 'Failed to get timeline',
      details: error.message
    });
    return;
  }
});

export default router;
