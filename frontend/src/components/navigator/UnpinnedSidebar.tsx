/**
 * UnpinnedSidebar Component
 * Feature: 021-create-a-geographic (Spatial Navigator)
 *
 * Displays children without map coordinates in a draggable sidebar.
 * Users can drag nodes from here onto the parent map to pin them.
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import './UnpinnedSidebar.css';

interface UnpinnedNode {
  id: string;
  name: string;
  location_type: string;
  child_count: number;
  location_exists?: boolean;
  location_id?: string | null;
}

interface UnpinnedSidebarProps {
  nodes: UnpinnedNode[];
  isOpen: boolean;
  onToggle: () => void;
  onNodeSelect?: (node: UnpinnedNode) => void;
  selectedNodeId?: string | null;
}

interface ClickableNodeItemProps {
  node: UnpinnedNode;
  isSelected: boolean;
  onClick: () => void;
}

function ClickableNodeItem({ node, isSelected, onClick }: ClickableNodeItemProps) {
  return (
    <div
      className={`unpinned-node-item ${isSelected ? 'selected' : ''} ${node.location_exists === false ? 'not-in-db' : ''}`}
      onClick={onClick}
      title={node.location_exists === false ? 'Create in Locations database first' : 'Click to select, then click map to place pin'}
    >
      <div className="unpinned-node-icon">{node.location_exists === false ? '⚠️' : '📍'}</div>
      <div className="unpinned-node-info">
        <div className="unpinned-node-name">{node.name}</div>
        <div className="unpinned-node-meta">
          {node.location_type}
          {node.child_count > 0 && ` • ${node.child_count} children`}
          {node.location_exists === false && <span className="not-in-db-label"> • Not in database</span>}
        </div>
      </div>
      {isSelected && <div className="unpinned-node-selected-indicator">→ Click map to place</div>}
    </div>
  );
}

export const UnpinnedSidebar: React.FC<UnpinnedSidebarProps> = ({ nodes, isOpen, onToggle, onNodeSelect, selectedNodeId }) => {
  return (
    <div className={`unpinned-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="unpinned-sidebar-header" onClick={onToggle}>
        <div className="unpinned-sidebar-title">
          <span className="unpinned-icon">📦</span>
          Unpinned Nodes ({nodes.length})
        </div>
        <button className="unpinned-toggle-btn">{isOpen ? '▶' : '◀'}</button>
      </div>

      {isOpen && (
        <div className="unpinned-sidebar-content">
          {nodes.length > 0 ? (
            <>
              <div className="unpinned-sidebar-hint">
                Click a node, then click on the map to place it
              </div>
              <div className="unpinned-nodes-list">
                {nodes.map((node) => (
                  <ClickableNodeItem
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onClick={() => onNodeSelect?.(node)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="unpinned-sidebar-empty">
              <div className="unpinned-empty-icon">✨</div>
              <p>All nodes are pinned to the map!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
