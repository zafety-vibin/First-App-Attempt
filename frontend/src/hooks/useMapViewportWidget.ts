/**
 * useMapViewportWidget Hook
 * Feature: 021-create-a-geographic
 * Task: T034
 *
 * Manages state for MapViewportWidget:
 * - Loads locations with maps
 * - Handles location/map selection
 * - Fetches pins and regions for selected map
 * - Persists widget configuration (future)
 */

import { useState, useEffect, useCallback } from 'react';
import { listLocations } from '../services/locationService';
import { getLocationMaps, MapImage, MapPin, FactionRegion } from '../services/locationService';

export interface MapViewportWidgetData {
  locations: Array<{ id: string; name: string; mapCount: number }>;
  selectedLocation: { id: string; name: string } | null;
  selectedMap: MapImage | null;
  pins: MapPin[];
  regions: FactionRegion[];
  loading: boolean;
  error: string | null;
  selectLocation: (locationId: string) => void;
  selectMap: (mapId: string) => void;
}

export function useMapViewportWidget(
  campaignId: string,
  initialLocationId?: string,
  initialMapId?: string
): MapViewportWidgetData {
  const [locations, setLocations] = useState<Array<{ id: string; name: string; mapCount: number }>>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string } | null>(null);
  const [selectedMap, setSelectedMap] = useState<MapImage | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [regions, setRegions] = useState<FactionRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all locations (simplified - don't pre-filter for maps to avoid 100s of API calls)
   */
  useEffect(() => {
    async function loadLocations() {
      setLoading(true);
      setError(null);

      try {
        // Fetch all locations for this campaign
        const response = await listLocations(campaignId, {}, { limit: 1000 });

        // Simple mapping without checking for maps (too many API calls)
        const locationList = response.data.map((loc) => ({
          id: loc.id,
          name: loc.name,
          mapCount: 0, // Will be determined when location is selected
        }));

        setLocations(locationList);

        // Auto-select initial location if provided
        if (initialLocationId) {
          await loadLocationMaps(initialLocationId, initialMapId);
        } else if (locationList.length > 0 && initialLocationId === undefined) {
          // Only auto-select if no specific location requested
          // Otherwise leave empty for user to choose
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load locations');
      } finally {
        setLoading(false);
      }
    }

    loadLocations();
  }, [campaignId]);

  /**
   * Load maps for a specific location
   */
  const loadLocationMaps = async (locationId: string, mapId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const mapsData = await getLocationMaps(locationId);

      if (!mapsData.maps || mapsData.maps.length === 0) {
        setError('No maps found for this location');
        setSelectedLocation(null);
        setSelectedMap(null);
        setPins([]);
        setRegions([]);
        return;
      }

      // Find location name
      const location = locations.find((loc) => loc.id === locationId);
      setSelectedLocation(location || { id: locationId, name: 'Unknown Location' });

      // Select map
      let map: MapImage;
      if (mapId) {
        const foundMap = mapsData.maps.find((m) => m.id === mapId);
        map = foundMap || mapsData.maps[0];
      } else {
        map = mapsData.maps[0]; // First map
      }

      setSelectedMap(map);

      // Filter pins and regions for selected map
      const mapPins = mapsData.pins.filter((p) => p.map_id === map.id);
      const mapRegions = mapsData.regions.filter((r) => r.map_id === map.id);

      setPins(mapPins);
      setRegions(mapRegions.sort((a, b) => a.z_order - b.z_order));
    } catch (err: any) {
      setError(err.message || 'Failed to load map data');
      setSelectedLocation(null);
      setSelectedMap(null);
      setPins([]);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Select a different location
   */
  const selectLocation = useCallback(
    (locationId: string) => {
      loadLocationMaps(locationId);
    },
    [locations]
  );

  /**
   * Select a different map within the current location
   */
  const selectMap = useCallback(
    (mapId: string) => {
      if (!selectedLocation) return;
      loadLocationMaps(selectedLocation.id, mapId);
    },
    [selectedLocation, locations]
  );

  return {
    locations,
    selectedLocation,
    selectedMap,
    pins,
    regions,
    loading,
    error,
    selectLocation,
    selectMap,
  };
}
