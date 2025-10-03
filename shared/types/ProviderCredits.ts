/**
 * Provider Credits Types
 * Feature: 008-create-byollm-configuration
 *
 * Caches user's remaining credits/usage from provider API
 */

export interface ProviderCredits {
  configId: string; // FK to BYOLLMConfig
  balance: number;
  currency: string; // ISO 3-letter code (USD, EUR, etc.)
  organizationName: string;
  lastFetchedAt: number; // Unix timestamp
}

// Response from provider API (to be mapped to ProviderCredits)
export interface AnthropicCreditsResponse {
  balance: {
    amount: number;
    currency: string;
  };
  organization: {
    name: string;
    id: string;
  };
}

// Custom endpoint doesn't have credits
export type CreditsResponse = AnthropicCreditsResponse | null;
