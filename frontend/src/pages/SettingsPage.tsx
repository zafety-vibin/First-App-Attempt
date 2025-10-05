/**
 * Settings Page - Campaign settings management
 * Feature: 004-create-a-tagging
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CampaignLayout } from '../components/CampaignLayout';
import { useInformationLevel } from '../contexts/InformationLevelContext';
import { CustomLevelForm } from '../components/CustomLevelForm';
import { BYOLLMSettings } from '../components/BYOLLMSettings';
import type { InformationLevel } from '../../shared/types/InformationLevel';

export function SettingsPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const {
    levels,
    loading,
    loadLevels,
    deleteLevel,
    getDefaultLevels,
    getCustomLevels,
  } = useInformationLevel();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<InformationLevel | null>(null);

  useEffect(() => {
    if (campaignId) {
      loadLevels(campaignId);
    }
  }, [campaignId]);

  const handleDelete = async (levelId: string) => {
    if (!window.confirm('Delete this information level? Any cards using it will revert to System level.')) {
      return;
    }

    try {
      const result = await deleteLevel(levelId);
      if (result.reverted_cards_count > 0) {
        alert(`Deleted level. ${result.reverted_cards_count} card(s) reverted to System level.`);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete level');
    }
  };

  const defaultLevels = getDefaultLevels();
  const customLevels = getCustomLevels();

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!campaignId) {
    return <div style={{ padding: '2rem' }}>Campaign not found</div>;
  }

  return (
    <CampaignLayout hideAIButtons={true}>
      <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => navigate(`/campaigns/${campaignId}`)}>
            ← Back to Campaign
          </button>
        </div>

        <h1 style={{ marginBottom: '2rem' }}>Campaign Settings</h1>

      {/* Information Levels Section */}
      <section className="settings-section">
        <h2 className="section-title">Information Levels</h2>
        <p className="section-description">
          Information levels control what content is visible in different view modes.
          Default levels are provided by the system. Create custom levels for your specific campaign needs.
        </p>

        {/* Default Levels */}
        <div className="levels-category">
          <h3 className="category-title">Default Levels</h3>
          <div className="levels-grid">
            {defaultLevels.map(level => (
              <div key={level.id} className="level-card level-card-readonly">
                <div className="level-header">
                  <div
                    className="level-color-indicator"
                    style={{ backgroundColor: level.color }}
                  />
                  <span className="level-name">{level.name}</span>
                  {level.hierarchical && (
                    <span className="level-badge">🔒 Hierarchical</span>
                  )}
                </div>
                <div className="level-description">
                  {level.id === 'system' && 'System content, always visible'}
                  {level.id === 'common-knowledge' && 'Information known to all players'}
                  {level.id === 'player-knowledge' && 'Information known to specific players'}
                  {level.id === 'dm-secret' && 'Hidden from players, DM only'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Levels */}
        <div className="levels-category">
          <div className="category-header">
            <h3 className="category-title">Custom Levels</h3>
            {!showCreateForm && !editingLevel && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-create"
              >
                + Create Custom Level
              </button>
            )}
          </div>

          {showCreateForm && (
            <div className="form-container">
              <CustomLevelForm
                campaignId={campaignId}
                onSuccess={() => {
                  setShowCreateForm(false);
                  loadLevels(campaignId);
                }}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          )}

          {editingLevel && (
            <div className="form-container">
              <CustomLevelForm
                campaignId={campaignId}
                editLevel={{
                  id: editingLevel.id,
                  name: editingLevel.name,
                  color: editingLevel.color,
                  hierarchical: editingLevel.hierarchical,
                }}
                onSuccess={() => {
                  setEditingLevel(null);
                  loadLevels(campaignId);
                }}
                onCancel={() => setEditingLevel(null)}
              />
            </div>
          )}

          {customLevels.length > 0 ? (
            <div className="levels-grid">
              {customLevels.map(level => (
                <div key={level.id} className="level-card">
                  <div className="level-header">
                    <div
                      className="level-color-indicator"
                      style={{ backgroundColor: level.color }}
                    />
                    <span className="level-name">{level.name}</span>
                    {level.hierarchical && (
                      <span className="level-badge">🔒 Hierarchical</span>
                    )}
                  </div>
                  <div className="level-actions">
                    <button
                      onClick={() => setEditingLevel(level)}
                      className="btn-action"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(level.id)}
                      className="btn-action btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !showCreateForm && !editingLevel && (
            <div className="empty-state">
              <p>No custom levels yet. Create one to get started!</p>
            </div>
          )}
        </div>
      </section>

      {/* BYOLLM Configuration Section */}
      <section className="settings-section">
        <BYOLLMSettings
          campaignId={campaignId}
          scope="campaign"
        />
      </section>

      <style>{`
        .settings-section {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 0.5rem;
          padding: 2rem;
          margin-bottom: 2rem;
        }

        .section-title {
          margin: 0 0 0.5rem 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .section-description {
          margin: 0 0 2rem 0;
          font-size: 0.875rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .levels-category {
          margin-bottom: 2rem;
        }

        .levels-category:last-child {
          margin-bottom: 0;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .category-title {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .btn-create {
          padding: 0.5rem 1rem;
          background: #3B82F6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-create:hover {
          background: #2563EB;
        }

        .form-container {
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #F9FAFB;
          border-radius: 0.5rem;
        }

        .levels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .level-card {
          padding: 1rem;
          border: 1px solid #E5E7EB;
          border-radius: 0.375rem;
          background: white;
          transition: box-shadow 0.15s;
        }

        .level-card:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .level-card-readonly {
          background: #F9FAFB;
        }

        .level-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .level-color-indicator {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .level-name {
          flex: 1;
          font-weight: 500;
          color: #111827;
        }

        .level-badge {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          background: #FEE2E2;
          color: #DC2626;
          border-radius: 0.25rem;
        }

        .level-description {
          font-size: 0.75rem;
          color: #6B7280;
          font-style: italic;
        }

        .level-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid #E5E7EB;
        }

        .btn-action {
          flex: 1;
          padding: 0.375rem 0.75rem;
          background: #F3F4F6;
          color: #374151;
          border: none;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-action:hover {
          background: #E5E7EB;
        }

        .btn-danger {
          color: #DC2626;
        }

        .btn-danger:hover {
          background: #FEE2E2;
        }

        .empty-state {
          padding: 2rem;
          text-align: center;
          color: #9CA3AF;
          font-size: 0.875rem;
          background: #F9FAFB;
          border-radius: 0.375rem;
          border: 1px dashed #D1D5DB;
        }

        .empty-state p {
          margin: 0;
        }
      `}</style>
      </div>
    </CampaignLayout>
  );
}
