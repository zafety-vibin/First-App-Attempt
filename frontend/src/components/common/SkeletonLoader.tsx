import React from 'react';
import './SkeletonLoader.css';

export interface SkeletonLoaderProps {
  type: 'widget' | 'table' | 'form' | 'detail';
  className?: string;
}

/**
 * Skeleton placeholder component with shimmer animation
 * Renders different layouts based on type prop
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'widget':
        return (
          <div className="skeleton-widget">
            <div className="skeleton-item skeleton-title" />
            <div className="skeleton-item skeleton-content" />
            <div className="skeleton-item skeleton-footer" />
          </div>
        );

      case 'table':
        return (
          <div className="skeleton-table">
            <div className="skeleton-item skeleton-table-header" />
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton-item skeleton-table-row" />
            ))}
          </div>
        );

      case 'form':
        return (
          <div className="skeleton-form">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton-field">
                <div className="skeleton-item skeleton-label" />
                <div className="skeleton-item skeleton-input" />
              </div>
            ))}
          </div>
        );

      case 'detail':
        return (
          <div className="skeleton-detail">
            <div className="skeleton-item skeleton-detail-title" />
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton-item skeleton-field-row" />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`skeleton-loader ${className}`} aria-busy="true" aria-label="Loading content">
      {renderSkeleton()}
    </div>
  );
};
