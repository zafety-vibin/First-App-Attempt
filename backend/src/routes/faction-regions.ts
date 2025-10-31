/**
 * Faction Territory Regions REST API Routes
 * Feature: 021-create-a-geographic
 * Task: T017
 * Contract: specs/021-create-a-geographic/contracts/faction-regions.yaml
 */

import express, { Request, Response } from 'express';
import { LocationService, FactionRegion } from '../services/LocationService';
import { protect } from '../middleware/auth';
import { extractViewMode } from '../middleware/viewMode';
import { validateFactionRegion, validateFactionRegionUpdate } from '../validation/geographic-maps';
import { db } from '../services/DatabaseService';
import { ZodError } from 'zod';

const router = express.Router();
const locationService = new LocationService(db);

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);

/**
 * POST /api/locations/:id/regions
 * Create faction region
 */
router.post('/:id/regions', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const input = req.body;

    // Validate ownership via campaign
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

    // Validate input
    try {
      validateFactionRegion(input);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
        return;
      }
      throw error;
    }

    // Create region (validates map_id and faction_id)
    const updatedLocation = locationService.createRegion(id, input.map_id, input);

    // Get the newly created region
    const row = db
      .prepare('SELECT faction_regions FROM locations WHERE id = ?')
      .get(id) as { faction_regions: string };

    const factionRegions = JSON.parse(row.faction_regions);
    const newRegion = factionRegions[factionRegions.length - 1];

    res.status(201).json({
      success: true,
      region: newRegion
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('vertices') || error.message.includes('bounds')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create region error:', error);
    res.status(500).json({ error: 'Failed to create region' });
  }
});

/**
 * GET /api/locations/:id/regions
 * List regions for location (filtered by X-View-Mode and faction visibility)
 */
router.get('/:id/regions', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { map_id } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Validate ownership via campaign
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

    // Get regions
    const row = db
      .prepare('SELECT faction_regions FROM locations WHERE id = ?')
      .get(id) as { faction_regions: string } | undefined;

    let factionRegions = row && row.faction_regions ? JSON.parse(row.faction_regions) : [];

    // Filter by map_id if provided
    if (map_id && typeof map_id === 'string') {
      factionRegions = factionRegions.filter((region: FactionRegion) => region.map_id === map_id);
    }

    // Filter by view mode (hide dm_only factions)
    if (viewMode === 'player_view') {
      factionRegions = factionRegions.filter((region: FactionRegion) => {
        const faction = db
          .prepare('SELECT player_knowledge FROM factions WHERE id = ?')
          .get(region.faction_id) as { player_knowledge: string | null } | undefined;

        if (!faction) return false;

        return !faction.player_knowledge ||
               faction.player_knowledge === 'common_knowledge' ||
               faction.player_knowledge === 'player_knowledge';
      });
    }

    // Sort by z_order ascending (lower z_order renders first)
    factionRegions.sort((a: FactionRegion, b: FactionRegion) => a.z_order - b.z_order);

    res.status(200).json({
      regions: factionRegions
    });
  } catch (error: any) {
    console.error('List regions error:', error);
    res.status(500).json({ error: 'Failed to list regions' });
  }
});

/**
 * PUT /api/locations/:id/regions/:regionId
 * Update faction region
 */
router.put('/:id/regions/:regionId', (req: Request, res: Response) => {
  try {
    const { id, regionId } = req.params;
    const userId = req.user!.id;
    const input = req.body;

    // Validate ownership via campaign
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

    // Validate input
    try {
      validateFactionRegionUpdate(input);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
        return;
      }
      throw error;
    }

    // Update region
    const updatedLocation = locationService.updateRegion(id, regionId, input);

    // Get the updated region
    const row = db
      .prepare('SELECT faction_regions FROM locations WHERE id = ?')
      .get(id) as { faction_regions: string };

    const factionRegions = JSON.parse(row.faction_regions);
    const updatedRegion = factionRegions.find((r: FactionRegion) => r.id === regionId);

    res.status(200).json({
      success: true,
      region: updatedRegion
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('vertices') || error.message.includes('bounds')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update region error:', error);
    res.status(500).json({ error: 'Failed to update region' });
  }
});

/**
 * DELETE /api/locations/:id/regions/:regionId
 * Delete faction region
 */
router.delete('/:id/regions/:regionId', (req: Request, res: Response) => {
  try {
    const { id, regionId } = req.params;
    const userId = req.user!.id;

    // Validate ownership via campaign
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

    // Delete region
    locationService.deleteRegion(id, regionId);

    res.status(200).json({
      success: true
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete region error:', error);
    res.status(500).json({ error: 'Failed to delete region' });
  }
});

export default router;
