/**
 * PortalWarning Component
 * Feature 009: Player Question Portal
 * T041: Warning about GM's LLM credentials usage
 */

import React from 'react';

export const PortalWarning: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '1rem auto',
        padding: '1rem',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
      }}
    >
      <strong>ℹ️ About This Portal:</strong> This portal uses your GM's AI credentials to answer
      questions. Please be respectful of their token usage and avoid excessive or unnecessary
      questions.
    </div>
  );
};
