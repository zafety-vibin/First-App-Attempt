/**
 * NPCSummaryWidget - T014: NPC Summary Widget
 * Feature: 015-create-the-dashboard
 *
 * Displays NPC statistics with size-adaptive rendering:
 * - Compact (1x1, 2x2): Total count only
 * - Detailed (3x3+): Total count, relationship breakdown, recent NPCs
 */

import React, { useState, useEffect } from 'react';
import { BaseWidgetProps } from '../WidgetRegistry';
import { getNPCSummary, NPCSummaryData } from '../../../services/widgetDataService';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import './WidgetStyles.css';

export const NPCSummaryWidget: React.FC<BaseWidgetProps> = ({ size, viewMode, campaignId }) => {
  const [data, setData] = useState<NPCSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getNPCSummary(campaignId);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load NPC data');
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
        <div className="widget-empty-icon">📋</div>
        <div className="widget-empty-text">No data available</div>
      </div>
    );
  }

  const isCompact = size === '1x1' || size === '2x2';

  if (isCompact) {
    // Compact view: just show total count
    return (
      <div className="widget-compact">
        <div className="widget-compact-number">{data.totalCount}</div>
        <div className="widget-compact-label">Total NPCs</div>
      </div>
    );
  }

  // Detailed view: show counts, breakdown, and recent NPCs
  return (
    <div className="widget-detailed">
      <div className="widget-stat-primary">
        <div className="widget-stat-number">{data.totalCount}</div>
        <div className="widget-stat-label">Total NPCs</div>
      </div>

      <div className="widget-section">
        <h4 className="widget-section-title">Relationships</h4>
        <div className="widget-breakdown">
          <span className="widget-breakdown-item">
            <span className="widget-breakdown-icon">🤝</span> Allies: {data.relationshipBreakdown.ally}
          </span>
          <span className="widget-breakdown-item">
            <span className="widget-breakdown-icon">⚔️</span> Enemies: {data.relationshipBreakdown.enemy}
          </span>
          <span className="widget-breakdown-item">
            <span className="widget-breakdown-icon">🤷</span> Neutral: {data.relationshipBreakdown.neutral}
          </span>
        </div>
      </div>

      <div className="widget-section">
        <h4 className="widget-section-title">Recent NPCs</h4>
        <ul className="widget-list">
          {data.recentNPCs.length > 0 ? (
            data.recentNPCs.map((npc) => (
              <li key={npc.id} className="widget-list-item">
                {npc.name}
              </li>
            ))
          ) : (
            <li className="widget-list-empty">No NPCs yet</li>
          )}
        </ul>
      </div>
    </div>
  );
};
