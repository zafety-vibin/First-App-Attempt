/**
 * API Client - Axios instance with token injection
 * Based on: specs/002-create-the-authentication/research.md section 4
 */

import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token will be injected by AuthContext
let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
  console.log('[setAuthToken] Setting token:', token ? `${token.substring(0, 20)}...` : 'null');
  currentToken = token;
}

// Request interceptor - inject token
apiClient.interceptors.request.use(
  (config) => {
    console.log('[apiClient] Request to:', config.url, 'Token:', currentToken ? `${currentToken.substring(0, 20)}...` : 'null');
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid/expired - clear token and reload
      setAuthToken(null);
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
