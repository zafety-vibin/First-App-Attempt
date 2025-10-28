/**
 * useGeographicHierarchy Hook
 * Feature: 021-create-a-geographic
 * Task: T039
 *
 * Builds location tree from parent_location_id relationships.
 * Handles expand/collapse state, cycle detection, location selection.
 */

import { useState, useEffect, useCallback } from 'react';
import { getLocationTree } from '../services/hierarchyService';
import { LocationTreeNodeData } from '../components/navigator/LocationTree';

export interface UseGeographicHierarchyReturn {
  treeData: LocationTreeNodeData[];
  expandedNodes: Set<string>;
  toggleNode: (locationId: string) => void;
  selectLocation: (locationId: string) => void;
  selectedLocationId: string | null;
  loading: boolean;
  error: string | null;
  hasCycles: boolean;
}

export function useGeographicHierarchy(campaignId: string): UseGeographicHierarchyReturn {
  const [treeData, setTreeData] = useState<LocationTreeNodeData[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCycles, setHasCycles] = useState(false);

  /**
   * Load hierarchy tree from backend
   */
  useEffect(() => {
    async function loadTree() {
      setLoading(true);
      setError(null);

      try {
        const response = await getLocationTree(campaignId);

        // Convert backend tree format to LocationTreeNodeData
        const convertToTreeData = (nodes: any[]): LocationTreeNodeData[] => {
          return nodes.map((node: any) => ({
            location: {
              id: node.location.id,
              name: node.location.name,
              location_type: node.location.location_type,
            },
            children: node.children ? convertToTreeData(node.children) : [],
            depth: node.depth || 0,
            hasMap: node.has_map || false,
            hasCycle: node.has_cycle || false,
          }));
        };

        const tree = convertToTreeData(response.tree || []);
        setTreeData(tree);
        setHasCycles(response.has_cycles || false);

        // Auto-expand first level
        const rootIds = tree.map((node) => node.location.id);
        setExpandedNodes(new Set(rootIds));
      } catch (err: any) {
        setError(err.message || 'Failed to load location hierarchy');
      } finally {
        setLoading(false);
      }
    }

    if (campaignId) {
      loadTree();
    }
  }, [campaignId]);

  /**
   * Toggle node expand/collapse
   */
  const toggleNode = useCallback((locationId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select location (triggers map display)
   */
  const selectLocation = useCallback((locationId: string) => {
    setSelectedLocationId(locationId);
  }, []);

  return {
    treeData,
    expandedNodes,
    toggleNode,
    selectLocation,
    selectedLocationId,
    loading,
    error,
    hasCycles,
  };
}
