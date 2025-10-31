/**
 * MCPConfigService
 * Feature: 008-create-byollm-configuration
 * Tasks: T035-T037
 *
 * Manages MCP (Model Context Protocol) configuration for bulk operations
 * MCP settings are automatic (hidden from users like Notion permissions)
 *
 * Features:
 * - Automatic optimal settings per provider
 * - Streaming validation
 * - Timeout validation
 * - Retry strategy validation
 * - Bulk operations readiness testing
 * - Performance estimation
 */

import crypto from 'crypto';
import { db } from './DatabaseService';
import type { MCPConfig, MCPTestResponse } from '../shared/types/MCPConfig';

interface CreateMCPConfigRequest {
  streamingEnabled?: boolean;
  timeoutSeconds?: number;
  retryAttempts?: number;
}

interface ProviderConfig {
  provider: 'anthropic' | 'openai' | 'custom';
  modelName?: string;
  apiKey?: string;
  baseUrl?: string;
  modelFormat?: 'openai_compatible' | 'anthropic_compatible' | 'custom';
  supportsStreaming?: boolean;
}

interface StreamingValidationResult {
  supported: boolean;
  provider: string;
  modelName?: string;
  endpoint?: string;
  warning?: string;
}

interface TimeoutValidationResult {
  valid: boolean;
  recommendedTimeout: number;
}

interface RetryStrategyValidationResult {
  valid: boolean;
  maxDuration: number; // Total time for all retries
}

interface BulkOperationsValidationResult {
  ready: boolean;
  streaming: boolean;
  timeout: number;
  retries: number;
  warnings?: string[];
}

interface PerformanceEstimate {
  estimatedDurationSeconds: number;
  recommendedTimeout: number;
  tokensPerSecond: number;
}

export class MCPConfigService {
  // Validation constants
  private readonly MIN_TIMEOUT_SECONDS = 10;
  private readonly MAX_TIMEOUT_SECONDS = 300; // 5 minutes
  private readonly MIN_RETRY_ATTEMPTS = 1;
  private readonly MAX_RETRY_ATTEMPTS = 10;

  constructor() {
    // No longer need db parameter - use module-level db
  }

  /**
   * Creates MCP config with default settings
   * @param configId - BYOLLM config ID
   * @returns Created MCP config
   */
  async createDefaultMCPConfig(configId: string): Promise<MCPConfig> {
    const DEFAULT_MCP_CONFIG = {
      streamingEnabled: true,
      timeoutSeconds: 30,
      retryAttempts: 3,
    };

    return this.createMCPConfig(configId, DEFAULT_MCP_CONFIG);
  }

