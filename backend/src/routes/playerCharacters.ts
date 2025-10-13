/**
 * Player Character Routes
 * Feature: 014-create-the-database
 *
 * Handles 4 dm_* fields:
 * - dm_secrets: Hidden character secrets
 * - dm_plot_threads: DM's plot thread tracking
 * - dm_true_motivation: Character's actual motivations
 * - dm_consequences: DM notes on consequences
 *
 * Applies:
 * - protect: Authentication middleware (all routes)
 * - extractViewMode: X-View-Mode header parsing
 * - applyInformationFilter: Automatic dm_* field stripping in player_view mode
 */

import express, { Request, Response } from 'express';
import { PlayerCharacterService } from '../services/PlayerCharacterService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';

const router = express.Router();
const service = new PlayerCharacterService();

// Apply authentication, view mode extraction, and information filtering to all routes
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * POST /api/player-characters
 * Create new player character
 *
 * Body: {
 *   campaign_id: string,
 *   name: string,
 *   description?: string,
 *   core_status?: 'active' | 'archived' | 'draft' | 'hidden',
 *   player_knowledge?: string,
 *   tags?: string[],
 *   custom_fields?: Record<string, any>,
 *   player_name?: string,
 *   class?: string[],
 *   level?: number,
 *   race?: string,
 *   background?: string,
 *   personality?: string,
 *   goals?: string,
 *   backstory?: string,
 *   art?: string,
 *   faction_affiliations?: string[],
 *   allied_npcs?: string[],
 *   dm_secrets?: string,
 *   dm_plot_threads?: string,
 *   dm_true_motivation?: string,
 *   dm_consequences?: string
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = req.body;

    // Validate required fields
    if (!data.campaign_id || !data.name) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, name' });
      return;
    }

    // Create player character
    const pc = await service.createPlayerCharacter(data, userId);

    res.status(201).json(pc);
  } catch (error: any) {
    console.error('Create player character error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create player character', details: error.message });
  }
});

/**
 * GET /api/player-characters
 * List all player characters for a campaign
 *
 * Query params:
 * - campaign_id: string (required)
 * - core_status?: 'active' | 'archived' | 'draft' | 'hidden'
 * - search?: string (search by name or player_name)
 *
 * Headers:
 * - X-View-Mode: 'dm_view' | 'player_view' (optional, defaults to dm_view)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';
    const { campaign_id, core_status, search } = req.query;

    // Validate required query params
    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'Missing required query parameter: campaign_id' });
      return;
    }

    let characters;

    // Handle different query types
    if (search && typeof search === 'string') {
      characters = await service.searchPlayerCharacters(campaign_id, search, userId);
    } else if (core_status && typeof core_status === 'string') {
      if (!['active', 'archived', 'draft', 'hidden'].includes(core_status)) {
        res.status(400).json({ error: 'Invalid core_status. Must be: active, archived, draft, or hidden' });
        return;
      }
      characters = await service.getPlayerCharactersByStatus(campaign_id, core_status as any, userId);
    } else {
      characters = await service.getPlayerCharactersByCampaign(campaign_id, userId);
    }

    // Apply player knowledge filtering for player_view
    if (viewMode === 'player_view') {
      characters = characters.filter(pc => {
        const pk = pc.player_knowledge;
        return pk === 'common_knowledge' || pk === 'player_knowledge' || pk === null;
      });
    }

    // Note: dm_* field stripping is handled by applyInformationFilter middleware

    res.status(200).json(characters);
  } catch (error: any) {
    console.error('List player characters error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to fetch player characters', details: error.message });
  }
});

/**
 * GET /api/player-characters/:id
 * Get single player character by ID
 *
 * Headers:
 * - X-View-Mode: 'dm_view' | 'player_view' (optional, defaults to dm_view)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';
    const { id } = req.params;

    const pc = await service.getPlayerCharacterById(id, userId);

    if (!pc) {
      res.status(404).json({ error: 'Player character not found' });
      return;
    }

    // Apply player knowledge filtering for player_view
    if (viewMode === 'player_view') {
      const pk = pc.player_knowledge;
      if (pk !== 'common_knowledge' && pk !== 'player_knowledge' && pk !== null) {
        // Return 404 instead of 403 to not reveal existence
        res.status(404).json({ error: 'Player character not found' });
        return;
      }
    }

    // Note: dm_* field stripping is handled by applyInformationFilter middleware

    res.status(200).json(pc);
  } catch (error: any) {
    console.error('Get player character error:', error);
    res.status(500).json({ error: 'Failed to fetch player character', details: error.message });
  }
});

/**
 * PUT /api/player-characters/:id
 * Update player character
 *
 * Body: {
 *   name?: string,
 *   description?: string,
 *   core_status?: 'active' | 'archived' | 'draft' | 'hidden',
 *   player_knowledge?: string,
 *   tags?: string[],
 *   custom_fields?: Record<string, any>,
 *   player_name?: string,
 *   class?: string[],
 *   level?: number,
 *   race?: string,
 *   background?: string,
 *   personality?: string,
 *   goals?: string,
 *   backstory?: string,
 *   art?: string,
 *   faction_affiliations?: string[],
 *   allied_npcs?: string[],
 *   dm_secrets?: string,
 *   dm_plot_threads?: string,
 *   dm_true_motivation?: string,
 *   dm_consequences?: string
 * }
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body;

    // Update player character
    const updated = await service.updatePlayerCharacter(id, data, userId);

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update player character error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update player character', details: error.message });
  }
});

/**
 * DELETE /api/player-characters/:id
 * Delete player character
 *
 * Will fail if character is referenced by items (owner_pc_id foreign key)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await service.deletePlayerCharacter(id, userId);

    res.status(200).json({ message: 'Player character deleted successfully' });
  } catch (error: any) {
    console.error('Delete player character error:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('referenced')) {
      res.status(409).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete player character', details: error.message });
  }
});

export default router;
