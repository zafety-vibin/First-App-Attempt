/**
 * MCP Configuration Types
 * Feature: 008-create-byollm-configuration
 *
 * Model Context Protocol settings for bulk operations
 * (automatic configuration, hidden from users like Notion permissions)
 */

export interface MCPConfig {
  id: string;
  configId: string; // FK to BYOLLMConfig
  streamingEnabled: boolean;
  timeoutSeconds: number;
  retryAttempts: number;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

// Default MCP configuration values
export const DEFAULT_MCP_CONFIG = {
  streamingEnabled: true,
  timeoutSeconds: 30,
  retryAttempts: 3,
} as const;

// MCP connection test request
export interface MCPTestRequest {
  configId: string;
}

// MCP connection test response
export interface MCPTestResponse {
  success: boolean;
  provider: string;
  modelName: string;
  contextWindow: number;
  bulkOperationsReady: boolean;
  error?: string;
  latencyMs?: number;
}
