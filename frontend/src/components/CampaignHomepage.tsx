/**
 * Campaign Homepage Component
 * GM view of campaign workspace (placeholder for future features)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../../../shared/types/Campaign';

export function CampaignHomepage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCampaign(id);
    }
  }, [id]);

  const loadCampaign = async (campaignId: string) => {
    try {
      setLoading(true);
      const data = await campaignService.getCampaign(campaignId);
      setCampaign(data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
      alert('Failed to load campaign');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
        <h2>Campaign Homepage</h2>
        <p style={{ color: '#666' }}>
          This is the GM workspace for your campaign. Future features will include:
        </p>
        <ul style={{ color: '#666' }}>
          <li>Card-based content organization (Feature 003)</li>
          <li>Information level filtering (Feature 004)</li>
          <li>AI Import & Planning tools (Feature 005)</li>
          <li>Interactive maps (Feature 007)</li>
          <li>Public campaign sharing (Feature 010)</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <h3>Campaign Details</h3>
        <p><strong>ID:</strong> {campaign.id}</p>
        <p><strong>Public URL ID:</strong> {campaign.publicUrlId}</p>
        <p><strong>Public Access:</strong> {campaign.publicAccessEnabled ? 'Enabled' : 'Disabled'}</p>
        <p><strong>Created:</strong> {new Date(campaign.createdAt).toLocaleString()}</p>
        <p><strong>Updated:</strong> {new Date(campaign.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
