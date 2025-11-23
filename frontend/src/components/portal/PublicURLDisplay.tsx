/**
 * PublicURLDisplay Component
 * Feature 009: Player Question Portal
 * T035: Display portal URL with copy button
 */

import React, { useState } from 'react';

interface PublicURLDisplayProps {
  campaignId: string;
}

export const PublicURLDisplay: React.FC<PublicURLDisplayProps> = ({ campaignId }) => {
  const [copied, setCopied] = useState(false);

  // Generate portal URL
  const portalUrl = `${window.location.origin}/portal/${campaignId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy URL');
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
      <h3 style={{ marginTop: 0 }}>Public Portal URL</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Share this URL with your players to access the question portal
      </p>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={portalUrl}
          readOnly
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem',
            background: '#f9f9f9',
            fontFamily: 'monospace',
          }}
        />
        <button
          onClick={handleCopy}
          style={{
            padding: '0.75rem 1.5rem',
            background: copied ? '#4CAF50' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
            whiteSpace: 'nowrap',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy URL'}
        </button>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
        <strong>Note:</strong> This is a localhost URL. Players must be on the same network to
        access it.
      </div>
    </div>
  );
};
