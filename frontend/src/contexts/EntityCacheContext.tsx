import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiClient } from '../services/apiClient';
import { CategoryName } from './SidebarContext';

interface EntityCacheEntry {
  id: string;
  name: string;
}

interface EntityCache {
  [categoryKey: string]: {
    entities: Map<string, EntityCacheEntry>;
    loading: boolean;
    timestamp: number;
  };
}

interface EntityCacheContextType {
  getEntity: (category: CategoryName, entityId: string, campaignId: string) => EntityCacheEntry | null;
  prefetchCategory: (category: CategoryName, campaignId: string) => Promise<void>;
  clearCache: () => void;
}

const EntityCacheContext = createContext<EntityCacheContextType | undefined>(undefined);

export function EntityCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<EntityCache>({});

  const getCacheKey = (category: CategoryName, campaignId: string) => {
    return `${campaignId}:${category}`;
  };

  const prefetchCategory = useCallback(
    async (category: CategoryName, campaignId: string) => {
      const cacheKey = getCacheKey(category, campaignId);

      // Check if already cached (within 5 min)
      const existing = cache[cacheKey];
      if (existing && Date.now() - existing.timestamp < 300000) {
        return; // Cache still fresh
      }

      try {
        const response = await apiClient.get(`/${category}?campaign_id=${campaignId}&limit=1000`);
        const entities = (response.data.data || response.data || []) as any[];

        const entityMap = new Map<string, EntityCacheEntry>();
        entities.forEach((entity: any) => {
          entityMap.set(entity.id, {
            id: entity.id,
            name: entity.name || 'Unnamed',
          });
        });

        setCache((prev) => ({
          ...prev,
          [cacheKey]: {
            entities: entityMap,
            loading: false,
            timestamp: Date.now(),
          },
        }));
      } catch (error) {
        console.error(`Failed to prefetch ${category}:`, error);
      }
    },
    [cache]
  );

  const getEntity = useCallback(
    (category: CategoryName, entityId: string, campaignId: string): EntityCacheEntry | null => {
      const cacheKey = getCacheKey(category, campaignId);
      const cached = cache[cacheKey];

      if (!cached) {
        // Trigger fetch if not in cache
        prefetchCategory(category, campaignId);
        return null;
      }

      return cached.entities.get(entityId) || null;
    },
    [cache, prefetchCategory]
  );

  const clearCache = useCallback(() => {
    setCache({});
  }, []);

  return (
    <EntityCacheContext.Provider value={{ getEntity, prefetchCategory, clearCache }}>
      {children}
    </EntityCacheContext.Provider>
  );
}

export function useEntityCache() {
  const context = useContext(EntityCacheContext);
  if (!context) {
    throw new Error('useEntityCache must be used within EntityCacheProvider');
  }
  return context;
}
