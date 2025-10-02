/**
 * Card Page - Full page card view with inline children
 * Feature: 003-create-a-notion (refactored)
 *
 * Pages are CONTAINERS that render child blocks inline
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BlockList } from '../components/cards/BlockList';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { useCardContext } from '../contexts/CardContext';
import { useCards } from '../hooks/useCards';
import { useInformationLevel } from '../contexts/InformationLevelContext';

export function CardPage() {
  const { campaignId, cardId } = useParams<{ campaignId: string; cardId: string }>();
  const navigate = useNavigate();
  const { loadCard, currentCard, loading } = useCardContext();
  const { updateCard } = useCards();
  const { loadLevels, loading: levelsLoading } = useInformationLevel();
  const [childrenKey, setChildrenKey] = useState(0);

  useEffect(() => {
    if (cardId) {
      loadCard(cardId);
    }
  }, [cardId]);

  // Feature 004: Load information levels for this campaign
  useEffect(() => {
    if (campaignId) {
      loadLevels(campaignId);
    }
  }, [campaignId]);

  const handleTitleUpdate = async (e: React.FocusEvent<HTMLHeadingElement>) => {
    if (!currentCard) return;
    const newTitle = e.currentTarget.textContent || '';
    if (newTitle !== currentCard.title) {
      try {
        await updateCard(currentCard.id, { title: newTitle });
      } catch (error) {
        console.error('Failed to update title:', error);
      }
    }
  };

  if (loading || levelsLoading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!currentCard) {
    return <div style={{ padding: '2rem' }}>Card not found</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Feature 004: View Mode Toggle */}
      <ViewModeToggle />

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button onClick={() => navigate(`/campaigns/${campaignId}`)}>
          ← Back to Campaign
        </button>
        <button onClick={() => navigate(`/campaigns/${campaignId}/settings`)}>
          ⚙️ Settings
        </button>
      </div>

      {/* Page Title - Editable */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTitleUpdate}
          style={{ outline: 'none', minHeight: '1em' }}
        >
          {currentCard.title || 'Untitled'}
        </h1>
        <div style={{ fontSize: '12px', color: '#999' }}>
          {currentCard.type} • Depth: {currentCard.depth}
        </div>
      </div>

      {/* Database Properties Section (for database entries) */}
      {currentCard.type === 'database' && currentCard.metadata?.schema && (
        <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
          <h3 style={{ marginTop: 0 }}>Properties</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Database schema properties will be displayed here
          </p>
        </div>
      )}

      {/* Page Content = Child Blocks */}
      <div style={{ marginBottom: '2rem' }}>
        <BlockList key={childrenKey} parentCard={currentCard} campaignId={campaignId!} />
      </div>
    </div>
  );
}
