import React from 'react';
import { useParams } from 'react-router-dom';
import { CategoryName } from '../../contexts/SidebarContext';
import { EntityDetailPage } from '../detail/EntityDetailPage';

/**
 * T060: Generic Category Detail View
 * Wrapper for EntityDetailPage that extracts route params
 */
export const GenericCategoryDetailView: React.FC = () => {
  const params = useParams<{ campaignId: string; category: CategoryName; entityId: string }>();

  const { campaignId, category, entityId } = params;

  if (!campaignId || !category || !entityId) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Error: Missing required route parameters</p>
      </div>
    );
  }

  return (
    <EntityDetailPage
      category={category}
      entityId={entityId}
      campaignId={campaignId}
    />
  );
};
