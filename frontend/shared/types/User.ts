/**
 * User Types
 * Feature: 002-create-the-authentication
 */

export interface User {
  id: string; // Keycloak sub
  username: string;
  email: string;
  created_at: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}
