/**
 * Cross-Graph Query Types
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * Types for querying across multiple knowledge graphs
 * Supports free-form observations for cross-graph context
 */

import { GraphType } from './KnowledgeGraph';

/**
 * Query filter for cross-graph searches
 */
export interface CrossGraphQueryFilter {
  /** Graph types to query (empty = all graphs) */
  graph_types?: GraphType[];

  /** Node types to filter by (empty = all node types) */
  node_types?: string[];

  /** Minimum confidence threshold (0.0-1.0) */
  min_confidence?: number;

  /** Maximum confidence threshold (0.0-1.0) */
  max_confidence?: number;

  /** Information level IDs to filter by (empty = no filtering) */
  information_level_ids?: string[];

  /** Only include pinned entities */
  pinned_only?: boolean;

  /** Text search query (matches node name, node type, or observation text) */
  search_query?: string;

  /** Maximum results to return */
  limit?: number;
}

/**
 * Cross-graph query request
 * Used to query entities across multiple graphs in a campaign
 */
export interface CrossGraphQuery {
  /** Campaign ID to query within */
  campaign_id: string;

  /** Query filters */
  filter: CrossGraphQueryFilter;

  /** Sort order for results */
  sort_by?: 'confidence' | 'name' | 'created_at' | 'last_accessed';

  /** Sort direction */
  sort_order?: 'asc' | 'desc';
}

/**
 * Graph observation for cross-graph context
 * Free-form text linking entities across graphs
 */
export interface GraphObservation {
  /** Observation ID (UUID) */
  id: string;

  /** Source graph ID where observation originates */
  source_graph_id: string;

  /** Source graph type */
  source_graph_type: GraphType;

  /** Source entity ID that has this observation */
  source_entity_id: string;

  /** Source entity name */
  source_entity_name: string;

  /** Observation text (free-form, interpreted by LLM) */
  observation_text: string;

  /** Referenced graph IDs (extracted from observation text) */
  referenced_graph_ids?: string[];

  /** Referenced entity names (extracted from observation text) */
  referenced_entity_names?: string[];

  /** Confidence score of this observation */
  confidence: number;

  /** Unix timestamp when observation was created */
  created_at: number;

  /** Unix timestamp when observation was last accessed */
  last_accessed: number;
}

/**
 * Cross-graph query result
 */
export interface CrossGraphQueryResult {
  /** Campaign ID */
  campaign_id: string;

  /** Query that was executed */
  query: CrossGraphQuery;

  /** Matching entities from multiple graphs */
  entities: CrossGraphEntity[];

  /** Total count of matching entities (before limit) */
  total_count: number;

  /** Query execution time (milliseconds) */
  execution_time_ms: number;
}

/**
 * Entity result from cross-graph query
 * Includes graph context information
 */
export interface CrossGraphEntity {
  /** Entity ID */
  entity_id: string;

  /** Entity name */
  entity_name: string;

  /** Entity type */
  entity_type: string;

  /** Source graph ID */
  graph_id: string;

  /** Source graph type */
  graph_type: GraphType;

  /** Source graph name */
  graph_name: string;

  /** Entity confidence score */
  confidence: number;

  /** Entity pinned status */
  pinned: boolean;

  /** Entity attributes */
  attributes: Record<string, any>;

  /** Entity observations */
  observations: Array<{
    text: string;
    confidence: number;
    created_at: number;
    last_accessed: number;
  }>;

  /** Information level ID (null = Common Knowledge) */
  information_level_id: string | null;

  /** Unix timestamp */
  created_at: number;

  /** Unix timestamp */
  last_accessed: number;
}

/**
 * Cross-graph relationship result
 * Shows relationships between entities in different graphs
 */
export interface CrossGraphRelationship {
  /** Source entity (may be in different graph) */
  from_entity: {
    entity_id: string;
    entity_name: string;
    graph_id: string;
    graph_type: GraphType;
  };

  /** Target entity (may be in different graph) */
  to_entity: {
    entity_id: string;
    entity_name: string;
    graph_id: string;
    graph_type: GraphType;
  };

  /** Relationship type (inferred from observations or explicit edges) */
  relationship_type: string;

  /** Relationship confidence (average of entity confidences) */
  confidence: number;

  /** Supporting observation text */
  observation_text?: string;

  /** Relationship source ('edge' = explicit edge, 'observation' = inferred from text) */
  source: 'edge' | 'observation';
}

/**
 * Default query filter values
 */
export const DEFAULT_CROSS_GRAPH_FILTER: Required<CrossGraphQueryFilter> = {
  graph_types: [],
  node_types: [],
  min_confidence: 0.0,
  max_confidence: 1.0,
  information_level_ids: [],
  pinned_only: false,
  search_query: '',
  limit: 100,
};
