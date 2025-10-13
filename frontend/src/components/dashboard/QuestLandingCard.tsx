import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategory } from '../../hooks/useCategory';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import { getQuestStats } from '../../services/questService';
import { Quest } from '../../utils/validationSchemas';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import './QuestLandingCard.css';

export interface QuestLandingCardProps {
  campaignId: string;
  onViewAll?: () => void;
}

export interface QuestStats {
  totalCount: number;
  statusBreakdown: Record<string, number>;
}

/**
 * Quest summary widget for campaign dashboard
 * Shows active count, completed count, and recent quests
 */
export const QuestLandingCard: React.FC<QuestLandingCardProps> = ({ campaignId, onViewAll }) => {
  const navigate = useNavigate();
  const { getCategoryLabel, loading: labelsLoading } = useThematicLabels(campaignId);

  // Fetch recent quests (last 5, sorted by updated_at)
  const {
    entities: recentQuests,
    loading: questsLoading,
    error: questsError,
    totalCount,
  } = useCategory<Quest>('quests', campaignId, {
    pagination: { limit: 5, sort: 'updated_at:desc' },
  });

  // Fetch all quests for stats calculation
  const {
    entities: allQuests,
    loading: allQuestsLoading,
  } = useCategory<Quest>('quests', campaignId, {
    pagination: { limit: 1000 }, // Get all quests for stats
  });

  // Calculate stats from allQuests
  const stats = React.useMemo(() => {
    if (!allQuests || allQuests.length === 0) return null;

    const statusBreakdown: Record<string, number> = {};

    allQuests.forEach((quest) => {
      if (quest.status) {
        statusBreakdown[quest.status] =
          (statusBreakdown[quest.status] || 0) + 1;
      }
    });

    return {
      totalCount: totalCount || allQuests.length,
      statusBreakdown,
    };
  }, [allQuests, totalCount]);

  const handleViewAll = (): void => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate(`/campaigns/${campaignId}/quests`);
    }
  };

  const handleQuestClick = (questId: string): void => {
    navigate(`/campaigns/${campaignId}/quests/${questId}`);
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

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'not_started':
        return 'item-badge-not-started';
      case 'in_progress':
        return 'item-badge-in-progress';
      case 'completed':
        return 'item-badge-completed';
      case 'failed':
        return 'item-badge-failed';
      default:
        return 'item-badge-default';
    }
  };

  const formatStatusLabel = (status: string): string => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Calculate active and completed counts
  const activeCount = stats?.statusBreakdown
    ? (stats.statusBreakdown['in_progress'] || 0) + (stats.statusBreakdown['not_started'] || 0)
    : 0;
  const completedCount = stats?.statusBreakdown?.['completed'] || 0;

  const loading = labelsLoading || questsLoading || allQuestsLoading;
  const error = questsError;

  if (loading) {
    return (
      <div className="landing-card quest-landing-card">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="landing-card quest-landing-card">
        <div className="landing-card-error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  const themedLabel = getCategoryLabel('quests');

  return (
    <div className="landing-card quest-landing-card">
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
          <div className="quest-stats-grid">
            <div className="stat-item stat-active">
              <span className="stat-label">Active</span>
              <span className="stat-value">{activeCount}</span>
            </div>
            <div className="stat-item stat-completed">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{completedCount}</span>
            </div>
          </div>

          {stats.statusBreakdown && Object.keys(stats.statusBreakdown).length > 0 && (
            <div className="stat-breakdown">
              <span className="stat-breakdown-label">Status:</span>
              <div className="stat-breakdown-items">
                {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="stat-chip">
                    <span className="stat-chip-label">{formatStatusLabel(status)}</span>
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
        {recentQuests.length === 0 ? (
          <EmptyState
            message={`No ${themedLabel.toLowerCase()} yet`}
            description={`Create your first ${themedLabel.toLowerCase().slice(0, -1)} to get started`}
            actionLabel="Create"
            onAction={handleViewAll}
          />
        ) : (
          <ul className="landing-card-items">
            {recentQuests.map((quest) => (
              <li key={quest.id} className="landing-card-item">
                <button
                  type="button"
                  className="landing-card-item-button"
                  onClick={() => handleQuestClick(quest.id)}
                >
                  <div className="item-content">
                    <span className="item-name">{quest.name}</span>
                    <div className="item-meta">
                      {quest.status && (
                        <span className={`item-badge ${getStatusBadgeClass(quest.status)}`}>
                          {formatStatusLabel(quest.status)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="item-time">{formatRelativeTime(quest.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
