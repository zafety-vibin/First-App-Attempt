/**
 * LocationExplorerWidget - T015: Location Explorer Widget
 * Feature: 015-create-the-dashboard
 *
 * Displays location statistics with size-adaptive rendering:
 * - Compact (1x1, 2x2): Total count only
 * - Detailed (3x3+): Total count, type breakdown, recent locations
 */

import React, { useState, useEffect } from 'react';
import { BaseWidgetProps } from '../WidgetRegistry';
import { getLocationSummary, LocationSummaryData } from '../../../services/widgetDataService';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import './WidgetStyles.css';

export const LocationExplorerWidget: React.FC<BaseWidgetProps> = ({ size, viewMode, campaignId }) => {
  const [data, setData] = useState<LocationSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getLocationSummary(campaignId);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load location data');
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
        <div className="widget-empty-icon">📍</div>
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
        <div className="widget-compact-label">Total Locations</div>
      </div>
    );
  }

  // Detailed view: show counts, breakdown, and recent locations
  return (
    <div className="widget-detailed">
      <div className="widget-stat-primary">
        <div className="widget-stat-number">{data.totalCount}</div>
        <div className="widget-stat-label">Total Locations</div>
      </div>

      <div className="widget-section">
        <h4 className="widget-section-title">Location Types</h4>
        <div className="widget-breakdown">
          {Object.keys(data.typeBreakdown).length > 0 ? (
            Object.entries(data.typeBreakdown).map(([type, count]) => (
              <span key={type} className="widget-breakdown-item">
                <span className="widget-breakdown-icon">📍</span>{' '}
                {type.charAt(0).toUpperCase() + type.slice(1)}: {count}
              </span>
            ))
          ) : (
            <span className="widget-breakdown-empty">No type data</span>
          )}
        </div>
      </div>

      <div className="widget-section">
        <h4 className="widget-section-title">Recent Locations</h4>
        <ul className="widget-list">
          {data.recentLocations.length > 0 ? (
            data.recentLocations.map((location) => (
              <li key={location.id} className="widget-list-item">
                {location.name}
              </li>
            ))
          ) : (
            <li className="widget-list-empty">No locations yet</li>
          )}
        </ul>
      </div>
    </div>
  );
};
