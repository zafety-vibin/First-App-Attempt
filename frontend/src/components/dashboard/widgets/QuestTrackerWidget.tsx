/**
 * QuestTrackerWidget - T017: Quest Tracker Widget
 * Feature: 015-create-the-dashboard
 *
 * Displays quest statistics with size-adaptive rendering:
 * - Compact (1x1, 2x2): Active quest count only
 * - Detailed (3x3+): Active/completed counts, in-progress quest list
 */

import React, { useState, useEffect } from 'react';
import { BaseWidgetProps } from '../WidgetRegistry';
import { getQuestTrackerData, QuestTrackerData } from '../../../services/widgetDataService';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import './WidgetStyles.css';

export const QuestTrackerWidget: React.FC<BaseWidgetProps> = ({ size, viewMode, campaignId }) => {
  const [data, setData] = useState<QuestTrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getQuestTrackerData(campaignId);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load quest data');
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
        <div className="widget-empty-icon">🎯</div>
        <div className="widget-empty-text">No data available</div>
      </div>
    );
  }

  const isCompact = size === '1x1' || size === '2x2';

  if (isCompact) {
    // Compact view: just show active quest count
    return (
      <div className="widget-compact">
        <div className="widget-compact-number">{data.activeCount}</div>
        <div className="widget-compact-label">Active Quests</div>
      </div>
    );
  }

  // Detailed view: show active/completed counts and in-progress list
  return (
    <div className="widget-detailed">
      <div className="widget-stat-row">
        <div className="widget-stat-half">
          <div className="widget-stat-number">{data.activeCount}</div>
          <div className="widget-stat-label">Active</div>
        </div>
        <div className="widget-stat-half">
          <div className="widget-stat-number">{data.completedCount}</div>
          <div className="widget-stat-label">Completed</div>
        </div>
      </div>

      <div className="widget-section">
        <h4 className="widget-section-title">In Progress</h4>
        <ul className="widget-list">
          {data.inProgressQuests.length > 0 ? (
            data.inProgressQuests.map((quest) => (
              <li key={quest.id} className="widget-list-item">
                {quest.name}
              </li>
            ))
          ) : (
            <li className="widget-list-empty">No active quests</li>
          )}
        </ul>
      </div>
    </div>
  );
};
