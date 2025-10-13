/**
 * Quest routes
 * Feature: 014-create-the-database
 * Task: T045
 *
 * Implements:
 * - 5 CRUD endpoints for quest management
 * - Auth middleware for campaign ownership validation
 * - Information filtering for player_knowledge and dm_* fields
 * - Status enum validation ('not_started' | 'in_progress' | 'completed' | 'failed')
 * - Foreign key handling (quest_giver_id, started_session_id, completed_session_id)
 */

import express, { Request, Response } from 'express';
import { QuestService } from '../services/QuestService';
import { protect } from '../middleware/auth';
import { extractViewMode, applyInformationFilter } from '../middleware/informationFilter';
import { db } from '../services/DatabaseService';

const router = express.Router();
const questService = new QuestService();

// All routes require authentication and view mode extraction
router.use(protect);
router.use(extractViewMode);
router.use(applyInformationFilter);

/**
 * POST /api/quests
 * Create new quest
 *
 * Request body:
 * - campaign_id (required)
 * - name (required)
 * - description (optional)
 * - core_status (optional, default: 'active')
 * - player_knowledge (optional, default: 'common_knowledge')
 * - tags (optional, string array)
 * - custom_fields (optional, object)
 * - status (optional, default: 'not_started')
 * - objectives (optional, string array)
 * - rewards (optional)
 * - quest_giver_id (optional, FK to npcs)
 * - started_session_id (optional, FK to session_recaps)
 * - completed_session_id (optional, FK to session_recaps)
 * - related_npcs (optional, string array of NPC IDs)
 * - related_locations (optional, string array of location IDs)
 * - dm_true_objective (optional)
 * - dm_consequences (optional)
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
      status,
      objectives,
      rewards,
      quest_giver_id,
      started_session_id,
      completed_session_id,
      related_npcs,
      related_locations,
      dm_true_objective,
      dm_consequences,
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

    // Validate status enum if provided
    if (status !== undefined) {
      const validStatuses = ['not_started', 'in_progress', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
    }

    const quest = questService.createQuest(
      {
        campaignId: campaign_id,
        name: name.trim(),
        description,
        coreStatus: core_status,
        playerKnowledge: player_knowledge,
        tags,
        customFields: custom_fields,
        status,
        objectives,
        rewards,
        questGiverId: quest_giver_id,
        startedSessionId: started_session_id,
        completedSessionId: completed_session_id,
        relatedNpcs: related_npcs,
        relatedLocations: related_locations,
        dmTrueObjective: dm_true_objective,
        dmConsequences: dm_consequences,
      },
      userId
    );

    res.status(201).json(quest);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(403).json({ error: error.message });
      return;
    }

    if (error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Create quest error:', error);
    res.status(500).json({ error: 'Failed to create quest' });
  }
});

/**
 * GET /api/quests
 * List quests for campaign with optional filtering
 *
 * Query params:
 * - campaign_id (required)
 * - status (optional, filter by quest status)
 * - quest_giver_id (optional, filter by quest giver NPC)
 * - limit (optional, default: 50)
 * - offset (optional, default: 0)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id, status, quest_giver_id, limit, offset } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    // Build query based on filters
    let quests: any[] = [];
    let total = 0;

    if (status && typeof status === 'string') {
      // Filter by status
      quests = questService.getQuestsByStatus(
        campaign_id,
        status as 'not_started' | 'in_progress' | 'completed' | 'failed',
        viewMode
      );
      total = quests.length;
    } else if (quest_giver_id && typeof quest_giver_id === 'string') {
      // Filter by quest giver
      quests = questService.getQuestsByQuestGiver(campaign_id, quest_giver_id, viewMode);
      total = quests.length;
    } else {
      // Get all quests with pagination
      const limitNum = limit ? parseInt(limit as string) : 50;
      const offsetNum = offset ? parseInt(offset as string) : 0;
      const result = questService.getQuestsByCampaign(campaign_id, limitNum, offsetNum, viewMode);
      quests = result.quests;
      total = result.total;
    }

    // Note: Service methods now handle viewMode filtering at SQL level

    res.status(200).json({
      data: quests,
      total,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });
  } catch (error: any) {
    if (error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('List quests error:', error);
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

/**
 * GET /api/quests/:id
 * Get quest by ID
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    // Use service to get quest (handles JSON parsing)
    const quest = questService.getQuestById(id);

    if (!quest) {
      res.status(404).json({ error: 'Quest not found' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT owner_id FROM campaigns WHERE id = ?')
      .get(quest.campaign_id) as { owner_id: string } | undefined;

    if (!campaign || campaign.owner_id !== userId) {
      res.status(404).json({ error: 'Quest not found' });
      return;
    }

    // Check player_knowledge visibility for player_view
    if (viewMode === 'player_view') {
      const pk = quest.player_knowledge;
      if (pk !== 'common_knowledge' && pk !== 'player_knowledge' && pk !== null) {
        // Return 404 instead of 403 to not reveal existence
        res.status(404).json({ error: 'Quest not found' });
        return;
      }
    }

    // Note: applyInformationFilter middleware will strip dm_* fields in player_view mode
    res.status(200).json(quest);
  } catch (error: any) {
    console.error('Get quest error:', error);
    res.status(500).json({ error: 'Failed to fetch quest' });
  }
});

/**
 * PUT /api/quests/:id
 * Update quest
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
      status,
      objectives,
      rewards,
      quest_giver_id,
      started_session_id,
      completed_session_id,
      related_npcs,
      related_locations,
      dm_true_objective,
      dm_consequences,
    } = req.body;

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({ error: 'name must not be empty' });
      return;
    }

    // Validate status enum if provided
    if (status !== undefined) {
      const validStatuses = ['not_started', 'in_progress', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: 'Invalid status',
          details: `Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
    }

    const quest = questService.updateQuest(
      id,
      {
        name: name ? name.trim() : undefined,
        description,
        coreStatus: core_status,
        playerKnowledge: player_knowledge,
        tags,
        customFields: custom_fields,
        status,
        objectives,
        rewards,
        questGiverId: quest_giver_id,
        startedSessionId: started_session_id,
        completedSessionId: completed_session_id,
        relatedNpcs: related_npcs,
        relatedLocations: related_locations,
        dmTrueObjective: dm_true_objective,
        dmConsequences: dm_consequences,
      },
      userId
    );

    res.status(200).json(quest);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update quest error:', error);
    res.status(500).json({ error: 'Failed to update quest' });
  }
});

/**
 * DELETE /api/quests/:id
 * Delete quest
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    questService.deleteQuest(id, userId);

    res.status(204).send();
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Delete quest error:', error);
    res.status(500).json({ error: 'Failed to delete quest' });
  }
});

/**
 * GET /api/quests/by-npc/:npcId
 * Get quests related to a specific NPC (quest giver or in related_npcs array)
 *
 * Query params:
 * - campaign_id (required)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/by-npc/:npcId', async (req: Request, res: Response) => {
  try {
    const { npcId } = req.params;
    const { campaign_id } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    let quests = questService.getQuestsRelatedToNpc(campaign_id, npcId, viewMode);

    // Note: Service method now handles viewMode filtering at SQL level

    res.status(200).json({
      data: quests,
      pagination: {
        currentPage: 1,
        pageSize: quests.length,
        totalPages: 1,
        totalCount: quests.length
      }
    });
  } catch (error: any) {
    console.error('Get quests by NPC error:', error);
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

/**
 * GET /api/quests/by-location/:locationId
 * Get quests related to a specific location (in related_locations array)
 *
 * Query params:
 * - campaign_id (required)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/by-location/:locationId', async (req: Request, res: Response) => {
  try {
    const { locationId } = req.params;
    const { campaign_id } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    let quests = questService.getQuestsRelatedToLocation(campaign_id, locationId, viewMode);

    // Note: Service method now handles viewMode filtering at SQL level

    res.status(200).json({
      data: quests,
      pagination: {
        currentPage: 1,
        pageSize: quests.length,
        totalPages: 1,
        totalCount: quests.length
      }
    });
  } catch (error: any) {
    console.error('Get quests by location error:', error);
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

/**
 * GET /api/quests/by-session/:sessionId
 * Get quests related to a specific session (started or completed)
 *
 * Query params:
 * - campaign_id (required)
 *
 * Headers:
 * - X-View-Mode: dm_view | player_view (optional, default: dm_view)
 */
router.get('/by-session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { campaign_id } = req.query;
    const userId = req.user!.id;
    const viewMode = req.categoryViewMode || 'dm_view';

    if (!campaign_id || typeof campaign_id !== 'string') {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db
      .prepare('SELECT id FROM campaigns WHERE id = ? AND owner_id = ?')
      .get(campaign_id, userId);

    if (!campaign) {
      res.status(403).json({ error: 'Campaign not found or access denied' });
      return;
    }

    let quests = questService.getQuestsRelatedToSession(campaign_id, sessionId, viewMode);

    // Note: Service method now handles viewMode filtering at SQL level

    res.status(200).json({
      data: quests,
      pagination: {
        currentPage: 1,
        pageSize: quests.length,
        totalPages: 1,
        totalCount: quests.length
      }
    });
  } catch (error: any) {
    console.error('Get quests by session error:', error);
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
});

export default router;
