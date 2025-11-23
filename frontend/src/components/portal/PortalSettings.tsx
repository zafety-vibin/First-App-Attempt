/**
 * PortalSettings Component
 * Feature 009: Player Question Portal
 * T030: Enable/disable toggle, password input, response style dropdown
 */

import React, { useState, useEffect } from 'react';
import { ResponseStyleSelector } from './ResponseStyleSelector';
import { PasswordProtection } from './PasswordProtection';
import { PublicURLDisplay } from './PublicURLDisplay';
import axios from 'axios';

interface PortalConfig {
  id: string;
  campaignId: string;
  enabled: boolean;
  passwordHash: string | null;
  responseStyle: string;
  customSystemPrompt: string | null;
}

interface PortalSettingsProps {
  campaignId: string;
}

export const PortalSettings: React.FC<PortalSettingsProps> = ({ campaignId }) => {
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load portal config
  useEffect(() => {
    loadConfig();
  }, [campaignId]);

  const loadConfig = async () => {
    try {
      const response = await axios.get(`/api/campaigns/${campaignId}/portal/config`);
      setConfig(response.data);
    } catch (error) {
      console.error('Error loading portal config:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle portal enabled/disabled
  const handleToggleEnabled = async () => {
    if (!config) return;

    setSaving(true);
    try {
      await axios.put(`/api/campaigns/${campaignId}/portal/enable`, {
        enabled: !config.enabled,
      });
      await loadConfig();
    } catch (error) {
      console.error('Error toggling portal:', error);
      alert('Failed to toggle portal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading portal settings...</div>;
  }

  if (!config) {
    return <div>Failed to load portal configuration</div>;
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Enable/Disable Toggle */}
      <div
        style={{
          padding: '1.5rem',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0 }}>Portal Status</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
              {config.enabled
                ? 'Portal is currently active and accessible to players'
                : 'Portal is currently disabled'}
            </p>
          </div>
          <button
            onClick={handleToggleEnabled}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '4px',
              background: config.enabled ? '#f44336' : '#4CAF50',
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            {saving ? 'Saving...' : config.enabled ? 'Disable Portal' : 'Enable Portal'}
          </button>
        </div>
      </div>

      {/* BYOLLM Warning */}
      <div
        style={{
          padding: '1rem',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          marginBottom: '2rem',
        }}
      >
        <strong>⚠️ Important:</strong> Player Portal uses your LLM credentials. Set expectations
        with players about usage to avoid excessive token consumption.
      </div>

      {/* Public URL */}
      <PublicURLDisplay campaignId={campaignId} />

      {/* Password Protection */}
      <PasswordProtection
        campaignId={campaignId}
        hasPassword={config.passwordHash !== null}
        onPasswordChange={loadConfig}
      />

      {/* Response Style */}
      <ResponseStyleSelector
        campaignId={campaignId}
        currentStyle={config.responseStyle}
        customPrompt={config.customSystemPrompt}
        onStyleChange={loadConfig}
      />
    </div>
  );
};
