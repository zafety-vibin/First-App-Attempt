/**
 * LocationTree Component
 * Feature: 021-create-a-geographic
 * Task: T036
 *
 * Recursive tree rendering for location hierarchy.
 * Shows expand/collapse controls, map indicators, selection highlighting.
 */

import React from 'react';
import LocationTreeNode from './LocationTreeNode';
import './LocationTree.css';

export interface LocationTreeNodeData {
  location: {
    id: string;
    name: string;
    location_type?: string;
  };
  children: LocationTreeNodeData[];
  depth: number;
  hasMap: boolean;
  hasCycle?: boolean;
}

export interface LocationTreeProps {
  nodes: LocationTreeNodeData[];
  expandedNodes: Set<string>;
  selectedLocationId: string | null;
  onToggleNode: (locationId: string) => void;
  onSelectLocation: (locationId: string) => void;
}

const LocationTree: React.FC<LocationTreeProps> = ({
  nodes,
  expandedNodes,
  selectedLocationId,
  onToggleNode,
  onSelectLocation,
}) => {
  return (
    <div className="location-tree">
      {nodes.map((node) => (
        <LocationTreeNode
          key={node.location.id}
          node={node}
          depth={0}
          isExpanded={expandedNodes.has(node.location.id)}
          isSelected={node.location.id === selectedLocationId}
          onToggle={onToggleNode}
          onSelect={onSelectLocation}
          expandedNodes={expandedNodes}
        />
      ))}
    </div>
  );
};

export default LocationTree;
