/**
 * Test Authentication Helper
 * Creates valid test sessions for contract tests
 */

import { AuthService } from '../../src/services/AuthService';
import { db } from '../../src/services/DatabaseService';

export interface TestUser {
  id: string;
  username: string;
  email: string;
  token: string;
}

/**
 * Create a test user and session for use in contract tests
 */
export function createTestUser(): TestUser {
  const testUserId = 'test-user';
  const testUsername = 'testuser';
  const testEmail = 'test@example.com';

  // Insert user if not exists
  db.prepare(
    `INSERT OR IGNORE INTO users (user_id, username, email, created_at)
     VALUES (?, ?, ?, strftime('%s', 'now'))`
  ).run(testUserId, testUsername, testEmail);

  // Create a session with a test token (expires in 1 hour)
  const testToken = `test-token-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const session = AuthService.createSession(testUserId, testToken, 3600);

  return {
    id: testUserId,
    username: testUsername,
    email: testEmail,
    token: testToken,
  };
}

/**
 * Clean up test user sessions
 */
export function cleanupTestUser(userId: string): void {
  try {
    // Delete all sessions for test user
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Get Authorization header with test token
 */
export function getAuthHeader(token: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${token}`,
  };
}
