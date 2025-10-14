import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GenericEntityForm } from '../components/forms/GenericEntityForm';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { CategoryName } from '../contexts/SidebarContext';
import { useCategoryService } from '../hooks/useCategory';

/**
 * T030: CategoryCreatePageRoute component
 * Route page wrapper for entity creation
 * Handles form submission and navigation
 */
export const CategoryCreatePageRoute: React.FC = () => {
  const { campaignId, category } = useParams<{ campaignId: string; category: CategoryName }>();
  const navigate = useNavigate();
  const { createEntity } = useCategoryService(category!);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!campaignId || !category) {
    return <div className="error-message">Invalid route parameters</div>;
  }

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createEntity({ ...data, campaign_id: campaignId });
      // Navigate to detail page on success
      navigate(`/campaigns/${campaignId}/${category}/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entity');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to category landing page
    navigate(`/campaigns/${campaignId}/${category}`);
  };

  return (
    <ErrorBoundary>
      <div className="category-create-page">
        <h1>Create New {category.replace('_', ' ')}</h1>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <GenericEntityForm
          category={category}
          campaignId={campaignId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </ErrorBoundary>
  );
};
