/**
 * WorldRule routes
 * Feature: 014-create-the-database
 * Task: T049
 *
 * Implements:
 * - 5 CRUD endpoints for world rule management
 * - Auth middleware for campaign ownership validation
 * - Information filtering for player_knowledge
 * - Self-referential many-to-many validation (related_rules)
 * - Foreign key validation for related_rules
 */

import express, { Request, Response } from 'express';
import { WorldRuleService } from '../services/WorldRuleService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * POST /api/world-rules
 * Create new world rule
 *
 * Request body:
 * - campaign_id (required)
 * - name (required)
 * - description (optional)
 * - core_status (optional, default: 'active')
 * - player_knowledge (optional, default: null)
 * - tags (optional, string array)
 * - custom_fields (optional, object)
 * - rule_type (optional)
 * - exceptions (optional)
 * - related_rules (optional, string array of world_rule IDs)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      campaign_id,
      name,
      description,
      core_status,
      player_knowledge,
      tags,
      custom_fields,
      rule_type,
      exceptions,
      related_rules,
    } = req.body;

    const userId = req.user!.id;

    // Validate required fields
    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id is required' });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'name is required and must not be empty' });
      return;
    }

    // Validate core_status enum if provided
    if (core_status !== undefined) {
      const validStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validStatuses.includes(core_status)) {
        res.status(400).json({
          error: 'Invalid core_status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
    }

    const worldRule = WorldRuleService.createWorldRule(
      {
        campaign_id,
        name: name.trim(),
        description,
        core_status,
        player_knowledge,
        tags,
        custom_fields,
        rule_type,
        exceptions,
        related_rules,
      },
      userId
    );

    res.status(201).json(worldRule);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    if (error.message.includes('Related rule')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create world rule error:', error);
    res.status(500).json({ error: 'Failed to create world rule' });
  }
});

