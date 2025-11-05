/**
 * Location Maps REST API Routes
 * Feature: 021-create-a-geographic
 * Task: T015
 * Contract: specs/021-create-a-geographic/contracts/location-maps.yaml
 */

import express, { Request, Response } from 'express';
import { LocationService, MapImage, MapPin, FactionRegion } from '../services/LocationService';
import { protect } from '../middleware/auth';
import { extractViewMode } from '../middleware/viewMode';
import { validateMapImage } from '../validation/geographic-maps';
import { db } from '../services/DatabaseService';
import { ZodError } from 'zod';

const router = express.Router();
const locationService = new LocationService(db);

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);

/**
 * POST /api/locations/:id/maps
 * Upload map image to location
 */
router.post('/:id/maps', (req: Request, res: Response) => {
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
      validateMapImage(input);
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

    // Check data size (10MB = ~13.3MB base64)
    const base64Data = input.data.split(',')[1] || input.data;
    const sizeInBytes = (base64Data.length * 3) / 4;
    if (sizeInBytes > 10 * 1024 * 1024) {
      res.status(413).json({ error: 'Map image too large (>10MB)' });
      return;
    }

    // Upload map
    const updatedLocation = locationService.uploadMap(id, input);

    // Get the newly created map
    const row = db
      .prepare('SELECT map_images FROM locations WHERE id = ?')
      .get(id) as { map_images: string };

    const mapImages = JSON.parse(row.map_images);
    const newMap = mapImages[mapImages.length - 1];

    res.status(201).json({
      success: true,
      map: newMap
    });
  } catch (error: any) {
    console.error('Upload map error:', error);
    res.status(500).json({ error: 'Failed to upload map' });
  }
});

/**
 * GET /api/locations/:id/maps
 * List maps for location (with pins and regions)
 */
router.get('/:id/maps', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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

    // Get maps, pins, and regions
    const row = db
      .prepare('SELECT map_images, map_pins, faction_regions FROM locations WHERE id = ?')
      .get(id) as { map_images: string; map_pins: string; faction_regions: string } | undefined;

    const mapImages = row && row.map_images ? JSON.parse(row.map_images) : [];
    let mapPins = row && row.map_pins ? JSON.parse(row.map_pins) : [];
    let factionRegions = row && row.faction_regions ? JSON.parse(row.faction_regions) : [];

    // Filter pins and regions based on view mode (System 2 filtering)
    if (viewMode === 'player_view') {
      // Filter pins by linked entity visibility
      mapPins = mapPins.filter((pin: MapPin) => {
        const table = pin.linked_entity_type === 'location' ? 'locations' : 'npcs';
        const entity = db
          .prepare(`SELECT player_knowledge FROM ${table} WHERE id = ?`)
          .get(pin.linked_entity_id) as { player_knowledge: string | null } | undefined;

        if (!entity) return false;

        // Include if null (contextual) or if non-hierarchical level
        if (!entity.player_knowledge) return true;

        const level = db
          .prepare('SELECT hierarchical FROM information_levels WHERE id = ?')
          .get(entity.player_knowledge) as { hierarchical: number } | undefined;

        return level ? !level.hierarchical : false;
      });

      // Filter regions by faction visibility
      factionRegions = factionRegions.filter((region: FactionRegion) => {
        const faction = db
          .prepare('SELECT player_knowledge FROM factions WHERE id = ?')
          .get(region.faction_id) as { player_knowledge: string | null } | undefined;

        if (!faction) return false;

        // Include if null (contextual) or if non-hierarchical level
        if (!faction.player_knowledge) return true;

        const level = db
          .prepare('SELECT hierarchical FROM information_levels WHERE id = ?')
          .get(faction.player_knowledge) as { hierarchical: number } | undefined;

        return level ? !level.hierarchical : false;
      });
    }

    res.status(200).json({
      maps: mapImages,
      pins: mapPins,
      regions: factionRegions
    });
  } catch (error: any) {
    console.error('List maps error:', error);
    res.status(500).json({ error: 'Failed to list maps' });
  }
});

/**
 * DELETE /api/locations/:id/maps/:mapId
 * Delete map from location (and associated pins/regions)
 */
router.delete('/:id/maps/:mapId', (req: Request, res: Response) => {
  try {
    const { id, mapId } = req.params;
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

    // Delete map
    const result = locationService.deleteMap(id, mapId);

    res.status(200).json({
      success: true,
      deleted_pins: result.deletedPins,
      deleted_regions: result.deletedRegions
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete map error:', error);
    res.status(500).json({ error: 'Failed to delete map' });
  }
});

export default router;
