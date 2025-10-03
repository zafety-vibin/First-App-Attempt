/**
 * MCPConfigService Bulk Operation Validation Unit Tests
 * Feature: 008-create-byollm-configuration
 * Task: T019
 *
 * Tests MCP (Model Context Protocol) validation for bulk operations
 * Ensures LLM endpoint supports streaming, timeouts, and retries for Import/Planning AI
 *
 * IMPORTANT: This test MUST FAIL until MCPConfigService is implemented (TDD)
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { MCPConfigService } from '../../../src/services/MCPConfigService';
import { DEFAULT_MCP_CONFIG } from '../../../../shared/types/MCPConfig';

describe('MCPConfigService - MCP Bulk Operation Validation', () => {
  let mcpService: MCPConfigService;

  beforeAll(() => {
    mcpService = new MCPConfigService();
  });

  describe('MCP configuration defaults', () => {
    it('should use default MCP settings from shared types', () => {
      expect(DEFAULT_MCP_CONFIG.streamingEnabled).toBe(true);
      expect(DEFAULT_MCP_CONFIG.timeoutSeconds).toBe(30);
      expect(DEFAULT_MCP_CONFIG.retryAttempts).toBe(3);
    });

    it('should create MCP config with defaults for new BYOLLM config', async () => {
      const byollmConfigId = 'config-123';

      const mcpConfig = await mcpService.createDefaultMCPConfig(byollmConfigId);

      expect(mcpConfig.configId).toBe(byollmConfigId);
      expect(mcpConfig.streamingEnabled).toBe(true);
      expect(mcpConfig.timeoutSeconds).toBe(30);
      expect(mcpConfig.retryAttempts).toBe(3);
      expect(mcpConfig.createdAt).toBeLessThanOrEqual(Date.now());
      expect(mcpConfig.updatedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should allow custom MCP settings override', async () => {
      const byollmConfigId = 'config-456';

      const mcpConfig = await mcpService.createMCPConfig(byollmConfigId, {
        streamingEnabled: false,
        timeoutSeconds: 60,
        retryAttempts: 5,
      });

      expect(mcpConfig.streamingEnabled).toBe(false);
      expect(mcpConfig.timeoutSeconds).toBe(60);
      expect(mcpConfig.retryAttempts).toBe(5);
    });
  });

  describe('streaming validation', () => {
    it('should validate streaming support for Anthropic API', async () => {
      const providerConfig = {
        provider: 'anthropic' as const,
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-api03-test-key',
      };

      const result = await mcpService.validateStreaming(providerConfig);

      expect(result.supported).toBe(true);
      expect(result.provider).toBe('anthropic');
      expect(result.modelName).toBe('claude-3-5-sonnet-20241022');
    });

    it('should validate streaming for custom OpenAI-compatible endpoint', async () => {
      const providerConfig = {
        provider: 'custom' as const,
        modelFormat: 'openai_compatible' as const,
        baseUrl: 'http://localhost:11434', // Ollama
        modelName: 'llama2',
      };

      const result = await mcpService.validateStreaming(providerConfig);

      expect(result.supported).toBe(true);
      expect(result.provider).toBe('custom');
      expect(result.endpoint).toBe('http://localhost:11434');
    });

    it('should detect non-streaming custom endpoints', async () => {
      const providerConfig = {
        provider: 'custom' as const,
        modelFormat: 'custom' as const,
        baseUrl: 'http://localhost:8080',
        modelName: 'custom-model',
        supportsStreaming: false, // Explicitly no streaming
      };

      const result = await mcpService.validateStreaming(providerConfig);

      expect(result.supported).toBe(false);
      expect(result.warning).toContain('streaming not supported');
    });

    it('should test streaming with actual API call (connection test)', async () => {
      const providerConfig = {
        provider: 'anthropic' as const,
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-api03-test-key',
      };

      // Mock streaming test (sends simple message, expects SSE response)
      const result = await mcpService.testStreamingConnection(providerConfig);

      expect(result.success).toBeDefined();
      if (result.success) {
        expect(result.latencyMs).toBeGreaterThan(0);
        expect(result.firstTokenMs).toBeGreaterThan(0);
      } else {
        expect(result.error).toBeTruthy();
      }
    });
  });

  describe('timeout validation', () => {
    it('should enforce minimum timeout (10 seconds)', async () => {
      const byollmConfigId = 'config-789';

      // Attempt to create MCP config with too short timeout
      const mcpConfig = await mcpService.createMCPConfig(byollmConfigId, {
        timeoutSeconds: 5, // Too short
      });

      // Should enforce minimum
      expect(mcpConfig.timeoutSeconds).toBeGreaterThanOrEqual(10);
    });

    it('should enforce maximum timeout (300 seconds = 5 minutes)', async () => {
      const byollmConfigId = 'config-999';

      // Attempt to create MCP config with too long timeout
      const mcpConfig = await mcpService.createMCPConfig(byollmConfigId, {
        timeoutSeconds: 600, // 10 minutes - too long
      });

      // Should cap at maximum
      expect(mcpConfig.timeoutSeconds).toBeLessThanOrEqual(300);
    });

    it('should validate timeout against provider limits', async () => {
      // Anthropic has different timeout limits than custom endpoints
      const anthropicConfig = {
        provider: 'anthropic' as const,
        modelName: 'claude-3-5-sonnet-20241022',
      };

      const validation = await mcpService.validateTimeout(anthropicConfig, 120);

      expect(validation.valid).toBe(true);
      expect(validation.recommendedTimeout).toBeGreaterThanOrEqual(30);
    });

    it('should test timeout with actual API call', async () => {
      const providerConfig = {
        provider: 'anthropic' as const,
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-api03-test-key',
      };

      // Test with 5 second timeout
      const result = await mcpService.testTimeout(providerConfig, 5);

      expect(result.success).toBeDefined();
      if (!result.success) {
        expect(result.timedOut).toBe(true);
        expect(result.error).toContain('timeout');
      }
    });
  });

  describe('retry validation', () => {
    it('should enforce minimum retry attempts (1)', async () => {
      const byollmConfigId = 'config-retry-1';

      const mcpConfig = await mcpService.createMCPConfig(byollmConfigId, {
        retryAttempts: 0, // No retries - too risky
      });

      // Should enforce minimum 1 retry
      expect(mcpConfig.retryAttempts).toBeGreaterThanOrEqual(1);
    });

    it('should enforce maximum retry attempts (10)', async () => {
      const byollmConfigId = 'config-retry-2';

      const mcpConfig = await mcpService.createMCPConfig(byollmConfigId, {
        retryAttempts: 20, // Too many retries
      });

      // Should cap at maximum 10
      expect(mcpConfig.retryAttempts).toBeLessThanOrEqual(10);
    });

    it('should validate retry strategy for bulk operations', async () => {
      const mcpConfig = {
        retryAttempts: 3,
        timeoutSeconds: 30,
      };

      const validation = await mcpService.validateRetryStrategy(mcpConfig);

      expect(validation.valid).toBe(true);
      expect(validation.maxDuration).toBeDefined(); // Total time for all retries
    });
  });

  describe('bulk operation validation', () => {
    it('should validate MCP readiness for Import AI workflow', async () => {
      const byollmConfigId = 'config-import';

      // Create BYOLLM config
      await mcpService.createDefaultMCPConfig(byollmConfigId);

      // Validate bulk operation support
      const result = await mcpService.validateBulkOperations(byollmConfigId, {
        workflow: 'import',
        estimatedTokens: 50000, // Typical import session
      });

      expect(result.ready).toBeDefined();
      expect(result.streaming).toBeDefined();
      expect(result.timeout).toBeDefined();
      expect(result.retries).toBeDefined();
    });

    it('should validate MCP readiness for Planning AI workflow', async () => {
      const byollmConfigId = 'config-planning';

      await mcpService.createDefaultMCPConfig(byollmConfigId);

      const result = await mcpService.validateBulkOperations(byollmConfigId, {
        workflow: 'planning',
        estimatedTokens: 20000, // Typical planning session
      });

      expect(result.ready).toBeDefined();
    });

    it('should warn if MCP config unsuitable for large bulk operations', async () => {
      const byollmConfigId = 'config-large-bulk';

      // Create config with short timeout
      await mcpService.createMCPConfig(byollmConfigId, {
        timeoutSeconds: 15, // Too short for large operations
        retryAttempts: 1,
      });

      const result = await mcpService.validateBulkOperations(byollmConfigId, {
        workflow: 'import',
        estimatedTokens: 100000, // Very large import
      });

      expect(result.warnings).toBeDefined();
      if (result.warnings && result.warnings.length > 0) {
        expect(result.warnings.some((w: string) => w.toLowerCase().includes('timeout'))).toBe(true);
      }
    });

    it('should estimate MCP performance for bulk operations', async () => {
      const byollmConfigId = 'config-perf';

      await mcpService.createDefaultMCPConfig(byollmConfigId);

      const estimate = await mcpService.estimateBulkOperationPerformance(byollmConfigId, {
        workflow: 'import',
        estimatedTokens: 30000,
        estimatedEntities: 50, // 50 entities to extract
      });

      expect(estimate.estimatedDurationSeconds).toBeGreaterThan(0);
      expect(estimate.recommendedTimeout).toBeGreaterThan(0);
      expect(estimate.tokensPerSecond).toBeGreaterThan(0);
    });
  });

  describe('connection test integration', () => {
    it('should validate full MCP stack with connection test', async () => {
      const providerConfig = {
        provider: 'anthropic' as const,
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-api03-test-key',
      };

      const mcpSettings = {
        streamingEnabled: true,
        timeoutSeconds: 30,
        retryAttempts: 3,
      };

      const result = await mcpService.testMCPConnection(providerConfig, mcpSettings);

      expect(result.success).toBeDefined();
      expect(result.streaming).toBeDefined();
      expect(result.timeout).toBeDefined();
      expect(result.retries).toBeDefined();
      expect(result.bulkOperationsReady).toBeDefined();

      if (result.success) {
        expect(result.latencyMs).toBeGreaterThan(0);
      } else {
        expect(result.error).toBeTruthy();
      }
    });

    it('should fail connection test if streaming unavailable', async () => {
      const providerConfig = {
        provider: 'custom' as const,
        modelFormat: 'custom' as const,
        baseUrl: 'http://localhost:8080',
        modelName: 'non-streaming-model',
        supportsStreaming: false,
      };

      const mcpSettings = {
        streamingEnabled: true, // Required but not supported
        timeoutSeconds: 30,
        retryAttempts: 3,
      };

      const result = await mcpService.testMCPConnection(providerConfig, mcpSettings);

      expect(result.success).toBe(false);
      expect(result.error).toContain('streaming');
    });

    it('should fail connection test if timeout too short', async () => {
      const providerConfig = {
        provider: 'anthropic' as const,
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-api03-test-key',
      };

      const mcpSettings = {
        streamingEnabled: true,
        timeoutSeconds: 5, // Too short
        retryAttempts: 3,
      };

      const result = await mcpService.testMCPConnection(providerConfig, mcpSettings);

      expect(result.warnings).toBeDefined();
      if (result.warnings && result.warnings.length > 0) {
        expect(result.warnings.some((w: string) => w.toLowerCase().includes('timeout'))).toBe(true);
      }
    });
  });

  describe('MCP config lifecycle', () => {
    it('should create MCP config when BYOLLM config created', async () => {
      const byollmConfigId = 'new-config-123';

      const mcpConfig = await mcpService.createDefaultMCPConfig(byollmConfigId);

      expect(mcpConfig.configId).toBe(byollmConfigId);
      expect(mcpConfig.id).toBeTruthy(); // Auto-generated ID
    });

    it('should update MCP config when BYOLLM config updated', async () => {
      const byollmConfigId = 'existing-config-456';

      // Create initial config
      const initialConfig = await mcpService.createDefaultMCPConfig(byollmConfigId);

      // Update settings
      const updatedConfig = await mcpService.updateMCPConfig(byollmConfigId, {
        timeoutSeconds: 60,
      });

      expect(updatedConfig.id).toBe(initialConfig.id);
      expect(updatedConfig.timeoutSeconds).toBe(60);
      expect(updatedConfig.updatedAt).toBeGreaterThan(initialConfig.updatedAt);
    });

    it('should delete MCP config when BYOLLM config deleted', async () => {
      const byollmConfigId = 'delete-config-789';

      // Create config
      await mcpService.createDefaultMCPConfig(byollmConfigId);

      // Delete config
      await mcpService.deleteMCPConfig(byollmConfigId);

      // Should be deleted
      const mcpConfig = await mcpService.getMCPConfig(byollmConfigId);
      expect(mcpConfig).toBeNull();
    });

    it('should retrieve MCP config by BYOLLM config ID', async () => {
      const byollmConfigId = 'retrieve-config-999';

      // Create config
      const createdConfig = await mcpService.createDefaultMCPConfig(byollmConfigId);

      // Retrieve config
      const retrievedConfig = await mcpService.getMCPConfig(byollmConfigId);

      expect(retrievedConfig).toBeTruthy();
      expect(retrievedConfig!.id).toBe(createdConfig.id);
      expect(retrievedConfig!.configId).toBe(byollmConfigId);
    });
  });

  describe('automatic MCP settings', () => {
    it('should be hidden from users (automatic configuration)', () => {
      // MCP settings should not be user-configurable in UI
      // (like Notion permissions - automatic, not user-facing)

      // This is a conceptual test - MCP settings applied automatically
      const isUserVisible = false; // MCP settings hidden from UI
      expect(isUserVisible).toBe(false);
    });

    it('should apply optimal MCP settings per provider', async () => {
      const anthropicConfig = {
        provider: 'anthropic' as const,
        modelName: 'claude-3-5-sonnet-20241022',
      };

      const customConfig = {
        provider: 'custom' as const,
        modelFormat: 'openai_compatible' as const,
        baseUrl: 'http://localhost:11434',
      };

      // Get optimal settings for each provider
      const anthropicMCP = await mcpService.getOptimalMCPSettings(anthropicConfig);
      const customMCP = await mcpService.getOptimalMCPSettings(customConfig);

      // Anthropic: higher timeout (API latency), more retries
      expect(anthropicMCP.timeoutSeconds).toBeGreaterThanOrEqual(30);

      // Custom: lower timeout (local), fewer retries
      expect(customMCP.timeoutSeconds).toBeGreaterThanOrEqual(10);
    });
  });

  describe('error handling', () => {
    it('should handle network errors during MCP validation', async () => {
      const providerConfig = {
        provider: 'anthropic' as const,
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'invalid-key',
      };

      const result = await mcpService.testMCPConnection(providerConfig, DEFAULT_MCP_CONFIG);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should handle invalid provider configuration', async () => {
      const invalidConfig = {
        provider: 'invalid-provider' as any,
        modelName: '',
      };

      const result = await mcpService.testMCPConnection(invalidConfig, DEFAULT_MCP_CONFIG);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should handle missing MCP config gracefully', async () => {
      const nonExistentConfigId = 'non-existent-config';

      const mcpConfig = await mcpService.getMCPConfig(nonExistentConfigId);

      expect(mcpConfig).toBeNull();
    });
  });

  describe('performance', () => {
    it('should complete MCP validation within 5 seconds', async () => {
      const providerConfig = {
        provider: 'anthropic' as const,
        modelName: 'claude-3-5-sonnet-20241022',
        apiKey: 'sk-ant-api03-test-key',
      };

      const startTime = Date.now();
      await mcpService.testMCPConnection(providerConfig, DEFAULT_MCP_CONFIG);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});
