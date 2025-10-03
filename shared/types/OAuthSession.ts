/**
 * OAuth Session Types
 * Feature: 008-create-byollm-configuration
 *
 * Temporary storage for OAuth 2.0 PKCE flow (10 minute TTL)
 */

export interface OAuthSession {
  state: string; // CSRF protection token (primary key)
  codeVerifier: string; // PKCE code verifier (for token exchange)
  provider: 'openai' | 'anthropic';
  scope: 'global' | 'campaign';
  campaignId: string | null;
  createdAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (auto-cleanup after 10 minutes)
}

// OAuth initiate request
export interface OAuthInitiateRequest {
  provider: 'anthropic'; // Primary focus: Anthropic (Claude)
  scope: 'global' | 'campaign';
  campaignId?: string;
}

// OAuth initiate response (authorization URL)
export interface OAuthInitiateResponse {
  authorizationUrl: string;
  state: string; // Client stores this to validate callback
}

// OAuth callback query params
export interface OAuthCallbackParams {
  code: string; // Authorization code from provider
  state: string; // CSRF token to validate
}

// OAuth token exchange response
export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number; // Seconds until expiration
  tokenType: string; // Usually "Bearer"
}
