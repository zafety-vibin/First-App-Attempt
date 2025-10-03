/**
 * EncryptionService Unit Tests
 * Feature: 008-create-byollm-configuration
 * Task: T015
 *
 * Tests AES-256-GCM encryption/decryption with PBKDF2 key derivation
 *
 * IMPORTANT: This test MUST FAIL until EncryptionService is implemented (TDD)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { EncryptionService } from '../../../src/services/EncryptionService';

describe('EncryptionService - AES-256-GCM Encryption', () => {
  let encryptionService: EncryptionService;
  const testPassphrase = 'test-passphrase-for-encryption';

  beforeAll(() => {
    encryptionService = new EncryptionService(testPassphrase);
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt OAuth credentials', () => {
      const oauthCredentials = {
        accessToken: 'sk-ant-api03-test-access-token-1234567890',
        refreshToken: 'refresh-token-abcdefghijklmnop',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };

      const plaintext = JSON.stringify(oauthCredentials);

      // Encrypt
      const encrypted = encryptionService.encrypt(plaintext);

      // Format check: salt:iv:authTag:encrypted (base64-encoded components)
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).not.toContain('sk-ant-api03'); // Should not contain plaintext

      // Decrypt
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);

      // Verify decrypted content
      const decryptedCreds = JSON.parse(decrypted);
      expect(decryptedCreds.accessToken).toBe(oauthCredentials.accessToken);
      expect(decryptedCreds.refreshToken).toBe(oauthCredentials.refreshToken);
      expect(decryptedCreds.expiresAt).toBe(oauthCredentials.expiresAt);
    });

    it('should encrypt and decrypt API key credentials', () => {
      const apiKeyCredentials = {
        apiKey: 'sk-ant-api03-test-api-key-very-long-secret-1234567890abcdefghijklmnop',
      };

      const plaintext = JSON.stringify(apiKeyCredentials);

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);

      const decryptedCreds = JSON.parse(decrypted);
      expect(decryptedCreds.apiKey).toBe(apiKeyCredentials.apiKey);
    });

    it('should produce different ciphertexts for same plaintext (random salt + IV)', () => {
      const plaintext = 'same-plaintext-different-encryption';

      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      // Different ciphertexts (due to random salt and IV)
      expect(encrypted1).not.toBe(encrypted2);

      // But both decrypt to same plaintext
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle very long strings (OAuth token ~500 chars)', () => {
      const longToken = 'sk-ant-api03-' + 'a'.repeat(500);

      const encrypted = encryptionService.encrypt(longToken);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(longToken);
    });
  });

  describe('encryption format validation', () => {
    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'original-text';
      const encrypted = encryptionService.encrypt(plaintext);

      // Tamper with encrypted data
      const [salt, iv, authTag, ciphertext] = encrypted.split(':');
      const tamperedEncrypted = `${salt}:${iv}:${authTag}:${ciphertext}X`; // Add character

      expect(() => {
        encryptionService.decrypt(tamperedEncrypted);
      }).toThrow();
    });

    it('should throw error for invalid format (missing components)', () => {
      const invalidEncrypted = 'invalid:format'; // Missing components

      expect(() => {
        encryptionService.decrypt(invalidEncrypted);
      }).toThrow();
    });

    it('should throw error for wrong passphrase', () => {
      const correctService = new EncryptionService('correct-passphrase');
      const wrongService = new EncryptionService('wrong-passphrase');

      const plaintext = 'secret-data';
      const encrypted = correctService.encrypt(plaintext);

      expect(() => {
        wrongService.decrypt(encrypted);
      }).toThrow();
    });
  });

  describe('PBKDF2 key derivation', () => {
    it('should use salt for key derivation (different keys for same passphrase)', () => {
      const plaintext = 'test-data';

      // Encrypt twice - should use different salts
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      const salt1 = encrypted1.split(':')[0];
      const salt2 = encrypted2.split(':')[0];

      // Different salts
      expect(salt1).not.toBe(salt2);

      // Both decrypt correctly
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should derive 32-byte key (AES-256 requirement)', () => {
      // This is tested implicitly - if key derivation fails, encrypt/decrypt would throw
      // AES-256-GCM requires exactly 32-byte (256-bit) key
      const plaintext = 'test-aes-256';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('security properties', () => {
    it('should use 16-byte IV (AES block size)', () => {
      const plaintext = 'test-iv-size';
      const encrypted = encryptionService.encrypt(plaintext);

      const [, ivBase64] = encrypted.split(':');
      const ivBuffer = Buffer.from(ivBase64, 'base64');

      expect(ivBuffer.length).toBe(16); // 128 bits
    });

    it('should use 16-byte auth tag (GCM authentication)', () => {
      const plaintext = 'test-auth-tag';
      const encrypted = encryptionService.encrypt(plaintext);

      const [, , authTagBase64] = encrypted.split(':');
      const authTagBuffer = Buffer.from(authTagBase64, 'base64');

      expect(authTagBuffer.length).toBe(16); // 128 bits
    });

    it('should not leak plaintext in encrypted output', () => {
      const sensitiveData = 'sk-ant-api03-super-secret-key-1234567890';
      const encrypted = encryptionService.encrypt(sensitiveData);

      // Encrypted should not contain any substring of plaintext
      expect(encrypted).not.toContain('sk-ant');
      expect(encrypted).not.toContain('super-secret');
      expect(encrypted).not.toContain('1234567890');
    });
  });

  describe('performance', () => {
    it('should encrypt/decrypt within reasonable time (<100ms)', () => {
      const plaintext = 'performance-test-data';

      const startEncrypt = Date.now();
      const encrypted = encryptionService.encrypt(plaintext);
      const encryptTime = Date.now() - startEncrypt;

      const startDecrypt = Date.now();
      const decrypted = encryptionService.decrypt(encrypted);
      const decryptTime = Date.now() - startDecrypt;

      expect(encryptTime).toBeLessThan(100);
      expect(decryptTime).toBeLessThan(100);
      expect(decrypted).toBe(plaintext);
    });
  });
});
