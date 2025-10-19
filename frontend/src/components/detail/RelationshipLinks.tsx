import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryName } from '../../contexts/SidebarContext';
import { Relationship, RelationshipWithEntities, buildRelationshipLinks } from '../../utils/relationshipHelpers';
import { useThematicLabels } from '../../hooks/useThematicLabels';
import { useCategory } from '../../hooks/useCategory';
import './RelationshipLinks.css';

export interface RelationshipLinksProps {
  relationships: Relationship[];
  campaignId: string;
}

/**
 * Displays relationships with clickable links to related entities
 * Fetches entity names and renders as navigable chips
 *
 * Usage:
 * <RelationshipLinks relationships={extractRelationships(entity, category)} campaignId={campaignId} />
 */
export const RelationshipLinks: React.FC<RelationshipLinksProps> = ({
  relationships,
  campaignId,
}) => {
  const navigate = useNavigate();
  const { getCategoryLabel } = useThematicLabels(campaignId);
  const [relationshipsWithData, setRelationshipsWithData] = useState<RelationshipWithEntities[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch entity data for all relationships
  useEffect(() => {
    const fetchRelationshipData = async () => {
      if (relationships.length === 0) {
        setRelationshipsWithData([]);
        return;
      }

      setLoading(true);
      try {
        // Group entity IDs by category for batch fetching
        const categoryMap: Record<CategoryName, string[]> = {} as any;
        relationships.forEach((rel) => {
          if (!categoryMap[rel.category]) {
            categoryMap[rel.category] = [];
          }
          categoryMap[rel.category].push(...rel.entityIds);
        });

        // Fetch entities per category (batch fetch)
        const entityDataMap: Record<CategoryName, Record<string, { id: string; name: string }>> = {} as any;

        await Promise.all(
          Object.entries(categoryMap).map(async ([category, ids]) => {
            // Use useCategory hook to fetch entities
            // Note: In real implementation, we'd need a batch fetch API endpoint
            // For now, fetch individually (can be optimized later)
            const uniqueIds = [...new Set(ids)];
            const entities: Record<string, { id: string; name: string }> = {};

            // Static service mapping (Vite requires static imports)
            const SERVICE_MAP: Record<string, any> = {
              npcs: () => import('../../services/npcService'),
              factions: () => import('../../services/factionService'),
              locations: () => import('../../services/locationService'),
              quests: () => import('../../services/questService'),
              session_recaps: () => import('../../services/sessionRecapService'),
              player_characters: () => import('../../services/playerCharacterService'),
              lore_entries: () => import('../../services/loreEntryService'),
              world_rules: () => import('../../services/worldRuleService'),
              planar_forces: () => import('../../services/planarForceService'),
              session_preps: () => import('../../services/sessionPrepService'),
              custom_mechanics: () => import('../../services/customMechanicService'),
              items: () => import('../../services/itemService'),
              creatures: () => import('../../services/creatureService')
            };

            // Fetch each entity (optimize with batch endpoint later)
            await Promise.all(
              uniqueIds.map(async (id) => {
                try {
                  // Use static service map
                  const serviceLoader = SERVICE_MAP[category];
                  if (!serviceLoader) {
                    throw new Error(`No service for category: ${category}`);
                  }

                  const service = await serviceLoader();
                  const singularFn = Object.keys(service).find(key => key.startsWith('get') && key.endsWith('ById'));
                  if (singularFn) {
                    const entity = await (service as any)[singularFn](id);
                    entities[id] = { id: entity.id, name: entity.name };
                  }
                } catch (error) {
                  console.error(`Failed to fetch ${category} entity ${id}:`, error);
                  // Keep entity ID as fallback
                  entities[id] = { id, name: `[${category} ${id}]` };
                }
              })
            );

            entityDataMap[category as CategoryName] = entities;
          })
        );

        // Build relationships with entity data
        const relationshipsWithEntities = buildRelationshipLinks(relationships, entityDataMap);
        setRelationshipsWithData(relationshipsWithEntities);
      } catch (error) {
        console.error('Failed to fetch relationship data:', error);
        // Fallback to relationships without entity names
        setRelationshipsWithData(
          relationships.map(rel => ({
            ...rel,
            entities: rel.entityIds.map(id => ({ id, name: `[${id}]` })),
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRelationshipData();
  }, [relationships, campaignId]);

  // Handle navigation to related entity
  const handleEntityClick = (category: CategoryName, entityId: string) => {
    navigate(`/campaigns/${campaignId}/${category}/${entityId}`);
  };

  if (relationships.length === 0) {
    return (
      <div className="relationship-links-empty">
        <p className="relationship-links-empty-text">No relationships</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relationship-links-loading">
        <div className="relationship-links-spinner" />
        <span>Loading relationships...</span>
      </div>
    );
  }

  return (
    <div className="relationship-links">
      {relationshipsWithData.map((relationship, index) => (
        <div key={index} className="relationship-group">
          <div className="relationship-group-header">
            <span className="relationship-label">
              {relationship.label}:
            </span>
            <span className="relationship-category-badge">
              {getCategoryLabel(relationship.category)}
            </span>
          </div>

          {relationship.entities.length === 0 ? (
            <span className="relationship-none">None</span>
          ) : (
            <div className="relationship-chips">
              {relationship.entities.map((entity) => (
                <button
                  key={entity.id}
                  className="relationship-chip"
                  onClick={() => handleEntityClick(relationship.category, entity.id)}
                  type="button"
                  aria-label={`Navigate to ${entity.name}`}
                >
                  {entity.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
