/**
 * Card Page - Full page card view with editor
 * Feature: 003-create-a-notion
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CardEditor } from '../components/cards/CardEditor';
import { useCardContext } from '../contexts/CardContext';
import { useCards } from '../hooks/useCards';

export function CardPage() {
  const { campaignId, cardId } = useParams<{ campaignId: string; cardId: string }>();
  const navigate = useNavigate();
  const { loadCard, currentCard, loading } = useCardContext();
  const { updateCard } = useCards();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cardId) {
      loadCard(cardId);
    }
  }, [cardId]);

  const handleSave = async (content: any) => {
    if (!currentCard) return;

    try {
      setSaving(true);
      await updateCard(currentCard.id, { content });
    } catch (error) {
      console.error('Failed to save card:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading card...</div>;
  }

  if (!currentCard) {
    return <div style={{ padding: '2rem' }}>Card not found</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => navigate(`/campaigns/${campaignId}`)}>
          ← Back to Campaign
        </button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h1 contentEditable suppressContentEditableWarning style={{ outline: 'none' }}>
          {currentCard.title || 'Untitled'}
        </h1>
        <div style={{ fontSize: '12px', color: '#999' }}>
          {currentCard.type} • Depth: {currentCard.depth} • {saving ? 'Saving...' : 'Saved'}
        </div>
      </div>

      {(currentCard.type === 'page' || currentCard.type === 'text') && (
        <CardEditor
          card={currentCard}
          onUpdate={handleSave}
          placeholder={`Start typing your ${currentCard.type} content...`}
        />
      )}

      {currentCard.type === 'database' && (
        <div style={{ padding: '2rem', background: '#f5f5f5', borderRadius: '4px' }}>
          <h3>Database View</h3>
          <p>Database views coming soon...</p>
        </div>
      )}

      {currentCard.type === 'image' && currentCard.metadata?.url && (
        <div>
          <img
            src={currentCard.metadata.url}
            alt={currentCard.metadata.caption || 'Image'}
            style={{ maxWidth: '100%', borderRadius: '4px' }}
          />
          {currentCard.metadata.caption && (
            <p style={{ marginTop: '8px', color: '#666', fontStyle: 'italic' }}>
              {currentCard.metadata.caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
