/**
 * BYOLLMSettings Component
 * Feature: 008-create-byollm-configuration
 * Tasks: T046-T048
 *
 * Main BYOLLM configuration UI
 * Allows users to configure their own LLM credentials (OAuth or API key)
 */

import React, { useState, useEffect } from 'react';
import { ProviderSelector } from './ProviderSelector';
import { OAuthButton } from './OAuthButton';
import { APIKeyInput } from './APIKeyInput';
import { ModelSelector } from './ModelSelector';
import { ConnectionTest } from './ConnectionTest';
import { CreditsDisplay } from './CreditsDisplay';
import { CustomSystemPrompt } from './CustomSystemPrompt';
import type { BYOLLMConfig } from '../../../shared/types/BYOLLMConfig';

interface BYOLLMSettingsProps {
  campaignId?: string; // If provided, manages campaign-specific config
  scope: 'global' | 'campaign';
}

export function BYOLLMSettings({ campaignId, scope }: BYOLLMSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<BYOLLMConfig | null>(null);
  const [provider, setProvider] = useState<'anthropic'>('anthropic');
  const [authMethod, setAuthMethod] = useState<'oauth' | 'api_key'>('oauth'); // Default to OAuth
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('claude-3-5-sonnet-20241022');
  const [customSystemPromptImport, setCustomSystemPromptImport] = useState('');
  const [customSystemPromptPlanning, setCustomSystemPromptPlanning] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load existing config
  useEffect(() => {
    loadConfig();
  }, [campaignId, scope]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = campaignId
        ? `http://localhost:3001/api/byollm/config?campaignId=${campaignId}`
        : 'http://localhost:3001/api/byollm/config?scope=global';

      const response = await fetch(url, { credentials: 'include' });

      if (response.status === 404) {
        // No config found - this is okay
        setConfig(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load config');
      }

      const data = await response.json();
      setConfig(data);

      // Populate form
      setProvider(data.provider);
      setAuthMethod(data.authMethod);
      setModelName(data.modelName || 'claude-3-5-sonnet-20241022');
      setCustomSystemPromptImport(data.customSystemPromptImport || '');
      setCustomSystemPromptPlanning(data.customSystemPromptPlanning || '');
    } catch (err) {
      console.error('Failed to load BYOLLM config:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Validate API key
      if (authMethod === 'api_key' && !apiKey) {
        throw new Error('API key required');
      }

      if (authMethod === 'api_key' && !apiKey.startsWith('sk-ant-api03-')) {
        throw new Error('Invalid Anthropic API key format (must start with sk-ant-api03-)');
      }

      // Save config
      const response = await fetch('http://localhost:3001/api/byollm/config', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope,
          campaignId: campaignId || null,
          provider,
          authMethod,
          credentials: {
            apiKey,
          },
          modelName,
          customSystemPromptImport: customSystemPromptImport || null,
          customSystemPromptPlanning: customSystemPromptPlanning || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save config');
      }

      const savedConfig = await response.json();
      setConfig(savedConfig);
      setApiKey(''); // Clear API key from memory
      setSuccessMessage('Configuration saved successfully!');

      // Reload config
      await loadConfig();
    } catch (err) {
      console.error('Failed to save config:', err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async () => {
    if (!config) return;

    if (!window.confirm('Delete this BYOLLM configuration? Import and Planning AI will be disabled.')) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(`http://localhost:3001/api/byollm/config/${config.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete config');
      }

      setConfig(null);
      setApiKey('');
      setSuccessMessage('Configuration deleted');
    } catch (err) {
      console.error('Failed to delete config:', err);
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="byollm-settings">
        <div className="loading">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="byollm-settings">
      <div className="byollm-header">
        <h3>AI Configuration (BYOLLM)</h3>
        <p className="byollm-description">
          Configure your own LLM credentials to use Import AI and Planning AI features.
          Your credentials are stored locally and encrypted.
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {/* Provider Selection */}
      <ProviderSelector
        value={provider}
        onChange={setProvider}
        disabled={!!config}
      />

      {/* OAuth Button (API key option hidden for simplicity) */}
      {!config && (
        <OAuthButton
          provider={provider}
          scope={scope}
          campaignId={campaignId}
          onSuccess={loadConfig}
        />
      )}

      {/* Model Selection */}
      {(config || apiKey) && (
        <ModelSelector
          provider={provider}
          value={modelName}
          onChange={setModelName}
        />
      )}

      {/* Custom System Prompts */}
      {(config || apiKey) && (
        <>
          <CustomSystemPrompt
            label="Custom Import AI Prompt"
            description="Optional custom system prompt for Import AI workflow"
            value={customSystemPromptImport}
            onChange={setCustomSystemPromptImport}
          />

          <CustomSystemPrompt
            label="Custom Planning AI Prompt"
            description="Optional custom system prompt for Planning AI workflow"
            value={customSystemPromptPlanning}
            onChange={setCustomSystemPromptPlanning}
          />
        </>
      )}

      {/* Connection Test & Credits */}
      {config && (
        <div className="config-status">
          <ConnectionTest campaignId={campaignId} />
          <CreditsDisplay campaignId={campaignId} />
        </div>
      )}

      {/* Actions */}
      <div className="form-actions">
        {!config && apiKey && (
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        )}

        {config && (
          <>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Updating...' : 'Update Configuration'}
            </button>
            <button
              onClick={handleDeleteConfig}
              className="btn btn-danger"
            >
              Delete Configuration
            </button>
          </>
        )}
      </div>

      <style>{`
        .byollm-settings {
          margin-top: 2rem;
        }

        .byollm-header {
          margin-bottom: 2rem;
        }

        .byollm-header h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .byollm-description {
          margin: 0;
          font-size: 0.875rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .alert {
          padding: 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }

        .alert-error {
          background: #FEE2E2;
          color: #DC2626;
          border: 1px solid #FCA5A5;
        }

        .alert-success {
          background: #D1FAE5;
          color: #059669;
          border: 1px solid #6EE7B7;
        }

        .form-section {
          margin-bottom: 1.5rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .auth-method-tabs {
          display: flex;
          gap: 0.5rem;
          background: #F3F4F6;
          padding: 0.25rem;
          border-radius: 0.375rem;
        }

        .tab {
          flex: 1;
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .tab:hover {
          color: #374151;
        }

        .tab.active {
          background: white;
          color: #111827;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .tab:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .config-status {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #E5E7EB;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #E5E7EB;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3B82F6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563EB;
        }

        .btn-danger {
          background: #EF4444;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #DC2626;
        }

        .loading {
          padding: 2rem;
          text-align: center;
          color: #9CA3AF;
        }
      `}</style>
    </div>
  );
}
