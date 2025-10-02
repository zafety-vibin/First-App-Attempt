/**
 * Campaign Homepage Component
 * GM view of campaign workspace with card tree
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../../shared/types/Campaign';
import { ViewModeToggle } from './ViewModeToggle';
import { BlockList } from './cards/BlockList';
import { useInformationLevel } from '../contexts/InformationLevelContext';
import { useViewMode } from '../contexts/ViewModeContext';

export function CampaignHomepage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);

  // Create a virtual "homepage card" to act as parent for root-level cards
  // Using null as id signals BlockList to load root cards (parent_id IS NULL)
  const homepageCard = campaign ? {
    id: null as any, // null signals root-level cards
    type: 'page' as const,
    parentId: null,
    campaignId: campaign.id,
    path: `/${campaign.id}`,
    position: 0,
    depth: 0,
    title: campaign.name,
    content: null,
    metadata: null,
    coverImageUrl: null,
    iconEmoji: null,
    informationLevelId: 'system', // Feature 004
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  } : null;

  // Feature 004: Information levels and view mode
  const { loadLevels, levels, loading: levelsLoading } = useInformationLevel();
  const { viewMode } = useViewMode();

  useEffect(() => {
    if (id) {
      loadCampaign(id);
    }
  }, [id]);

  const loadCampaign = async (campaignId: string) => {
    try {
      setCampaignLoading(true);
      const data = await campaignService.getCampaign(campaignId);
      setCampaign(data);

      // Feature 004: Load information levels for this campaign
      await loadLevels(campaignId);
    } catch (error) {
      console.error('Failed to load campaign:', error);
      alert('Failed to load campaign');
      navigate('/campaigns');
    } finally {
      setCampaignLoading(false);
    }
  };


  if (campaignLoading) {
    return <div style={{ padding: '2rem' }}>Loading campaign...</div>;
  }

  if (!campaign) {
    return null;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Feature 004: View Mode Toggle */}
      <ViewModeToggle />

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button onClick={() => {
          try {
            navigate('/campaigns');
          } catch (err) {
            console.error('Navigation error:', err);
            window.location.href = '/campaigns';
          }
        }}>← Back to Campaigns</button>
        <button onClick={() => navigate(`/campaigns/${id}/settings`)}>⚙️ Settings</button>
      </div>

      <h1 contentEditable suppressContentEditableWarning style={{ outline: 'none', minHeight: '1em', marginBottom: '2rem' }}>
        {campaign.name}
      </h1>

      {/* Campaign content - rendered as blocks just like a page (Feature 003) */}
      {homepageCard && (
        <BlockList parentCard={homepageCard} campaignId={id!} />
      )}
    </div>
  );
}
