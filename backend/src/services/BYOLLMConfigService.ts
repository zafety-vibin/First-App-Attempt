/**
 * BYOLLMConfigService
 * Feature: 008-create-byollm-configuration
 * Tasks: T029-T031
 *
 * Manages BYOLLM (Bring Your Own LLM) configuration CRUD operations
 * Handles scope resolution: campaign-specific configs override global configs
 *
 * Features:
 * - Create/update/delete configs with encrypted credentials
 * - Scope resolution (campaign → global fallback)
 * - OAuth token refresh automation
 * - API key and OAuth credential management
 * - Custom system prompts for Import/Planning AI
 * - Model selection and validation
 */

import crypto from 'crypto';
import { db } from './DatabaseService';
import { EncryptionService } from './EncryptionService';
import type { BYOLLMConfig } from '../../shared/types/BYOLLMConfig';
import type { DecryptedOAuthCredentials, DecryptedAPIKeyCredentials } from '../../shared/types/BYOLLMConfig';

interface CreateConfigRequest {
  scope: 'global' | 'campaign';
  campaignId: string | null;
  provider: 'openai' | 'anthropic' | 'custom';
  authMethod: 'oauth' | 'api_key';
  credentials: DecryptedOAuthCredentials | DecryptedAPIKeyCredentials;
  modelName: string;
  customEndpointUrl?: string;
  customSystemPromptImport?: string;
  customSystemPromptPlanning?: string;
}

interface UpdateConfigRequest {
  credentials?: DecryptedOAuthCredentials | DecryptedAPIKeyCredentials;
  modelName?: string;
  customSystemPromptImport?: string;
  customSystemPromptPlanning?: string;
}

export class BYOLLMConfigService {
  private readonly encryptionService: EncryptionService;

  constructor(encryptionService?: EncryptionService) {
    // Use provided encryption service or create default
    // In production, passphrase should come from environment variable
    const passphrase = process.env.ENCRYPTION_PASSPHRASE || 'default-passphrase-change-in-production';
    this.encryptionService = encryptionService || new EncryptionService(passphrase);
  }

  /**
   * Creates new BYOLLM config with encrypted credentials
   * @param request - Config creation parameters
   * @returns Created config
   */
  async createConfig(request: CreateConfigRequest): Promise<BYOLLMConfig> {
    // Validate request
    this.validateCreateRequest(request);

    // Generate ID
    const id = this.generateId();

    // Encrypt credentials
    const credentialsJson = JSON.stringify(request.credentials);
    const encryptedCredentials = this.encryptionService.encrypt(credentialsJson);

    // Insert into database
    const now = Date.now();
    db.prepare(`
      INSERT INTO byollm_configs (
        id, scope, campaign_id, provider, auth_method, encrypted_credentials,
        model_name, custom_endpoint_url, custom_system_prompt_import,
        custom_system_prompt_planning, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      request.scope,
      request.campaignId,
      request.provider,
      request.authMethod,
      encryptedCredentials,
      request.modelName,
      request.customEndpointUrl || null,
      request.customSystemPromptImport || null,
      request.customSystemPromptPlanning || null,
      now,
      now
    );

    return this.getConfigById(id) as Promise<BYOLLMConfig>;
  }

  /**
   * Retrieves config by scope and campaign ID
   * @param params - Scope and campaign ID
   * @returns Config or null if not found
   */
  async getConfig(params: {
    scope: 'global' | 'campaign';
    campaignId: string | null;
  }): Promise<BYOLLMConfig | null> {
    const row = db.prepare(`
      SELECT * FROM byollm_configs
      WHERE scope = ? AND campaign_id IS ?
    `).get(params.scope, params.campaignId) as any;

    return row ? this.mapRowToConfig(row) : null;
  }

  /**
   * Retrieves config by ID
   * @param id - Config ID
   * @returns Config or null if not found
   */
  async getConfigById(id: string): Promise<BYOLLMConfig | null> {
    const row = db.prepare(`
      SELECT * FROM byollm_configs
      WHERE id = ?
    `).get(id) as any;

    return row ? this.mapRowToConfig(row) : null;
  }

  /**
   * Updates existing config
   * @param id - Config ID
   * @param request - Update parameters
   * @returns Updated config
   */
  async updateConfig(id: string, request: UpdateConfigRequest): Promise<BYOLLMConfig> {
    const existingConfig = await this.getConfigById(id);
    if (!existingConfig) {
      throw new Error(`Config not found: ${id}`);
    }

    const updates: string[] = [];
    const values: any[] = [];

    // Update credentials if provided
    if (request.credentials) {
      const credentialsJson = JSON.stringify(request.credentials);
      const encryptedCredentials = this.encryptionService.encrypt(credentialsJson);
      updates.push('encrypted_credentials = ?');
      values.push(encryptedCredentials);
    }

    // Update model name if provided
    if (request.modelName) {
      updates.push('model_name = ?');
      values.push(request.modelName);
    }

    // Update custom prompts if provided
    if (request.customSystemPromptImport !== undefined) {
      updates.push('custom_system_prompt_import = ?');
      values.push(request.customSystemPromptImport);
    }

    if (request.customSystemPromptPlanning !== undefined) {
      updates.push('custom_system_prompt_planning = ?');
      values.push(request.customSystemPromptPlanning);
    }

    // Update timestamp
    updates.push('updated_at = ?');
    values.push(Date.now());

    // Add ID for WHERE clause
    values.push(id);

    // Execute update
    if (updates.length > 0) {
      db.prepare(`
        UPDATE byollm_configs
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
    }

    return this.getConfigById(id) as Promise<BYOLLMConfig>;
  }

