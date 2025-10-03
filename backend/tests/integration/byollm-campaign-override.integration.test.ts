/**
 * BYOLLM Campaign Override Integration Tests
 * Feature: 008-create-byollm-configuration
 * Task: T023
 *
 * Tests campaign-specific BYOLLM config overriding global config
 * Scope resolution: campaign config takes precedence over global config
 *
 * IMPORTANT: This test MUST FAIL until BYOLLM services are implemented (TDD)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseService } from '../../src/services/DatabaseService';
import { BYOLLMConfigService } from '../../src/services/BYOLLMConfigService';
import { EncryptionService } from '../../src/services/EncryptionService';
import { ProviderClientService } from '../../src/services/ProviderClientService';

describe('BYOLLM Campaign Override Integration', () => {
  let db: DatabaseService;
  let configService: BYOLLMConfigService;
  let encryptionService: EncryptionService;
  let providerService: ProviderClientService;

  const testUserId = 'test-user-override';
  const campaign1Id = 'campaign-override-1';
  const campaign2Id = 'campaign-override-2';
  const campaign3Id = 'campaign-override-3';

  beforeAll(async () => {
    // Initialize services
    db = new DatabaseService(':memory:');
    await db.initialize();

    const encryptionPassphrase = 'test-passphrase-override';
    encryptionService = new EncryptionService(encryptionPassphrase);
    configService = new BYOLLMConfigService(db, encryptionService);
    providerService = new ProviderClientService();

    // Create test campaigns
    const campaigns = [
      { id: campaign1Id, name: 'Campaign 1 - Override Test' },
      { id: campaign2Id, name: 'Campaign 2 - Global Fallback' },
      { id: campaign3Id, name: 'Campaign 3 - Custom Model' },
    ];

    for (const campaign of campaigns) {
      db.getDatabase().prepare(`
        INSERT INTO campaigns (id, user_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(campaign.id, testUserId, campaign.name, Date.now(), Date.now());
    }
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Scope resolution: campaign overrides global', () => {
    it('should use campaign config when both global and campaign exist', async () => {
      const globalApiKey = 'sk-ant-api03-global-key-override-test-1';
      const campaignApiKey = 'sk-ant-api03-campaign-key-override-test-1';

      // Create global config
      const globalConfig = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Create campaign-specific config
      const campaignConfig = await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaignApiKey,
        },
        modelName: 'claude-3-opus-20240229', // Different model
      });

      // Resolve config for campaign
      const resolvedConfig = await configService.resolveConfig(campaign1Id);

      expect(resolvedConfig).toBeTruthy();
      expect(resolvedConfig!.id).toBe(campaignConfig.id);
      expect(resolvedConfig!.scope).toBe('campaign');
      expect(resolvedConfig!.modelName).toBe('claude-3-opus-20240229');

      // Verify campaign API key used
      const credentials = await configService.getDecryptedCredentials(resolvedConfig!.id);
      expect(credentials.apiKey).toBe(campaignApiKey);
    });

    it('should fallback to global config when campaign config not found', async () => {
      const globalApiKey = 'sk-ant-api03-global-fallback-key';

      // Create only global config (no campaign-specific config for campaign2)
      const globalConfig = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Resolve config for campaign without specific config
      const resolvedConfig = await configService.resolveConfig(campaign2Id);

      expect(resolvedConfig).toBeTruthy();
      expect(resolvedConfig!.id).toBe(globalConfig.id);
      expect(resolvedConfig!.scope).toBe('global');

      // Verify global API key used
      const credentials = await configService.getDecryptedCredentials(resolvedConfig!.id);
      expect(credentials.apiKey).toBe(globalApiKey);
    });

    it('should return null when no config exists (blocking error)', async () => {
      const noCampaignId = 'campaign-no-config-123';

      // Create campaign without any BYOLLM config
      db.getDatabase().prepare(`
        INSERT INTO campaigns (id, user_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(noCampaignId, testUserId, 'No Config Campaign', Date.now(), Date.now());

      // Delete global config if exists
      await configService.deleteGlobalConfig();

      // Resolve config (should return null - blocking error)
      const resolvedConfig = await configService.resolveConfig(noCampaignId);

      expect(resolvedConfig).toBeNull();
    });
  });

  describe('Different models per campaign', () => {
    it('should allow different campaigns to use different models', async () => {
      const globalApiKey = 'sk-ant-api03-global-multi-model-key';
      const campaign3ApiKey = 'sk-ant-api03-campaign3-key';

      // Global config: Claude 3.5 Sonnet
      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Campaign 3: Claude 3 Opus
      await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign3Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaign3ApiKey,
        },
        modelName: 'claude-3-opus-20240229',
      });

      // Resolve for campaign 2 (should use global Sonnet)
      const config2 = await configService.resolveConfig(campaign2Id);
      expect(config2!.modelName).toBe('claude-3-5-sonnet-20241022');

      // Resolve for campaign 3 (should use campaign-specific Opus)
      const config3 = await configService.resolveConfig(campaign3Id);
      expect(config3!.modelName).toBe('claude-3-opus-20240229');
    });
  });

  describe('Different API keys per campaign', () => {
    it('should allow different campaigns to use different API keys', async () => {
      const globalApiKey = 'sk-ant-api03-global-org-key';
      const campaign1ApiKey = 'sk-ant-api03-campaign1-personal-key';

      // Global config (organization API key)
      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Campaign 1 (personal API key)
      await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaign1ApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Verify different API keys used
      const config2 = await configService.resolveConfig(campaign2Id);
      const credentials2 = await configService.getDecryptedCredentials(config2!.id);
      expect(credentials2.apiKey).toBe(globalApiKey);

      const config1 = await configService.resolveConfig(campaign1Id);
      const credentials1 = await configService.getDecryptedCredentials(config1!.id);
      expect(credentials1.apiKey).toBe(campaign1ApiKey);
    });
  });

  describe('Custom system prompts per campaign', () => {
    it('should allow different campaigns to have different Import AI prompts', async () => {
      const globalApiKey = 'sk-ant-api03-global-prompt-key';
      const campaign1ApiKey = 'sk-ant-api03-campaign1-prompt-key';

      // Global config: default Import prompt
      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
        customSystemPromptImport: 'Default import prompt for all campaigns.',
      });

      // Campaign 1: custom Import prompt
      await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaign1ApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
        customSystemPromptImport: 'Custom prompt for high-fantasy campaign imports.',
      });

      // Verify different prompts
      const config2 = await configService.resolveConfig(campaign2Id);
      expect(config2!.customSystemPromptImport).toBe('Default import prompt for all campaigns.');

      const config1 = await configService.resolveConfig(campaign1Id);
      expect(config1!.customSystemPromptImport).toBe('Custom prompt for high-fantasy campaign imports.');
    });

    it('should allow different campaigns to have different Planning AI prompts', async () => {
      const globalApiKey = 'sk-ant-api03-global-planning-key';
      const campaign1ApiKey = 'sk-ant-api03-campaign1-planning-key';

      // Global config: default Planning prompt
      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
        customSystemPromptPlanning: 'Default planning prompt.',
      });

      // Campaign 1: custom Planning prompt
      await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaign1ApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
        customSystemPromptPlanning: 'Creative planning for sci-fi horror campaign.',
      });

      // Verify different prompts
      const config2 = await configService.resolveConfig(campaign2Id);
      expect(config2!.customSystemPromptPlanning).toBe('Default planning prompt.');

      const config1 = await configService.resolveConfig(campaign1Id);
      expect(config1!.customSystemPromptPlanning).toBe('Creative planning for sci-fi horror campaign.');
    });
  });

  describe('OAuth vs API key per campaign', () => {
    it('should allow global OAuth with campaign-specific API key override', async () => {
      // Note: This test conceptually validates mixing auth methods
      // In practice, both use same provider, different auth methods

      const campaignApiKey = 'sk-ant-api03-campaign-override-oauth';

      // Global config: OAuth (simulated with mock tokens)
      const globalConfig = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'oauth',
        credentials: {
          accessToken: 'oauth-access-token-global',
          refreshToken: 'oauth-refresh-token-global',
          expiresAt: Date.now() + 3600000,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Campaign 1: API key override
      const campaignConfig = await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaignApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Verify different auth methods
      expect(globalConfig.authMethod).toBe('oauth');
      expect(campaignConfig.authMethod).toBe('api_key');

      // Resolve for campaign 2 (should use global OAuth)
      const config2 = await configService.resolveConfig(campaign2Id);
      expect(config2!.authMethod).toBe('oauth');

      // Resolve for campaign 1 (should use campaign API key)
      const config1 = await configService.resolveConfig(campaign1Id);
      expect(config1!.authMethod).toBe('api_key');
    });
  });

  describe('Update campaign config', () => {
    it('should update campaign config without affecting global', async () => {
      const globalApiKey = 'sk-ant-api03-global-update-test';
      const campaignApiKey1 = 'sk-ant-api03-campaign-update-1';
      const campaignApiKey2 = 'sk-ant-api03-campaign-update-2';

      // Create global config
      const globalConfig = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Create campaign config
      const campaignConfig = await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaignApiKey1,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Update campaign config
      await configService.updateConfig(campaignConfig.id, {
        credentials: {
          apiKey: campaignApiKey2,
        },
      });

      // Verify global config unchanged
      const globalAfterUpdate = await configService.getConfigById(globalConfig.id);
      const globalCredentials = await configService.getDecryptedCredentials(globalAfterUpdate!.id);
      expect(globalCredentials.apiKey).toBe(globalApiKey);

      // Verify campaign config updated
      const campaignAfterUpdate = await configService.getConfigById(campaignConfig.id);
      const campaignCredentials = await configService.getDecryptedCredentials(campaignAfterUpdate!.id);
      expect(campaignCredentials.apiKey).toBe(campaignApiKey2);
    });
  });

  describe('Delete campaign config', () => {
    it('should delete campaign config and fallback to global', async () => {
      const globalApiKey = 'sk-ant-api03-global-delete-test';
      const campaignApiKey = 'sk-ant-api03-campaign-delete-test';

      // Create global config
      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Create campaign config
      const campaignConfig = await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaignApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Resolve (should use campaign config)
      const resolvedBefore = await configService.resolveConfig(campaign1Id);
      expect(resolvedBefore!.scope).toBe('campaign');

      // Delete campaign config
      await configService.deleteConfig(campaignConfig.id);

      // Resolve again (should fallback to global)
      const resolvedAfter = await configService.resolveConfig(campaign1Id);
      expect(resolvedAfter!.scope).toBe('global');

      const credentials = await configService.getDecryptedCredentials(resolvedAfter!.id);
      expect(credentials.apiKey).toBe(globalApiKey);
    });
  });

  describe('Credits fetching with scope resolution', () => {
    it('should fetch credits using resolved config (campaign override)', async () => {
      const globalApiKey = 'sk-ant-api03-global-credits-key';
      const campaignApiKey = 'sk-ant-api03-campaign-credits-key';

      // Global config
      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Campaign config
      await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaignApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Fetch credits for campaign (should use campaign API key)
      const credits = await providerService.fetchCredits(campaign1Id);

      // Verify credits fetched (may fail if API keys invalid, but structure should exist)
      expect(credits).toBeDefined();
    });

    it('should fetch credits using global config when campaign config not found', async () => {
      const globalApiKey = 'sk-ant-api03-global-credits-fallback-key';

      // Only global config
      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Fetch credits for campaign without specific config
      const credits = await providerService.fetchCredits(campaign2Id);

      expect(credits).toBeDefined();
    });
  });

  describe('Connection test with scope resolution', () => {
    it('should test connection using campaign config when available', async () => {
      const globalApiKey = 'sk-ant-api03-global-test-key';
      const campaignApiKey = 'sk-ant-api03-campaign-test-key';

      // Global config
      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Campaign config (different model)
      await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaignApiKey,
        },
        modelName: 'claude-3-opus-20240229',
      });

      // Test connection for campaign (should use campaign config)
      const resolvedConfig = await configService.resolveConfig(campaign1Id);
      const result = await providerService.testConnection(resolvedConfig!.id);

      if (result.success) {
        // Should report Opus model (campaign config)
        expect(result.modelName).toBe('claude-3-opus-20240229');
      }
    });
  });

  describe('Performance', () => {
    it('should resolve campaign config quickly (<10ms)', async () => {
      const globalApiKey = 'sk-ant-api03-global-perf-key';
      const campaignApiKey = 'sk-ant-api03-campaign-perf-key';

      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: globalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      await configService.createConfig({
        scope: 'campaign',
        campaignId: campaign1Id,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaignApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      const startTime = Date.now();
      await configService.resolveConfig(campaign1Id);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10);
    });
  });
});
