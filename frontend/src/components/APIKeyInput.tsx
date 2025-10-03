/**
 * APIKeyInput Component
 * Feature: 008-create-byollm-configuration
 * Task: T051
 *
 * Secure API key input with masking and validation
 */

import React, { useState } from 'react';

interface APIKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  provider: 'anthropic' | 'openai' | 'custom';
}

export function APIKeyInput({ value, onChange, provider }: APIKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (newValue: string) => {
    onChange(newValue);

    // Validate API key format
    if (newValue.length > 0) {
      if (provider === 'anthropic' && !newValue.startsWith('sk-ant-api03-')) {
        setValidationError('Anthropic API keys start with sk-ant-api03-');
      } else if (provider === 'openai' && !newValue.startsWith('sk-')) {
        setValidationError('OpenAI API keys start with sk-');
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  };

  const placeholder = provider === 'anthropic'
    ? 'sk-ant-api03-...'
    : provider === 'openai'
    ? 'sk-...'
    : 'Enter API key';

  return (
    <div className="api-key-input-container">
      <label className="form-label">
        API Key
      </label>

      <div className="input-wrapper">
        <input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className={`api-key-input ${validationError ? 'error' : ''}`}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="toggle-visibility"
          tabIndex={-1}
        >
          {showKey ? '🙈' : '👁️'}
        </button>
      </div>

      {validationError && (
        <div className="validation-error">
          {validationError}
        </div>
      )}

      <div className="api-key-info">
        <p className="info-text">
          🔒 Your API key is encrypted before storage and never transmitted to our servers.
        </p>
        <p className="info-text">
          Get your API key from:
        </p>
        <ul className="info-links">
          {provider === 'anthropic' && (
            <li>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                Anthropic Console → API Keys
              </a>
            </li>
          )}
          {provider === 'openai' && (
            <li>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenAI Platform → API Keys
              </a>
            </li>
          )}
        </ul>
      </div>

      <style>{`
        .api-key-input-container {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .input-wrapper {
          position: relative;
          display: flex;
        }

        .api-key-input {
          flex: 1;
          padding: 0.75rem 3rem 0.75rem 1rem;
          border: 2px solid #D1D5DB;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-family: 'Monaco', 'Courier New', monospace;
          transition: border-color 0.15s;
        }

        .api-key-input:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .api-key-input.error {
          border-color: #EF4444;
        }

        .toggle-visibility {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.25rem;
          opacity: 0.6;
          transition: opacity 0.15s;
        }

        .toggle-visibility:hover {
          opacity: 1;
        }

        .validation-error {
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #FEE2E2;
          color: #DC2626;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          border: 1px solid #FCA5A5;
        }

        .api-key-info {
          margin-top: 0.75rem;
          padding: 1rem;
          background: #F9FAFB;
          border-radius: 0.375rem;
          border: 1px solid #E5E7EB;
        }

        .info-text {
          margin: 0 0 0.5rem 0;
          font-size: 0.75rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .info-text:last-child {
          margin-bottom: 0;
        }

        .info-links {
          margin: 0.5rem 0 0 1.25rem;
          padding: 0;
          list-style: none;
        }

        .info-links li {
          margin-bottom: 0.25rem;
        }

        .info-links li::before {
          content: '→';
          margin-right: 0.5rem;
          color: #3B82F6;
        }

        .info-links a {
          font-size: 0.75rem;
          color: #3B82F6;
          text-decoration: none;
          font-weight: 500;
        }

        .info-links a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
