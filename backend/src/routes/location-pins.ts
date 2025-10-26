/**
 * Location Map Pins REST API Routes
 * Feature: 021-create-a-geographic
 * Task: T016
 * Contract: specs/021-create-a-geographic/contracts/location-pins.yaml
 */

import express, { Request, Response } from 'express';
import { LocationService, MapPin } from '../services/LocationService';
import { protect } from '../middleware/auth';
import { extractViewMode } from '../middleware/informationFilter';
import { validateMapPin, validateMapPinUpdate } from '../validation/geographic-maps';
import { db } from '../services/DatabaseService';
import { ZodError } from 'zod';

const router = express.Router();
const locationService = new LocationService(db);

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);

/**
 * POST /api/locations/:id/pins
 * Create map pin
 */
router.post('/:id/pins', (req: Request, res: Response) => {
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
      validateMapPin(input);
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

    // Create pin (validates map_id and linked_entity_id)
    const updatedLocation = locationService.createPin(id, input.map_id, input);

    // Get the newly created pin
    const row = db
      .prepare('SELECT map_pins FROM locations WHERE id = ?')
      .get(id) as { map_pins: string };

    const mapPins = JSON.parse(row.map_pins);
    const newPin = mapPins[mapPins.length - 1];

    res.status(201).json({
      success: true,
      pin: newPin
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('out of') || error.message.includes('bounds')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create pin error:', error);
    res.status(500).json({ error: 'Failed to create pin' });
  }
});

/**
 * GET /api/locations/:id/pins
 * List pins for location (filtered by X-View-Mode and linked entity visibility)
 */
router.get('/:id/pins', (req: Request, res: Response) => {
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

    // Get pins
    const row = db
      .prepare('SELECT map_pins FROM locations WHERE id = ?')
      .get(id) as { map_pins: string } | undefined;

    let mapPins = row && row.map_pins ? JSON.parse(row.map_pins) : [];

    // Filter by map_id if provided
    if (map_id && typeof map_id === 'string') {
      mapPins = mapPins.filter((pin: MapPin) => pin.map_id === map_id);
    }

    // Filter by view mode
    if (viewMode === 'player_view') {
      mapPins = mapPins.filter((pin: MapPin) => {
        const table = pin.linked_entity_type === 'location' ? 'locations' : 'npcs';
        const entity = db
          .prepare(`SELECT player_knowledge FROM ${table} WHERE id = ?`)
          .get(pin.linked_entity_id) as { player_knowledge: string | null } | undefined;

        if (!entity) return false;

        return !entity.player_knowledge ||
               entity.player_knowledge === 'common_knowledge' ||
               entity.player_knowledge === 'player_knowledge';
      });
    }

    res.status(200).json({
      pins: mapPins
    });
  } catch (error: any) {
    console.error('List pins error:', error);
    res.status(500).json({ error: 'Failed to list pins' });
  }
});

/**
 * PUT /api/locations/:id/pins/:pinId
 * Update map pin
 */
router.put('/:id/pins/:pinId', (req: Request, res: Response) => {
  try {
    const { id, pinId } = req.params;
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
      validateMapPinUpdate(input);
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

    // Update pin
    const updatedLocation = locationService.updatePin(id, pinId, input);

    // Get the updated pin
    const row = db
      .prepare('SELECT map_pins FROM locations WHERE id = ?')
      .get(id) as { map_pins: string };

    const mapPins = JSON.parse(row.map_pins);
    const updatedPin = mapPins.find((p: MapPin) => p.id === pinId);

    res.status(200).json({
      success: true,
      pin: updatedPin
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('out of') || error.message.includes('bounds')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update pin error:', error);
    res.status(500).json({ error: 'Failed to update pin' });
  }
});

/**
 * DELETE /api/locations/:id/pins/:pinId
 * Delete map pin
 */
router.delete('/:id/pins/:pinId', (req: Request, res: Response) => {
  try {
    const { id, pinId } = req.params;
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

    // Delete pin
    locationService.deletePin(id, pinId);

    res.status(200).json({
      success: true
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete pin error:', error);
    res.status(500).json({ error: 'Failed to delete pin' });
  }
});

export default router;
