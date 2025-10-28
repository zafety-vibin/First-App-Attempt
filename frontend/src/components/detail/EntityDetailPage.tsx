import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryName } from '../../contexts/SidebarContext';
import { useCategory } from '../../hooks/useCategory';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import { extractRelationships } from '../../utils/relationshipHelpers';
import { FieldDisplay } from './FieldDisplay';
import { RelationshipLinks } from './RelationshipLinks';
import { GenericEntityForm } from '../forms/GenericEntityForm';
import { DeleteConfirmation } from '../forms/DeleteConfirmation';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';
import LocationMapsTab from '../location/LocationMapsTab';
import './EntityDetailPage.css';

export interface EntityDetailPageProps {
  campaignId: string;
  category: CategoryName;
  entityId: string;
}

/**
 * Generic entity detail page with view/edit modes
 * Displays all entity fields, relationships, and DM-only information (in dm_view)
 *
 * Usage:
 * <EntityDetailPage campaignId={campaignId} category="npcs" entityId={npcId} />
 */
export const EntityDetailPage: React.FC<EntityDetailPageProps> = ({
  campaignId,
  category,
  entityId,
}) => {
  const navigate = useNavigate();
  const { getCategoryLabel } = useThematicLabels(campaignId);
  const { getById, update, delete: deleteEntity } = useCategory(category, campaignId, { autoFetch: false });

  const [entity, setEntity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'maps'>('details');

  // Get view mode from localStorage (for DM field visibility)
  const viewMode = localStorage.getItem(`viewMode_${campaignId}`) || 'dm_view';
  const isDmView = viewMode === 'dm_view';

  // Fetch entity on mount
  useEffect(() => {
    const fetchEntity = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedEntity = await getById(entityId);
        setEntity(fetchedEntity);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch entity';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchEntity();
  }, [entityId, getById]);

  // Handle update
  const handleUpdate = async (updatedData: any) => {
    try {
      const updated = await update(entityId, updatedData);
      setEntity(updated);
      setEditMode(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update entity';
      alert(`Update failed: ${errorMessage}`);
      throw err; // Re-throw for form handling
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteEntity(entityId);
      // Navigate back to category landing page
      navigate(`/campaigns/${campaignId}/${category}`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete entity';
      alert(`Delete failed: ${errorMessage}`);
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate(`/campaigns/${campaignId}/${category}`);
  };

  // Extract relationships
  const relationships = entity ? extractRelationships(entity, category) : [];

  // Get DM-only field keys
  const getDmFields = (entity: any): string[] => {
    if (!entity) return [];
    return Object.keys(entity).filter(key => key.startsWith('dm_'));
  };

  const dmFields = getDmFields(entity);

  // Render universal fields
  const renderUniversalFields = () => {
    if (!entity) return null;

    return (
      <>
        <FieldDisplay label="Description" value={entity.description} type="text" />
        <FieldDisplay label="Status" value={entity.core_status} type="text" />
        <FieldDisplay label="Player Knowledge" value={entity.player_knowledge} type="text" />
        <FieldDisplay label="Tags" value={entity.tags} type="array" />
        <FieldDisplay label="Created" value={entity.created_at} type="date" />
        <FieldDisplay label="Updated" value={entity.updated_at} type="date" />
      </>
    );
  };

  // Render category-specific fields (non-universal, non-DM, non-system)
  const renderCategoryFields = () => {
    if (!entity) return null;

    // Exclude universal fields, DM fields, system fields, and map data (shown in Maps tab)
    const excludedFields = new Set([
      'id', 'campaign_id', 'name', 'description', 'core_status',
      'player_knowledge', 'tags', 'created_at', 'updated_at', 'custom_fields',
      'map_images', 'map_pins', 'faction_regions', 'map_pin_x', 'map_pin_y', // Feature 021: Map data shown in Maps tab
      ...dmFields,
    ]);

    const categoryFieldKeys = Object.keys(entity).filter(key => !excludedFields.has(key));

    if (categoryFieldKeys.length === 0) return null;

    return categoryFieldKeys.map(key => {
      const value = entity[key];

      // Determine field type
      let type: 'text' | 'date' | 'array' | 'json' | 'number' = 'text';
      if (Array.isArray(value)) {
        type = 'array';
      } else if (typeof value === 'number' && !key.includes('id')) {
        type = 'number';
      } else if (key.includes('date') && typeof value === 'number') {
        type = 'date';
      } else if (typeof value === 'object' && value !== null) {
        type = 'json';
      }

      // Format label (snake_case to Title Case)
      const label = key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return <FieldDisplay key={key} label={label} value={value} type={type} />;
    });
  };

  // Render DM-only fields
  const renderDmFields = () => {
    if (!entity || !isDmView || dmFields.length === 0) return null;

    return (
      <section className="entity-detail-section entity-detail-dm-section">
        <h2 className="entity-detail-section-title">DM-Only Information</h2>
        <dl className="entity-detail-fields">
          {dmFields.map(key => {
            const value = entity[key];
            const label = key
              .replace('dm_', '')
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            return <FieldDisplay key={key} label={label} value={value} type="text" />;
          })}
        </dl>
      </section>
    );
  };

  // Render custom fields
  const renderCustomFields = () => {
    if (!entity || !entity.custom_fields || Object.keys(entity.custom_fields).length === 0) {
      return null;
    }

    return (
      <section className="entity-detail-section">
        <h2 className="entity-detail-section-title">Custom Fields</h2>
        <dl className="entity-detail-fields">
          <FieldDisplay label="Custom Fields" value={entity.custom_fields} type="json" />
        </dl>
      </section>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="entity-detail-loading">
        <LoadingSpinner size="lg" />
        <p>Loading {getCategoryLabel(category)}...</p>
      </div>
    );
  }

  // Error state
  if (error || !entity) {
    return (
      <div className="entity-detail-error">
        <h2>Error Loading Entity</h2>
        <p>{error || 'Entity not found'}</p>
        <button onClick={handleBack} className="entity-detail-back-button">
          Back to {getCategoryLabel(category)}
        </button>
      </div>
    );
  }

  // Edit mode
  if (editMode) {
    return (
      <ErrorBoundary>
        <div className="entity-detail-page">
          <GenericEntityForm
            category={category}
            campaignId={campaignId}
            entity={entity}
            onSubmit={handleUpdate}
            onCancel={() => setEditMode(false)}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // View mode
  return (
    <ErrorBoundary>
      <div className="entity-detail-page">
        {/* Header */}
        <header className="entity-detail-header">
          <button
            onClick={handleBack}
            className="entity-detail-back-button"
            aria-label="Go back"
          >
            ← Back
          </button>

          <div className="entity-detail-title-row">
            <h1 className="entity-detail-title">{entity.name}</h1>
            <div className="entity-detail-actions">
              <button
                onClick={() => setEditMode(true)}
                className="entity-detail-action-button entity-detail-edit-button"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="entity-detail-action-button entity-detail-delete-button"
              >
                Delete
              </button>
            </div>
          </div>
        </header>

        {/* Tab Navigation (for locations only) */}
        {category === 'locations' && (
          <nav className="entity-detail-tabs">
            <button
              className={`entity-detail-tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`entity-detail-tab ${activeTab === 'maps' ? 'active' : ''}`}
              onClick={() => setActiveTab('maps')}
            >
              Maps
            </button>
          </nav>
        )}

        {/* Maps Tab Content (locations only) */}
        {category === 'locations' && activeTab === 'maps' ? (
          <LocationMapsTab locationId={entityId} campaignId={campaignId} />
        ) : (
          <>
            {/* Universal Fields */}
            <section className="entity-detail-section">
              <h2 className="entity-detail-section-title">Basic Information</h2>
              <dl className="entity-detail-fields">
                {renderUniversalFields()}
              </dl>
            </section>

            {/* Category-Specific Fields */}
            <section className="entity-detail-section">
              <h2 className="entity-detail-section-title">
                {getCategoryLabel(category)} Details
              </h2>
              <dl className="entity-detail-fields">
                {renderCategoryFields()}
              </dl>
            </section>

            {/* Relationships */}
            {relationships.length > 0 && (
              <section className="entity-detail-section">
                <h2 className="entity-detail-section-title">Relationships</h2>
                <RelationshipLinks relationships={relationships} campaignId={campaignId} />
              </section>
            )}

            {/* DM-Only Fields */}
            {renderDmFields()}

            {/* Custom Fields */}
            {renderCustomFields()}
          </>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmation
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
          entityName={entity.name}
          entityType={getCategoryLabel(category)}
          loading={deleting}
        />
      </div>
    </ErrorBoundary>
  );
};
