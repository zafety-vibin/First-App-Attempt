/**
 * Graph Version Entity Types
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Snapshot system for graph versioning
 * System maintains current version + 1 backup version per graph
 */

import { GraphNode, GraphEdge } from './KnowledgeGraph';

/**
 * Version type discriminator
 * Each graph can have at most 1 current + 1 backup
 */
export type VersionType = 'current' | 'backup';

/**
 * Graph snapshot content structure
 * Full serialization of graph state including confidence metadata
 */
export interface GraphSnapshot {
  /** All nodes with their attributes and observations */
  nodes: GraphNode[];

  /** All edges with their metadata */
  edges: GraphEdge[];

  /** Snapshot metadata */
  metadata: {
    /** Graph type at snapshot time */
    graph_type: string;

    /** Graph display name at snapshot time */
    graph_name: string;

    /** Number of nodes in snapshot */
    node_count: number;

    /** Number of edges in snapshot */
    edge_count: number;

    /** Unix timestamp when snapshot was created */
    snapshot_timestamp: number;

    /** Decay rate configuration at snapshot time */
    decay_rate?: number;

    /** Toggle state at snapshot time */
    toggle_state?: boolean;
  };
}

/**
 * GraphVersion entity
 * Immutable snapshot of entire graph state
 * Used for 1-deep versioning and restore functionality
 */
export interface GraphVersion {
  /** UUID primary key */
  id: string;

  /** Parent graph reference */
  graph_id: string;

  /** Full graph state snapshot (JSONB) */
  snapshot_content: GraphSnapshot;

  /** Version type (unique per graph_id + version_type) */
  version_type: VersionType;

  /** Unix timestamp (seconds) */
  created_at: number;
}

/**
 * Validation constants
 */
export const VERSION_TYPES: readonly VersionType[] = ['current', 'backup'] as const;

/**
 * Type guard for valid version types
 */
export function isValidVersionType(type: string): type is VersionType {
  return VERSION_TYPES.includes(type as VersionType);
}

/**
 * Version management helper types
 */

/**
 * Version creation options
 */
export interface CreateVersionOptions {
  /** Parent graph ID */
  graph_id: string;

  /** Nodes to include in snapshot */
  nodes: GraphNode[];

  /** Edges to include in snapshot */
  edges: GraphEdge[];

  /** Graph metadata */
  metadata: {
    graph_type: string;
    graph_name: string;
    decay_rate: number;
    toggle_state: boolean;
  };

  /** Version type to create */
  version_type: VersionType;
}

/**
 * Version restore result
 */
export interface RestoreVersionResult {
  /** Restored graph type */
  graph_type: string;

  /** Restored graph name */
  graph_name: string;

  /** Timestamp of backup version that was restored */
  reverted_to_timestamp: number;

  /** Number of entities restored */
  entities_count: number;

  /** Number of relations restored */
  relations_count: number;
}
