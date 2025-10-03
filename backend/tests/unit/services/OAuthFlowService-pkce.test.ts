/**
 * OAuthFlowService PKCE Unit Tests
 * Feature: 008-create-byollm-configuration
 * Task: T016
 *
 * Tests PKCE (Proof Key for Code Exchange) code verifier and challenge generation
 * PKCE protects OAuth flows from authorization code interception attacks
 *
 * IMPORTANT: This test MUST FAIL until OAuthFlowService is implemented (TDD)
 */

import { describe, it, expect } from 'vitest';
import { OAuthFlowService } from '../../../src/services/OAuthFlowService';
import crypto from 'crypto';

describe('OAuthFlowService - PKCE Code Verifier and Challenge', () => {
  let oauthService: OAuthFlowService;

  beforeAll(() => {
    oauthService = new OAuthFlowService();
  });

  describe('generateCodeVerifier', () => {
    it('should generate code verifier with correct length (43-128 characters)', () => {
      const verifier = oauthService.generateCodeVerifier();

      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    it('should use URL-safe characters only (unreserved characters)', () => {
      const verifier = oauthService.generateCodeVerifier();

      // RFC 7636: code_verifier = 43*128(unreserved)
      // unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
      const urlSafePattern = /^[A-Za-z0-9\-._~]+$/;
      expect(verifier).toMatch(urlSafePattern);
    });

    it('should generate different verifiers each time (random)', () => {
      const verifier1 = oauthService.generateCodeVerifier();
      const verifier2 = oauthService.generateCodeVerifier();
      const verifier3 = oauthService.generateCodeVerifier();

      expect(verifier1).not.toBe(verifier2);
      expect(verifier2).not.toBe(verifier3);
      expect(verifier1).not.toBe(verifier3);
    });

    it('should generate high-entropy verifiers (sufficient randomness)', () => {
      const verifiers = new Set();

      // Generate 100 verifiers - should all be unique
      for (let i = 0; i < 100; i++) {
        verifiers.add(oauthService.generateCodeVerifier());
      }

      expect(verifiers.size).toBe(100);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate S256 challenge (SHA-256 hash)', () => {
      const verifier = 'test-code-verifier-1234567890abcdefghijklmnop';
      const challenge = oauthService.generateCodeChallenge(verifier);

      // Manually compute SHA-256 and base64url encode
      const hash = crypto.createHash('sha256').update(verifier).digest();
      const expectedChallenge = hash
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      expect(challenge).toBe(expectedChallenge);
    });

    it('should produce base64url-encoded challenge (URL-safe)', () => {
      const verifier = 'another-verifier-test-9876543210';
      const challenge = oauthService.generateCodeChallenge(verifier);

      // Should not contain +, /, or = (base64url requirements)
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
      expect(challenge).not.toContain('=');

      // Should only contain URL-safe base64 characters
      const base64UrlPattern = /^[A-Za-z0-9\-_]+$/;
      expect(challenge).toMatch(base64UrlPattern);
    });

    it('should produce same challenge for same verifier (deterministic)', () => {
      const verifier = 'deterministic-verifier-test-abc123';

      const challenge1 = oauthService.generateCodeChallenge(verifier);
      const challenge2 = oauthService.generateCodeChallenge(verifier);
      const challenge3 = oauthService.generateCodeChallenge(verifier);

      expect(challenge1).toBe(challenge2);
      expect(challenge2).toBe(challenge3);
    });

    it('should produce different challenges for different verifiers', () => {
      const verifier1 = 'verifier-one-12345';
      const verifier2 = 'verifier-two-67890';

      const challenge1 = oauthService.generateCodeChallenge(verifier1);
      const challenge2 = oauthService.generateCodeChallenge(verifier2);

      expect(challenge1).not.toBe(challenge2);
    });

    it('should handle edge case: empty verifier', () => {
      const verifier = '';
      const challenge = oauthService.generateCodeChallenge(verifier);

      // Should still produce valid base64url-encoded SHA-256 hash
      expect(challenge).toBeTruthy();
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it('should handle edge case: very long verifier (128 chars)', () => {
      const verifier = 'a'.repeat(128); // Maximum length
      const challenge = oauthService.generateCodeChallenge(verifier);

      expect(challenge).toBeTruthy();
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
  });

  describe('PKCE flow integration', () => {
    it('should generate verifier and challenge pair for OAuth flow', () => {
      const verifier = oauthService.generateCodeVerifier();
      const challenge = oauthService.generateCodeChallenge(verifier);

      // Verifier should be stored in session/database
      expect(verifier.length).toBeGreaterThanOrEqual(43);

      // Challenge should be sent to authorization endpoint
      expect(challenge).toBeTruthy();
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);

      // Challenge should be different from verifier
      expect(challenge).not.toBe(verifier);
    });

    it('should verify that verifier matches challenge (conceptual test)', () => {
      const verifier = oauthService.generateCodeVerifier();
      const challenge = oauthService.generateCodeChallenge(verifier);

      // In actual OAuth flow:
      // 1. Client generates verifier and challenge
      // 2. Client sends challenge to authorization server
      // 3. Client stores verifier in session
      // 4. After redirect, client sends verifier to token endpoint
      // 5. Authorization server computes challenge from verifier and compares

      // Simulate server-side verification
      const recomputedChallenge = oauthService.generateCodeChallenge(verifier);
      expect(recomputedChallenge).toBe(challenge);
    });

    it('should detect tampered verifier (PKCE protection)', () => {
      const originalVerifier = oauthService.generateCodeVerifier();
      const challenge = oauthService.generateCodeChallenge(originalVerifier);

      // Attacker tries to use different verifier
      const tamperedVerifier = originalVerifier + 'X';
      const tamperedChallenge = oauthService.generateCodeChallenge(tamperedVerifier);

      // Challenges don't match - PKCE protection works
      expect(tamperedChallenge).not.toBe(challenge);
    });
  });

  describe('RFC 7636 compliance', () => {
    it('should follow RFC 7636 section 4.1 (code_verifier)', () => {
      const verifier = oauthService.generateCodeVerifier();

      // RFC 7636 4.1: code_verifier = 43*128unreserved
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });

    it('should follow RFC 7636 section 4.2 (code_challenge method S256)', () => {
      const verifier = 'test-rfc-7636-compliance';
      const challenge = oauthService.generateCodeChallenge(verifier);

      // RFC 7636 4.2: code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))
      const hash = crypto.createHash('sha256').update(verifier, 'ascii').digest();
      const expectedChallenge = Buffer.from(hash)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      expect(challenge).toBe(expectedChallenge);
    });
  });

  describe('security properties', () => {
    it('should provide sufficient entropy (prevents brute force)', () => {
      const verifier = oauthService.generateCodeVerifier();

      // Minimum 43 characters = 43 bytes * 8 bits/byte = 344 bits entropy
      // (Actually base64url encoding reduces this, but still >256 bits)
      // This makes brute force infeasible
      expect(verifier.length).toBeGreaterThanOrEqual(43);
    });

    it('should not allow verifier to be derived from challenge (one-way)', () => {
      const verifier = oauthService.generateCodeVerifier();
      const challenge = oauthService.generateCodeChallenge(verifier);

      // SHA-256 is one-way hash function
      // Cannot derive verifier from challenge alone
      // (This is inherent to SHA-256, just a conceptual test)
      expect(challenge.length).not.toBe(verifier.length); // Different lengths
      expect(challenge).not.toBe(verifier); // Different values
    });

    it('should protect against authorization code interception attacks', () => {
      // PKCE prevents attacks where authorization code is intercepted
      // Attacker needs BOTH code AND verifier to exchange for token

      const verifier = oauthService.generateCodeVerifier();
      const challenge = oauthService.generateCodeChallenge(verifier);

      // Scenario: Attacker intercepts authorization code but not verifier
      // Attacker tries to guess verifier (infeasible due to entropy)
      const attackerGuess = 'attacker-guessed-verifier';
      const attackerChallenge = oauthService.generateCodeChallenge(attackerGuess);

      // Attack fails - challenges don't match
      expect(attackerChallenge).not.toBe(challenge);
    });
  });
});
