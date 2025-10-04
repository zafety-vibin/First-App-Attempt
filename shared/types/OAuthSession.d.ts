/**
 * OAuth Session Types
 * Feature: 008-create-byollm-configuration
 *
 * Temporary storage for OAuth 2.0 PKCE flow (10 minute TTL)
 */
export interface OAuthSession {
    state: string;
    codeVerifier: string;
    provider: 'openai' | 'anthropic';
    scope: 'global' | 'campaign';
    campaignId: string | null;
    createdAt: number;
    expiresAt: number;
}
export interface OAuthInitiateRequest {
    provider: 'anthropic';
    scope: 'global' | 'campaign';
    campaignId?: string;
}
export interface OAuthInitiateResponse {
    authorizationUrl: string;
    state: string;
}
export interface OAuthCallbackParams {
    code: string;
    state: string;
}
export interface OAuthTokenResponse {
    accessToken: string;
    refreshToken: string | null;
    expiresIn: number;
    tokenType: string;
}
//# sourceMappingURL=OAuthSession.d.ts.map