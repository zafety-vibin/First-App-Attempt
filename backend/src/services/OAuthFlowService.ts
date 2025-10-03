/**
 * OAuthFlowService
 * Feature: 008-create-byollm-configuration
 * Tasks: T026-T028
 *
 * Implements OAuth 2.0 Authorization Code Flow with PKCE for Anthropic provider
 * PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks
 *
 * OAuth Flow:
 * 1. Client calls initiateOAuthFlow() → generates state, code_verifier, code_challenge
 * 2. Client redirects user to authorization URL with code_challenge
 * 3. User authorizes on provider's site
 * 4. Provider redirects back with authorization code and state
 * 5. Client calls handleOAuthCallback() → validates state, exchanges code for tokens
 * 6. Tokens encrypted and stored in BYOLLM config
 *
 * Security:
 * - PKCE: code_verifier/code_challenge pair (SHA-256, base64url)
 * - State parameter: CSRF protection (cryptographically random)
 * - Session TTL: 10 minutes (cleanup expired sessions)
 * - One-time use: state deleted after callback
 */

import crypto from 'crypto';
import axios from 'axios';
import { db } from './DatabaseService';
import { BYOLLMConfigService } from './BYOLLMConfigService';
import type { OAuthSession } from '../../shared/types/OAuthSession';

interface OAuthInitiateRequest {
  provider: 'anthropic';
  scope: 'global' | 'campaign';
  campaignId: string | null;
}

interface OAuthInitiateResponse {
  authorizationUrl: string;
  state: string;
}

interface OAuthCallbackRequest {
  code: string;
  state: string;
}

interface OAuthCallbackResponse {
  success: boolean;
  configId?: string;
  error?: string;
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export class OAuthFlowService {
  private readonly SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

  // Anthropic OAuth endpoints
  private readonly ANTHROPIC_AUTHORIZE_URL = 'https://console.anthropic.com/oauth/authorize';
  private readonly ANTHROPIC_TOKEN_URL = 'https://console.anthropic.com/oauth/token';
  private readonly ANTHROPIC_CLIENT_ID = process.env.ANTHROPIC_CLIENT_ID || 'wrldbldr-mcp-manager';
  private readonly ANTHROPIC_REDIRECT_URI = process.env.ANTHROPIC_REDIRECT_URI || 'http://localhost:3001/api/byollm/oauth/callback';

  constructor() {
    // No longer need db parameter - use module-level db
  }

  /**
   * Generates PKCE code verifier (RFC 7636 section 4.1)
   * @returns Random URL-safe string (43-128 characters)
   */
  generateCodeVerifier(): string {
    // RFC 7636: code_verifier = 43*128unreserved
    // unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
    // Generate 32 random bytes (256 bits) → base64url encode → 43 characters
    const randomBytes = crypto.randomBytes(32);
    return this.base64urlEncode(randomBytes);
  }

  /**
   * Generates PKCE code challenge from code verifier (RFC 7636 section 4.2)
   * @param verifier - Code verifier
   * @returns SHA-256 base64url-encoded challenge
   */
  generateCodeChallenge(verifier: string): string {
    // RFC 7636: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
    const hash = crypto.createHash('sha256').update(verifier, 'ascii').digest();
    return this.base64urlEncode(hash);
  }

  /**
   * Generates OAuth state parameter for CSRF protection
   * @returns Cryptographically random base64url-encoded string
   */
  generateState(): string {
    // 32 random bytes (256 bits) for CSRF protection
    const randomBytes = crypto.randomBytes(32);
    return this.base64urlEncode(randomBytes);
  }

  /**
   * Initiates OAuth flow by generating authorization URL
   * @param request - Provider, scope, and campaign ID
   * @returns Authorization URL and state parameter
   */
  async initiateOAuthFlow(request: OAuthInitiateRequest): Promise<OAuthInitiateResponse> {
    // Generate PKCE parameters
    const state = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    // Store OAuth session
    await this.storeOAuthSession({
      state,
      codeVerifier,
      provider: request.provider,
      scope: request.scope,
      campaignId: request.campaignId,
    });

    // Build authorization URL
    let authorizationUrl: string;

    if (request.provider === 'anthropic') {
      const params = new URLSearchParams({
        client_id: this.ANTHROPIC_CLIENT_ID,
        redirect_uri: this.ANTHROPIC_REDIRECT_URI,
        response_type: 'code',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: 'read:user read:credits', // Anthropic OAuth scopes
      });

      authorizationUrl = `${this.ANTHROPIC_AUTHORIZE_URL}?${params.toString()}`;
    } else {
      throw new Error(`Unsupported OAuth provider: ${request.provider}`);
    }

    return {
      authorizationUrl,
      state,
    };
  }

  /**
   * Handles OAuth callback by validating state and exchanging code for tokens
   * @param request - Authorization code and state from callback
   * @returns Success status and config ID
   */
  async handleOAuthCallback(request: OAuthCallbackRequest): Promise<OAuthCallbackResponse> {
    try {
      // Validate state (CSRF protection)
      const isValid = await this.validateState(request.state);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid or expired state parameter',
        };
      }

      // Retrieve OAuth session
      const session = await this.getOAuthSessionByState(request.state);
      if (!session) {
        return {
          success: false,
          error: 'OAuth session not found',
        };
      }

      // Exchange authorization code for tokens
      const tokens = await this.exchangeCodeForTokens(
        request.code,
        session.codeVerifier,
        session.provider
      );

      // Create BYOLLM config with encrypted tokens
      const configService = new BYOLLMConfigService();
      const config = await configService.createConfig({
        scope: session.scope,
        campaignId: session.campaignId,
        provider: session.provider,
        authMethod: 'oauth',
        credentials: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          expiresAt: Date.now() + tokens.expires_in * 1000,
        },
        modelName: this.getDefaultModel(session.provider),
      });

