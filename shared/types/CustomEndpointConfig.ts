/**
 * Custom Endpoint Configuration Types
 * Feature: 008-create-byollm-configuration
 *
 * Additional metadata for custom local LLM endpoints (Ollama, LM Studio, etc.)
 */

export interface CustomEndpointConfig {
  id: string;
  configId: string; // FK to BYOLLMConfig
  baseUrl: string; // e.g., "http://localhost:11434" for Ollama
  authHeaderName: string | null; // e.g., "Authorization" or "X-API-Key"
  authHeaderValue: string | null; // Encrypted API key or bearer token
  modelFormat: 'openai_compatible' | 'anthropic_compatible' | 'custom';
  supportsStreaming: boolean;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

// Request to create/update custom endpoint
export interface CustomEndpointRequest {
  baseUrl: string;
  authHeaderName?: string;
  authHeaderValue?: string;
  modelFormat?: 'openai_compatible' | 'anthropic_compatible' | 'custom';
  supportsStreaming?: boolean;
}

// Common local LLM presets
export const LOCAL_LLM_PRESETS = {
  ollama: {
    name: 'Ollama',
    baseUrl: 'http://localhost:11434',
    modelFormat: 'openai_compatible' as const,
    supportsStreaming: true,
    authRequired: false,
  },
  lmstudio: {
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234',
    modelFormat: 'openai_compatible' as const,
    supportsStreaming: true,
    authRequired: false,
  },
} as const;
