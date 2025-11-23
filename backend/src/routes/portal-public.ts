/**
 * Portal Public Routes
 * Feature 009: Player Question Portal
 * T028: Public player endpoints (NO authentication - uses session tokens)
 */

import express, { Request, Response } from 'express';
import { PortalConfigService } from '../services/PortalConfigService';
import { PortalPlayerService } from '../services/PortalPlayerService';
import { PortalConversationService } from '../services/PortalConversationService';
import { PortalAIService } from '../services/PortalAIService';
import { SessionRecapService } from '../services/SessionRecapService';
import { ItemService } from '../services/ItemService';
import { KnowledgeGraphService } from '../services/KnowledgeGraphService';
import { db } from '../services/DatabaseService';

const router = express.Router();

// Initialize services
const configService = new PortalConfigService(db);
const playerService = new PortalPlayerService(db);
const conversationService = new PortalConversationService(db);
const sessionRecapService = new SessionRecapService(db);
const itemService = new ItemService(db);
const graphService = new KnowledgeGraphService(db);
const portalAI = new PortalAIService(db, sessionRecapService, itemService, graphService);

/**
 * GET /api/portal/:campaignId/status
 * Check if portal is enabled and password-protected
 */
router.get('/portal/:campaignId/status', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const config = configService.getConfig(campaignId);

    if (!config) {
      return res.status(404).json({ error: 'Portal not found' });
    }

    res.json({
      enabled: config.enabled,
      requiresPassword: config.passwordHash !== null,
    });
  } catch (error) {
    console.error('Error getting portal status:', error);
    res.status(500).json({ error: 'Failed to get portal status' });
  }
});

/**
 * POST /api/portal/:campaignId/verify-password
 * Verify portal password (if password protection enabled)
 */
router.post('/portal/:campaignId/verify-password', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { password } = req.body;

    const isValid = await configService.verifyPassword(campaignId, password);

    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

/**
 * POST /api/portal/:campaignId/identify
 * Create player identity and session token
 */
router.post('/portal/:campaignId/identify', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { characterName } = req.body;

    if (!characterName || characterName.trim().length === 0) {
      return res.status(400).json({ error: 'Character name is required' });
    }

    // Create player identity
    const { player, sessionToken } = await playerService.identifyPlayer(
      campaignId,
      characterName.trim()
    );

    // Set HTTP-only cookie with session token
    res.cookie('portal_session', sessionToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
    });

    res.status(201).json({
      player: {
        id: player.id,
        characterName: player.characterName,
      },
    });
  } catch (error: any) {
    if (error.message.includes('already in use')) {
      return res.status(409).json({ error: error.message });
    }
    console.error('Error identifying player:', error);
    res.status(500).json({ error: 'Failed to identify player' });
  }
});

/**
 * POST /api/portal/:campaignId/ask
 * Player asks a question (requires session token cookie)
 */
router.post('/portal/:campaignId/ask', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { question } = req.body;
    const sessionToken = req.cookies.portal_session;

    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token. Please identify yourself first.' });
    }

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get player from session token
    const player = await playerService.getPlayerByToken(sessionToken);

    if (!player) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    // Get or create conversation
    const conversation = conversationService.getOrCreateByPlayer(player.id, campaignId);

    // Get portal config for response style
    const config = configService.getConfig(campaignId);

    if (!config || !config.enabled) {
      return res.status(403).json({ error: 'Portal is currently disabled' });
    }

    // Answer question with AI
    const message = await portalAI.answerQuestion(
      campaignId,
      player.id,
      conversation.id,
      question.trim(),
      config.responseStyle
    );

    // Save message to conversation
    conversationService.addMessage(message);

    res.json(message);
  } catch (error: any) {
    if (error.message.includes('BYOLLM')) {
      return res
        .status(503)
        .json({ error: 'GM must configure BYOLLM for Player Portal to function' });
    }
    console.error('Error answering question:', error);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

/**
 * GET /api/portal/:campaignId/history
 * Get conversation history for current player (requires session token cookie)
 */
router.get('/portal/:campaignId/history', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const sessionToken = req.cookies.portal_session;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token' });
    }

    // Get player from session token
    const player = await playerService.getPlayerByToken(sessionToken);

    if (!player) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    // Get conversation
    const conversation = conversationService.getOrCreateByPlayer(player.id, campaignId);

    // Get history
    const history = conversationService.getHistory(conversation.id, limit);

    res.json({
      player: {
        id: player.id,
        characterName: player.characterName,
      },
      messages: history,
    });
  } catch (error) {
    console.error('Error getting history:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

export default router;
