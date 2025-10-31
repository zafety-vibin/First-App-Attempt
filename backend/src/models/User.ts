/**
 * User model - Represents a Game Master account synchronized from Keycloak
 * Based on: specs/002-create-the-authentication/data-model.md
 */

import { User, UserRow } from '../shared/types/User';

/**
 * Transform database row to User entity
 */
export function rowToUser(row: UserRow): User {
  return {
    id: row.user_id,
    username: row.username,
    email: row.email,
    createdAt: new Date(row.created_at * 1000),
    byollmConfig: row.byollm_config ? JSON.parse(row.byollm_config) : undefined,
  };
}

/**
 * Transform User entity to database row
 */
export function userToRow(user: Partial<User> & { id: string }): Partial<UserRow> {
  return {
    user_id: user.id,
    username: user.username,
    email: user.email,
    created_at: user.createdAt ? Math.floor(user.createdAt.getTime() / 1000) : undefined,
    byollm_config: user.byollmConfig ? JSON.stringify(user.byollmConfig) : null,
  };
}
