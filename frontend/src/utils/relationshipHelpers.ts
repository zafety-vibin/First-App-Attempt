import { CategoryName } from './thematicNames';

export interface Relationship {
  label: string;
  category: CategoryName;
  entityIds: string[];
  isArray: boolean; // true for JSON array relations, false for single FK
}

/**
 * Extracts relationships from an entity based on category schema
 * @param entity - Entity object from API
 * @param category - Category name (determines which fields are relationships)
 * @returns Array of relationship objects
 */
export function extractRelationships(entity: any, category: CategoryName): Relationship[] {
  if (!entity) return [];

  const relationships: Relationship[] = [];

  // Define relationship mappings per category
  const relationshipMaps: Record<CategoryName, Array<{ field: string; label: string; category: CategoryName; isArray: boolean }>> = {
    npcs: [
      { field: 'faction_id', label: 'Faction', category: 'factions', isArray: false },
      { field: 'superior_npc_id', label: 'Superior', category: 'npcs', isArray: false },
      { field: 'locations', label: 'Locations', category: 'locations', isArray: true },
    ],
    locations: [
      { field: 'parent_location_id', label: 'Parent Location', category: 'locations', isArray: false },
      { field: 'controlling_faction_id', label: 'Controlling Faction', category: 'factions', isArray: false },
      { field: 'key_members', label: 'Key Members', category: 'npcs', isArray: true },
    ],
    factions: [
      { field: 'allied_factions', label: 'Allied Factions', category: 'factions', isArray: true },
      { field: 'enemy_factions', label: 'Enemy Factions', category: 'factions', isArray: true },
      { field: 'key_members', label: 'Key Members', category: 'npcs', isArray: true },
    ],
    quests: [
      { field: 'quest_giver_id', label: 'Quest Giver', category: 'npcs', isArray: false },
      { field: 'related_faction_id', label: 'Related Faction', category: 'factions', isArray: false },
      { field: 'started_session_id', label: 'Started Session', category: 'session_recaps', isArray: false },
      { field: 'completed_session_id', label: 'Completed Session', category: 'session_recaps', isArray: false },
      { field: 'locations', label: 'Locations', category: 'locations', isArray: true },
    ],
    session_recaps: [
      { field: 'locations_visited', label: 'Locations Visited', category: 'locations', isArray: true },
      { field: 'npcs_encountered', label: 'NPCs Encountered', category: 'npcs', isArray: true },
      { field: 'quests_progressed', label: 'Quests Progressed', category: 'quests', isArray: true },
    ],
    session_prep: [
      { field: 'npcs_to_prep', label: 'NPCs to Prep', category: 'npcs', isArray: true },
      { field: 'locations_to_prep', label: 'Locations to Prep', category: 'locations', isArray: true },
      { field: 'quests_to_advance', label: 'Quests to Advance', category: 'quests', isArray: true },
    ],
    world_rules: [
      { field: 'related_rules', label: 'Related Rules', category: 'world_rules', isArray: true },
    ],
    items: [
      { field: 'current_owner_id', label: 'Current Owner', category: 'npcs', isArray: false },
      { field: 'current_location_id', label: 'Current Location', category: 'locations', isArray: false },
    ],
    creatures: [
      { field: 'locations_found', label: 'Locations Found', category: 'locations', isArray: true },
    ],
    // Categories with no relationships
    player_characters: [],
    lore_entries: [],
    planar_forces: [],
    custom_mechanics: [],
  };

  const categoryRelations = relationshipMaps[category] || [];

  for (const relationConfig of categoryRelations) {
    const value = entity[relationConfig.field];

    if (relationConfig.isArray) {
      // JSON array relation
      if (Array.isArray(value) && value.length > 0) {
        relationships.push({
          label: relationConfig.label,
          category: relationConfig.category,
          entityIds: value,
          isArray: true,
        });
      }
    } else {
      // Single FK relation
      if (value !== null && value !== undefined) {
        relationships.push({
          label: relationConfig.label,
          category: relationConfig.category,
          entityIds: [value],
          isArray: false,
        });
      }
    }
  }

  return relationships;
}

export interface RelationshipWithEntities extends Relationship {
  entities: Array<{ id: string; name: string }>;
}

/**
 * Builds relationship objects with fetched entity data
 * @param relationships - Array of relationships from extractRelationships
 * @param entityDataMap - Map of category -> entity ID -> entity object
 * @returns Relationships with merged entity names
 */
export function buildRelationshipLinks(
  relationships: Relationship[],
  entityDataMap: Record<CategoryName, Record<string, { id: string; name: string }>>
): RelationshipWithEntities[] {
  return relationships.map((relationship) => {
    const categoryData = entityDataMap[relationship.category] || {};
    const entities = relationship.entityIds
      .map((id) => categoryData[id])
      .filter((entity) => entity !== undefined);

    return {
      ...relationship,
      entities,
    };
  });
}
