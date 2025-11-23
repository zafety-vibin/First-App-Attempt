/**
 * DMPreviewMode Component
 * Feature 009: Player Question Portal
 * T032: Test portal with player_view filtering, shows exact filtered view
 */

import React, { useState } from 'react';

interface DMPreviewModeProps {
  campaignId: string;
}

export const DMPreviewMode: React.FC<DMPreviewModeProps> = ({ campaignId }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      // TODO: Implement preview endpoint call
      // For now, show placeholder
      setResponse(
        'Preview mode will show you exactly what players see based on their information level access. This feature requires the preview endpoint implementation.'
      );
    } catch (error) {
      console.error('Error in preview mode:', error);
      setResponse('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div
        style={{
          padding: '1rem',
          background: '#e3f2fd',
          border: '1px solid #2196F3',
          borderRadius: '4px',
          marginBottom: '2rem',
        }}
      >
        <strong>ℹ️ Preview Mode:</strong> Test what players will see based on information level
        filtering. Only common-knowledge and player-knowledge content is accessible.
      </div>

      {/* Question Input */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          htmlFor="preview-question"
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
        >
          Test Question
        </label>
        <textarea
          id="preview-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question as if you were a player..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>

      <button
        onClick={handlePreview}
        disabled={loading || !question.trim()}
        style={{
          padding: '0.75rem 1.5rem',
          background: loading ? '#ccc' : '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '1rem',
        }}
      >
        {loading ? 'Generating Preview...' : 'Test Portal Response'}
      </button>

      {/* Response Display */}
      {response && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: '#f9f9f9',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <h4 style={{ marginTop: 0 }}>Player View Response:</h4>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{response}</div>
        </div>
      )}

      {/* Info about filtering */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
        }}
      >
        <strong>What gets filtered:</strong>
        <ul style={{ marginBottom: 0 }}>
          <li>
            <strong>Included:</strong> common-knowledge, player-knowledge
          </li>
          <li>
            <strong>Excluded:</strong> dm-secret, system
          </li>
        </ul>
      </div>
    </div>
  );
};
