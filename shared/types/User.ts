/**
 * User entity - Represents a Game Master account synchronized from Keycloak
 */
export interface User {
  id: string; // user_id (Keycloak sub claim)
  username: string;
  email: string;
  createdAt: Date;
  byollmConfig?: {
    provider: 'openai' | 'anthropic' | 'custom';
    apiKey: string; // Encrypted
    creditsRemaining?: number;
  };
}

/**
 * Database row representation (before transformation)
 */
export interface UserRow {
  user_id: string;
  username: string;
  email: string;
  created_at: number; // Unix timestamp
  byollm_config: string | null; // JSON string
}
