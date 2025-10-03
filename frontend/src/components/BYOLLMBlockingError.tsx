/**
 * BYOLLMBlockingError Component
 * Feature: 008-create-byollm-configuration
 * Task: T056
 *
 * Blocking error displayed when Import AI or Planning AI accessed without BYOLLM config
 * Guides user to Settings to configure their LLM credentials
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BYOLLMBlockingErrorProps {
  campaignId: string;
  feature: 'Import AI' | 'Planning AI';
}

export function BYOLLMBlockingError({ campaignId, feature }: BYOLLMBlockingErrorProps) {
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    navigate(`/campaigns/${campaignId}/settings`);
  };

  return (
    <div className="blocking-error-container">
      <div className="blocking-error">
        <div className="error-icon">🔒</div>

        <h2 className="error-title">AI Configuration Required</h2>

        <p className="error-message">
          {feature} requires your own LLM credentials to function.
          Configure your AI provider in Settings to continue.
        </p>

        <div className="error-details">
          <h3>Why do I need to configure this?</h3>
          <p>
            Wrldbldr MCP Manager follows a <strong>BYOLLM (Bring Your Own LLM)</strong> model.
            This means:
          </p>
          <ul>
            <li>
              <strong>Your credentials, your control:</strong> Your API keys and OAuth tokens
              are stored locally and encrypted
            </li>
            <li>
              <strong>No surprise costs:</strong> You pay your LLM provider directly,
              with full visibility into usage
            </li>
            <li>
              <strong>Privacy first:</strong> Your credentials never leave your machine
              or touch our servers
            </li>
          </ul>
        </div>

        <div className="supported-providers">
          <h3>Supported Providers</h3>
          <div className="provider-grid">
            <div className="provider-card">
              <div className="provider-icon">🤖</div>
              <div className="provider-name">Anthropic Claude</div>
              <div className="provider-description">
                OAuth or API Key
              </div>
            </div>

            <div className="provider-card">
              <div className="provider-icon">⚙️</div>
              <div className="provider-name">Custom Endpoint</div>
              <div className="provider-description">
                Ollama, LM Studio, etc.
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleGoToSettings} className="settings-button">
          Go to Settings
        </button>
      </div>

      <style>{`
        .blocking-error-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          padding: 2rem;
        }

        .blocking-error {
          max-width: 600px;
          padding: 3rem;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
        }

        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .error-title {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .error-message {
          margin: 0 0 2rem 0;
          font-size: 1rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .error-details {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #F9FAFB;
          border-radius: 0.5rem;
          text-align: left;
        }

        .error-details h3 {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .error-details p {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .error-details ul {
          margin: 0;
          padding-left: 1.5rem;
          font-size: 0.875rem;
          color: #6B7280;
          line-height: 1.75;
        }

        .error-details li {
          margin-bottom: 0.5rem;
        }

        .error-details strong {
          color: #111827;
          font-weight: 600;
        }

        .supported-providers {
          margin-bottom: 2rem;
          text-align: left;
        }

        .supported-providers h3 {
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
          text-align: center;
        }

        .provider-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .provider-card {
          padding: 1rem;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 0.5rem;
          text-align: center;
        }

        .provider-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .provider-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        .provider-description {
          font-size: 0.75rem;
          color: #6B7280;
        }

        .settings-button {
          width: 100%;
          padding: 1rem 2rem;
          background: #3B82F6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .settings-button:hover {
          background: #2563EB;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
}
