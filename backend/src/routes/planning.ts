/**
 * Planning API Routes
 * Feature: 005-create-the-ai
 */

import { Router, Request, Response } from 'express';
import { db } from '../services/DatabaseService';
import { PlanningAIService } from '../services/PlanningAIService';
import { rowToPlanningSession } from '../models/PlanningSession';

const router = Router();

/**
 * POST /api/planning/session
 * Create a new planning session
 */
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }

    // Get BYOLLM config
    const byollmConfig = db.prepare(`
      SELECT config FROM byollm_configs
      WHERE campaign_id = ? AND scope = 'campaign'
    `).get(campaignId) as any;

    if (!byollmConfig) {
      return res.status(400).json({ error: 'BYOLLM configuration not found' });
    }

    const config = JSON.parse(byollmConfig.config);

    // Initialize planning AI service
    const planningAI = new PlanningAIService(db, {
      llmConfig: {
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model
      },
      activeFilterEnabled: true
    });

    await planningAI.initialize();

    // Create session
    const session = await planningAI.createSession(campaignId);

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/planning/session
 * Get active planning sessions for a campaign
 */
router.get('/session', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.query;
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }

    const sessions = db.prepare(`
      SELECT * FROM planning_sessions
      WHERE campaign_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `).all(campaignId as string) as any[];

    const planningSessions = sessions.map(row => rowToPlanningSession(row));

    res.json(planningSessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/planning/chat
 * Chat with the planning AI (SSE streaming)
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, campaignId, message } = req.body;
    if (!sessionId || !campaignId || !message) {
      return res.status(400).json({ error: 'Session ID, campaign ID, and message required' });
    }

    // Get BYOLLM config
    const byollmConfig = db.prepare(`
      SELECT config FROM byollm_configs
      WHERE campaign_id = ? AND scope = 'campaign'
    `).get(campaignId) as any;

    if (!byollmConfig) {
      return res.status(400).json({ error: 'BYOLLM configuration not found' });
    }

    const config = JSON.parse(byollmConfig.config);

    // Initialize planning AI service
    const planningAI = new PlanningAIService(db, {
      llmConfig: {
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model
      },
      activeFilterEnabled: true
    });

    await planningAI.initialize();

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the chat response
    try {
      const stream = await planningAI.handleChat(sessionId, campaignId, message);

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
    } catch (streamError: any) {
      res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`);
    } finally {
      res.end();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/planning/session/:id
 * Get a specific planning session
 */
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = db.prepare(`
      SELECT * FROM planning_sessions WHERE id = ?
    `).get(id) as any;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const planningSession = rowToPlanningSession(session);

    res.json(planningSession);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/planning/session/:id/complete
 * Mark a planning session as complete
 */
router.post('/session/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get session to verify it exists
    const session = db.prepare(`
      SELECT campaign_id FROM planning_sessions WHERE id = ?
    `).get(id) as any;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get BYOLLM config
    const byollmConfig = db.prepare(`
      SELECT config FROM byollm_configs
      WHERE campaign_id = ? AND scope = 'campaign'
    `).get(session.campaign_id) as any;

    if (!byollmConfig) {
      return res.status(400).json({ error: 'BYOLLM configuration not found' });
    }

    const config = JSON.parse(byollmConfig.config);

    // Initialize planning AI service
    const planningAI = new PlanningAIService(db, {
      llmConfig: {
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model
      },
      activeFilterEnabled: true
    });

    await planningAI.completeSession(id);

    res.json({
      success: true,
      message: 'Session completed successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as planningRouter };