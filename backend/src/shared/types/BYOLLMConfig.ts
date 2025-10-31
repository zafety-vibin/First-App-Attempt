/**
 * BYOLLM Configuration Types
 * Feature: 008-create-byollm-configuration
 *
 * Stores user's LLM provider account configuration
 */

export interface BYOLLMConfig {
  id: string; // UUID
  scope: 'global' | 'campaign';
  campaignId: string | null;
  provider: 'openai' | 'anthropic' | 'custom';
  authMethod: 'oauth' | 'api_key';
  encryptedCredentials: string; // Format: salt:iv:authTag:encrypted (AES-256-GCM)
  modelName: string;
  customEndpointUrl: string | null;
  customSystemPromptImport: string | null;
  customSystemPromptPlanning: string | null;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

// Decrypted credentials (never stored, only in memory)
export interface DecryptedOAuthCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // Unix timestamp
}

export interface DecryptedAPIKeyCredentials {
  apiKey: string;
}

export type DecryptedCredentials = DecryptedOAuthCredentials | DecryptedAPIKeyCredentials;

// Request/Response types for API
export interface CreateBYOLLMConfigRequest {
  scope: 'global' | 'campaign';
  campaignId?: string;
  provider: 'openai' | 'anthropic' | 'custom';
  authMethod: 'oauth' | 'api_key';
  credentials: DecryptedCredentials; // Will be encrypted by backend
  modelName: string;
  customEndpointUrl?: string;
  customSystemPromptImport?: string;
  customSystemPromptPlanning?: string;
}

export interface UpdateBYOLLMConfigRequest {
  modelName?: string;
  customSystemPromptImport?: string;
  customSystemPromptPlanning?: string;
}
