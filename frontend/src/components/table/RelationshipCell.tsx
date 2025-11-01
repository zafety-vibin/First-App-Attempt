import React, { useState, useEffect } from 'react';
import { CategoryName } from '../../contexts/SidebarContext';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import './RelationshipCell.css';

export interface RelationshipCellProps {
  entityIds: string[]; // Array of related entity IDs
  category: CategoryName; // Which category to fetch from
  campaignId: string;
  maxDisplay?: number; // Max entities to show before "+X more"
  onClick?: (entityId: string) => void; // Navigate to entity
}

interface EntityName {
  id: string;
  name: string;
}

/**
 * RelationshipCell Component
 * Displays relationship entity names (fetched from junction tables)
 * Replaces "3 NPCs" with "Elara, Marcus, Vex"
 *
 * Usage:
 * <RelationshipCell
 *   entityIds={["npc-123", "npc-456"]}
 *   category="npcs"
 *   campaignId={campaignId}
 * />
 */
export const RelationshipCell: React.FC<RelationshipCellProps> = ({
  entityIds,
  category,
  campaignId,
  maxDisplay = 3,
  onClick,
}) => {
  const [entities, setEntities] = useState<EntityName[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getCategoryLabel } = useThematicLabels(campaignId);

  useEffect(() => {
    if (!entityIds || entityIds.length === 0) {
      setEntities([]);
      return;
    }

    const fetchEntityNames = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch entities by IDs (limit to 100 to prevent massive queries)
        const idsToFetch = entityIds.slice(0, 100);

        // Build query string with IDs
        const idParams = idsToFetch.map(id => `ids[]=${id}`).join('&');
        const response = await fetch(
          `/api/campaigns/${campaignId}/${category}?${idParams}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch entity names');
        }

        const data = await response.json();

        // Extract id and name from response
        const fetchedEntities: EntityName[] = (data.data || data).map((entity: any) => ({
          id: entity.id,
          name: entity.name || 'Unnamed',
        }));

        setEntities(fetchedEntities);
      } catch (err: any) {
        setError(err.message || 'Failed to load');
        console.error('RelationshipCell fetch error:', err);
        // Fallback: show count
        setEntities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEntityNames();
  }, [entityIds, category, campaignId]);

  if (!entityIds || entityIds.length === 0) {
    return <span className="relationship-cell-empty">—</span>;
  }

  if (loading) {
    return <span className="relationship-cell-loading">Loading...</span>;
  }

  if (error || entities.length === 0) {
    // Fallback: show count
    const categoryLabel = getCategoryLabel(category);
    return (
      <span className="relationship-cell-count" title={error || 'Click to view details'}>
        {entityIds.length} {entityIds.length === 1 ? categoryLabel.slice(0, -1) : categoryLabel}
      </span>
    );
  }

  // Show first N entities, then "+X more"
  const displayEntities = entities.slice(0, maxDisplay);
  const remaining = entities.length - maxDisplay;

  return (
    <div className="relationship-cell">
      {displayEntities.map((entity, index) => (
        <React.Fragment key={entity.id}>
          <span
            className="relationship-cell-entity"
            onClick={() => onClick?.(entity.id)}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
          >
            {entity.name}
          </span>
          {index < displayEntities.length - 1 && <span className="relationship-cell-separator">, </span>}
        </React.Fragment>
      ))}
      {remaining > 0 && (
        <span className="relationship-cell-more" title={`${remaining} more`}>
          , +{remaining} more
        </span>
      )}
    </div>
  );
};
