/**
 * Campaign Homepage Component
 * GM view of campaign workspace with card tree
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../../../shared/types/Campaign';
import { CardTree } from './cards/CardTree';
import { useCardContext } from '../contexts/CardContext';
import { useCards } from '../hooks/useCards';

export function CampaignHomepage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const { loadCampaignCards, cards, loading: cardsLoading } = useCardContext();
  const { createCard } = useCards();
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardType, setNewCardType] = useState<'page' | 'database' | 'text'>('page');

  useEffect(() => {
    if (id) {
      loadCampaign(id);
      loadCampaignCards(id);
    }
  }, [id]);

  const loadCampaign = async (campaignId: string) => {
    try {
      setCampaignLoading(true);
      const data = await campaignService.getCampaign(campaignId);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
      alert('Failed to load campaign');
      navigate('/campaigns');
    } finally {
      setCampaignLoading(false);
    }
  };

  const handleCreateCard = async () => {
    if (!id || !newCardTitle.trim()) {
      alert('Please enter a card title');
      return;
    }

    try {
      await createCard({
        type: newCardType,
        campaignId: id,
        parentId: null, // Root card
        position: cards.length, // Add at end
        title: newCardTitle,
        content: newCardType !== 'database' ? { type: 'doc', content: [] } : null,
        metadata: newCardType === 'database' ? {
          schema: { columns: [] },
          views: [],
          defaultViewId: '',
        } : null,
      });

      setNewCardTitle('');
      setShowNewCardForm(false);
      setNewCardType('page');
    } catch (error) {
      console.error('Failed to create card:', error);
      alert('Failed to create card');
    }
  };

  if (campaignLoading) {
    return <div style={{ padding: '2rem' }}>Loading campaign...</div>;
  }

  if (!campaign) {
    return null;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/campaigns')}>← Back to Campaigns</button>
      </div>

      <h1>{campaign.name}</h1>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Campaign Cards</h2>
          <button
            onClick={() => setShowNewCardForm(!showNewCardForm)}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            + New Card
          </button>
        </div>

        {showNewCardForm && (
          <div style={{
            marginBottom: '1rem',
            padding: '1rem',
            background: '#f5f5f5',
            borderRadius: '4px',
          }}>
            <h3>Create New Card</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Title:</label>
              <input
                type="text"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Enter card title..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px' }}>Type:</label>
              <select
                value={newCardType}
                onChange={(e) => setNewCardType(e.target.value as any)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              >
                <option value="page">Page</option>
                <option value="database">Database</option>
                <option value="text">Text Block</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreateCard}
                style={{
                  padding: '8px 16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewCardForm(false);
                  setNewCardTitle('');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <CardTree cards={cards} campaignId={id!} loading={cardsLoading} />
      </div>
    </div>
  );
}
