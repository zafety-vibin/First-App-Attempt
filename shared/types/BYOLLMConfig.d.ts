/**
 * BYOLLM Configuration Types
 * Feature: 008-create-byollm-configuration
 *
 * Stores user's LLM provider account configuration
 */
export interface BYOLLMConfig {
    id: string;
    scope: 'global' | 'campaign';
    campaignId: string | null;
    provider: 'openai' | 'anthropic' | 'custom';
    authMethod: 'oauth' | 'api_key';
    encryptedCredentials: string;
    modelName: string;
    customEndpointUrl: string | null;
    customSystemPromptImport: string | null;
    customSystemPromptPlanning: string | null;
    createdAt: number;
    updatedAt: number;
}
export interface DecryptedOAuthCredentials {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: number;
}
export interface DecryptedAPIKeyCredentials {
    apiKey: string;
}
export type DecryptedCredentials = DecryptedOAuthCredentials | DecryptedAPIKeyCredentials;
export interface CreateBYOLLMConfigRequest {
    scope: 'global' | 'campaign';
    campaignId?: string;
    provider: 'openai' | 'anthropic' | 'custom';
    authMethod: 'oauth' | 'api_key';
    credentials: DecryptedCredentials;
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
//# sourceMappingURL=BYOLLMConfig.d.ts.map