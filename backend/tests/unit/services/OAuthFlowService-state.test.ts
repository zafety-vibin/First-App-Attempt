/**
 * OAuthFlowService State Validation Unit Tests
 * Feature: 008-create-byollm-configuration
 * Task: T017
 *
 * Tests OAuth state parameter for CSRF (Cross-Site Request Forgery) protection
 * State parameter prevents attackers from forging authorization callbacks
 *
 * IMPORTANT: This test MUST FAIL until OAuthFlowService is implemented (TDD)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { OAuthFlowService } from '../../../src/services/OAuthFlowService';

describe('OAuthFlowService - OAuth State Validation (CSRF Protection)', () => {
  let oauthService: OAuthFlowService;

  beforeAll(() => {
    oauthService = new OAuthFlowService();
  });

  describe('generateState', () => {
    it('should generate cryptographically random state parameter', () => {
      const state = oauthService.generateState();

      // Should be non-empty string
      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
    });

    it('should generate URL-safe state (base64url encoding)', () => {
      const state = oauthService.generateState();

      // Should not contain URL-unsafe characters (+, /, =)
      expect(state).not.toContain('+');
      expect(state).not.toContain('/');
      expect(state).not.toContain('=');

      // Should only contain base64url-safe characters
      const base64UrlPattern = /^[A-Za-z0-9\-_]+$/;
      expect(state).toMatch(base64UrlPattern);
    });

    it('should generate different states each time (random)', () => {
      const state1 = oauthService.generateState();
      const state2 = oauthService.generateState();
      const state3 = oauthService.generateState();

      // All different
      expect(state1).not.toBe(state2);
      expect(state2).not.toBe(state3);
      expect(state1).not.toBe(state3);
    });

    it('should generate high-entropy states (sufficient randomness)', () => {
      const states = new Set();

      // Generate 100 states - should all be unique
      for (let i = 0; i < 100; i++) {
        states.add(oauthService.generateState());
      }

      expect(states.size).toBe(100);
    });

    it('should generate sufficiently long states (>=32 chars recommended)', () => {
      const state = oauthService.generateState();

      // Minimum 32 characters for CSRF protection
      // (256 bits entropy = 32 bytes base64url-encoded = ~43 chars)
      expect(state.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('validateState', () => {
    it('should validate matching state from OAuth session', async () => {
      const state = oauthService.generateState();

      // Store state in OAuth session (simulated)
      await oauthService.storeOAuthSession({
        state,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // Validate state from callback
      const isValid = await oauthService.validateState(state);
      expect(isValid).toBe(true);
    });

    it('should reject non-matching state (CSRF attack)', async () => {
      const validState = oauthService.generateState();
      const attackerState = oauthService.generateState();

      // Store valid state
      await oauthService.storeOAuthSession({
        state: validState,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // Attacker tries to use different state
      const isValid = await oauthService.validateState(attackerState);
      expect(isValid).toBe(false);
    });

    it('should reject expired state (10 minute TTL)', async () => {
      const state = oauthService.generateState();

      // Store state with past expiration (11 minutes ago)
      const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
      await oauthService.storeOAuthSession({
        state,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
        expiresAt: elevenMinutesAgo,
      });

      // Validate expired state
      const isValid = await oauthService.validateState(state);
      expect(isValid).toBe(false);
    });

    it('should accept valid state within TTL (9 minutes)', async () => {
      const state = oauthService.generateState();

      // Store state with future expiration (9 minutes from now)
      const nineMinutesFromNow = Date.now() + 9 * 60 * 1000;
      await oauthService.storeOAuthSession({
        state,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
        expiresAt: nineMinutesFromNow,
      });

      // Validate state
      const isValid = await oauthService.validateState(state);
      expect(isValid).toBe(true);
    });

    it('should reject empty state', async () => {
      const isValid = await oauthService.validateState('');
      expect(isValid).toBe(false);
    });

    it('should reject null/undefined state', async () => {
      const isValid1 = await oauthService.validateState(null as any);
      const isValid2 = await oauthService.validateState(undefined as any);

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);
    });

    it('should handle state not found in database', async () => {
      const nonExistentState = 'non-existent-state-12345';

      const isValid = await oauthService.validateState(nonExistentState);
      expect(isValid).toBe(false);
    });
  });

  describe('CSRF protection workflow', () => {
    it('should complete full OAuth state lifecycle', async () => {
      // Step 1: Generate state for authorization URL
      const state = oauthService.generateState();
      expect(state).toBeTruthy();

      // Step 2: Store state in OAuth session (before redirect)
      await oauthService.storeOAuthSession({
        state,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // Step 3: User redirected to provider, then back to callback
      // Provider returns state parameter

      // Step 4: Validate state from callback
      const isValid = await oauthService.validateState(state);
      expect(isValid).toBe(true);

      // Step 5: Retrieve OAuth session by state
      const session = await oauthService.getOAuthSessionByState(state);
      expect(session).toBeTruthy();
      expect(session!.state).toBe(state);
      expect(session!.codeVerifier).toBe('test-verifier');
    });

    it('should prevent CSRF attack with forged state', async () => {
      // Legitimate user initiates OAuth flow
      const legitimateState = oauthService.generateState();
      await oauthService.storeOAuthSession({
        state: legitimateState,
        codeVerifier: 'legitimate-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // Attacker tries to forge callback with different state
      const attackerState = oauthService.generateState();

      // Validation fails - CSRF protection works
      const isValid = await oauthService.validateState(attackerState);
      expect(isValid).toBe(false);

      // Attempt to retrieve session with attacker state fails
      const session = await oauthService.getOAuthSessionByState(attackerState);
      expect(session).toBeNull();
    });

    it('should cleanup expired OAuth sessions (prevent database bloat)', async () => {
      const state1 = oauthService.generateState();
      const state2 = oauthService.generateState();

      // Store expired session (12 minutes ago)
      const twelveMinutesAgo = Date.now() - 12 * 60 * 1000;
      await oauthService.storeOAuthSession({
        state: state1,
        codeVerifier: 'expired-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
        expiresAt: twelveMinutesAgo,
      });

      // Store valid session (5 minutes from now)
      const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
      await oauthService.storeOAuthSession({
        state: state2,
        codeVerifier: 'valid-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
        expiresAt: fiveMinutesFromNow,
      });

      // Cleanup expired sessions
      await oauthService.cleanupExpiredOAuthSessions();

      // Expired session should be deleted
      const expiredSession = await oauthService.getOAuthSessionByState(state1);
      expect(expiredSession).toBeNull();

      // Valid session should still exist
      const validSession = await oauthService.getOAuthSessionByState(state2);
      expect(validSession).toBeTruthy();
      expect(validSession!.state).toBe(state2);
    });
  });

  describe('OAuth session storage', () => {
    it('should store OAuth session with all required fields', async () => {
      const state = oauthService.generateState();
      const codeVerifier = 'test-code-verifier-1234567890';

      await oauthService.storeOAuthSession({
        state,
        codeVerifier,
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      const session = await oauthService.getOAuthSessionByState(state);
      expect(session).toBeTruthy();
      expect(session!.state).toBe(state);
      expect(session!.codeVerifier).toBe(codeVerifier);
      expect(session!.provider).toBe('anthropic');
      expect(session!.scope).toBe('global');
      expect(session!.campaignId).toBeNull();
      expect(session!.createdAt).toBeLessThanOrEqual(Date.now());
      expect(session!.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should store campaign-scoped OAuth session', async () => {
      const state = oauthService.generateState();
      const campaignId = 'campaign-123';

      await oauthService.storeOAuthSession({
        state,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'campaign',
        campaignId,
      });

      const session = await oauthService.getOAuthSessionByState(state);
      expect(session).toBeTruthy();
      expect(session!.scope).toBe('campaign');
      expect(session!.campaignId).toBe(campaignId);
    });

    it('should default to 10 minute expiration if not specified', async () => {
      const state = oauthService.generateState();

      const beforeStore = Date.now();
      await oauthService.storeOAuthSession({
        state,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });
      const afterStore = Date.now();

      const session = await oauthService.getOAuthSessionByState(state);
      expect(session).toBeTruthy();

      // Expiration should be ~10 minutes from now
      const tenMinutesFromBefore = beforeStore + 10 * 60 * 1000;
      const tenMinutesFromAfter = afterStore + 10 * 60 * 1000;

      expect(session!.expiresAt).toBeGreaterThanOrEqual(tenMinutesFromBefore);
      expect(session!.expiresAt).toBeLessThanOrEqual(tenMinutesFromAfter);
    });

    it('should delete OAuth session after successful token exchange', async () => {
      const state = oauthService.generateState();

      await oauthService.storeOAuthSession({
        state,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // Session exists
      const sessionBefore = await oauthService.getOAuthSessionByState(state);
      expect(sessionBefore).toBeTruthy();

      // Delete session (simulates successful token exchange)
      await oauthService.deleteOAuthSession(state);

      // Session deleted
      const sessionAfter = await oauthService.getOAuthSessionByState(state);
      expect(sessionAfter).toBeNull();
    });
  });

  describe('security properties', () => {
    it('should use timing-safe comparison for state validation', async () => {
      // This is a conceptual test - timing-safe comparison prevents
      // timing attacks where attacker measures response time to guess state

      const validState = oauthService.generateState();
      await oauthService.storeOAuthSession({
        state: validState,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // Different state (same length)
      const invalidState = validState.slice(0, -1) + 'X';

      // Both should take similar time (timing-safe comparison)
      const start1 = Date.now();
      await oauthService.validateState(validState);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await oauthService.validateState(invalidState);
      const time2 = Date.now() - start2;

      // Times should be similar (within 10ms variance is acceptable)
      // Note: This is a weak test, just ensures no obvious timing leak
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });

    it('should prevent state reuse (one-time use)', async () => {
      const state = oauthService.generateState();

      await oauthService.storeOAuthSession({
        state,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
      });

      // First use - valid
      const isValid1 = await oauthService.validateState(state);
      expect(isValid1).toBe(true);

      // Delete session after first use
      await oauthService.deleteOAuthSession(state);

      // Second use - invalid (state already consumed)
      const isValid2 = await oauthService.validateState(state);
      expect(isValid2).toBe(false);
    });

    it('should not leak information about state existence in error messages', async () => {
      const nonExistentState = 'non-existent-state';
      const expiredState = oauthService.generateState();

      // Store expired state
      const pastExpiration = Date.now() - 60 * 1000;
      await oauthService.storeOAuthSession({
        state: expiredState,
        codeVerifier: 'test-verifier',
        provider: 'anthropic',
        scope: 'global',
        campaignId: null,
        expiresAt: pastExpiration,
      });

      // Both should return false without distinguishing reason
      const isValid1 = await oauthService.validateState(nonExistentState);
      const isValid2 = await oauthService.validateState(expiredState);

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);

      // Should not throw different errors or provide distinguishing info
    });
  });
});
