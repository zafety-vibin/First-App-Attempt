/**
 * PasswordEntry Component
 * Feature 009: Player Question Portal
 * T040: Password entry before identity prompt
 */

import React, { useState } from 'react';
import axios from 'axios';

interface PasswordEntryProps {
  campaignId: string;
  onVerified: () => void;
}

export const PasswordEntry: React.FC<PasswordEntryProps> = ({ campaignId, onVerified }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Please enter the password');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await axios.post(`/api/portal/${campaignId}/verify-password`, {
        password: password.trim(),
      });

      // Password correct
      onVerified();
    } catch (error: any) {
      if (error.response?.status === 401) {
        setError('Incorrect password. Please try again.');
      } else {
        setError('Failed to verify password. Please try again.');
      }
      console.error('Error verifying password:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '6rem auto',
        padding: '2rem',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
      <h2>Password Required</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        This portal is password-protected. Please enter the password to continue.
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <label
            htmlFor="portal-password"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
          >
            Password
          </label>
          <input
            id="portal-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Enter password..."
            disabled={submitting}
            autoFocus
            style={{
              width: '100%',
              padding: '0.75rem',
              border: error ? '2px solid #f44336' : '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
            }}
          />
          {error && (
            <div style={{ marginTop: '0.5rem', color: '#f44336', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !password.trim()}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: submitting || !password.trim() ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting || !password.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          {submitting ? 'Verifying...' : 'Continue'}
        </button>
      </form>
    </div>
  );
};