      // Delete OAuth session (one-time use)
      await this.deleteOAuthSession(request.state);

      return {
        success: true,
        configId: config.id,
      };
    } catch (error) {
      // Cleanup session even on failure
      await this.deleteOAuthSession(request.state).catch(() => {});

      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Exchanges authorization code for access/refresh tokens
   * @param code - Authorization code
   * @param codeVerifier - PKCE code verifier
   * @param provider - OAuth provider
   * @returns Token response
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    provider: 'openai' | 'anthropic'
  ): Promise<OAuthTokenResponse> {
    let tokenUrl: string;
    let clientId: string;
    let redirectUri: string;

    if (provider === 'anthropic') {
      tokenUrl = this.ANTHROPIC_TOKEN_URL;
      clientId = this.ANTHROPIC_CLIENT_ID;
      redirectUri = this.ANTHROPIC_REDIRECT_URI;
    } else {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    try {
      const response = await axios.post<OAuthTokenResponse>(
        tokenUrl,
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          code_verifier: codeVerifier,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Token exchange failed: ${error.response?.data?.error || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Stores OAuth session in database
   * @param session - Session data (state, code verifier, provider, scope)
   */
  async storeOAuthSession(
    session: Omit<OAuthSession, 'createdAt' | 'expiresAt'>
  ): Promise<void> {
    const now = Date.now();
    const expiresAt = now + this.SESSION_TTL_MS;

    db.prepare(`
      INSERT INTO oauth_sessions (state, code_verifier, provider, scope, campaign_id, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.state,
      session.codeVerifier,
      session.provider,
      session.scope,
      session.campaignId,
      now,
      expiresAt
    );
  }

  /**
   * Retrieves OAuth session by state parameter
   * @param state - State parameter
   * @returns OAuth session or null if not found
   */
  async getOAuthSessionByState(state: string): Promise<OAuthSession | null> {
    const row = db.prepare(`
      SELECT state, code_verifier, provider, scope, campaign_id, created_at, expires_at
      FROM oauth_sessions
      WHERE state = ?
    `).get(state) as any;

    if (!row) {
      return null;
    }

    return {
      state: row.state,
      codeVerifier: row.code_verifier,
      provider: row.provider,
      scope: row.scope,
      campaignId: row.campaign_id,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  /**
   * Validates state parameter (CSRF protection + expiration)
   * @param state - State parameter from callback
   * @returns true if valid, false otherwise
   */
  async validateState(state: string): Promise<boolean> {
    if (!state || typeof state !== 'string') {
      return false;
    }

    const session = await this.getOAuthSessionByState(state);
    if (!session) {
      return false;
    }

    // Check expiration
    if (session.expiresAt < Date.now()) {
      // Expired - delete session
      await this.deleteOAuthSession(state);
      return false;
    }

    return true;
  }

  /**
   * Deletes OAuth session (one-time use after callback)
   * @param state - State parameter
   */
  async deleteOAuthSession(state: string): Promise<void> {
    db.prepare(`
      DELETE FROM oauth_sessions
      WHERE state = ?
    `).run(state);
  }

  /**
   * Cleans up expired OAuth sessions (prevent database bloat)
   * Should be called periodically (e.g., every hour via cron)
   */
  async cleanupExpiredOAuthSessions(): Promise<void> {
    const now = Date.now();
    db.prepare(`
      DELETE FROM oauth_sessions
      WHERE expires_at < ?
    `).run(now);
  }

  /**
   * Base64url encoding (RFC 4648)
   * @param buffer - Buffer to encode
   * @returns Base64url-encoded string (URL-safe, no padding)
   */
  private base64urlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Gets default model for provider
   * @param provider - OAuth provider
   * @returns Default model name
   */
  private getDefaultModel(provider: 'openai' | 'anthropic'): string {
    if (provider === 'anthropic') {
      return 'claude-3-5-sonnet-20241022';
    }
    throw new Error(`Unknown provider: ${provider}`);
  }
}