/**
 * GET /api/world-rules
 * List world rules for campaign with optional filtering
 *
 * Query params:
 * - campaign_id (required)
 * - core_status (optional, filter by core status)
 * - player_knowledge (optional, filter by player knowledge)
 * - limit (optional, default: 50)
 * - offset (optional, default: 0)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id, core_status, player_knowledge, limit, offset } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Build filters
    const filters: any = {};

    if (core_status && typeof core_status === 'string') {
      // Validate core_status
      const validStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validStatuses.includes(core_status)) {
        res.status(400).json({
          error: 'Invalid core_status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
      filters.core_status = core_status as 'active' | 'archived' | 'draft' | 'hidden';
    }

    if (player_knowledge && typeof player_knowledge === 'string') {
      filters.player_knowledge = player_knowledge;
    }

    if (limit) {
      filters.limit = parseInt(limit as string);
    }

    if (offset) {
      filters.offset = parseInt(offset as string);
    }

    const result = WorldRuleService.getWorldRulesByCampaign(campaign_id, userId, filters);
    let worldRules = result.world_rules;

    // Apply player_knowledge filtering for player_view
    if (viewMode === 'player_view') {
      worldRules = worldRules.filter(rule => {
        const pk = rule.player_knowledge;
        return pk === 'common_knowledge' || pk === 'player_knowledge' || pk === null;
      });
    }

    res.status(200).json({
      data: worldRules,
      total: result.total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('List world rules error:', error);
    res.status(500).json({ error: 'Failed to fetch world rules' });
  }
});

/**
 * GET /api/world-rules/:id
 * Get world rule by ID
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Get world rule and verify ownership via campaign
    const worldRule = db
      .prepare(`
        SELECT wr.*, c.owner_id FROM world_rules wr
        JOIN campaigns c ON wr.campaign_id = c.id
        WHERE wr.id = ? AND c.owner_id = ?
      `)
      .get(id, userId);

    if (!worldRule) {
      res.status(404).json({ error: 'World rule not found' });
      return;
    }

    // Check player_knowledge visibility for player_view
    if (viewMode === 'player_view') {
      const pk = (worldRule as any).player_knowledge;
      if (pk !== 'common_knowledge' && pk !== 'player_knowledge' && pk !== null) {
        // Return 404 instead of 403 to not reveal existence
        res.status(404).json({ error: 'World rule not found' });
        return;
      }
    }

    // Parse JSON fields
    const worldRuleData = {
      id: (worldRule as any).id,
      campaign_id: (worldRule as any).campaign_id,
      name: (worldRule as any).name,
      description: (worldRule as any).description,
      core_status: (worldRule as any).core_status,
      player_knowledge: (worldRule as any).player_knowledge,
      tags: JSON.parse((worldRule as any).tags),
      created_at: (worldRule as any).created_at,
      updated_at: (worldRule as any).updated_at,
      custom_fields: JSON.parse((worldRule as any).custom_fields),
      rule_type: (worldRule as any).rule_type,
      exceptions: (worldRule as any).exceptions,
      related_rules: JSON.parse((worldRule as any).related_rules),
    };

    res.status(200).json(worldRuleData);
  } catch (error: any) {
    console.error('Get world rule error:', error);
    res.status(500).json({ error: 'Failed to fetch world rule' });
  }
});

/**
 * PUT /api/world-rules/:id
 * Update world rule
 *
 * All fields from POST are optional
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const {
      name,
      description,
      core_status,
      player_knowledge,
      tags,
      custom_fields,
      rule_type,
      exceptions,
      related_rules,
    } = req.body;

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({ error: 'name must not be empty' });
      return;
    }

    // Validate core_status enum if provided
    if (core_status !== undefined) {
      const validStatuses = ['active', 'archived', 'draft', 'hidden'];
      if (!validStatuses.includes(core_status)) {
        res.status(400).json({
          error: 'Invalid core_status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
    }

    // Get campaign_id from existing world rule
    const existing = db
      .prepare('SELECT campaign_id FROM world_rules WHERE id = ?')
      .get(id) as { campaign_id: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'World rule not found' });
      return;
    }

    const worldRule = WorldRuleService.updateWorldRule(
      id,
      existing.campaign_id,
      {
        name: name ? name.trim() : undefined,
        description,
        core_status,
        player_knowledge,
        tags,
        custom_fields,
        rule_type,
        exceptions,
        related_rules,
      },
      userId
    );

    res.status(200).json(worldRule);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Related rule')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update world rule error:', error);
    res.status(500).json({ error: 'Failed to update world rule' });
  }
});

/**
 * DELETE /api/world-rules/:id
 * Delete world rule
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Get campaign_id from existing world rule
    const existing = db
      .prepare('SELECT campaign_id FROM world_rules WHERE id = ?')
      .get(id) as { campaign_id: string } | undefined;

    if (!existing) {
      res.status(404).json({ error: 'World rule not found' });
      return;
    }

    WorldRuleService.deleteWorldRule(id, existing.campaign_id, userId);

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete world rule error:', error);
    res.status(500).json({ error: 'Failed to delete world rule' });
  }
});

/**
 * GET /api/world-rules/:id/related
 * Get world rules related to a specific world rule (via related_rules array)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/:id/related', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Get world rule to verify ownership
    const worldRule = db
      .prepare(`
        SELECT wr.campaign_id, c.owner_id FROM world_rules wr
        JOIN campaigns c ON wr.campaign_id = c.id
        WHERE wr.id = ? AND c.owner_id = ?
      `)
      .get(id, userId) as { campaign_id: string; owner_id: string } | undefined;

    if (!worldRule) {
      res.status(404).json({ error: 'World rule not found' });
      return;
    }

    let relatedRules = WorldRuleService.getRelatedWorldRules(id, worldRule.campaign_id);

    // Apply player_knowledge filtering for player_view
    if (viewMode === 'player_view') {
      relatedRules = relatedRules.filter(rule => {
        const pk = rule.player_knowledge;
        return pk === 'common_knowledge' || pk === 'player_knowledge' || pk === null;
      });
    }

    res.status(200).json({ data: relatedRules, total: relatedRules.length });
  } catch (error: any) {
    console.error('Get related world rules error:', error);
    res.status(500).json({ error: 'Failed to fetch related world rules' });
  }
});

/**
 * GET /api/world-rules/search/:campaignId
 * Search world rules by name
 *
 * Query params:
 * - query (required, search term)
 * - limit (optional, default: 20)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/search/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { query, limit } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'query parameter is required' });
      return;
    }

    const searchLimit = limit ? parseInt(limit as string) : 20;

    let worldRules = WorldRuleService.searchWorldRules(campaignId, query, userId, searchLimit);

    // Apply player_knowledge filtering for player_view
    if (viewMode === 'player_view') {
      worldRules = worldRules.filter(rule => {
        const pk = rule.player_knowledge;
        return pk === 'common_knowledge' || pk === 'player_knowledge' || pk === null;
      });
    }

    res.status(200).json({ data: worldRules, total: worldRules.length });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    console.error('Search world rules error:', error);
    res.status(500).json({ error: 'Failed to search world rules' });
  }
});

export default router;
