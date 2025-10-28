/**
 * LocationTreeNode Component
 * Feature: 021-create-a-geographic
 * Task: T037
 *
 * Single tree node with expand button, select handler, depth indentation.
 * Recursively renders children when expanded.
 */

import React from 'react';
import { LocationTreeNodeData } from './LocationTree';
import './LocationTreeNode.css';

export interface LocationTreeNodeProps {
  node: LocationTreeNodeData;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (locationId: string) => void;
  onSelect: (locationId: string) => void;
  expandedNodes: Set<string>;
}

const LocationTreeNode: React.FC<LocationTreeNodeProps> = ({
  node,
  depth,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  expandedNodes,
}) => {
  const hasChildren = node.children.length > 0;
  const indentWidth = depth * 20;

  return (
    <div className="tree-node-container">
      <div
        className={`tree-node ${isSelected ? 'selected' : ''} ${node.hasCycle ? 'has-cycle' : ''}`}
        style={{ paddingLeft: `${indentWidth}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            className="tree-node-expand-button"
            onClick={() => onToggle(node.location.id)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="tree-node-spacer"></span>
        )}

        {/* Location Name Button */}
        <button
          className="tree-node-label"
          onClick={() => onSelect(node.location.id)}
        >
          <span className="tree-node-name">{node.location.name}</span>

          {/* Map Indicator */}
          {node.hasMap && (
            <span className="tree-node-map-icon" title="Has map">
              🗺️
            </span>
          )}

          {/* Cycle Warning */}
          {node.hasCycle && (
            <span className="tree-node-cycle-icon" title="Circular reference detected">
              ⚠️
            </span>
          )}

          {/* Location Type Badge (optional) */}
          {node.location.location_type && (
            <span className="tree-node-type">{node.location.location_type}</span>
          )}
        </button>
      </div>

      {/* Recursively render children when expanded */}
      {isExpanded && hasChildren && (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <LocationTreeNode
              key={child.location.id}
              node={child}
              depth={depth + 1}
              isExpanded={expandedNodes.has(child.location.id)}
              isSelected={child.location.id === node.location.id}
              onToggle={onToggle}
              onSelect={onSelect}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationTreeNode;
