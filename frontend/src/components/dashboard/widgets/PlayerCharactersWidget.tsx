/**
 * PlayerCharactersWidget - T019: Player Characters Widget
 * Feature: 015-create-the-dashboard
 *
 * Displays player character statistics with size-adaptive rendering:
 * - Compact (1x1, 2x2): Active PC count only
 * - Detailed (3x3+): Active count, level range, party roster
 */

import React, { useState, useEffect } from 'react';
import { BaseWidgetProps } from '../WidgetRegistry';
import { getPlayerCharacterData, PlayerCharacterData } from '../../../services/widgetDataService';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import './WidgetStyles.css';

export const PlayerCharactersWidget: React.FC<BaseWidgetProps> = ({ size, viewMode, campaignId }) => {
  const [data, setData] = useState<PlayerCharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const result = await getPlayerCharacterData(campaignId);
        if (mounted) {
          setData(result);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load player character data');
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
        <div className="widget-empty-icon">👥</div>
        <div className="widget-empty-text">No data available</div>
      </div>
    );
  }

  const isCompact = size === '1x1' || size === '2x2';

  if (isCompact) {
    // Compact view: just show active PC count
    return (
      <div className="widget-compact">
        <div className="widget-compact-number">{data.activeCount}</div>
        <div className="widget-compact-label">Player Characters</div>
      </div>
    );
  }

  // Detailed view: show count, level range, and party roster
  return (
    <div className="widget-detailed">
      <div className="widget-stat-primary">
        <div className="widget-stat-number">{data.activeCount}</div>
        <div className="widget-stat-label">
          Player Characters
          {data.levelRange && (
            <span className="widget-stat-sublabel">
              {' '}
              (Levels {data.levelRange.min}-{data.levelRange.max})
            </span>
          )}
        </div>
      </div>

      <div className="widget-section">
        <h4 className="widget-section-title">Party Roster</h4>
        <ul className="widget-list">
          {data.partyRoster.length > 0 ? (
            data.partyRoster.map((pc) => (
              <li key={pc.id} className="widget-list-item">
                <span className="widget-pc-name">{pc.name}</span>
                <span className="widget-pc-meta">
                  {' '}
                  — Lv{pc.level} {pc.character_class}
                </span>
              </li>
            ))
          ) : (
            <li className="widget-list-empty">No player characters yet</li>
          )}
        </ul>
      </div>
    </div>
  );
};
