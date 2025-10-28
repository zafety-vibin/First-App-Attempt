/**
 * HierarchyBreadcrumb Component
 * Feature: 021-create-a-geographic
 * Task: T038
 *
 * Clickable breadcrumb path from root to current location.
 * Shows navigation history with separator arrows.
 */

import React from 'react';
import './HierarchyBreadcrumb.css';

export interface BreadcrumbItem {
  locationId: string;
  locationName: string;
  mapIndex: number;
}

export interface HierarchyBreadcrumbProps {
  breadcrumb: BreadcrumbItem[];
  onBreadcrumbClick: (index: number) => void;
}

const HierarchyBreadcrumb: React.FC<HierarchyBreadcrumbProps> = ({
  breadcrumb,
  onBreadcrumbClick,
}) => {
  if (breadcrumb.length === 0) {
    return null;
  }

  return (
    <nav className="hierarchy-breadcrumb" aria-label="Geographic hierarchy breadcrumb">
      {breadcrumb.map((item, index) => (
        <React.Fragment key={item.locationId}>
          <button
            className={`breadcrumb-item ${index === breadcrumb.length - 1 ? 'current' : ''}`}
            onClick={() => onBreadcrumbClick(index)}
            aria-current={index === breadcrumb.length - 1 ? 'page' : undefined}
          >
            {item.locationName}
          </button>

          {index < breadcrumb.length - 1 && (
            <span className="breadcrumb-separator" aria-hidden="true">
              →
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default HierarchyBreadcrumb;
