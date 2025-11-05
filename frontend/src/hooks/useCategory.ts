import { useState, useCallback, useEffect, useMemo } from 'react';
import { CategoryName } from '../contexts/SidebarContext';
import * as npcService from '../services/npcService';
import * as locationService from '../services/locationService';
import * as factionService from '../services/factionService';
import * as sessionRecapService from '../services/sessionRecapService';
import * as questService from '../services/questService';
import * as playerCharacterService from '../services/playerCharacterService';
import * as loreEntryService from '../services/loreEntryService';
import * as worldRuleService from '../services/worldRuleService';
import * as planarForceService from '../services/planarForceService';
import * as sessionPrepService from '../services/sessionPrepService';
import * as customMechanicService from '../services/customMechanicService';
import * as itemService from '../services/itemService';
import * as creatureService from '../services/creatureService';

// Map category names to their service modules
const SERVICE_MAP = {
  npcs: npcService,
  locations: locationService,
  factions: factionService,
  session_recaps: sessionRecapService,
  quests: questService,
  player_characters: playerCharacterService,
  lore_entries: loreEntryService,
  world_rules: worldRuleService,
  planar_forces: planarForceService,
  session_prep: sessionPrepService,
  custom_mechanics: customMechanicService,
  items: itemService,
  creatures: creatureService,
} as const;

// Map category names to their CRUD function names
const FUNCTION_MAPS = {
  list: {
    npcs: 'listNPCs',
    locations: 'listLocations',
    factions: 'listFactions',
    session_recaps: 'listSessionRecaps',
    quests: 'listQuests',
    player_characters: 'listPlayerCharacters',
    lore_entries: 'listLoreEntries',
    world_rules: 'listWorldRules',
    planar_forces: 'listPlanarForces',
    session_prep: 'listSessionPreps',
    custom_mechanics: 'listCustomMechanics',
    items: 'listItems',
    creatures: 'listCreatures',
  },
  getById: {
    npcs: 'getNPCById',
    locations: 'getLocationById',
    factions: 'getFactionById',
    session_recaps: 'getSessionRecapById',
    quests: 'getQuestById',
    player_characters: 'getPlayerCharacterById',
    lore_entries: 'getLoreEntryById',
    world_rules: 'getWorldRuleById',
    planar_forces: 'getPlanarForceById',
    session_prep: 'getSessionPrepById',
    custom_mechanics: 'getCustomMechanicById',
    items: 'getItemById',
    creatures: 'getCreatureById',
  },
  create: {
    npcs: 'createNPC',
    locations: 'createLocation',
    factions: 'createFaction',
    session_recaps: 'createSessionRecap',
    quests: 'createQuest',
    player_characters: 'createPlayerCharacter',
    lore_entries: 'createLoreEntry',
    world_rules: 'createWorldRule',
    planar_forces: 'createPlanarForce',
    session_prep: 'createSessionPrep',
    custom_mechanics: 'createCustomMechanic',
    items: 'createItem',
    creatures: 'createCreature',
  },
  update: {
    npcs: 'updateNPC',
    locations: 'updateLocation',
    factions: 'updateFaction',
    session_recaps: 'updateSessionRecap',
    quests: 'updateQuest',
    player_characters: 'updatePlayerCharacter',
    lore_entries: 'updateLoreEntry',
    world_rules: 'updateWorldRule',
    planar_forces: 'updatePlanarForce',
    session_prep: 'updateSessionPrep',
    custom_mechanics: 'updateCustomMechanic',
    items: 'updateItem',
    creatures: 'updateCreature',
  },
  delete: {
    npcs: 'deleteNPC',
    locations: 'deleteLocation',
    factions: 'deleteFaction',
    session_recaps: 'deleteSessionRecap',
    quests: 'deleteQuest',
    player_characters: 'deletePlayerCharacter',
    lore_entries: 'deleteLoreEntry',
    world_rules: 'deleteWorldRule',
    planar_forces: 'deletePlanarForce',
    session_prep: 'deleteSessionPrep',
    custom_mechanics: 'deleteCustomMechanic',
    items: 'deleteItem',
    creatures: 'deleteCreature',
  },
} as const;

export interface UseCategoryOptions {
  filters?: any;
  pagination?: any;
  autoFetch?: boolean; // Default true
}