  /**
   * Creates MCP config with custom settings
   * @param configId - BYOLLM config ID
   * @param request - MCP settings
   * @returns Created MCP config
   */
  async createMCPConfig(
    configId: string,
    request: CreateMCPConfigRequest
  ): Promise<MCPConfig> {
    const id = this.generateId();
    const now = Date.now();

    // Apply validation and defaults
    const streamingEnabled = request.streamingEnabled ?? true;
    const timeoutSeconds = this.clampTimeout(request.timeoutSeconds ?? 30);
    const retryAttempts = this.validateRetryAttempts(request.retryAttempts ?? 3);

    // Insert into database
    db.prepare(`
      INSERT INTO mcp_configs (id, config_id, streaming_enabled, timeout_seconds, retry_attempts, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, configId, streamingEnabled ? 1 : 0, timeoutSeconds, retryAttempts, now, now);

    return this.getMCPConfig(configId) as Promise<MCPConfig>;
  }

  /**
   * Gets MCP config by BYOLLM config ID
   * @param configId - BYOLLM config ID
   * @returns MCP config or null
   */
  async getMCPConfig(configId: string): Promise<MCPConfig | null> {
    const row = db.prepare(`
      SELECT * FROM mcp_configs
      WHERE config_id = ?
    `).get(configId) as any;

    if (!row) {
      return null;
    }

    return this.mapRowToConfig(row);
  }

  /**
   * Updates MCP config
   * @param configId - BYOLLM config ID
   * @param request - Update settings
   * @returns Updated MCP config
   */
  async updateMCPConfig(
    configId: string,
    request: CreateMCPConfigRequest
  ): Promise<MCPConfig> {
    const updates: string[] = [];
    const values: any[] = [];

    if (request.streamingEnabled !== undefined) {
      updates.push('streaming_enabled = ?');
      values.push(request.streamingEnabled ? 1 : 0);
    }

    if (request.timeoutSeconds !== undefined) {
      const validatedTimeout = this.clampTimeout(request.timeoutSeconds);
      updates.push('timeout_seconds = ?');
      values.push(validatedTimeout);
    }

    if (request.retryAttempts !== undefined) {
      const validatedRetries = this.validateRetryAttempts(request.retryAttempts);
      updates.push('retry_attempts = ?');
      values.push(validatedRetries);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(configId);

    if (updates.length > 0) {
      db.prepare(`
        UPDATE mcp_configs
        SET ${updates.join(', ')}
        WHERE config_id = ?
      `).run(...values);
    }

    return this.getMCPConfig(configId) as Promise<MCPConfig>;
  }

  /**
   * Deletes MCP config
   * @param configId - BYOLLM config ID
   */
  async deleteMCPConfig(configId: string): Promise<void> {
    db.prepare(`
      DELETE FROM mcp_configs
      WHERE config_id = ?
    `).run(configId);
  }

  /**
   * Validates streaming support
   * @param providerConfig - Provider configuration
   * @returns Streaming validation result
   */
  async validateStreaming(providerConfig: ProviderConfig): Promise<StreamingValidationResult> {
    if (providerConfig.provider === 'anthropic') {
      return {
        supported: true,
        provider: 'anthropic',
        modelName: providerConfig.modelName,
      };
    }

    if (providerConfig.provider === 'custom') {
      if (providerConfig.modelFormat === 'openai_compatible') {
        return {
          supported: true,
          provider: 'custom',
          endpoint: providerConfig.baseUrl,
        };
      }

      if (providerConfig.supportsStreaming === false) {
        return {
          supported: false,
          provider: 'custom',
          endpoint: providerConfig.baseUrl,
          warning: 'Custom endpoint streaming not supported',
        };
      }

      return {
        supported: true,
        provider: 'custom',
        endpoint: providerConfig.baseUrl,
      };
    }

    return {
      supported: false,
      provider: providerConfig.provider,
      warning: `Streaming support unknown for ${providerConfig.provider}`,
    };
  }

  /**
   * Tests streaming connection
   * @param providerConfig - Provider configuration
   * @returns Test result with latency
   */
  async testStreamingConnection(_providerConfig: ProviderConfig): Promise<{
    success: boolean;
    latencyMs?: number;
    firstTokenMs?: number;
    error?: string;
  }> {
    // Placeholder - actual implementation would make streaming API call
    return {
      success: true,
      latencyMs: 100,
      firstTokenMs: 150,
    };
  }

  /**
   * Validates timeout setting
   * @param providerConfig - Provider configuration
   * @param timeoutSeconds - Timeout in seconds
   * @returns Validation result
   */
  async validateTimeout(
    providerConfig: ProviderConfig,
    timeoutSeconds: number
  ): Promise<TimeoutValidationResult> {
    // Anthropic typically has higher latency than local endpoints
    const recommendedTimeout = providerConfig.provider === 'anthropic' ? 30 : 15;

    return {
      valid: timeoutSeconds >= this.MIN_TIMEOUT_SECONDS,
      recommendedTimeout,
    };
  }

  /**
   * Tests timeout with actual API call
   * @param providerConfig - Provider configuration
   * @param timeoutSeconds - Timeout to test
   * @returns Test result
   */
  async testTimeout(_providerConfig: ProviderConfig, _timeoutSeconds: number): Promise<{
    success: boolean;
    timedOut?: boolean;
    error?: string;
  }> {
    // Placeholder - actual implementation would make API call with timeout
    return {
      success: true,
      timedOut: false,
    };
  }

  /**
   * Validates retry strategy
   * @param mcpConfig - MCP configuration
   * @returns Validation result
   */
  async validateRetryStrategy(mcpConfig: {
    retryAttempts: number;
    timeoutSeconds: number;
  }): Promise<RetryStrategyValidationResult> {
    // Calculate max duration (timeout * retries)
    const maxDuration = mcpConfig.timeoutSeconds * (mcpConfig.retryAttempts + 1);

    return {
      valid: mcpConfig.retryAttempts >= this.MIN_RETRY_ATTEMPTS,
      maxDuration,
    };
  }

  /**
   * Validates MCP readiness for bulk operations
   * @param configId - BYOLLM config ID
   * @param options - Workflow options
   * @returns Validation result
   */
  async validateBulkOperations(
    configId: string,
    options: {
      workflow: 'import' | 'planning';
      estimatedTokens: number;
    }
  ): Promise<BulkOperationsValidationResult> {
    const mcpConfig = await this.getMCPConfig(configId);
    if (!mcpConfig) {
      return {
        ready: false,
        streaming: false,
        timeout: 0,
        retries: 0,
        warnings: ['MCP config not found'],
      };
    }

    const warnings: string[] = [];

    // Check timeout for large operations
    if (options.estimatedTokens > 50000 && mcpConfig.timeoutSeconds < 30) {
      warnings.push('Timeout may be too short for large bulk operations (50k+ tokens)');
    }

    return {
      ready: true,
      streaming: mcpConfig.streamingEnabled,
      timeout: mcpConfig.timeoutSeconds,
      retries: mcpConfig.retryAttempts,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Estimates performance for bulk operations
   * @param configId - BYOLLM config ID
   * @param options - Operation options
   * @returns Performance estimate
   */
  async estimateBulkOperationPerformance(
    _configId: string,
    options: {
      workflow: 'import' | 'planning';
      estimatedTokens: number;
      estimatedEntities: number;
    }
  ): Promise<PerformanceEstimate> {
    // Rough estimates (tokens per second varies by model)
    const tokensPerSecond = 50; // Conservative estimate for Claude

    const estimatedDurationSeconds = Math.ceil(options.estimatedTokens / tokensPerSecond);
    const recommendedTimeout = Math.max(estimatedDurationSeconds * 2, 30);

    return {
      estimatedDurationSeconds,
      recommendedTimeout,
      tokensPerSecond,
    };
  }

  /**
   * Tests full MCP connection stack
   * @param providerConfig - Provider configuration
   * @param mcpSettings - MCP settings
   * @returns Test result
   */
  async testMCPConnection(
    providerConfig: ProviderConfig,
    mcpSettings: {
      streamingEnabled: boolean;
      timeoutSeconds: number;
      retryAttempts: number;
    }
  ): Promise<MCPTestResponse> {
    const startTime = Date.now();

    try {
      // Validate streaming
      const streamingResult = await this.validateStreaming(providerConfig);
      if (mcpSettings.streamingEnabled && !streamingResult.supported) {
        return {
          success: false,
          provider: providerConfig.provider,
          modelName: providerConfig.modelName || 'unknown',
          contextWindow: 0,
          bulkOperationsReady: false,
          error: 'Streaming required but not supported',
        };
      }

      // Validate timeout
      const timeoutResult = await this.validateTimeout(providerConfig, mcpSettings.timeoutSeconds);
      const warnings: string[] = [];
      if (!timeoutResult.valid) {
        warnings.push(`Timeout too short (minimum: ${this.MIN_TIMEOUT_SECONDS}s)`);
      }

      // Test streaming if enabled
      if (mcpSettings.streamingEnabled) {
        const streamingTest = await this.testStreamingConnection(providerConfig);
        if (!streamingTest.success) {
          return {
            success: false,
            provider: providerConfig.provider,
            modelName: providerConfig.modelName || 'unknown',
            contextWindow: 0,
            bulkOperationsReady: false,
            error: streamingTest.error,
          };
        }
      }

      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        provider: providerConfig.provider,
        modelName: providerConfig.modelName || 'unknown',
        contextWindow: this.getContextWindow(providerConfig),
        bulkOperationsReady: true,
        latencyMs,
      };
    } catch (error) {
      return {
        success: false,
        provider: providerConfig.provider,
        modelName: providerConfig.modelName || 'unknown',
        contextWindow: 0,
        bulkOperationsReady: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Gets optimal MCP settings for provider
   * @param providerConfig - Provider configuration
   * @returns Optimal MCP settings
   */
  async getOptimalMCPSettings(providerConfig: ProviderConfig): Promise<{
    streamingEnabled: boolean;
    timeoutSeconds: number;
    retryAttempts: number;
  }> {
    if (providerConfig.provider === 'anthropic') {
      return {
        streamingEnabled: true,
        timeoutSeconds: 30,
        retryAttempts: 3,
      };
    }

    if (providerConfig.provider === 'custom') {
      return {
        streamingEnabled: providerConfig.modelFormat === 'openai_compatible',
        timeoutSeconds: 15, // Local endpoints typically faster
        retryAttempts: 2,
      };
    }

    // Default
    return {
      streamingEnabled: true,
      timeoutSeconds: 30,
      retryAttempts: 3,
    };
  }

  /**
   * Clamps timeout value to valid range
   */
  private clampTimeout(timeoutSeconds: number): number {
    if (timeoutSeconds < this.MIN_TIMEOUT_SECONDS) {
      return this.MIN_TIMEOUT_SECONDS;
    }
    if (timeoutSeconds > this.MAX_TIMEOUT_SECONDS) {
      return this.MAX_TIMEOUT_SECONDS;
    }
    return timeoutSeconds;
  }

  /**
   * Validates retry attempts value
   */
  private validateRetryAttempts(retryAttempts: number): number {
    if (retryAttempts < this.MIN_RETRY_ATTEMPTS) {
      return this.MIN_RETRY_ATTEMPTS;
    }
    if (retryAttempts > this.MAX_RETRY_ATTEMPTS) {
      return this.MAX_RETRY_ATTEMPTS;
    }
    return retryAttempts;
  }

  /**
   * Gets context window for provider
   */
  private getContextWindow(providerConfig: ProviderConfig): number {
    if (providerConfig.provider === 'anthropic') {
      return 200000; // Claude 3 models
    }
    return 0;
  }

  /**
   * Maps database row to MCPConfig
   */
  private mapRowToConfig(row: any): MCPConfig {
    return {
      id: row.id,
      configId: row.config_id,
      streamingEnabled: row.streaming_enabled === 1,
      timeoutSeconds: row.timeout_seconds,
      retryAttempts: row.retry_attempts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Generates unique ID
   */
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
