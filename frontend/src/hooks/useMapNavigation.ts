/**
 * useMapNavigation Hook
 * Feature: 021-create-a-geographic
 * Task: T040
 *
 * Handles map-to-map transitions via pin clicks.
 * Manages breadcrumb history, preloads linked location maps.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocationMaps, MapImage, MapPin, FactionRegion } from '../services/locationService';
import { BreadcrumbItem } from '../components/navigator/HierarchyBreadcrumb';

export interface UseMapNavigationReturn {
  currentMap: MapImage | null;
  currentPins: MapPin[];
  currentRegions: FactionRegion[];
  breadcrumb: BreadcrumbItem[];
  handlePinClick: (pin: MapPin) => void;
  handleBreadcrumbClick: (index: number) => void;
  loading: boolean;
  error: string | null;
}

export function useMapNavigation(
  campaignId: string,
  initialLocationId: string | null
): UseMapNavigationReturn {
  const navigate = useNavigate();
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(initialLocationId);
  const [currentMapIndex, setCurrentMapIndex] = useState(0);
  const [currentMap, setCurrentMap] = useState<MapImage | null>(null);
  const [currentPins, setCurrentPins] = useState<MapPin[]>([]);
  const [currentRegions, setCurrentRegions] = useState<FactionRegion[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load maps for current location
   */
  useEffect(() => {
    if (!currentLocationId) {
      setCurrentMap(null);
      setCurrentPins([]);
      setCurrentRegions([]);
      return;
    }

    async function loadMaps() {
      setLoading(true);
      setError(null);

      try {
        const data = await getLocationMaps(currentLocationId!);

        if (data.maps && data.maps.length > 0) {
          const map = data.maps[currentMapIndex] || data.maps[0];
          setCurrentMap(map);

          // Filter pins and regions for current map
          setCurrentPins(data.pins.filter((p) => p.map_id === map.id));
          setCurrentRegions(data.regions.filter((r) => r.map_id === map.id).sort((a, b) => a.z_order - b.z_order));
        } else {
          setCurrentMap(null);
          setCurrentPins([]);
          setCurrentRegions([]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load maps');
        setCurrentMap(null);
        setCurrentPins([]);
        setCurrentRegions([]);
      } finally {
        setLoading(false);
      }
    }

    loadMaps();
  }, [currentLocationId, currentMapIndex]);

  /**
   * Handle pin click - navigate to linked entity or transition to linked location map
   */
  const handlePinClick = useCallback(
    (pin: MapPin) => {
      if (!pin.linked_entity_type || !pin.linked_entity_id) {
        // Visual-only pin (no entity link)
        return;
      }

      if (pin.linked_entity_type === 'npc') {
        // Navigate to NPC detail page
        navigate(`/campaigns/${campaignId}/npcs/${pin.linked_entity_id}`);
      } else if (pin.linked_entity_type === 'location') {
        // Map-to-map transition
        // Add current location to breadcrumb
        if (currentLocationId && currentMap) {
          const newBreadcrumb = [
            ...breadcrumb,
            {
              locationId: currentLocationId,
              locationName: currentMap.name, // Using map name as proxy for location name
              mapIndex: currentMapIndex,
            },
          ];
          setBreadcrumb(newBreadcrumb);
        }

        // Transition to linked location
        setCurrentLocationId(pin.linked_entity_id);
        setCurrentMapIndex(0); // Show first map of linked location
      }
    },
    [campaignId, currentLocationId, currentMap, currentMapIndex, breadcrumb, navigate]
  );

  /**
   * Handle breadcrumb click - navigate back in history
   */
  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      if (index >= breadcrumb.length) return;

      const targetItem = breadcrumb[index];

      // Truncate breadcrumb to clicked index
      setBreadcrumb(breadcrumb.slice(0, index));

      // Navigate to that location
      setCurrentLocationId(targetItem.locationId);
      setCurrentMapIndex(targetItem.mapIndex);
    },
    [breadcrumb]
  );

  /**
   * Update location when selection changes from tree
   */
  useEffect(() => {
    if (initialLocationId !== currentLocationId) {
      setCurrentLocationId(initialLocationId);
      setCurrentMapIndex(0);
      setBreadcrumb([]); // Clear breadcrumb on tree selection
    }
  }, [initialLocationId]);

  return {
    currentMap,
    currentPins,
    currentRegions,
    breadcrumb,
    handlePinClick,
    handleBreadcrumbClick,
    loading,
    error,
  };
}
