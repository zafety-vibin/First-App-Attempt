/**
 * ProviderClientService
 * Feature: 008-create-byollm-configuration
 * Tasks: T032-T034
 *
 * Handles provider API interactions (Anthropic, OpenAI, Custom endpoints)
 * Features:
 * - Connection testing with MCP validation
 * - Credits/usage fetching with 5-min cache
 * - Rate limit handling with exponential backoff + jitter
 * - Available models fetching
 * - Error handling with retry logic
 */

import axios from 'axios';
import { EventEmitter } from 'events';
import { BYOLLMConfigService } from './BYOLLMConfigService';
import { MCPConfigService } from './MCPConfigService';
import type { AnthropicCreditsResponse } from '../../shared/types/ProviderCredits';

interface ConnectionTestResult {
  success: boolean;
  provider?: string;
  modelName?: string;
  contextWindow?: number;
  bulkOperationsReady?: boolean;
  streaming?: boolean;
  timeout?: number;
  retries?: number;
  latencyMs?: number;
  error?: string;
  warnings?: string[];
  credits?: any;
}

interface ProviderConfig {
  provider: 'anthropic' | 'openai' | 'custom';
  apiKey?: string;
  modelName?: string;
  baseUrl?: string;
  modelFormat?: 'openai_compatible' | 'anthropic_compatible' | 'custom';
}

export class ProviderClientService extends EventEmitter {
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000; // 1 second
  private readonly MAX_DELAY_MS = 60000; // 60 seconds
  private readonly RETRY_AFTER_MAX_MS = 5 * 60 * 1000; // 5 minutes

  private configService: BYOLLMConfigService;
  private mcpService: MCPConfigService;

