import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GenericEntityForm } from '../components/forms/GenericEntityForm';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CategoryName } from '../contexts/SidebarContext';
import { useCategoryService } from '../hooks/useCategory';

/**
 * T031: CategoryEditPageRoute component
 * Route page wrapper for entity editing
 * Fetches entity data and handles form submission
 */
export const CategoryEditPageRoute: React.FC = () => {
  const { campaignId, category, entityId } = useParams<{
    campaignId: string;
    category: CategoryName;
    entityId: string;
  }>();
  const navigate = useNavigate();
  const { getEntity, updateEntity } = useCategoryService(category!);

  const [entity, setEntity] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityId || !category) return;

    const fetchEntity = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getEntity(entityId);
        setEntity(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch entity');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntity();
  }, [entityId, category, getEntity]);

  if (!campaignId || !category || !entityId) {
    return <div className="error-message">Invalid route parameters</div>;
  }

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await updateEntity(entityId, data);
      // Navigate to detail page on success
      navigate(`/campaigns/${campaignId}/${category}/${entityId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entity');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Navigate back to detail page
    navigate(`/campaigns/${campaignId}/${category}/${entityId}`);
  };

  if (isLoading) {
    return (
      <div className="category-edit-page loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !entity) {
    return (
      <div className="category-edit-page error">
        <div className="error-message" role="alert">
          {error}
        </div>
        <button onClick={handleCancel}>Go Back</button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="category-edit-page">
        <h1>Edit {category.replace('_', ' ')}</h1>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <GenericEntityForm
          category={category}
          campaignId={campaignId}
          initialData={entity}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </ErrorBoundary>
  );
};
