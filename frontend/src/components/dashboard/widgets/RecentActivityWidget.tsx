/**
 * RecentActivityWidget - T020: Recent Activity Widget
 * Feature: 015-create-the-dashboard
 *
 * Displays recent updates across all categories with size-adaptive rendering:
 * - Compact (1x1, 2x2): Count of recent updates only
 * - Detailed (2x4, 3x3+): List of recent updates with category, name, timestamp
 */

import React, { useState, useEffect } from 'react';
import { BaseWidgetProps } from '../WidgetRegistry';
import { getRecentActivityData, RecentActivityData } from '../../../services/widgetDataService';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import './WidgetStyles.css';

export const RecentActivityWidget: React.FC<BaseWidgetProps> = ({ size, viewMode, campaignId }) => {
  const [data, setData] = useState<RecentActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getRecentActivityData(campaignId);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load activity data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      mounted = false;
    };
  }, [campaignId, viewMode]);

  if (loading) {
    return (
      <div className="widget-loading">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="widget-error">
        <div className="widget-error-icon">⚠️</div>
        <div className="widget-error-text">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget-empty">
        <div className="widget-empty-icon">📊</div>
        <div className="widget-empty-text">No data available</div>
      </div>
    );
  }

  const isCompact = size === '1x1' || size === '2x2';

  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format category name for display
  const formatCategory = (category: string) => {
    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isCompact) {
    // Compact view: just show count of recent updates
    return (
      <div className="widget-compact">
        <div className="widget-compact-number">{data.recentUpdates.length}</div>
        <div className="widget-compact-label">Recent Updates</div>
      </div>
    );
  }

  // Detailed view: show list of recent updates
  return (
    <div className="widget-detailed">
      <div className="widget-section">
        <h4 className="widget-section-title">Recent Activity</h4>
        <ul className="widget-activity-list">
          {data.recentUpdates.length > 0 ? (
            data.recentUpdates.map((update, index) => (
              <li key={`${update.category}-${update.id}-${index}`} className="widget-activity-item">
                <div className="widget-activity-header">
                  <span className="widget-activity-category">{formatCategory(update.category)}</span>
                  <span className="widget-activity-time">{formatRelativeTime(update.updated_at)}</span>
                </div>
                <div className="widget-activity-name">{update.name}</div>
              </li>
            ))
          ) : (
            <li className="widget-list-empty">No recent activity</li>
          )}
        </ul>
      </div>
    </div>
  );
};
