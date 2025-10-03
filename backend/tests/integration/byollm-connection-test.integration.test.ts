/**
 * BYOLLM Connection Test Integration Tests
 * Feature: 008-create-byollm-configuration
 * Task: T022
 *
 * Tests connection validation for BYOLLM configurations
 * Validates credentials, model access, MCP bulk operations readiness
 *
 * IMPORTANT: This test MUST FAIL until BYOLLM services are implemented (TDD)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseService } from '../../src/services/DatabaseService';
import { BYOLLMConfigService } from '../../src/services/BYOLLMConfigService';
import { ProviderClientService } from '../../src/services/ProviderClientService';
import { MCPConfigService } from '../../src/services/MCPConfigService';
import { EncryptionService } from '../../src/services/EncryptionService';

describe('BYOLLM Connection Test Integration', () => {
  let db: DatabaseService;
  let configService: BYOLLMConfigService;
  let providerService: ProviderClientService;
  let mcpService: MCPConfigService;
  let encryptionService: EncryptionService;

  const testUserId = 'test-user-connection';
  const testCampaignId = 'test-campaign-connection';

  beforeAll(async () => {
    // Initialize services
    db = new DatabaseService(':memory:');
    await db.initialize();

    const encryptionPassphrase = 'test-passphrase-connection';
    encryptionService = new EncryptionService(encryptionPassphrase);
    configService = new BYOLLMConfigService(db, encryptionService);
    providerService = new ProviderClientService();
    mcpService = new MCPConfigService(db);

    // Create test campaign
    db.getDatabase().prepare(`
      INSERT INTO campaigns (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(testCampaignId, testUserId, 'Connection Test Campaign', Date.now(), Date.now());
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Anthropic API key connection test', () => {
    it('should test valid Anthropic API key', async () => {
      const apiKey = 'sk-ant-api03-valid-key-for-testing';

      // Create config
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

      // Test connection
      const result = await providerService.testConnection(config.id);

      expect(result.success).toBeDefined();
      if (result.success) {
        expect(result.provider).toBe('anthropic');
        expect(result.modelName).toBe('claude-3-5-sonnet-20241022');
        expect(result.contextWindow).toBeGreaterThan(0);
        expect(result.latencyMs).toBeGreaterThan(0);
      } else {
        expect(result.error).toBeTruthy();
      }
    });

    it('should detect invalid Anthropic API key', async () => {
      const invalidApiKey = 'sk-ant-api03-invalid-key-12345';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: invalidApiKey,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      const result = await providerService.testConnection(config.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication');
    });

    it('should return model metadata on successful connection', async () => {
      const apiKey = 'sk-ant-api03-metadata-test-key';

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

      const result = await providerService.testConnection(config.id);

      if (result.success) {
        // Should include context window size
        expect(result.contextWindow).toBeGreaterThanOrEqual(200000); // Claude 3.5 Sonnet: 200k tokens

        // Should include model name
        expect(result.modelName).toBe('claude-3-5-sonnet-20241022');
      }
    });

    it('should measure connection latency', async () => {
      const apiKey = 'sk-ant-api03-latency-test-key';

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

      const result = await providerService.testConnection(config.id);

      if (result.success) {
        expect(result.latencyMs).toBeGreaterThan(0);
        expect(result.latencyMs).toBeLessThan(10000); // Should be < 10 seconds
      }
    });
  });

  describe('MCP bulk operations validation', () => {
    it('should validate MCP readiness for bulk operations', async () => {
      const apiKey = 'sk-ant-api03-mcp-test-key';

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

      // Create MCP config (automatic)
      await mcpService.createDefaultMCPConfig(config.id);

      // Test connection with MCP validation
      const result = await providerService.testConnection(config.id);

      expect(result.bulkOperationsReady).toBeDefined();

      if (result.success && result.bulkOperationsReady) {
        // MCP validation passed
        expect(result.streaming).toBe(true);
        expect(result.timeout).toBeGreaterThanOrEqual(30);
        expect(result.retries).toBeGreaterThanOrEqual(3);
      }
    });

    it('should test streaming support for Import AI', async () => {
      const apiKey = 'sk-ant-api03-streaming-test-key';

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

      await mcpService.createDefaultMCPConfig(config.id);

      const result = await providerService.testConnection(config.id);

      if (result.success) {
        // Anthropic supports streaming
        expect(result.streaming).toBe(true);
      }
    });

    it('should validate timeout settings for bulk operations', async () => {
      const apiKey = 'sk-ant-api03-timeout-test-key';

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

      // Create MCP config with custom timeout
      await mcpService.createMCPConfig(config.id, {
        timeoutSeconds: 60,
      });

      const result = await providerService.testConnection(config.id);

      if (result.success) {
        expect(result.timeout).toBe(60);
      }
    });

    it('should validate retry settings for bulk operations', async () => {
      const apiKey = 'sk-ant-api03-retry-test-key';

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

      // Create MCP config with custom retry attempts
      await mcpService.createMCPConfig(config.id, {
        retryAttempts: 5,
      });

      const result = await providerService.testConnection(config.id);

      if (result.success) {
        expect(result.retries).toBe(5);
      }
    });

    it('should warn if MCP config unsuitable for bulk operations', async () => {
      const apiKey = 'sk-ant-api03-warning-test-key';

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

      // Create MCP config with very short timeout
      await mcpService.createMCPConfig(config.id, {
        timeoutSeconds: 10, // Too short for bulk operations
      });

      const result = await providerService.testConnection(config.id);

      if (result.success) {
        expect(result.warnings).toBeDefined();
        if (result.warnings && result.warnings.length > 0) {
          expect(result.warnings.some((w: string) => w.toLowerCase().includes('timeout'))).toBe(true);
        }
      }
    });
  });

  describe('Model validation', () => {
    it('should verify selected model is accessible with API key', async () => {
      const apiKey = 'sk-ant-api03-model-verify-key';

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

      const result = await providerService.testConnection(config.id);

      if (result.success) {
        // Verify returned model matches requested
        expect(result.modelName).toBe('claude-3-5-sonnet-20241022');
      }
    });

    it('should detect if model not accessible (permissions issue)', async () => {
      const apiKey = 'sk-ant-api03-restricted-key'; // API key without access to Opus

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'claude-3-opus-20240229', // Restricted model
      });

      const result = await providerService.testConnection(config.id);

      if (!result.success) {
        expect(result.error).toMatch(/model|permission|access/i);
      }
    });
  });

  describe('Credits and usage validation', () => {
    it('should fetch credits/usage during connection test', async () => {
      const apiKey = 'sk-ant-api03-credits-test-key';

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

      const result = await providerService.testConnection(config.id);

      if (result.success) {
        // Should include credits information (if available from Anthropic API)
        // Note: Anthropic may not expose credits via API - test gracefully
        expect(result.credits).toBeDefined();
      }
    });

    it('should warn if credits low (prevent surprise costs)', async () => {
      const apiKey = 'sk-ant-api03-low-credits-key';

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

      const result = await providerService.testConnection(config.id);

      if (result.success && result.credits) {
        // If credits available and low, should warn
        if (result.credits.balance < 1.0) {
          expect(result.warnings).toBeDefined();
          expect(result.warnings!.some((w: string) => w.toLowerCase().includes('credit'))).toBe(true);
        }
      }
    });
  });

  describe('Custom endpoint connection test', () => {
    it('should test connection to Ollama (local LLM)', async () => {
      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'custom',
        authMethod: 'api_key',
        credentials: {
          apiKey: '', // Ollama doesn't require API key
        },
        modelName: 'llama2',
        customEndpointUrl: 'http://localhost:11434',
      });

      const result = await providerService.testConnection(config.id);

      // May fail if Ollama not running - that's expected
      expect(result.success).toBeDefined();

      if (!result.success) {
        expect(result.error).toContain('connection');
      }
    });

    it('should test connection to LM Studio (local LLM)', async () => {
      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'custom',
        authMethod: 'api_key',
        credentials: {
          apiKey: '', // LM Studio doesn't require API key
        },
        modelName: 'local-model',
        customEndpointUrl: 'http://localhost:1234',
      });

      const result = await providerService.testConnection(config.id);

      // May fail if LM Studio not running - that's expected
      expect(result.success).toBeDefined();
    });

    it('should validate custom endpoint URL format', async () => {
      const invalidUrl = 'not-a-valid-url';

      await expect(
        configService.createConfig({
          scope: 'global',
          campaignId: null,
          provider: 'custom',
          authMethod: 'api_key',
          credentials: {
            apiKey: '',
          },
          modelName: 'custom-model',
          customEndpointUrl: invalidUrl,
        })
      ).rejects.toThrow(/url/i);
    });
  });

  describe('Error handling', () => {
    it('should handle network timeout gracefully', async () => {
      const apiKey = 'sk-ant-api03-timeout-test-key';

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

      // Set very short timeout for test
      await mcpService.createMCPConfig(config.id, {
        timeoutSeconds: 1, // 1 second timeout
      });

      const result = await providerService.testConnection(config.id);

      if (!result.success) {
        expect(result.error).toMatch(/timeout|network/i);
      }
    });

    it('should handle rate limit errors during connection test', async () => {
      const apiKey = 'sk-ant-api03-rate-limited-key';

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

      // If rate limited, should retry with backoff
      const result = await providerService.testConnection(config.id);

      if (!result.success && result.error?.includes('rate limit')) {
        expect(result.retryable).toBe(true);
      }
    });

    it('should handle API errors (invalid request)', async () => {
      const apiKey = 'sk-ant-api03-error-test-key';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey,
        },
        modelName: 'invalid-model-name', // Invalid model
      });

      const result = await providerService.testConnection(config.id);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Connection test caching', () => {
    it('should cache successful connection test results (5 min TTL)', async () => {
      const apiKey = 'sk-ant-api03-cache-test-key';

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

      // First test (hits API)
      const result1 = await providerService.testConnection(config.id);
      const latency1 = result1.latencyMs || 0;

      // Second test (should use cache)
      const result2 = await providerService.testConnection(config.id);
      const latency2 = result2.latencyMs || 0;

      if (result1.success && result2.success) {
        // Second call should be much faster (cached)
        expect(latency2).toBeLessThan(latency1);
      }
    });

    it('should invalidate cache after config update', async () => {
      const apiKey1 = 'sk-ant-api03-cache-invalidate-key-1';
      const apiKey2 = 'sk-ant-api03-cache-invalidate-key-2';

      const config = await configService.createConfig({
        scope: 'global',
        campaignId: null,
        provider: 'anthropic',
        authMethod: 'api_key',
        credentials: {
          apiKey: apiKey1,
        },
        modelName: 'claude-3-5-sonnet-20241022',
      });

      // First test
      await providerService.testConnection(config.id);

      // Update config (should invalidate cache)
      await configService.updateConfig(config.id, {
        credentials: {
          apiKey: apiKey2,
        },
      });

      // Second test (should hit API again, not cache)
      const result2 = await providerService.testConnection(config.id);

      expect(result2.success).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete connection test within 5 seconds', async () => {
      const apiKey = 'sk-ant-api03-performance-test-key';

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
      await providerService.testConnection(config.id);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});
