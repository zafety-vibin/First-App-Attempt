/**
 * SessionTimelineWidget - T018: Session Timeline Widget
 * Feature: 015-create-the-dashboard
 *
 * Displays session timeline with size-adaptive rendering:
 * - Compact (1x1, 2x2): Last recap date only
 * - Detailed (3x3+): Last recap, next prep, in-game date
 */

import React, { useState, useEffect } from 'react';
import { BaseWidgetProps } from '../WidgetRegistry';
import { getSessionTimelineData, SessionTimelineData } from '../../../services/widgetDataService';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import './WidgetStyles.css';

export const SessionTimelineWidget: React.FC<BaseWidgetProps> = ({ size, viewMode, campaignId }) => {
  const [data, setData] = useState<SessionTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getSessionTimelineData(campaignId);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load session data');
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
        <div className="widget-empty-icon">📅</div>
        <div className="widget-empty-text">No data available</div>
      </div>
    );
  }

  const isCompact = size === '1x1' || size === '2x2';

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isCompact) {
    // Compact view: just show last recap date or "No sessions"
    return (
      <div className="widget-compact">
        {data.lastRecap ? (
          <>
            <div className="widget-compact-number">{formatDate(data.lastRecap.created_at)}</div>
            <div className="widget-compact-label">Last Session</div>
          </>
        ) : (
          <>
            <div className="widget-compact-icon">📅</div>
            <div className="widget-compact-label">No sessions yet</div>
          </>
        )}
      </div>
    );
  }

  // Detailed view: show last recap, next prep, in-game date
  return (
    <div className="widget-detailed">
      <div className="widget-section">
        <h4 className="widget-section-title">Last Recap</h4>
        {data.lastRecap ? (
          <div className="widget-timeline-item">
            <div className="widget-timeline-name">{data.lastRecap.name}</div>
            <div className="widget-timeline-meta">
              {formatDate(data.lastRecap.created_at)}
              {data.lastRecap.in_game_date && (
                <span className="widget-timeline-date"> • {data.lastRecap.in_game_date}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="widget-list-empty">No session recaps yet</div>
        )}
      </div>

      <div className="widget-section">
        <h4 className="widget-section-title">Next Prep</h4>
        {data.nextPrep ? (
          <div className="widget-timeline-item">
            <div className="widget-timeline-name">{data.nextPrep.name}</div>
            <div className="widget-timeline-meta">{formatDate(data.nextPrep.created_at)}</div>
          </div>
        ) : (
          <div className="widget-list-empty">No session prep yet</div>
        )}
      </div>
    </div>
  );
};
