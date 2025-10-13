import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategory } from '../../hooks/useCategory';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import { SessionRecap, SessionPrep } from '../../utils/validationSchemas';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import './SessionTimelineCard.css';

export interface SessionTimelineCardProps {
  campaignId: string;
}

/**
 * Session timeline widget for campaign dashboard
 * Shows last session recap, next session prep, and current in-game date
 */
export const SessionTimelineCard: React.FC<SessionTimelineCardProps> = ({ campaignId }) => {
  const navigate = useNavigate();
  const { getCategoryLabel, loading: labelsLoading } = useThematicLabels(campaignId);

  // Fetch last session recap (most recent by session_date)
  const {
    entities: recaps,
    loading: recapsLoading,
    error: recapsError,
  } = useCategory<SessionRecap>('session_recaps', campaignId, {
    pagination: { limit: 1, sort: 'session_date:desc' },
  });

  // Fetch next session prep (earliest planned_date with status 'ready')
  const {
    entities: preps,
    loading: prepsLoading,
    error: prepsError,
  } = useCategory<SessionPrep>('session_prep', campaignId, {
    pagination: { limit: 1, sort: 'planned_date:asc' },
    filters: { prep_status: 'ready' },
  });

  const lastRecap = recaps.length > 0 ? recaps[0] : null;
  const nextPrep = preps.length > 0 ? preps[0] : null;

  const handleRecapClick = (): void => {
    if (lastRecap) {
      navigate(`/campaigns/${campaignId}/session_recaps/${lastRecap.id}`);
    }
  };

  const handlePrepClick = (): void => {
    if (nextPrep) {
      navigate(`/campaigns/${campaignId}/session_prep/${nextPrep.id}`);
    }
  };

  const handleViewRecaps = (): void => {
    navigate(`/campaigns/${campaignId}/session_recaps`);
  };

  const handleViewPrep = (): void => {
    navigate(`/campaigns/${campaignId}/session_prep`);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  const loading = labelsLoading || recapsLoading || prepsLoading;
  const error = recapsError || prepsError;

  if (loading) {
    return (
      <div className="landing-card session-timeline-card">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="landing-card session-timeline-card">
        <div className="landing-card-error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  const recapLabel = getCategoryLabel('session_recaps');
  const prepLabel = getCategoryLabel('session_prep');

  return (
    <div className="landing-card session-timeline-card">
      <div className="landing-card-header">
        <h3 className="landing-card-title">Session Timeline</h3>
      </div>

      <div className="landing-card-stats">
        {lastRecap && lastRecap.in_game_date_end && (
          <div className="stat-item stat-in-game-date">
            <span className="stat-label">Current In-Game Date</span>
            <span className="stat-value-text">{lastRecap.in_game_date_end}</span>
          </div>
        )}
      </div>

      <div className="timeline-sections">
        {/* Last Session Recap */}
        <div className="timeline-section">
          <div className="timeline-section-header">
            <h4 className="timeline-section-title">Last Session</h4>
            <button
              type="button"
              className="timeline-section-link"
              onClick={handleViewRecaps}
              aria-label={`View all ${recapLabel}`}
            >
              View All
            </button>
          </div>

          {lastRecap ? (
            <button
              type="button"
              className="timeline-item-button"
              onClick={handleRecapClick}
            >
              <div className="timeline-item-content">
                <div className="timeline-item-header">
                  <span className="timeline-item-session">Session {lastRecap.session_number}</span>
                  <span className="timeline-item-date">{formatDate(lastRecap.session_date)}</span>
                </div>
                <span className="timeline-item-title">{lastRecap.name}</span>
                {lastRecap.description && (
                  <p className="timeline-item-description">
                    {lastRecap.description.length > 100
                      ? `${lastRecap.description.substring(0, 100)}...`
                      : lastRecap.description}
                  </p>
                )}
                <span className="timeline-item-time">
                  {formatRelativeTime(lastRecap.updated_at)}
                </span>
              </div>
            </button>
          ) : (
            <EmptyState
              message={`No ${recapLabel.toLowerCase()} yet`}
              description="Record your first session to start the timeline"
              actionLabel="View Recaps"
              onAction={handleViewRecaps}
            />
          )}
        </div>

        {/* Next Session Prep */}
        <div className="timeline-section">
          <div className="timeline-section-header">
            <h4 className="timeline-section-title">Next Session</h4>
            <button
              type="button"
              className="timeline-section-link"
              onClick={handleViewPrep}
              aria-label={`View all ${prepLabel}`}
            >
              View All
            </button>
          </div>

          {nextPrep ? (
            <button
              type="button"
              className="timeline-item-button"
              onClick={handlePrepClick}
            >
              <div className="timeline-item-content">
                <div className="timeline-item-header">
                  <span className="timeline-item-session">Session {nextPrep.session_number}</span>
                  {nextPrep.planned_date && (
                    <span className="timeline-item-date">{formatDate(nextPrep.planned_date)}</span>
                  )}
                </div>
                <span className="timeline-item-title">{nextPrep.name}</span>
                {nextPrep.prep_status && (
                  <span className="timeline-item-badge timeline-item-badge-status">
                    {nextPrep.prep_status}
                  </span>
                )}
                {nextPrep.description && (
                  <p className="timeline-item-description">
                    {nextPrep.description.length > 100
                      ? `${nextPrep.description.substring(0, 100)}...`
                      : nextPrep.description}
                  </p>
                )}
              </div>
            </button>
          ) : (
            <EmptyState
              message="No upcoming session prep"
              description="Create session prep to plan your next game"
              actionLabel="View Prep"
              onAction={handleViewPrep}
            />
          )}
        </div>
      </div>
    </div>
  );
};
