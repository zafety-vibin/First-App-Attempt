/**
 * OAuthButton Component
 * Feature: 008-create-byollm-configuration
 * Task: T050
 *
 * Initiates OAuth 2.0 + PKCE flow with provider
 */

import React, { useState } from 'react';

interface OAuthButtonProps {
  provider: 'anthropic' | 'openai' | 'custom';
  scope: 'global' | 'campaign';
  campaignId?: string;
  onSuccess?: () => void;
}

export function OAuthButton({ provider, scope, campaignId, onSuccess }: OAuthButtonProps) {
  const [initiating, setInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthLogin = async () => {
    try {
      setInitiating(true);
      setError(null);

      // Initiate OAuth flow
      const response = await fetch('http://localhost:3001/api/byollm/oauth/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          provider,
          scope,
          campaignId: campaignId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate OAuth');
      }

      const data = await response.json();

      // Redirect to authorization URL
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error('OAuth initiate error:', err);
      setError((err as Error).message);
      setInitiating(false);
    }
  };

  return (
    <div className="oauth-button-container">
      <button
        onClick={handleOAuthLogin}
        disabled={initiating}
        className="oauth-button"
      >
        {initiating ? (
          <>
            <span className="spinner">⏳</span>
            Redirecting to {provider}...
          </>
        ) : (
          <>
            <span className="icon">🔐</span>
            Login with {provider === 'anthropic' ? 'Anthropic' : provider}
          </>
        )}
      </button>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <p className="oauth-info">
        You'll be redirected to {provider === 'anthropic' ? 'Anthropic' : provider} to authorize access.
        Your credentials are never stored on our servers.
      </p>

      <style>{`
        .oauth-button-container {
          margin-bottom: 1.5rem;
        }

        .oauth-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 1rem 1.5rem;
          background: #3B82F6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .oauth-button:hover:not(:disabled) {
          background: #2563EB;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
        }

        .oauth-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .icon,
        .spinner {
          font-size: 1.25rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .oauth-info {
          margin-top: 0.75rem;
          font-size: 0.75rem;
          color: #6B7280;
          text-align: center;
          line-height: 1.5;
        }

        .error-message {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: #FEE2E2;
          color: #DC2626;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          border: 1px solid #FCA5A5;
        }
      `}</style>
    </div>
  );
}
