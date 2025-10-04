/**
 * Provider Credits Types
 * Feature: 008-create-byollm-configuration
 *
 * Caches user's remaining credits/usage from provider API
 */
export interface ProviderCredits {
    configId: string;
    balance: number;
    currency: string;
    organizationName: string;
    lastFetchedAt: number;
}
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
export type CreditsResponse = AnthropicCreditsResponse | null;
//# sourceMappingURL=ProviderCredits.d.ts.map