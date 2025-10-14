import React from 'react';
import { useParams } from 'react-router-dom';
import { EntityDetailPage } from '../components/detail/EntityDetailPage';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { CategoryName } from '../contexts/SidebarContext';

/**
 * T029: CategoryDetailPageRoute component
 * Route page wrapper for entity detail view
 * Renders EntityDetailPage with campaign, category, and entity context
 */
export const CategoryDetailPageRoute: React.FC = () => {
  const { campaignId, category, entityId } = useParams<{
    campaignId: string;
    category: CategoryName;
    entityId: string;
  }>();

  if (!campaignId || !category || !entityId) {
    return <div className="error-message">Invalid route parameters</div>;
  }

  return (
    <ErrorBoundary>
      <EntityDetailPage
        campaignId={campaignId}
        category={category}
        entityId={entityId}
      />
    </ErrorBoundary>
  );
};
