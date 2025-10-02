/**
 * Public URL ID generation utility
 * Based on: specs/002-create-the-authentication/research.md section 7
 *
 * Generates cryptographically secure random IDs for public campaign URLs
 * Format: 16 characters, base64url encoding (URL-safe)
 */

import crypto from 'crypto';

/**
 * Generates cryptographically secure random ID for public campaign URLs
 * @returns 16-character base64url string (96 bits of entropy)
 * @example "a8f3D92k4p1mN7qR"
 */
export function generatePublicId(): string {
  // Generate 12 random bytes (96 bits of entropy)
  const buffer = crypto.randomBytes(12);

  // Convert to base64url (URL-safe: no +, /, =)
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Validates public ID format
 * @param id - Public ID string to validate
 * @returns true if valid format, false otherwise
 */
export function isValidPublicId(id: string): boolean {
  return /^[A-Za-z0-9_-]{16}$/.test(id);
}
