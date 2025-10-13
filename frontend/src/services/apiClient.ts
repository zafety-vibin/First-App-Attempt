/**
 * API Client - Axios instance with token injection
 * Based on: specs/002-create-the-authentication/research.md section 4
 */

import axios from 'axios';

export const apiClient = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token will be injected by AuthContext
let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

// View mode storage helper (Feature 015)
export function getViewMode(campaignId: string): 'dm_view' | 'player_view' {
  const storageKey = `viewMode_${campaignId}`;
  const stored = localStorage.getItem(storageKey);
  return (stored === 'player_view') ? 'player_view' : 'dm_view';
}

export function setViewMode(campaignId: string, mode: 'dm_view' | 'player_view'): void {
  const storageKey = `viewMode_${campaignId}`;
  localStorage.setItem(storageKey, mode);
}

// Request interceptor - inject token and X-View-Mode header
apiClient.interceptors.request.use(
  (config) => {
    // Inject auth token (Feature 002)
    if (currentToken) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }

    // Inject X-View-Mode header (Feature 015)
    // Extract campaignId from URL path (/campaigns/:campaignId/...) or query params (campaign_id=...)
    let campaignId: string | null = null;

    // Try path param first: /campaigns/:campaignId/...
    const pathMatch = config.url?.match(/\/campaigns\/([a-f0-9-]+)/);
    if (pathMatch && pathMatch[1]) {
      campaignId = pathMatch[1];
    } else {
      // Fallback to query param: ?campaign_id=...
      const queryMatch = config.url?.match(/campaign_id=([^&]+)/);
      if (queryMatch && queryMatch[1]) {
        campaignId = queryMatch[1];
      }
    }

    if (campaignId) {
      const viewMode = getViewMode(campaignId);
      // Backend expects 'dm' or 'player', but we store 'dm_view' or 'player_view'
      // Strip the '_view' suffix before sending to backend
      const backendViewMode = viewMode.replace('_view', '');
      config.headers['X-View-Mode'] = backendViewMode;
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
