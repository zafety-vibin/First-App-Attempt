/**
 * Campaign Homepage Component
 * GM view of campaign workspace with card tree
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../../../shared/types/Campaign';
import { BlockList } from './cards/BlockList';

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
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  } : null;

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
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/campaigns')}>← Back to Campaigns</button>
      </div>

      <h1 contentEditable suppressContentEditableWarning style={{ outline: 'none', minHeight: '1em', marginBottom: '2rem' }}>
        {campaign.name}
      </h1>

      {/* Campaign content - rendered as blocks just like a page */}
      {homepageCard && (
        <BlockList parentCard={homepageCard} campaignId={id!} />
      )}
    </div>
  );
}
