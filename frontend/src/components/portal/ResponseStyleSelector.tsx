/**
 * ResponseStyleSelector Component
 * Feature 009: Player Question Portal
 * T033: Dropdown with 5 styles + custom textarea
 */

import React, { useState } from 'react';
import axios from 'axios';

const RESPONSE_STYLES = {
  'friendly-sage': 'Friendly Sage - Warm, helpful librarian persona',
  'scholarly-tome': 'Scholarly Tome - Formal academic authority',
  'tavern-gossip': 'Tavern Gossip - Casual storyteller',
  factual: 'Factual - Straightforward and concise',
  custom: 'Custom - Your own system prompt',
};

interface ResponseStyleSelectorProps {
  campaignId: string;
  currentStyle: string;
  customPrompt: string | null;
  onStyleChange: () => void;
}

export const ResponseStyleSelector: React.FC<ResponseStyleSelectorProps> = ({
  campaignId,
  currentStyle,
  customPrompt,
  onStyleChange,
}) => {
  const [selectedStyle, setSelectedStyle] = useState(currentStyle);
  const [customText, setCustomText] = useState(customPrompt || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`/api/campaigns/${campaignId}/portal/response-style`, {
        responseStyle: selectedStyle,
        customSystemPrompt: selectedStyle === 'custom' ? customText : null,
      });
      onStyleChange();
      alert('Response style updated successfully!');
    } catch (error: any) {
      console.error('Error saving response style:', error);
      alert(error.response?.data?.error || 'Failed to update response style');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    selectedStyle !== currentStyle ||
    (selectedStyle === 'custom' && customText !== customPrompt);

  return (
    <div
      style={{
        padding: '1.5rem',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}
    >
      <h3 style={{ marginTop: 0 }}>Response Style</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Choose how the AI responds to player questions
      </p>

      {/* Style Dropdown */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label htmlFor="response-style" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
          Style
        </label>
        <select
          id="response-style"
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '1rem',
          }}
        >
          {Object.entries(RESPONSE_STYLES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom System Prompt (shown only if custom selected) */}
      {selectedStyle === 'custom' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="custom-prompt"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}
          >
            Custom System Prompt
          </label>
          <textarea
            id="custom-prompt"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Enter your custom system prompt for the AI..."
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '0.75rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '1rem',
              fontFamily: 'monospace',
              resize: 'vertical',
            }}
          />
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
            Tip: Define the AI's personality and how it should respond to player questions
          </div>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving || (selectedStyle === 'custom' && !customText.trim())}
          style={{
            padding: '0.75rem 1.5rem',
            background: saving ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
          }}
        >
          {saving ? 'Saving...' : 'Save Response Style'}
        </button>
      )}
    </div>
  );
};
