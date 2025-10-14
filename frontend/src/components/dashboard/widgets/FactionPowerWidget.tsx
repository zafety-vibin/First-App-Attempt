/**
 * FactionPowerWidget - T016: Faction Power Widget
 * Feature: 015-create-the-dashboard
 *
 * Displays faction statistics with size-adaptive rendering:
 * - Compact (1x1, 2x2): Total count only
 * - Detailed (3x3+): Total count, power level distribution, active factions
 */

import React, { useState, useEffect } from 'react';
import { BaseWidgetProps } from '../WidgetRegistry';
import { getFactionPowerData, FactionPowerData } from '../../../services/widgetDataService';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import './WidgetStyles.css';

export const FactionPowerWidget: React.FC<BaseWidgetProps> = ({ size, viewMode, campaignId }) => {
  const [data, setData] = useState<FactionPowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getFactionPowerData(campaignId);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load faction data');
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
        <div className="widget-empty-icon">⚔️</div>
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
        <div className="widget-compact-label">Total Factions</div>
      </div>
    );
  }

  // Detailed view: show counts, breakdown, and active factions
  return (
    <div className="widget-detailed">
      <div className="widget-stat-primary">
        <div className="widget-stat-number">{data.totalCount}</div>
        <div className="widget-stat-label">Total Factions</div>
      </div>

      <div className="widget-section">
        <h4 className="widget-section-title">Power Distribution</h4>
        <div className="widget-breakdown">
          <span className="widget-breakdown-item">
            <span className="widget-breakdown-icon">👑</span> Major: {data.powerBreakdown.major}
          </span>
          <span className="widget-breakdown-item">
            <span className="widget-breakdown-icon">🏛️</span> Minor: {data.powerBreakdown.minor}
          </span>
        </div>
      </div>

      <div className="widget-section">
        <h4 className="widget-section-title">Active Factions</h4>
        <ul className="widget-list">
          {data.activeFactions.length > 0 ? (
            data.activeFactions.map((faction) => (
              <li key={faction.id} className="widget-list-item">
                {faction.name}
              </li>
            ))
          ) : (
            <li className="widget-list-empty">No factions yet</li>
          )}
        </ul>
      </div>
    </div>
  );
};
