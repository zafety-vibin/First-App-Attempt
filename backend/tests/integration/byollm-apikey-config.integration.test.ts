/**
 * BYOLLM API Key Configuration Integration Tests
 * Feature: 008-create-byollm-configuration
 * Task: T021
 *
 * Tests API key-based configuration for Anthropic provider (alternative to OAuth)
 * End-to-end: create config with API key → encrypt → store → retrieve → decrypt → use
 *
 * IMPORTANT: This test MUST FAIL until BYOLLM services are implemented (TDD)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseService } from '../../src/services/DatabaseService';
import { BYOLLMConfigService } from '../../src/services/BYOLLMConfigService';
import { EncryptionService } from '../../src/services/EncryptionService';
import { ProviderClientService } from '../../src/services/ProviderClientService';

describe('BYOLLM API Key Configuration Integration', () => {
  let db: DatabaseService;
  let configService: BYOLLMConfigService;
  let encryptionService: EncryptionService;
  let providerService: ProviderClientService;

  const testUserId = 'test-user-apikey';
  const testCampaignId = 'test-campaign-apikey';

  beforeAll(async () => {
    // Initialize services
    db = new DatabaseService(':memory:');
    await db.initialize();

    const encryptionPassphrase = 'test-passphrase-apikey';
    encryptionService = new EncryptionService(encryptionPassphrase);
    configService = new BYOLLMConfigService(db, encryptionService);
    providerService = new ProviderClientService();

    // Create test campaign
    db.getDatabase().prepare(`
      INSERT INTO campaigns (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(testCampaignId, testUserId, 'API Key Test Campaign', Date.now(), Date.now());
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Global scope API key config', () => {
    it('should create global Anthropic config with API key', async () => {
      const apiKey = 'sk-ant-api03-test-api-key-1234567890abcdefghijklmnop';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      expect(config.id).toBeTruthy();
      expect(config.scope).toBe('global');
      expect(config.campaignId).toBeNull();
      expect(config.provider).toBe('anthropic');
      expect(config.authMethod).toBe('api_key');
      expect(config.encryptedCredentials).toBeTruthy();
      expect(config.modelName).toBe('claude-3-5-sonnet-20241022');
    });

    it('should encrypt API key in database', async () => {
      const apiKey = 'sk-ant-api03-secret-key-sensitive-data-12345';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Verify encrypted format
      expect(config.encryptedCredentials).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);

      // Verify API key not stored in plaintext
      expect(config.encryptedCredentials).not.toContain('sk-ant-api03');
      expect(config.encryptedCredentials).not.toContain('secret-key');

      // Verify can decrypt
      const decrypted = JSON.parse(
        encryptionService.decrypt(config.encryptedCredentials)
      );
      expect(decrypted.apiKey).toBe(apiKey);
    });

    it('should retrieve and decrypt API key for use', async () => {
      const apiKey = 'sk-ant-api03-retrieve-test-key-abcdefghijklmnop';

      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Retrieve config
      const config = await configService.getConfig({
        scope: 'global',
        campaignId: null,
      });

      expect(config).toBeTruthy();

      // Decrypt credentials
      const credentials = await configService.getDecryptedCredentials(config!.id);

      expect(credentials.apiKey).toBe(apiKey);
    });
  });

  describe('Campaign scope API key config', () => {
    it('should create campaign-specific Anthropic config', async () => {
      const apiKey = 'sk-ant-api03-campaign-key-1234567890';

      const config = await configService.createConfig({
        scope: 'campaign',
        campaignId: testCampaignId,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      expect(config.scope).toBe('campaign');
      expect(config.campaignId).toBe(testCampaignId);
    });

    it('should enforce UNIQUE(scope, campaign_id) constraint', async () => {
      const apiKey1 = 'sk-ant-api03-unique-test-1';
      const apiKey2 = 'sk-ant-api03-unique-test-2';

      // Create first campaign config
      await configService.createConfig({
        scope: 'campaign',
        campaignId: testCampaignId,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: apiKey1,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Attempt to create second campaign config (should fail)
      await expect(
        configService.createConfig({
          scope: 'campaign',
          campaignId: testCampaignId,
          provider: 'anthropic',
          authMethod: 'api_key',
          credentials: {
            apiKey: apiKey2,
          },
          modelName: 'claude-3-5-sonnet-20241022',
        })
      ).rejects.toThrow();
    });

    it('should allow updating existing campaign config', async () => {
      const originalApiKey = 'sk-ant-api03-original-key';
      const updatedApiKey = 'sk-ant-api03-updated-key';

      // Create config
      const config = await configService.createConfig({
        scope: 'campaign',
        campaignId: testCampaignId,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: originalApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Update config
      const updatedConfig = await configService.updateConfig(config.id, {
        credentials: {
          apiKey: updatedApiKey,
        },
      });

      // Verify updated
      const credentials = await configService.getDecryptedCredentials(updatedConfig.id);
      expect(credentials.apiKey).toBe(updatedApiKey);
    });
  });

  describe('Model configuration', () => {
    it('should store selected model name', async () => {
      const apiKey = 'sk-ant-api03-model-test-key';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-opus-20240229',
      });

      expect(config.modelName).toBe('claude-3-opus-20240229');
    });

    it('should allow updating model name', async () => {
      const apiKey = 'sk-ant-api03-model-update-key';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Update model
      const updatedConfig = await configService.updateConfig(config.id, {
        modelName: 'claude-3-opus-20240229',
      });

      expect(updatedConfig.modelName).toBe('claude-3-opus-20240229');
    });

    it('should fetch available models from Anthropic API', async () => {
      const apiKey = 'sk-ant-api03-fetch-models-key';

      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Fetch models (uses API key)
      const models = await providerService.fetchAvailableModels({
        provider: 'anthropic',
        apiKey,
      });

      expect(models).toBeTruthy();
      expect(models.length).toBeGreaterThan(0);

      // Should include Claude models
      const hasClaude = models.some((m: any) => m.name.includes('claude'));
      expect(hasClaude).toBe(true);
    });
  });

  describe('Custom system prompts', () => {
    it('should store custom system prompt for Import AI', async () => {
      const apiKey = 'sk-ant-api03-prompt-test-key';
      const customPrompt = 'You are a helpful assistant for importing TTRPG session recaps.';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
        customSystemPromptImport: customPrompt,
      });

      expect(config.customSystemPromptImport).toBe(customPrompt);
    });

    it('should store custom system prompt for Planning AI', async () => {
      const apiKey = 'sk-ant-api03-planning-prompt-key';
      const customPrompt = 'You are a creative assistant for planning TTRPG campaigns.';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
        customSystemPromptPlanning: customPrompt,
      });

      expect(config.customSystemPromptPlanning).toBe(customPrompt);
    });

    it('should allow separate prompts for Import and Planning', async () => {
      const apiKey = 'sk-ant-api03-both-prompts-key';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
        customSystemPromptImport: 'Import prompt here',
        customSystemPromptPlanning: 'Planning prompt here',
      });

      expect(config.customSystemPromptImport).toBe('Import prompt here');
      expect(config.customSystemPromptPlanning).toBe('Planning prompt here');
    });

    it('should handle null custom prompts (use defaults)', async () => {
      const apiKey = 'sk-ant-api03-null-prompts-key';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      expect(config.customSystemPromptImport).toBeNull();
      expect(config.customSystemPromptPlanning).toBeNull();
    });
  });

  describe('Scope resolution (campaign overrides global)', () => {
    it('should return campaign config when both global and campaign exist', async () => {
      const globalApiKey = 'sk-ant-api03-global-fallback-key';
      const campaignApiKey = 'sk-ant-api03-campaign-override-key';

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
      await configService.createConfig({
        scope: 'campaign',
        campaignId: testCampaignId,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: campaignApiKey,
        },
        modelName: 'claude-3-opus-20240229',
      });

      // Resolve config for campaign (should return campaign config)
      const resolvedConfig = await configService.resolveConfig(testCampaignId);

      expect(resolvedConfig).toBeTruthy();
      expect(resolvedConfig!.scope).toBe('campaign');

      // Verify campaign API key used (not global)
      const credentials = await configService.getDecryptedCredentials(resolvedConfig!.id);
      expect(credentials.apiKey).toBe(campaignApiKey);
    });

    it('should fallback to global config when campaign config not found', async () => {
      const globalApiKey = 'sk-ant-api03-global-only-key';

      // Create only global config (no campaign config)
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

      const anotherCampaignId = 'another-campaign-123';

      // Resolve config for campaign without specific config
      const resolvedConfig = await configService.resolveConfig(anotherCampaignId);

      expect(resolvedConfig).toBeTruthy();
      expect(resolvedConfig!.scope).toBe('global');

      const credentials = await configService.getDecryptedCredentials(resolvedConfig!.id);
      expect(credentials.apiKey).toBe(globalApiKey);
    });

    it('should return null when no config found (blocking error)', async () => {
      const noCampaignId = 'no-config-campaign';

      // No global or campaign config exists
      const resolvedConfig = await configService.resolveConfig(noCampaignId);

      expect(resolvedConfig).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should validate API key format', async () => {
      const invalidApiKey = 'invalid-key-format'; // Missing sk-ant-api03 prefix

      await expect(
        configService.createConfig({
          scope: 'global',
          campaignId: null,
          provider: 'anthropic',
          authMethod: 'api_key',
          credentials: {
            apiKey: invalidApiKey,
          },
          modelName: 'claude-3-5-sonnet-20241022',
        })
      ).rejects.toThrow(/api key format/i);
    });

    it('should validate model name exists for provider', async () => {
      const apiKey = 'sk-ant-api03-invalid-model-key';

      await expect(
        configService.createConfig({
          scope: 'global',
          campaignId: null,
          provider: 'anthropic',
          authMethod: 'api_key',
          credentials: {
            apiKey,
          },
          modelName: 'gpt-4', // OpenAI model, not Anthropic
        })
      ).rejects.toThrow(/invalid model/i);
    });

    it('should require campaign_id for campaign scope', async () => {
      const apiKey = 'sk-ant-api03-missing-campaign-id-key';

      await expect(
        configService.createConfig({
          scope: 'campaign',
          campaignId: null, // Missing campaign ID
          provider: 'anthropic',
          authMethod: 'api_key',
          credentials: {
            apiKey,
          },
          modelName: 'claude-3-5-sonnet-20241022',
        })
      ).rejects.toThrow(/campaign_id required/i);
    });

    it('should reject global scope with campaign_id', async () => {
      const apiKey = 'sk-ant-api03-global-with-campaign-key';

      await expect(
        configService.createConfig({
          scope: 'global',
          campaignId: testCampaignId, // Global shouldn't have campaign ID
          provider: 'anthropic',
          authMethod: 'api_key',
          credentials: {
            apiKey,
          },
          modelName: 'claude-3-5-sonnet-20241022',
        })
      ).rejects.toThrow(/global scope cannot have campaign_id/i);
    });
  });

  describe('Deletion', () => {
    it('should delete BYOLLM config', async () => {
      const apiKey = 'sk-ant-api03-delete-test-key';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Delete config
      await configService.deleteConfig(config.id);

      // Verify deleted
      const deletedConfig = await configService.getConfigById(config.id);
      expect(deletedConfig).toBeNull();
    });

    it('should cascade delete when campaign deleted (FK constraint)', async () => {
      const campaignToDelete = 'campaign-to-delete-123';

      // Create campaign
      db.getDatabase().prepare(`
        INSERT INTO campaigns (id, user_id, name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(campaignToDelete, testUserId, 'Delete Test Campaign', Date.now(), Date.now());

      // Create campaign config
      const apiKey = 'sk-ant-api03-cascade-delete-key';
      const config = await configService.createConfig({
        scope: 'campaign',
        campaignId: campaignToDelete,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // Delete campaign (should cascade delete config)
      db.getDatabase().prepare(`
        DELETE FROM campaigns WHERE id = ?
      `).run(campaignToDelete);

      // Verify config deleted
      const deletedConfig = await configService.getConfigById(config.id);
      expect(deletedConfig).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should create API key config in <100ms', async () => {
      const apiKey = 'sk-ant-api03-performance-test-key';

      const startTime = Date.now();

      await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it('should retrieve and decrypt config in <50ms', async () => {
      const apiKey = 'sk-ant-api03-retrieve-performance-key';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      const startTime = Date.now();

      await configService.getConfig({
        scope: 'global',
        campaignId: null,
      });
      await configService.getDecryptedCredentials(config.id);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });
  });
});
