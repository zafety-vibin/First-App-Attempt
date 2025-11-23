/**
 * PlayerIdentity Component
 * Feature 009: Player Question Portal
 * T037: "Who are you in-game?" prompt with unique name validation
 */

import React, { useState } from 'react';
import axios from 'axios';

interface PlayerIdentityProps {
  campaignId: string;
  onIdentified: () => void;
}

export const PlayerIdentity: React.FC<PlayerIdentityProps> = ({ campaignId, onIdentified }) => {
  const [characterName, setCharacterName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!characterName.trim()) {
      setError('Please enter your character name');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await axios.post(`/api/portal/${campaignId}/identify`, {
        characterName: characterName.trim(),
      });

      // Session cookie is set automatically by backend
      onIdentified();
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Conflict - name already in use
        setError(error.response.data.error || 'Character name already in use');
      } else {
        setError('Failed to identify. Please try again.');
      }
      console.error('Error identifying player:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '500px',
        margin: '4rem auto',
        padding: '2rem',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <h2>Welcome to the Campaign Portal</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Who are you in-game?</p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <label
            htmlFor="character-name"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
          >
            Character Name
          </label>
          <input
            id="character-name"
            type="text"
            value={characterName}
            onChange={(e) => {
              setCharacterName(e.target.value);
              setError(null);
            }}
            placeholder="Enter your character name..."
            disabled={submitting}
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
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
            This name must be unique in this campaign
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !characterName.trim()}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: submitting || !characterName.trim() ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting || !characterName.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          {submitting ? 'Identifying...' : 'Enter Portal'}
        </button>
      </form>
    </div>
  );
};
