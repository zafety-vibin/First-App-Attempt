/**
 * BYOLLM Configuration Types
 * Feature: 008-create-byollm-configuration
 */

export type BYOLLMProvider = 'openai' | 'anthropic' | 'custom';
export type BYOLLMScope = 'global' | 'campaign';

export interface BYOLLMConfig {
  id: number;
  user_id: string;
  campaign_id: string | null; // null = global scope
  provider: BYOLLMProvider;
  model: string;
  api_key_encrypted?: string; // Only for API key auth
  custom_endpoint?: string; // For custom provider
  custom_system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  created_at: number;
  updated_at: number;
}

export interface BYOLLMConfigCreateInput {
  campaign_id?: string | null;
  provider: BYOLLMProvider;
  model: string;
  api_key?: string;
  custom_endpoint?: string;
  custom_system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface BYOLLMConfigUpdateInput {
  model?: string;
  api_key?: string;
  custom_endpoint?: string;
  custom_system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface ProviderCredits {
  provider: BYOLLMProvider;
  balance: number;
  currency: string;
  organization_name?: string;
  last_updated: number;
}