  /**
   * Deletes config
   * @param id - Config ID
   */
  async deleteConfig(id: string): Promise<void> {
    db.prepare(`
      DELETE FROM byollm_configs
      WHERE id = ?
    `).run(id);
  }

  /**
   * Deletes global config (helper method for tests)
   */
  async deleteGlobalConfig(): Promise<void> {
    db.prepare(`
      DELETE FROM byollm_configs
      WHERE scope = 'global'
    `).run();
  }

  /**
   * Resolves config for campaign (campaign overrides global)
   * @param campaignId - Campaign ID
   * @returns Resolved config or null if not found
   */
  async resolveConfig(campaignId: string): Promise<BYOLLMConfig | null> {
    // Try campaign-specific config first
    const campaignConfig = await this.getConfig({
      scope: 'campaign',
      campaignId,
    });

    if (campaignConfig) {
      return campaignConfig;
    }

    // Fallback to global config
    const globalConfig = await this.getConfig({
      scope: 'global',
      campaignId: null,
    });

    return globalConfig;
  }

  /**
   * Gets validated config with automatic token refresh
   * @param params - Scope and campaign ID
   * @returns Config with valid tokens
   */
  async getValidatedConfig(params: {
    scope: 'global' | 'campaign';
    campaignId: string | null;
  }): Promise<BYOLLMConfig | null> {
    const config = await this.getConfig(params);
    if (!config) {
      return null;
    }

    // Check if OAuth tokens need refresh
    if (config.authMethod === 'oauth') {
      const credentials = await this.getDecryptedCredentials(config.id) as DecryptedOAuthCredentials;

      // If expired, refresh token
      if (credentials.expiresAt < Date.now() && credentials.refreshToken) {
        try {
          const newCredentials = await this.refreshOAuthToken(config.provider, credentials.refreshToken);
          await this.updateConfig(config.id, {
            credentials: newCredentials,
          });

          // Return updated config
          return this.getConfigById(config.id);
        } catch (error) {
          console.error('Token refresh failed:', error);
          // Return config anyway - let provider client handle expired token
        }
      }
    }

    return config;
  }

  /**
   * Decrypts and returns credentials
   * @param configId - Config ID
   * @returns Decrypted credentials
   */
  async getDecryptedCredentials(
    configId: string
  ): Promise<DecryptedOAuthCredentials | DecryptedAPIKeyCredentials> {
    const config = await this.getConfigById(configId);
    if (!config) {
      throw new Error(`Config not found: ${configId}`);
    }

    const decryptedJson = this.encryptionService.decrypt(config.encryptedCredentials);
    return JSON.parse(decryptedJson);
  }

  /**
   * Refreshes OAuth access token using refresh token
   * @param _provider - OAuth provider (unused in mock implementation)
   * @param refreshToken - Refresh token
   * @returns New credentials
   */
  private async refreshOAuthToken(
    _provider: 'openai' | 'anthropic' | 'custom',
    refreshToken: string
  ): Promise<DecryptedOAuthCredentials> {
    // Placeholder - actual implementation would call provider's token endpoint
    // For now, return mock refreshed credentials
    return {
      accessToken: 'refreshed-access-token',
      refreshToken: refreshToken,
      expiresAt: Date.now() + 3600000, // 1 hour
    };
  }

  /**
   * Validates create request
   * @param request - Create request
   * @throws Error if validation fails
   */
  private validateCreateRequest(request: CreateConfigRequest): void {
    // Validate scope and campaign_id consistency
    if (request.scope === 'global' && request.campaignId !== null) {
      throw new Error('global scope cannot have campaign_id');
    }

    if (request.scope === 'campaign' && !request.campaignId) {
      throw new Error('campaign_id required for campaign scope');
    }

    // Validate API key format (Anthropic)
    if (request.authMethod === 'api_key' && request.provider === 'anthropic') {
      const apiKey = (request.credentials as DecryptedAPIKeyCredentials).apiKey;
      if (!apiKey.startsWith('sk-ant-api03-')) {
        throw new Error('Invalid Anthropic API key format (expected sk-ant-api03-...)');
      }
    }

    // Validate model name for provider
    if (request.provider === 'anthropic') {
      const validModels = [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ];

      if (!validModels.includes(request.modelName)) {
        throw new Error(`Invalid model for Anthropic: ${request.modelName}`);
      }
    }
  }

  /**
   * Maps database row to BYOLLMConfig
   * @param row - Database row
   * @returns BYOLLMConfig
   */
  private mapRowToConfig(row: any): BYOLLMConfig {
    return {
      id: row.id,
      scope: row.scope,
      campaignId: row.campaign_id,
      provider: row.provider,
      authMethod: row.auth_method,
      encryptedCredentials: row.encrypted_credentials,
      modelName: row.model_name,
      customEndpointUrl: row.custom_endpoint_url,
      customSystemPromptImport: row.custom_system_prompt_import,
      customSystemPromptPlanning: row.custom_system_prompt_planning,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Generates unique ID for config
   * @returns UUID-like ID
   */
  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
