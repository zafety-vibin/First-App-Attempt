import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategory } from '../../hooks/useCategory';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import { Location } from '../../utils/validationSchemas';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import './LocationLandingCard.css';

export interface LocationLandingCardProps {
  campaignId: string;
  onViewAll?: () => void;
}

export interface LocationStats {
  totalCount: number;
  typeBreakdown: Record<string, number>;
}

/**
 * Location summary widget for campaign dashboard
 * Shows total count, type breakdown, and recent locations
 */
export const LocationLandingCard: React.FC<LocationLandingCardProps> = ({ campaignId, onViewAll }) => {
  const navigate = useNavigate();
  const { getCategoryLabel, loading: labelsLoading } = useThematicLabels(campaignId);

  // Fetch recent locations (last 5)
  const {
    entities: recentLocations,
    loading: locationsLoading,
    error: locationsError,
    totalCount,
  } = useCategory<Location>('locations', campaignId, {
    pagination: { limit: 5, sort: 'updated_at:desc' },
  });

  // Fetch all locations for stats calculation
  const {
    entities: allLocations,
    loading: allLocationsLoading,
  } = useCategory<Location>('locations', campaignId, {
    pagination: { limit: 1000 }, // Get all locations for stats
  });

  // Calculate stats from allLocations
  const stats = React.useMemo(() => {
    if (!allLocations || allLocations.length === 0) return null;

    const typeBreakdown: Record<string, number> = {};

    allLocations.forEach((location) => {
      if (location.location_type) {
        typeBreakdown[location.location_type] =
          (typeBreakdown[location.location_type] || 0) + 1;
      }
    });

    return {
      totalCount: totalCount || allLocations.length,
      typeBreakdown,
    };
  }, [allLocations, totalCount]);

  const handleViewAll = (): void => {
    if (onViewAll) {
      onViewAll();
    } else {
      navigate(`/campaigns/${campaignId}/locations`);
    }
  };

  const handleLocationClick = (locationId: string): void => {
    navigate(`/campaigns/${campaignId}/locations/${locationId}`);
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

  const loading = labelsLoading || locationsLoading || allLocationsLoading;
  const error = locationsError;

  if (loading) {
    return (
      <div className="landing-card location-landing-card">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="landing-card location-landing-card">
        <div className="landing-card-error">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  const themedLabel = getCategoryLabel('locations');

  return (
    <div className="landing-card location-landing-card">
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

          {stats.typeBreakdown && Object.keys(stats.typeBreakdown).length > 0 && (
            <div className="stat-breakdown">
              <span className="stat-breakdown-label">Types:</span>
              <div className="stat-breakdown-items">
                {Object.entries(stats.typeBreakdown).map(([type, count]) => (
                  <div key={type} className="stat-chip">
                    <span className="stat-chip-label">{type}</span>
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
        {recentLocations.length === 0 ? (
          <EmptyState
            message={`No ${themedLabel.toLowerCase()} yet`}
            description={`Create your first ${themedLabel.toLowerCase().slice(0, -1)} to get started`}
            actionLabel="Create"
            onAction={handleViewAll}
          />
        ) : (
          <ul className="landing-card-items">
            {recentLocations.map((location) => (
              <li key={location.id} className="landing-card-item">
                <button
                  type="button"
                  className="landing-card-item-button"
                  onClick={() => handleLocationClick(location.id)}
                >
                  <div className="item-content">
                    <span className="item-name">{location.name}</span>
                    <div className="item-meta">
                      {location.location_type && (
                        <span className="item-badge item-badge-type">{location.location_type}</span>
                      )}
                      {location.size && <span className="item-meta-text">{location.size}</span>}
                    </div>
                  </div>
                  <span className="item-time">{formatRelativeTime(location.updated_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
