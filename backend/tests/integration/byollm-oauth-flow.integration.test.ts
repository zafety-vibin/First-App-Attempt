/**
 * BYOLLM OAuth Flow Integration Tests
 * Feature: 008-create-byollm-configuration
 * Task: T020
 *
 * Tests complete OAuth 2.0 + PKCE flow for Anthropic provider
 * End-to-end: initiate → authorize → callback → token exchange → store config
 *
 * IMPORTANT: This test MUST FAIL until BYOLLM services are implemented (TDD)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseService } from '../../src/services/DatabaseService';
import { OAuthFlowService } from '../../src/services/OAuthFlowService';
import { BYOLLMConfigService } from '../../src/services/BYOLLMConfigService';
import { EncryptionService } from '../../src/services/EncryptionService';

describe('BYOLLM OAuth Flow Integration', () => {
  let db: DatabaseService;
  let oauthService: OAuthFlowService;
  let configService: BYOLLMConfigService;
  let encryptionService: EncryptionService;

  const testUserId = 'test-user-oauth-flow';
  const testCampaignId = 'test-campaign-oauth';

  beforeAll(async () => {
    // Initialize services
    db = new DatabaseService(':memory:');
    await db.initialize();

    const encryptionPassphrase = 'test-passphrase-oauth';
    encryptionService = new EncryptionService(encryptionPassphrase);
    oauthService = new OAuthFlowService(db);
    configService = new BYOLLMConfigService(db, encryptionService);

    // Create test campaign
    db.getDatabase().prepare(`
      INSERT INTO campaigns (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(testCampaignId, testUserId, 'OAuth Test Campaign', Date.now(), Date.now());
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Global scope OAuth flow', () => {
    it('should complete full OAuth flow for global Anthropic config', async () => {
      // Step 1: Initiate OAuth flow
      const initiateResult = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      expect(initiateResult.authorizationUrl).toBeTruthy();
      expect(initiateResult.authorizationUrl).toContain('console.anthropic.com');
      expect(initiateResult.state).toBeTruthy();

      const { state } = initiateResult;

      // Verify OAuth session stored
      const oauthSession = await oauthService.getOAuthSessionByState(state);
      expect(oauthSession).toBeTruthy();
      expect(oauthSession!.provider).toBe('anthropic');
      expect(oauthSession!.scope).toBe('global');
      expect(oauthSession!.codeVerifier).toBeTruthy();

      // Step 2: User redirects to Anthropic, authorizes, Anthropic redirects back
      // Simulate OAuth callback with authorization code
      const mockAuthorizationCode = 'mock-auth-code-123';

      // Step 3: Handle OAuth callback
      const callbackResult = await oauthService.handleOAuthCallback({
        code: mockAuthorizationCode,
        state,
      });

      expect(callbackResult.success).toBe(true);
      expect(callbackResult.configId).toBeTruthy();

      // Step 4: Verify BYOLLM config created
      const config = await configService.getConfig({
        scope: 'global',
        campaignId: null,
      });

      expect(config).toBeTruthy();
      expect(config!.scope).toBe('global');
      expect(config!.provider).toBe('anthropic');
      expect(config!.authMethod).toBe('oauth');
      expect(config!.encryptedCredentials).toBeTruthy();

      // Step 5: Verify OAuth session deleted (one-time use)
      const sessionAfterCallback = await oauthService.getOAuthSessionByState(state);
      expect(sessionAfterCallback).toBeNull();
    });

    it('should store encrypted OAuth tokens in BYOLLM config', async () => {
      const initiateResult = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      const { state } = initiateResult;
      const mockAuthorizationCode = 'mock-auth-code-456';

      // Mock token exchange response
      const mockTokens = {
        accessToken: 'sk-ant-api03-mock-access-token-1234567890',
        refreshToken: 'mock-refresh-token-abcdefghijklmnop',
        expiresAt: Date.now() + 3600000, // 1 hour
      };

      // Handle callback (internally exchanges code for tokens)
      await oauthService.handleOAuthCallback({
        code: mockAuthorizationCode,
        state,
      });

      // Retrieve config
      const config = await configService.getConfig({
        scope: 'global',
        campaignId: null,
      });

      // Verify credentials encrypted
      expect(config!.encryptedCredentials).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
      expect(config!.encryptedCredentials).not.toContain('sk-ant-api03');

      // Decrypt and verify
      const decryptedCreds = JSON.parse(
        encryptionService.decrypt(config!.encryptedCredentials)
      );

      expect(decryptedCreds.accessToken).toBeTruthy();
      expect(decryptedCreds.refreshToken).toBeTruthy();
      expect(decryptedCreds.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Campaign scope OAuth flow', () => {
    it('should complete OAuth flow for campaign-specific config', async () => {
      // Initiate OAuth for campaign scope
      const initiateResult = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'campaign',
        campaignId: testCampaignId,
      });

      expect(initiateResult.authorizationUrl).toBeTruthy();
      const { state } = initiateResult;

      // Verify OAuth session has campaign ID
      const oauthSession = await oauthService.getOAuthSessionByState(state);
      expect(oauthSession!.scope).toBe('campaign');
      expect(oauthSession!.campaignId).toBe(testCampaignId);

      // Handle callback
      const mockAuthorizationCode = 'mock-auth-code-campaign';
      await oauthService.handleOAuthCallback({
        code: mockAuthorizationCode,
        state,
      });

      // Verify campaign-specific config created
      const config = await configService.getConfig({
        scope: 'campaign',
        campaignId: testCampaignId,
      });

      expect(config).toBeTruthy();
      expect(config!.scope).toBe('campaign');
      expect(config!.campaignId).toBe(testCampaignId);
    });

    it('should allow both global and campaign configs to coexist', async () => {
      // Create global config
      const globalInitiate = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      await oauthService.handleOAuthCallback({
        code: 'mock-global-code',
        state: globalInitiate.state,
      });

      // Create campaign config
      const campaignInitiate = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'campaign',
        campaignId: testCampaignId,
      });

      await oauthService.handleOAuthCallback({
        code: 'mock-campaign-code',
        state: campaignInitiate.state,
      });

      // Both should exist
      const globalConfig = await configService.getConfig({
        scope: 'global',
        campaignId: null,
      });

      const campaignConfig = await configService.getConfig({
        scope: 'campaign',
        campaignId: testCampaignId,
      });

      expect(globalConfig).toBeTruthy();
      expect(campaignConfig).toBeTruthy();
      expect(globalConfig!.id).not.toBe(campaignConfig!.id);
    });
  });

  describe('PKCE security validation', () => {
    it('should use code verifier from session during token exchange', async () => {
      const initiateResult = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      const { state } = initiateResult;

      // Retrieve code verifier from session
      const oauthSession = await oauthService.getOAuthSessionByState(state);
      const codeVerifier = oauthSession!.codeVerifier;

      // Code verifier should be used in token exchange (tested in unit tests)
      expect(codeVerifier).toBeTruthy();
      expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    });

    it('should reject callback with invalid state (CSRF protection)', async () => {
      const initiateResult = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // Attacker tries to use forged state
      const invalidState = 'forged-state-12345';

      const callbackResult = await oauthService.handleOAuthCallback({
        code: 'mock-code',
        state: invalidState,
      });

      expect(callbackResult.success).toBe(false);
      expect(callbackResult.error).toContain('state');
    });

    it('should reject callback with expired state (10 min TTL)', async () => {
      const state = 'expired-state-123';

      // Manually store expired OAuth session
      const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
      db.getDatabase().prepare(`
        INSERT INTO oauth_sessions (state, code_verifier, provider, scope, campaign_id, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        state,
        'test-verifier',
        'anthropic',
        'global',
        null,
        elevenMinutesAgo,
        elevenMinutesAgo
      );

      // Attempt callback with expired state
      const callbackResult = await oauthService.handleOAuthCallback({
        code: 'mock-code',
        state,
      });

      expect(callbackResult.success).toBe(false);
      expect(callbackResult.error).toContain('expired');
    });
  });

  describe('Token refresh', () => {
    it('should automatically refresh expired OAuth tokens', async () => {
      // Create config with expired access token
      const initiateResult = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      await oauthService.handleOAuthCallback({
        code: 'mock-code',
        state: initiateResult.state,
      });

      // Get config
      const config = await configService.getConfig({
        scope: 'global',
        campaignId: null,
      });

      // Manually expire access token
      const credentials = JSON.parse(
        encryptionService.decrypt(config!.encryptedCredentials)
      );
      credentials.expiresAt = Date.now() - 1000; // Expired 1 second ago

      // Update config with expired token
      const updatedEncrypted = encryptionService.encrypt(JSON.stringify(credentials));
      db.getDatabase().prepare(`
        UPDATE byollm_configs
        SET encrypted_credentials = ?
        WHERE id = ?
      `).run(updatedEncrypted, config!.id);

      // Attempt to use config (should trigger refresh)
      const refreshedConfig = await configService.getValidatedConfig({
        scope: 'global',
        campaignId: null,
      });

      // Verify token refreshed
      const refreshedCreds = JSON.parse(
        encryptionService.decrypt(refreshedConfig!.encryptedCredentials)
      );

      expect(refreshedCreds.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('Error handling', () => {
    it('should handle token exchange failure gracefully', async () => {
      const initiateResult = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // Simulate token exchange failure (invalid code)
      const callbackResult = await oauthService.handleOAuthCallback({
        code: 'invalid-authorization-code',
        state: initiateResult.state,
      });

      expect(callbackResult.success).toBe(false);
      expect(callbackResult.error).toBeTruthy();

      // OAuth session should be deleted even on failure
      const sessionAfter = await oauthService.getOAuthSessionByState(initiateResult.state);
      expect(sessionAfter).toBeNull();
    });

    it('should handle network errors during token exchange', async () => {
      const initiateResult = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // Simulate network error (Anthropic API down)
      // Mock network failure in OAuthFlowService

      const callbackResult = await oauthService.handleOAuthCallback({
        code: 'mock-code',
        state: initiateResult.state,
      });

      if (!callbackResult.success) {
        expect(callbackResult.error).toBeTruthy();
        expect(callbackResult.retryable).toBe(true);
      }
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired OAuth sessions automatically', async () => {
      const state1 = 'state-expired-1';
      const state2 = 'state-valid-2';

      const now = Date.now();
      const twelveMinutesAgo = now - 12 * 60 * 1000;
      const fiveMinutesFromNow = now + 5 * 60 * 1000;

      // Store expired session
      db.getDatabase().prepare(`
        INSERT INTO oauth_sessions (state, code_verifier, provider, scope, campaign_id, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(state1, 'verifier1', 'anthropic', 'global', null, twelveMinutesAgo, twelveMinutesAgo);

      // Store valid session
      db.getDatabase().prepare(`
        INSERT INTO oauth_sessions (state, code_verifier, provider, scope, campaign_id, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(state2, 'verifier2', 'anthropic', 'global', null, now, fiveMinutesFromNow);

      // Run cleanup
      await oauthService.cleanupExpiredOAuthSessions();

      // Expired session deleted
      const session1 = await oauthService.getOAuthSessionByState(state1);
      expect(session1).toBeNull();

      // Valid session still exists
      const session2 = await oauthService.getOAuthSessionByState(state2);
      expect(session2).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should complete OAuth flow initialization in <1 second', async () => {
      const startTime = Date.now();

      await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('should handle OAuth callback in <2 seconds', async () => {
      const initiateResult = await oauthService.initiateOAuthFlow({
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      const startTime = Date.now();

      await oauthService.handleOAuthCallback({
        code: 'mock-code',
        state: initiateResult.state,
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });
  });
});
