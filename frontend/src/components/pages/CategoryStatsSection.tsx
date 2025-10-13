import React from 'react';
import './CategoryStatsSection.css';

export interface CategoryStatItem {
  label: string;
  value: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export interface CategoryBreakdownItem {
  label: string;
  count: number;
}

export interface CategoryStatsSectionProps {
  stats: CategoryStatItem[];
  breakdown?: {
    title: string;
    items: CategoryBreakdownItem[];
  };
  loading?: boolean;
}

/**
 * Category Stats Section
 * Displays aggregate statistics at the top of category list pages
 * Shows primary stats (total, active, completed, etc.) and optional breakdown
 */
export const CategoryStatsSection: React.FC<CategoryStatsSectionProps> = ({
  stats,
  breakdown,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="category-stats-section">
        <div className="stats-loading">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="category-stats-section">
      <div className="stats-primary">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`stat-item stat-${stat.variant || 'default'}`}
          >
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      {breakdown && breakdown.items.length > 0 && (
        <div className="stats-breakdown">
          <h3 className="breakdown-title">{breakdown.title}</h3>
          <div className="breakdown-items">
            {breakdown.items.map((item, index) => (
              <div key={index} className="breakdown-chip">
                <span className="breakdown-label">{item.label}</span>
                <span className="breakdown-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
