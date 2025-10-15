/**
 * Knowledge Graph Entity Types
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Core entity types for knowledge graph architecture supporting:
 * - Multiple graph instances per campaign
 * - User-defined node types and edge relationships
 * - Temporal confidence decay system
 * - Information level filtering integration
 */

/**
 * Graph type discriminator
 * Four documented types plus custom types with custom:* prefix
 */
export type GraphType =
  | 'World-Foundations'
  | 'Political-Web'
  | 'Geographical'
  | 'Campaign-Story'
  | `custom:${string}`;

/**
 * Maintenance rule for automated graph maintenance (opt-in)
 */
export interface MaintenanceRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  strategy: 'time-based' | 'tag-based' | 'graduated-detail';
  params: Record<string, any>;
}

/**
 * KnowledgeGraph entity
 * Independent graph container with user-defined nodes and edges
 * Supports versioning (current + backup) and toggle controls for AI access
 */
export interface KnowledgeGraph {
  /** UUID primary key */
  id: string;

  /** Parent campaign reference */
  campaign_id: string;

  /** Graph type discriminator */
  graph_type: GraphType;

  /** Unique display name per campaign (e.g., "Faerun Politics", "Waterdeep Map") */
  graph_name: string;

  /** AI access toggle: true = AI can query/update, false = filtered out */
  toggle_state: boolean;

  /** Confidence decay rate per week (0.0-1.0). 0.0 = no decay. */
  decay_rate: number;

  /** Optional automatic maintenance configuration (JSONB) */
  maintenance_rules: MaintenanceRule[] | null;

  /** Unix timestamp (seconds) */
  created_at: number;

  /** Unix timestamp (seconds) */
  updated_at: number;

  /** Reference to current version snapshot */
  current_version_id: string | null;

  /** Reference to backup version snapshot (1-deep versioning) */
  backup_version_id: string | null;

  /** Optional: loaded nodes (not stored in graph table) */
  nodes?: GraphNode[];

  /** Optional: loaded edges (not stored in graph table) */
  edges?: GraphEdge[];
}

/**
 * Observation on a graph node
 * Free-form text with independent confidence decay
 */
export interface GraphObservation {
  /** Free-form observation text */
  text: string;

  /** Unix timestamp when observation was created */
  created_at: number;

  /** Unix timestamp when observation was last accessed (for decay calculation) */
  last_accessed: number;
}

/**
 * GraphNode entity
 * User-defined node within a knowledge graph
 * Supports information level tagging for view mode filtering
 */
export interface GraphNode {
  /** UUID primary key */
  id: string;

  /** Parent graph reference */
  graph_id: string;

  /** User-defined node type (e.g., "NPC", "Location", "Deity", "Event", "Faction") */
  node_type: string;

  /** Node name (e.g., "Lord Neverember", "Waterdeep", "The Sundering") */
  name: string;

  /** Free-form user-defined attributes (JSONB) */
  attributes: Record<string, any>;

  /** Array of observations with temporal tracking (JSONB) */
  observations: GraphObservation[] | null;

  /** Information level for filtering (null = Common Knowledge) */
  information_level_id: string | null;

  /** Unix timestamp (seconds) */
  created_at: number;

  /** Unix timestamp for confidence decay calculation (updated on read) */
  last_accessed: number;

  /** Pin flag: true = bypass decay (confidence locked at 1.0), false = normal decay */
  pinned: boolean;

  /** Calculated confidence score (0.0-1.0). NOT stored, calculated on-demand. */
  confidence?: number;
}

/**
 * GraphEdge entity
 * User-defined relationship between two nodes
 * Supports directed and undirected edges
 */
export interface GraphEdge {
  /** UUID primary key */
  id: string;

  /** Parent graph reference */
  graph_id: string;

  /** User-defined relationship label (e.g., "allied with", "contains", "caused by") */
  edge_type: string;

  /** Source node UUID */
  source_node_id: string;

  /** Target node UUID */
  target_node_id: string;

  /** Edge direction: true = directed (source→target), false = undirected (bidirectional) */
  directed: boolean;

  /** Optional metadata (JSONB, e.g., {strength: 0.8, travel_time: "3 days"}) */
  metadata: Record<string, any> | null;

  /** Unix timestamp (seconds) */
  created_at: number;

  /** Calculated confidence score (average of source and target entity confidence). NOT stored. */
  confidence?: number;
}

/**
 * Validation patterns
 */
export const GRAPH_TYPE_PATTERN = /^(World-Foundations|Political-Web|Geographical|Campaign-Story|custom:.+)$/;
export const DECAY_RATE_MIN = 0.0;
export const DECAY_RATE_MAX = 1.0;
export const MAX_NODE_NAME_LENGTH = 200;

/**
 * Type guard for valid graph types
 */
export function isValidGraphType(type: string): type is GraphType {
  return GRAPH_TYPE_PATTERN.test(type);
}

/**
 * Type guard for custom graph types
 */
export function isCustomGraphType(type: GraphType): type is `custom:${string}` {
  return (type as string).indexOf('custom:') === 0;
}
