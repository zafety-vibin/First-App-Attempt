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
}

interface DraggableNodeItemProps {
  node: UnpinnedNode;
}

function DraggableNodeItem({ node }: DraggableNodeItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: node.id,
    data: { node },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`unpinned-node-item ${isDragging ? 'dragging' : ''} ${node.location_exists === false ? 'not-in-db' : ''}`}
      {...listeners}
      {...attributes}
      title={node.location_exists === false ? 'Create in Locations database first to enable pinning' : 'Drag to pin on map'}
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
      <div className="unpinned-node-drag-handle">⋮⋮</div>
    </div>
  );
}

export const UnpinnedSidebar: React.FC<UnpinnedSidebarProps> = ({ nodes, isOpen, onToggle }) => {
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
                Drag nodes onto the map to pin them to coordinates
              </div>
              <div className="unpinned-nodes-list">
                {nodes.map((node) => (
                  <DraggableNodeItem key={node.id} node={node} />
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