  // Credits cache (5 min TTL)
  private creditsCache: Map<string, { data: any; expiresAt: number }> = new Map();
  private readonly CREDITS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
    this.configService = new BYOLLMConfigService();
    this.mcpService = new MCPConfigService();
  }

  /**
   * Tests connection to provider API with MCP validation
   * @param configId - BYOLLM config ID
   * @returns Connection test result
   */
  async testConnection(configId: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      // Get config
      const config = await this.configService.getConfigById(configId);
      if (!config) {
        return {
          success: false,
          error: 'Config not found',
        };
      }

      // Get decrypted credentials
      const credentials = await this.configService.getDecryptedCredentials(configId);

      // Get MCP config
      const mcpConfig = await this.mcpService.getMCPConfig(configId);

      // Test API connection
      let result: ConnectionTestResult;

      if (config.provider === 'anthropic') {
        result = await this.testAnthropicConnection(credentials, config.modelName);
      } else if (config.provider === 'openai') {
        result = await this.testOpenAIConnection(credentials, config.modelName);
      } else if (config.provider === 'custom') {
        result = await this.testCustomEndpointConnection(credentials, config);
      } else {
        return {
          success: false,
          error: `Unsupported provider: ${config.provider}`,
        };
      }

      // Add MCP validation
      if (result.success && mcpConfig) {
        result.streaming = mcpConfig.streamingEnabled;
        result.timeout = mcpConfig.timeoutSeconds;
        result.retries = mcpConfig.retryAttempts;
        result.bulkOperationsReady = true;

        // Validate MCP settings
        const warnings: string[] = [];
        if (mcpConfig.timeoutSeconds < 30) {
          warnings.push('Timeout setting is low for bulk operations (recommended: 30s+)');
        }
        if (warnings.length > 0) {
          result.warnings = warnings;
        }
      }

      // Add latency
      result.latencyMs = Date.now() - startTime;

      return result;
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Tests Anthropic API connection
   */
  private async testAnthropicConnection(
    credentials: any,
    modelName: string
  ): Promise<ConnectionTestResult> {
    try {
      const apiKey = credentials.apiKey || credentials.accessToken;

      // Test API by sending minimal message
      await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: modelName,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      // Get context window from model
      const contextWindow = this.getAnthropicContextWindow(modelName);

      return {
        success: true,
        provider: 'anthropic',
        modelName,
        contextWindow,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          return {
            success: false,
            error: 'Authentication failed: Invalid API key',
          };
        } else if (status === 403) {
          return {
            success: false,
            error: 'Model access denied: Check API key permissions',
          };
        } else if (status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded',
          };
        }
      }

      return {
        success: false,
        error: `Connection test failed: ${error.message}`,
      };
    }
  }

  /**
   * Tests OpenAI API connection (placeholder)
   */
  private async testOpenAIConnection(
    _credentials: any,
    _modelName: string
  ): Promise<ConnectionTestResult> {
    // Placeholder for OpenAI
    return {
      success: false,
      error: 'OpenAI not yet implemented',
    };
  }

  /**
   * Tests custom endpoint connection
   */
  private async testCustomEndpointConnection(
    _credentials: any,
    config: any
  ): Promise<ConnectionTestResult> {
    try {
      const baseUrl = config.customEndpointUrl;

      // Test connection with health check or minimal request
      await axios.get(`${baseUrl}/health`, {
        timeout: 5000,
      });

      return {
        success: true,
        provider: 'custom',
        modelName: config.modelName,
      };
    } catch (error) {
      return {
        success: false,
        error: `Connection to custom endpoint failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Fetches credits/usage from provider (with 5-min cache)
   * @param campaignId - Campaign ID for scope resolution
   * @returns Credits information
   */
  async fetchCredits(campaignId: string): Promise<AnthropicCreditsResponse | null> {
    // Check cache
    const cached = this.creditsCache.get(campaignId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      // Resolve config
      const config = await this.configService.resolveConfig(campaignId);
      if (!config) {
        return null;
      }

      // Get credentials
      const credentials = await this.configService.getDecryptedCredentials(config.id);

      // Fetch credits from provider
      let credits: any = null;

      if (config.provider === 'anthropic') {
        credits = await this.fetchAnthropicCredits(credentials);
      }

      // Cache result
      this.creditsCache.set(campaignId, {
        data: credits,
        expiresAt: Date.now() + this.CREDITS_CACHE_TTL,
      });

      return credits;
    } catch (error) {
      console.error('Failed to fetch credits:', error);
      return null;
    }
  }

  /**
   * Fetches Anthropic credits (placeholder - API endpoint may not exist)
   */
  private async fetchAnthropicCredits(_credentials: any): Promise<AnthropicCreditsResponse> {
    // Placeholder - Anthropic may not expose credits via API
    // This would need to be implemented based on actual Anthropic API
    return {
      balance: {
        amount: 0,
        currency: 'USD',
      },
      organization: {
        name: 'Unknown',
        id: 'unknown',
      },
    };
  }

  /**
   * Fetches available models from provider
   * @param providerConfig - Provider configuration
   * @returns List of available models
   */
  async fetchAvailableModels(providerConfig: ProviderConfig): Promise<any[]> {
    if (providerConfig.provider === 'anthropic') {
      return this.getAnthropicModels();
    } else if (providerConfig.provider === 'openai') {
      return this.getOpenAIModels();
    } else {
      return [];
    }
  }

  /**
   * Gets Anthropic available models
   */
  private getAnthropicModels(): any[] {
    return [
      {
        name: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutput: 8192,
      },
      {
        name: 'claude-3-opus-20240229',
        displayName: 'Claude 3 Opus',
        contextWindow: 200000,
        maxOutput: 4096,
      },
      {
        name: 'claude-3-sonnet-20240229',
        displayName: 'Claude 3 Sonnet',
        contextWindow: 200000,
        maxOutput: 4096,
      },
      {
        name: 'claude-3-haiku-20240307',
        displayName: 'Claude 3 Haiku',
        contextWindow: 200000,
        maxOutput: 4096,
      },
    ];
  }

  /**
   * Gets OpenAI available models (placeholder)
   */
  private getOpenAIModels(): any[] {
    return [];
  }

  /**
   * Retries API call with exponential backoff on rate limit errors
   * @param apiCall - Function that makes API call
   * @returns API call result
   */
  async retryWithBackoff<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        lastError = error;

        // Only retry on rate limit errors (429)
        if (!this.isRateLimitError(error)) {
          throw error;
        }

        // Max retries exceeded
        if (attempt === this.MAX_RETRIES) {
          this.emit('rate-limit-error', 'Max retries exceeded for rate limit');
          throw this.enhanceError(error, attempt);
        }

        // Calculate backoff delay
        const retryAfter = this.getRetryAfterHeader(error);
        const delay = retryAfter
          ? this.parseRetryAfterHeader(retryAfter, attempt + 1)
          : this.calculateBackoffDelay(attempt + 1);

        // Emit notification
        this.emit(
          'rate-limit-retry',
          `Retry ${attempt + 1} of ${this.MAX_RETRIES} after ${Math.round(delay / 1000)} seconds`
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calculates exponential backoff delay with jitter
   * @param retryCount - Retry attempt number (1-indexed)
   * @returns Delay in milliseconds
   */
  calculateBackoffDelay(retryCount: number): number {
    // Exponential backoff: 2^(retryCount-1) * BASE_DELAY_MS
    const exponentialDelay = Math.pow(2, retryCount - 1) * this.BASE_DELAY_MS;

    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, this.MAX_DELAY_MS);

    // Add jitter (50-150% of delay)
    const jitterFactor = 0.5 + Math.random();
    const delayWithJitter = cappedDelay * jitterFactor;

    return Math.round(delayWithJitter);
  }

  /**
   * Parses Retry-After header (seconds or HTTP date)
   * @param retryAfter - Retry-After header value
   * @param retryCount - Retry attempt number
   * @returns Delay in milliseconds
   */
  parseRetryAfterHeader(retryAfter: string | null, retryCount: number): number {
    if (!retryAfter) {
      return this.calculateBackoffDelay(retryCount);
    }

    // Try parsing as seconds
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      // Cap at maximum
      const delayMs = Math.min(seconds * 1000, this.RETRY_AFTER_MAX_MS);
      return delayMs;
    }

    // Try parsing as HTTP date
    try {
      const date = new Date(retryAfter);
      const delayMs = date.getTime() - Date.now();
      if (delayMs > 0) {
        return Math.min(delayMs, this.RETRY_AFTER_MAX_MS);
      }
    } catch {
      // Invalid date format
    }

    // Fallback to exponential backoff
    return this.calculateBackoffDelay(retryCount);
  }

  /**
   * Checks if error is rate limit error
   */
  private isRateLimitError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      return error.response?.status === 429;
    }
    return false;
  }

  /**
   * Gets Retry-After header from error
   */
  private getRetryAfterHeader(error: any): string | null {
    if (axios.isAxiosError(error)) {
      return error.response?.headers?.['retry-after'] || null;
    }
    return null;
  }

  /**
   * Enhances error with retry metadata
   */
  private enhanceError(error: any, retries: number): any {
    const retryAfter = this.getRetryAfterHeader(error);

    return {
      ...error,
      retryable: true,
      retries,
      lastRetryAfter: retryAfter ? parseInt(retryAfter, 10) : null,
      message: `${error.message} (retry manually after rate limit clears)`,
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gets context window size for Anthropic models
   */
  private getAnthropicContextWindow(_modelName: string): number {
    // All Claude 3 models have 200k context window
    return 200000;
  }
}
