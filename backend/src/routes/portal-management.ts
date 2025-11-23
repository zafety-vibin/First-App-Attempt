/**
 * Portal Management Routes
 * Feature 009: Player Question Portal
 * T027: GM portal management endpoints (protected by Keycloak)
 */

import express, { Request, Response } from 'express';
import { PortalConfigService } from '../services/PortalConfigService';
import { PortalTokenTrackerService } from '../services/PortalTokenTrackerService';
import { PortalConversationService } from '../services/PortalConversationService';
import { PortalPlayerService } from '../services/PortalPlayerService';
import { db } from '../services/DatabaseService';

const router = express.Router();

// Initialize services
const configService = new PortalConfigService(db);
const tokenTracker = new PortalTokenTrackerService(db);
const conversationService = new PortalConversationService(db);
const playerService = new PortalPlayerService(db);

/**
 * GET /api/campaigns/:campaignId/portal/config
 * Get portal configuration
 */
router.get('/campaigns/:campaignId/portal/config', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const config = configService.getOrCreate(campaignId);

    res.json(config);
  } catch (error) {
    console.error('Error getting portal config:', error);
    res.status(500).json({ error: 'Failed to get portal config' });
  }
});

/**
 * POST /api/campaigns/:campaignId/portal/config
 * Create or update portal configuration
 */
router.post('/campaigns/:campaignId/portal/config', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { enabled, responseStyle, customSystemPrompt } = req.body;

    const config = configService.getOrCreate(campaignId);

    // Update configuration
    const updated = configService.update(campaignId, {
      enabled,
      responseStyle,
      customSystemPrompt,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating portal config:', error);
    res.status(400).json({ error: error.message || 'Failed to update portal config' });
  }
});

/**
 * PUT /api/campaigns/:campaignId/portal/enable
 * Enable/disable portal
 */
router.put('/campaigns/:campaignId/portal/enable', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { enabled } = req.body;

    if (enabled) {
      configService.enable(campaignId);
    } else {
      configService.disable(campaignId);
    }

    const config = configService.getConfig(campaignId);
    res.json(config);
  } catch (error) {
    console.error('Error toggling portal:', error);
    res.status(500).json({ error: 'Failed to toggle portal' });
  }
});

/**
 * PUT /api/campaigns/:campaignId/portal/password
 * Set or remove password protection
 */
router.put('/campaigns/:campaignId/portal/password', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { password } = req.body; // null to remove password

    await configService.setPassword(campaignId, password);

    const config = configService.getConfig(campaignId);
    res.json({ success: true, hasPassword: config?.passwordHash !== null });
  } catch (error) {
    console.error('Error setting portal password:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

/**
 * PUT /api/campaigns/:campaignId/portal/response-style
 * Set response style
 */
router.put('/campaigns/:campaignId/portal/response-style', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { responseStyle, customSystemPrompt } = req.body;

    configService.setResponseStyle(campaignId, responseStyle, customSystemPrompt);

    const config = configService.getConfig(campaignId);
    res.json(config);
  } catch (error: any) {
    console.error('Error setting response style:', error);
    res.status(400).json({ error: error.message || 'Failed to set response style' });
  }
});

/**
 * GET /api/campaigns/:campaignId/portal/monitoring
 * Get per-player token usage and conversation stats
 */
router.get('/campaigns/:campaignId/portal/monitoring', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    // Get per-player token usage
    const tokenUsage = tokenTracker.getPerPlayerUsage(campaignId);

    // Get campaign total
    const totalTokens = tokenTracker.getCampaignUsage(campaignId);

    // Get conversations
    const conversations = conversationService.listByCampaign(campaignId);

    // Get players
    const players = playerService.listPlayers(campaignId);

    // Combine data
    const monitoring = {
      totalTokens,
      playerStats: tokenUsage,
      totalPlayers: players.length,
      totalConversations: conversations.length,
      players: players.map((p) => ({
        id: p.id,
        characterName: p.characterName,
        createdAt: p.createdAt,
      })),
    };

    res.json(monitoring);
  } catch (error) {
    console.error('Error getting portal monitoring:', error);
    res.status(500).json({ error: 'Failed to get monitoring data' });
  }
});

/**
 * POST /api/campaigns/:campaignId/portal/preview
 * DM preview mode - test portal response without saving
 */
router.post('/campaigns/:campaignId/portal/preview', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { question } = req.body;

    // TODO: Implement preview mode (similar to answering but no save)
    // This would use PortalAIService.buildContext() and return filtered context

    res.json({
      message: 'Preview mode not yet implemented',
      question,
    });
  } catch (error) {
    console.error('Error in preview mode:', error);
    res.status(500).json({ error: 'Failed to preview' });
  }
});

export default router;
