/**
 * Campaign Management Component
 * List, create, and delete campaigns
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../../../shared/types/Campaign';

export function CampaignManagement() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const result = await campaignService.getCampaigns();
      setCampaigns(result.campaigns);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      alert('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    try {
      setCreating(true);
      await campaignService.createCampaign(newCampaignName);
      setNewCampaignName('');
      setShowNewForm(false);
      await loadCampaigns();
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return;

    try {
      await campaignService.deleteCampaign(id);
      await loadCampaigns();
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Campaigns</h1>
        <div>
          <span style={{ marginRight: '1rem' }}>Logged in as: {user?.username}</span>
          <button onClick={() => logout()}>Logout</button>
        </div>
      </div>

      {loading ? (
        <p>Loading campaigns...</p>
      ) : (
        <>
          <div style={{ marginTop: '2rem' }}>
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                + New Campaign
              </button>
            ) : (
              <form onSubmit={handleCreate} style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="Campaign name"
                  style={{
                    padding: '0.5rem',
                    fontSize: '1rem',
                    marginRight: '0.5rem',
                    width: '300px',
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={creating || !newCampaignName.trim()}
                  style={{ padding: '0.5rem 1rem', marginRight: '0.5rem' }}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowNewForm(false)}>
                  Cancel
                </button>
              </form>
            )}
          </div>

          {campaigns.length === 0 ? (
            <p style={{ marginTop: '2rem', color: '#666' }}>
              No campaigns yet. Create your first campaign to get started!
            </p>
          ) : (
            <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '1rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/campaigns/${campaign.id}/dashboard`)}
                >
                  <h3>{campaign.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#666', margin: '0.5rem 0' }}>
                    Updated: {new Date(campaign.updatedAt).toLocaleString()}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#666' }}>
                    Public Access: {campaign.publicAccessEnabled ? 'Enabled' : 'Disabled'}
                    {campaign.publicAccessEnabled && campaign.publicUrlId && (
                      <span> ({campaign.publicUrlId})</span>
                    )}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(campaign.id, campaign.name);
                    }}
                    style={{ marginTop: '0.5rem', color: 'red' }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