export interface UseCategoryReturn<T> {
  entities: T[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  getById: (id: string) => Promise<T>;
}

/**
 * Generic CRUD hook for all 13 categories
 * @param category - Category name (internal identifier)
 * @param campaignId - Campaign ID
 * @param options - Optional filters, pagination, and autoFetch settings
 * @returns CRUD operations and entity data
 */
export function useCategory<T = any>(
  category: CategoryName,
  campaignId: string,
  options: UseCategoryOptions = {}
): UseCategoryReturn<T> {
  const { filters, pagination, autoFetch = true } = options;

  const [entities, setEntities] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // FIX #3: Memoize service lookup to prevent unnecessary re-renders
  const service = useMemo(() => {
    const svc = SERVICE_MAP[category];
    if (!svc) {
      throw new Error(`Unknown category: ${category}`);
    }
    return svc;
  }, [category]);

  // FIX #1: Memoize JSON keys for filters/pagination to prevent infinite loops
  // We use JSON.stringify in the dependency array to detect deep changes
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [JSON.stringify(filters)]);
  const paginationKey = useMemo(() => JSON.stringify(pagination || {}), [JSON.stringify(pagination)]);

  // FIX #2: Fetch entities with AbortController to prevent memory leaks
  const fetchEntities = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const listFnName = FUNCTION_MAPS.list[category];
      const listFn = service[listFnName as keyof typeof service] as any;

      if (!listFn) {
        throw new Error(`List function not found for category: ${category}`);
      }

      // Call service function - service doesn't accept signal, so we rely on axios interceptor
      // Note: We parse filters/pagination from the memoized keys to maintain stability
      const parsedFilters = filtersKey ? JSON.parse(filtersKey) : undefined;
      const parsedPagination = paginationKey ? JSON.parse(paginationKey) : undefined;

      const response = await listFn(campaignId, parsedFilters, parsedPagination);

      // Check if aborted before setting state
      if (signal?.aborted) return;

      setEntities(response.data || []);
      setTotalCount(response.pagination?.totalCount || 0);
    } catch (err: any) {
      // Ignore abort errors
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }

      if (!signal?.aborted) {
        const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch entities';
        setError(errorMessage);
        console.error(`Error fetching ${category}:`, err);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [category, campaignId, service, filtersKey, paginationKey]);

  // Auto-fetch on mount and when dependencies change
  // FIX #1 & #2: Use memoized keys and AbortController for cleanup
  useEffect(() => {
    if (!autoFetch) return;

    const abortController = new AbortController();
    fetchEntities(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [autoFetch, fetchEntities, filtersKey, paginationKey]);

  // Refresh wrapper that doesn't require signal (for CRUD operations)
  const refresh = useCallback(async () => {
    await fetchEntities();
  }, [fetchEntities]);

  // Create entity
  const create = useCallback(
    async (data: Partial<T>): Promise<T> => {
      const createFnName = FUNCTION_MAPS.create[category];
      const createFn = service[createFnName as keyof typeof service] as any;

      if (!createFn) {
        throw new Error(`Create function not found for category: ${category}`);
      }

      const created = await createFn(data);
      await refresh(); // Refresh list
      return created;
    },
    [category, service, refresh]
  );

  // Update entity
  const update = useCallback(
    async (id: string, data: Partial<T>): Promise<T> => {
      const updateFnName = FUNCTION_MAPS.update[category];
      const updateFn = service[updateFnName as keyof typeof service] as any;

      if (!updateFn) {
        throw new Error(`Update function not found for category: ${category}`);
      }

      const updated = await updateFn(id, data);
      await refresh(); // Refresh list
      return updated;
    },
    [category, service, refresh]
  );

  // Delete entity
  const deleteEntity = useCallback(
    async (id: string): Promise<void> => {
      const deleteFnName = FUNCTION_MAPS.delete[category];
      const deleteFn = service[deleteFnName as keyof typeof service] as any;

      if (!deleteFn) {
        throw new Error(`Delete function not found for category: ${category}`);
      }

      await deleteFn(id);
      await refresh(); // Refresh list
    },
    [category, service, refresh]
  );

  // Get single entity by ID
  const getById = useCallback(
    async (id: string): Promise<T> => {
      const getFnName = FUNCTION_MAPS.getById[category];
      const getFn = service[getFnName as keyof typeof service] as any;

      if (!getFn) {
        throw new Error(`Get function not found for category: ${category}`);
      }

      return await getFn(id);
    },
    [category, service]
  );

  return {
    entities,
    totalCount,
    loading,
    error,
    create,
    update,
    delete: deleteEntity,
    refresh,
    getById,
  };
}

// Helper: Capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper: Convert plural category names to singular
function singularize(category: CategoryName): string {
  const singularMap: Record<CategoryName, string> = {
    npcs: 'NPC',
    locations: 'Location',
    factions: 'Faction',
    session_recaps: 'SessionRecap',
    quests: 'Quest',
    player_characters: 'PlayerCharacter',
    lore_entries: 'LoreEntry',
    world_rules: 'WorldRule',
    planar_forces: 'PlanarForce',
    session_prep: 'SessionPrep',
    custom_mechanics: 'CustomMechanic',
    items: 'Item',
    creatures: 'Creature',
  };
  return singularMap[category] || category;
}
