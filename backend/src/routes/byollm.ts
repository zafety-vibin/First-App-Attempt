/**
 * BYOLLM API Routes
 * Feature: 008-create-byollm-configuration
 * Tasks: T038-T045
 *
 * REST API endpoints for BYOLLM configuration management
 * Implements OpenAPI spec: /specs/008-create-byollm-configuration/contracts/byollm.yaml
 */

import express, { Request, Response } from 'express';
import { BYOLLMConfigService } from '../services/BYOLLMConfigService';
import { OAuthFlowService } from '../services/OAuthFlowService';
import { ProviderClientService } from '../services/ProviderClientService';
import { MCPConfigService } from '../services/MCPConfigService';

const router = express.Router();

// Initialize services
const configService = new BYOLLMConfigService();
const oauthService = new OAuthFlowService();
const providerService = new ProviderClientService();
const mcpService = new MCPConfigService();

/**
 * POST /api/byollm/oauth/initiate
 * Initiates OAuth 2.0 flow with PKCE
 */
router.post('/oauth/initiate', async (req: Request, res: Response) => {
  try {
    const { provider, scope, campaignId } = req.body;

    // Validate request
    if (!provider || !scope) {
      return res.status(400).json({
        error: 'Missing required fields: provider, scope',
      });
    }

    if (provider !== 'anthropic') {
      return res.status(400).json({
        error: 'Unsupported provider (only anthropic supported)',
      });
    }

    if (scope !== 'global' && scope !== 'campaign') {
      return res.status(400).json({
        error: 'Invalid scope (must be global or campaign)',
      });
    }

    if (scope === 'campaign' && !campaignId) {
      return res.status(400).json({
        error: 'campaignId required for campaign scope',
      });
    }

    // Initiate OAuth flow
    const result = await oauthService.initiateOAuthFlow({
      provider,
      scope,
      campaignId: campaignId || null,
    });

    return res.json({
      authorization_url: result.authorizationUrl,
      state: result.state,
    });
  } catch (error) {
    console.error('OAuth initiate error:', error);
    return res.status(500).json({
      error: 'Failed to initiate OAuth flow',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/byollm/oauth/callback
 * Handles OAuth callback (authorization code exchange)
 */
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    // Validate query parameters
    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing required query parameters: code, state',
      });
    }

    // Handle OAuth callback
    const result = await oauthService.handleOAuthCallback({
      code: code as string,
      state: state as string,
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    // Redirect to frontend with success
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/byollm?success=true&config_id=${result.configId}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/byollm?error=${encodeURIComponent((error as Error).message)}`;
    return res.redirect(redirectUrl);
  }
});

/**
 * POST /api/byollm/config
 * Creates or updates BYOLLM config
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const {
      scope,
      campaignId,
      provider,
      authMethod,
      credentials,
      modelName,
      customEndpointUrl,
      customSystemPromptImport,
      customSystemPromptPlanning,
    } = req.body;

    // Validate required fields
    if (!scope || !provider || !authMethod || !credentials || !modelName) {
      return res.status(400).json({
        error: 'Missing required fields',
      });
    }

    // Check if config already exists
    const existingConfig = await configService.getConfig({
      scope,
      campaignId: campaignId || null,
    });

    let config;
    if (existingConfig) {
      // Update existing config
      config = await configService.updateConfig(existingConfig.id, {
        credentials,
        modelName,
        customSystemPromptImport,
        customSystemPromptPlanning,
      });
    } else {
      // Create new config
      config = await configService.createConfig({
        scope,
        campaignId: campaignId || null,
        provider,
        authMethod,
        credentials,
        modelName,
        customEndpointUrl,
        customSystemPromptImport,
        customSystemPromptPlanning,
      });

      // Create MCP config automatically
      await mcpService.createDefaultMCPConfig(config.id);
    }

    return res.json(config);
  } catch (error) {
    console.error('Config create/update error:', error);
    return res.status(500).json({
      error: 'Failed to save config',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/byollm/config
 * Retrieves BYOLLM config with scope resolution
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.query;

    let config;
    if (campaignId) {
      // Resolve config for campaign (campaign → global fallback)
      config = await configService.resolveConfig(campaignId as string);
    } else {
      // Get global config
      config = await configService.getConfig({
        scope: 'global',
        campaignId: null,
      });
    }

    if (!config) {
      return res.status(404).json({
        error: 'No BYOLLM config found',
        blocking: true,
      });
    }

    // Don't return encrypted credentials to client
    const { encryptedCredentials, ...safeConfig } = config;

    return res.json(safeConfig);
  } catch (error) {
    console.error('Config retrieve error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve config',
      details: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/byollm/config/:id
 * Deletes BYOLLM config
 */
router.delete('/config/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if config exists
    const config = await configService.getConfigById(id);
    if (!config) {
      return res.status(404).json({
        error: 'Config not found',
      });
    }

    // Delete config
    await configService.deleteConfig(id);

    // Delete associated MCP config
    await mcpService.deleteMCPConfig(id);

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error('Config delete error:', error);
    return res.status(500).json({
      error: 'Failed to delete config',
      details: (error as Error).message,
    });
  }
});

/**
 * POST /api/byollm/test-connection
 * Tests connection to provider API with MCP validation
 */
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;

    // Resolve config
    let config;
    if (campaignId) {
      config = await configService.resolveConfig(campaignId);
    } else {
      config = await configService.getConfig({
        scope: 'global',
        campaignId: null,
      });
    }

    if (!config) {
      return res.status(404).json({
        error: 'No BYOLLM config found',
        blocking: true,
      });
    }

    // Test connection
    const result = await providerService.testConnection(config.id);

    return res.json(result);
  } catch (error) {
    console.error('Connection test error:', error);
    return res.status(500).json({
      error: 'Connection test failed',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/byollm/credits
 * Fetches credits/usage from provider (with 5-min cache)
 */
router.get('/credits', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({
        error: 'campaignId required',
      });
    }

    // Fetch credits
    const credits = await providerService.fetchCredits(campaignId as string);

    if (!credits) {
      return res.status(404).json({
        error: 'No credits data available',
      });
    }

    return res.json(credits);
  } catch (error) {
    console.error('Credits fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch credits',
      details: (error as Error).message,
    });
  }
});

/**
 * GET /api/byollm/models
 * Fetches available models for provider
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    const { provider } = req.query;

    if (!provider) {
      return res.status(400).json({
        error: 'provider required',
      });
    }

    // Fetch models
    const models = await providerService.fetchAvailableModels({
      provider: provider as any,
    });

    return res.json(models);
  } catch (error) {
    console.error('Models fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch models',
      details: (error as Error).message,
    });
  }
});

/**
 * Cleanup expired OAuth sessions (cron endpoint)
 */
router.post('/oauth/cleanup', async (_req: Request, res: Response) => {
  try {
    await oauthService.cleanupExpiredOAuthSessions();
    return res.json({
      success: true,
    });
  } catch (error) {
    console.error('OAuth cleanup error:', error);
    return res.status(500).json({
      error: 'Failed to cleanup sessions',
      details: (error as Error).message,
    });
  }
});

export default router;
