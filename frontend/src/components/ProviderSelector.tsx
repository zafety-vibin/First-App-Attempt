/**
 * ProviderSelector Component
 * Feature: 008-create-byollm-configuration
 * Task: T049
 *
 * Provider selection dropdown (Anthropic, OpenAI, Custom Endpoint)
 */

import React from 'react';

interface ProviderSelectorProps {
  value: 'anthropic' | 'openai' | 'custom';
  onChange: (provider: 'anthropic' | 'openai' | 'custom') => void;
  disabled?: boolean;
}

export function ProviderSelector({ value, onChange, disabled }: ProviderSelectorProps) {
  return (
    <div className="provider-selector">
      <label className="form-label">
        LLM Provider
      </label>
      <div className="provider-options">
        <button
          className={`provider-option ${value === 'anthropic' ? 'selected' : ''}`}
          onClick={() => onChange('anthropic')}
          disabled={disabled}
        >
          <div className="provider-icon">🤖</div>
          <div className="provider-info">
            <div className="provider-name">Anthropic Claude</div>
            <div className="provider-description">Claude 3.5 Sonnet, Opus, Haiku</div>
          </div>
          {value === 'anthropic' && <div className="check-icon">✓</div>}
        </button>

        {/* OpenAI - Commented out for now, focus on Anthropic only */}
        {/* <button
          className={`provider-option ${value === 'openai' ? 'selected' : ''}`}
          onClick={() => onChange('openai')}
          disabled={disabled}
        >
          <div className="provider-icon">🧠</div>
          <div className="provider-info">
            <div className="provider-name">OpenAI</div>
            <div className="provider-description">GPT-4, GPT-3.5</div>
          </div>
          {value === 'openai' && <div className="check-icon">✓</div>}
        </button> */}

        {/* Custom Endpoint - Temporarily hidden, backend not implemented */}
        {/* <button
          className={`provider-option ${value === 'custom' ? 'selected' : ''}`}
          onClick={() => onChange('custom')}
          disabled={disabled}
        >
          <div className="provider-icon">⚙️</div>
          <div className="provider-info">
            <div className="provider-name">Custom Endpoint</div>
            <div className="provider-description">Ollama, LM Studio, etc.</div>
          </div>
          {value === 'custom' && <div className="check-icon">✓</div>}
        </button> */}
      </div>

      {disabled && (
        <p className="helper-text">
          Provider cannot be changed after configuration is created
        </p>
      )}

      <style>{`
        .provider-selector {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .provider-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .provider-option {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border: 2px solid #E5E7EB;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          width: 100%;
        }

        .provider-option:hover:not(:disabled) {
          border-color: #3B82F6;
          box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
        }

        .provider-option.selected {
          border-color: #3B82F6;
          background: #EFF6FF;
        }

        .provider-option:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .provider-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .provider-info {
          flex: 1;
        }

        .provider-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .provider-description {
          font-size: 0.75rem;
          color: #6B7280;
        }

        .check-icon {
          font-size: 1.25rem;
          color: #3B82F6;
          font-weight: bold;
        }

        .helper-text {
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: #9CA3AF;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
