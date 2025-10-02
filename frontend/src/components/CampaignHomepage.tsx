/**
 * Campaign Homepage Component
 * GM view of campaign workspace (placeholder for future features)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../../shared/types/Campaign';
import { ViewModeToggle } from './ViewModeToggle';
import { useInformationLevel } from '../contexts/InformationLevelContext';
import { useViewMode } from '../contexts/ViewModeContext';

export function CampaignHomepage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
      const data = await campaignService.getCampaign(campaignId);
      setCampaign(data);

      // Feature 004: Load information levels for this campaign
      await loadLevels(campaignId);
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
      {/* Feature 004: View Mode Toggle */}
      <ViewModeToggle />

      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => navigate('/campaigns')}>← Back to Campaigns</button>
      </div>

      <h1>{campaign.name}</h1>

      {/* Feature 004: Current view mode indicator */}
      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
        Current View: <strong>{viewMode === 'dm' ? 'DM View' : 'Player View'}</strong>
      </p>

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

      {/* Feature 004: Information Levels */}
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
        <h3>Information Levels (Feature 004)</h3>
        {levelsLoading ? (
          <p>Loading information levels...</p>
        ) : (
          <div>
            <p><strong>Total Levels:</strong> {levels.length}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
              {levels.map(level => (
                <div
                  key={level.id}
                  style={{
                    padding: '0.75rem',
                    border: `2px solid ${level.color}`,
                    borderRadius: '4px',
                    backgroundColor: 'white',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: level.color,
                      }}
                    />
                    <strong>{level.name}</strong>
                    {level.hierarchical && <span title="Hidden in Player View">🔒</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                    {level.type === 'default' ? 'Default' : 'Custom'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
