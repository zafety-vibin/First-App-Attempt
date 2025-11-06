import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategory } from '../../hooks/useCategory';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import { NPC } from '../../utils/validationSchemas';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import './NPCLandingCard.css';

export interface NPCLandingCardProps {
  campaignId: string;
  onViewAll?: () => void;
}

/**
 * NPC summary widget for campaign dashboard
 * Shows total count, relationship breakdown, and recent NPCs
 */
export const NPCLandingCard: React.FC<NPCLandingCardProps> = ({ campaignId, onViewAll }) => {
  const navigate = useNavigate();
  const { getCategoryLabel, loading: labelsLoading } = useThematicLabels(campaignId);

  // Fetch recent NPCs (last 5)
  const {
    entities: recentNPCs,
    loading: npcsLoading,
    error: npcsError,
    totalCount,
  } = useCategory<NPC>('npcs', campaignId, {
    pagination: { limit: 5, sort: 'updated_at:desc' },
  });

  // Fetch all NPCs for stats calculation
  const {
    entities: allNPCs,
    loading: allNPCsLoading,
  } = useCategory<NPC>('npcs', campaignId, {
    pagination: { limit: 1000 }, // Get all NPCs for stats
  });

  // Calculate stats from allNPCs
  const stats = React.useMemo(() => {
    if (!allNPCs || allNPCs.length === 0) return null;

    const relationshipBreakdown: Record<string, number> = {};

    allNPCs.forEach((npc) => {
      if (npc.relationship_to_party) {
        relationshipBreakdown[npc.relationship_to_party] =
          (relationshipBreakdown[npc.relationship_to_party] || 0) + 1;
      }
    });

    return {
      totalCount: totalCount || allNPCs.length,
      relationshipBreakdown,
      raceBreakdown: {},
      factionBreakdown: {},
    };
  }, [allNPCs, totalCount]);

  const handleViewAll = (): void => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate(`/campaigns/${campaignId}/npcs`);
    }
  };

  const handleNPCClick = (npcId: string): void => {
    navigate(`/campaigns/${campaignId}/npcs/${npcId}`);
  };

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const loading = labelsLoading || npcsLoading || allNPCsLoading;
  const error = npcsError;

  if (loading) {
    return (
      <div className="landing-card npc-landing-card">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="landing-card npc-landing-card">
        <div className="landing-card-error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  const themedLabel = getCategoryLabel('npcs');

  return (
    <div className="landing-card npc-landing-card">
      <div className="landing-card-header">
        <h3 className="landing-card-title">{themedLabel}</h3>
        <button
          type="button"
          className="landing-card-view-all"
          onClick={handleViewAll}
          aria-label={`View all ${themedLabel}`}
        >
          View All
        </button>
      </div>

      {stats && (
        <div className="landing-card-stats">
          <div className="stat-item stat-total">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.totalCount}</span>
          </div>

          {stats.relationshipBreakdown && Object.keys(stats.relationshipBreakdown).length > 0 && (
            <div className="stat-breakdown">
              <span className="stat-breakdown-label">Relationships:</span>
              <div className="stat-breakdown-items">
                {Object.entries(stats.relationshipBreakdown).map(([relationship, count]) => (
                  <div key={relationship} className="stat-chip">
                    <span className="stat-chip-label">{relationship}</span>
                    <span className="stat-chip-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="landing-card-list">
        <h4 className="landing-card-list-title">Recent</h4>
        {recentNPCs.length === 0 ? (
          <EmptyState
            message={`No ${themedLabel.toLowerCase()} yet`}
            description={`Create your first ${themedLabel.toLowerCase().slice(0, -1)} to get started`}
            actionLabel="Create"
            onAction={handleViewAll}
          />
        ) : (
          <ul className="landing-card-items">
            {recentNPCs.map((npc) => (
              <li key={npc.id} className="landing-card-item">
                <button
                  type="button"
                  className="landing-card-item-button"
                  onClick={() => handleNPCClick(npc.id)}
                >
                  <div className="item-content">
                    <span className="item-name">{npc.name}</span>
                    <div className="item-meta">
                      {npc.race && <span className="item-meta-text">{npc.race}</span>}
                      {npc.class && <span className="item-meta-text">{npc.class}</span>}
                      {npc.relationship_to_party && (
                        <span className="item-badge item-badge-relationship">
                          {npc.relationship_to_party}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="item-time">{formatRelativeTime(npc.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
