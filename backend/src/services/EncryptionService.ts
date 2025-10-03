/**
 * EncryptionService
 * Feature: 008-create-byollm-configuration
 * Tasks: T024-T025
 *
 * Provides AES-256-GCM encryption/decryption with PBKDF2 key derivation
 * Used to encrypt OAuth tokens and API keys before storing in database
 *
 * Security:
 * - AES-256-GCM: Authenticated encryption (confidentiality + integrity)
 * - PBKDF2: Key derivation from passphrase (100,000 iterations, SHA-256)
 * - Random salt per encryption (prevents rainbow table attacks)
 * - Random IV per encryption (prevents pattern analysis)
 * - 128-bit auth tag (prevents tampering)
 *
 * Format: salt:iv:authTag:encrypted (base64-encoded components)
 */

import crypto from 'crypto';

export class EncryptionService {
  private readonly passphrase: string;

  // AES-256-GCM constants
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly SALT_LENGTH = 16; // 128 bits
  private readonly IV_LENGTH = 16; // 128 bits (AES block size)
  private readonly AUTH_TAG_LENGTH = 16; // 128 bits

  // PBKDF2 constants
  private readonly PBKDF2_ITERATIONS = 100000;
  private readonly PBKDF2_DIGEST = 'sha256';

  constructor(passphrase: string) {
    if (!passphrase || passphrase.length === 0) {
      throw new Error('Encryption passphrase required');
    }
    this.passphrase = passphrase;
  }

  /**
   * Encrypts plaintext using AES-256-GCM with random salt and IV
   * @param plaintext - The text to encrypt (e.g., JSON-stringified credentials)
   * @returns Encrypted string in format: salt:iv:authTag:encrypted (base64)
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random salt for key derivation
      const salt = crypto.randomBytes(this.SALT_LENGTH);

      // Derive 256-bit key from passphrase using PBKDF2
      const key = crypto.pbkdf2Sync(
        this.passphrase,
        salt,
        this.PBKDF2_ITERATIONS,
        this.KEY_LENGTH,
        this.PBKDF2_DIGEST
      );

      // Generate random IV (initialization vector)
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      // Encrypt plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get auth tag (GCM authentication)
      const authTag = cipher.getAuthTag();

      // Return format: salt:iv:authTag:encrypted (all base64-encoded)
      return [
        salt.toString('base64'),
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted,
      ].join(':');
    } catch (error) {
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Decrypts encrypted string using AES-256-GCM
   * @param encrypted - Encrypted string in format: salt:iv:authTag:encrypted
   * @returns Decrypted plaintext
   * @throws Error if decryption fails (wrong passphrase, tampering, invalid format)
   */
  decrypt(encrypted: string): string {
    try {
      // Parse encrypted format
      const parts = encrypted.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted format (expected salt:iv:authTag:encrypted)');
      }

      const [saltBase64, ivBase64, authTagBase64, encryptedData] = parts;

      // Decode base64 components
      const salt = Buffer.from(saltBase64, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Validate component lengths
      if (salt.length !== this.SALT_LENGTH) {
        throw new Error(`Invalid salt length (expected ${this.SALT_LENGTH} bytes)`);
      }
      if (iv.length !== this.IV_LENGTH) {
        throw new Error(`Invalid IV length (expected ${this.IV_LENGTH} bytes)`);
      }
      if (authTag.length !== this.AUTH_TAG_LENGTH) {
        throw new Error(`Invalid auth tag length (expected ${this.AUTH_TAG_LENGTH} bytes)`);
      }

      // Derive key from passphrase using same salt
      const key = crypto.pbkdf2Sync(
        this.passphrase,
        salt,
        this.PBKDF2_ITERATIONS,
        this.KEY_LENGTH,
        this.PBKDF2_DIGEST
      );

      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);

      // Set auth tag (GCM authentication)
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Common errors:
      // - Wrong passphrase: "Unsupported state or unable to authenticate data"
      // - Tampered data: "Unsupported state or unable to authenticate data"
      // - Invalid format: caught above

      if ((error as Error).message.includes('Unsupported state')) {
        throw new Error('Decryption failed: wrong passphrase or tampered data');
      }

      throw new Error(`Decryption failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validates encrypted string format without decrypting
   * @param encrypted - Encrypted string to validate
   * @returns true if format is valid, false otherwise
   */
  validateFormat(encrypted: string): boolean {
    try {
      const parts = encrypted.split(':');
      if (parts.length !== 4) {
        return false;
      }

      const [saltBase64, ivBase64, authTagBase64, encryptedData] = parts;

      // Validate base64 encoding
      const salt = Buffer.from(saltBase64, 'base64');
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');

      // Validate lengths
      if (salt.length !== this.SALT_LENGTH) return false;
      if (iv.length !== this.IV_LENGTH) return false;
      if (authTag.length !== this.AUTH_TAG_LENGTH) return false;
      if (!encryptedData) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Re-encrypts data with new passphrase (for passphrase rotation)
   * @param encrypted - Currently encrypted data
   * @param oldPassphrase - Old passphrase to decrypt with
   * @returns Re-encrypted data with current passphrase
   */
  reEncrypt(encrypted: string, oldPassphrase: string): string {
    const oldService = new EncryptionService(oldPassphrase);
    const plaintext = oldService.decrypt(encrypted);
    return this.encrypt(plaintext);
  }
}
