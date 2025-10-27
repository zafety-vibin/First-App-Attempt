/**
 * useLocationMaps Hook
 * Feature: 021-create-a-geographic
 * Task: T030
 *
 * React hook for managing location map data (maps, pins, regions).
 * Provides CRUD operations with state management and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getLocationMaps,
  uploadMap,
  deleteMap,
  createPin,
  updatePin,
  deletePin,
  createRegion,
  updateRegion,
  deleteRegion,
  MapImage,
  MapPin,
  FactionRegion,
} from '../services/locationService';

export interface UseLocationMapsReturn {
  // Data
  maps: MapImage[];
  pins: MapPin[];
  regions: FactionRegion[];

  // State
  loading: boolean;
  error: string | null;

  // Map operations
  uploadMapFile: (mapData: { name: string; data: string; width: number; height: number }) => Promise<void>;
  removeMap: (mapId: string) => Promise<void>;

  // Pin operations
  addPin: (pinData: any) => Promise<void>;
  editPin: (pinId: string, updates: Partial<MapPin>) => Promise<void>;
  removePin: (pinId: string) => Promise<void>;

  // Region operations
  addRegion: (regionData: any) => Promise<void>;
  editRegion: (regionId: string, updates: Partial<FactionRegion>) => Promise<void>;
  removeRegion: (regionId: string) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

export function useLocationMaps(locationId: string): UseLocationMapsReturn {
  const [maps, setMaps] = useState<MapImage[]>([]);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [regions, setRegions] = useState<FactionRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all map data for the location
   */
  const loadMaps = useCallback(async () => {
    if (!locationId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getLocationMaps(locationId);
      setMaps(data.maps || []);
      setPins(data.pins || []);
      setRegions(data.regions || []);
    } catch (err: any) {
      console.error('Failed to load location maps:', err);
      setError(err.message || 'Failed to load maps');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  // Load on mount and when locationId changes
  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  /**
   * Upload a new map
   */
  const uploadMapFile = useCallback(
    async (mapData: { name: string; data: string; width: number; height: number }) => {
      try {
        const newMap = await uploadMap(locationId, mapData);
        setMaps((prev) => [...prev, newMap]);
      } catch (err: any) {
        setError(err.message || 'Failed to upload map');
        throw err;
      }
    },
    [locationId]
  );

  /**
   * Delete a map
   */
  const removeMap = useCallback(
    async (mapId: string) => {
      try {
        await deleteMap(locationId, mapId);
        setMaps((prev) => prev.filter((m) => m.id !== mapId));
        // Also remove associated pins and regions
        setPins((prev) => prev.filter((p) => p.map_id !== mapId));
        setRegions((prev) => prev.filter((r) => r.map_id !== mapId));
      } catch (err: any) {
        setError(err.message || 'Failed to delete map');
        throw err;
      }
    },
    [locationId]
  );

  /**
   * Create a pin
   */
  const addPin = useCallback(
    async (pinData: any) => {
      try {
        const newPin = await createPin(locationId, pinData);
        setPins((prev) => [...prev, newPin]);
      } catch (err: any) {
        setError(err.message || 'Failed to create pin');
        throw err;
      }
    },
    [locationId]
  );

  /**
   * Update a pin
   */
  const editPin = useCallback(
    async (pinId: string, updates: Partial<MapPin>) => {
      try {
        const updatedPin = await updatePin(locationId, pinId, updates);
        setPins((prev) => prev.map((p) => (p.id === pinId ? updatedPin : p)));
      } catch (err: any) {
        setError(err.message || 'Failed to update pin');
        throw err;
      }
    },
    [locationId]
  );

  /**
   * Delete a pin
   */
  const removePin = useCallback(
    async (pinId: string) => {
      try {
        await deletePin(locationId, pinId);
        setPins((prev) => prev.filter((p) => p.id !== pinId));
      } catch (err: any) {
        setError(err.message || 'Failed to delete pin');
        throw err;
      }
    },
    [locationId]
  );

  /**
   * Create a faction region
   */
  const addRegion = useCallback(
    async (regionData: any) => {
      try {
        const newRegion = await createRegion(locationId, regionData);
        setRegions((prev) => [...prev, newRegion]);
      } catch (err: any) {
        setError(err.message || 'Failed to create region');
        throw err;
      }
    },
    [locationId]
  );

  /**
   * Update a faction region
   */
  const editRegion = useCallback(
    async (regionId: string, updates: Partial<FactionRegion>) => {
      try {
        const updatedRegion = await updateRegion(locationId, regionId, updates);
        setRegions((prev) => prev.map((r) => (r.id === regionId ? updatedRegion : r)));
      } catch (err: any) {
        setError(err.message || 'Failed to update region');
        throw err;
      }
    },
    [locationId]
  );

  /**
   * Delete a faction region
   */
  const removeRegion = useCallback(
    async (regionId: string) => {
      try {
        await deleteRegion(locationId, regionId);
        setRegions((prev) => prev.filter((r) => r.id !== regionId));
      } catch (err: any) {
        setError(err.message || 'Failed to delete region');
        throw err;
      }
    },
    [locationId]
  );

  return {
    maps,
    pins,
    regions,
    loading,
    error,
    uploadMapFile,
    removeMap,
    addPin,
    editPin,
    removePin,
    addRegion,
    editRegion,
    removeRegion,
    refresh: loadMaps,
  };
}
