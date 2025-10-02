/**
 * Auth Service - Simplified authentication (no Keycloak for now)
 */

import { apiClient } from './apiClient';
import { User } from '../../../shared/types/User';

export const authService = {
  /**
   * Login with token (simplified)
   */
  async login(token: string): Promise<{ user: User; sessionId: string }> {
    const response = await apiClient.post('/api/auth/login', { token });
    return response.data;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  /**
   * Validate current session
   */
  async validate(): Promise<{ valid: boolean; user?: User }> {
    try {
      const response = await apiClient.get('/api/auth/validate');
      return response.data;
    } catch (error) {
      return { valid: false };
    }
  },
};
