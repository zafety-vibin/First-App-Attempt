/**
 * PasswordProtection Component
 * Feature 009: Player Question Portal
 * T034: Password set/remove UI with show/hide
 */

import React, { useState } from 'react';
import axios from 'axios';

interface PasswordProtectionProps {
  campaignId: string;
  hasPassword: boolean;
  onPasswordChange: () => void;
}

export const PasswordProtection: React.FC<PasswordProtectionProps> = ({
  campaignId,
  hasPassword,
  onPasswordChange,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSetPassword = async () => {
    if (!password.trim()) return;

    setSaving(true);
    try {
      await axios.put(`/api/campaigns/${campaignId}/portal/password`, {
        password: password.trim(),
      });
      setPassword('');
      onPasswordChange();
      alert('Password set successfully!');
    } catch (error) {
      console.error('Error setting password:', error);
      alert('Failed to set password');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!confirm('Remove password protection? Portal will be accessible without a password.')) {
      return;
    }

    setSaving(true);
    try {
      await axios.put(`/api/campaigns/${campaignId}/portal/password`, {
        password: null,
      });
      onPasswordChange();
      alert('Password protection removed');
    } catch (error) {
      console.error('Error removing password:', error);
      alert('Failed to remove password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Password Protection</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {hasPassword
          ? 'Portal is currently password-protected'
          : 'Optional: Require players to enter a password before accessing the portal'}
      </p>

      {hasPassword ? (
        <div>
          <div
            style={{
              padding: '1rem',
              background: '#e8f5e9',
              border: '1px solid #4CAF50',
              borderRadius: '4px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>🔒 Password protection is active</span>
            <button
              onClick={handleRemovePassword}
              disabled={saving}
              style={{
                padding: '0.5rem 1rem',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {saving ? 'Removing...' : 'Remove Password'}
            </button>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            To change the password, remove the current one and set a new one.
          </div>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="portal-password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="portal-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a password..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '5rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  fontSize: '0.9rem',
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            onClick={handleSetPassword}
            disabled={saving || !password.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              background: saving || !password.trim() ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving || !password.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            {saving ? 'Setting Password...' : 'Set Password'}
          </button>
        </div>
      )}
    </div>
  );
};
