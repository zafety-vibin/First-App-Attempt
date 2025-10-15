// Core graph types matching backend models
export type GraphType = 'Geographical' | 'Political-Web' | 'Campaign-Story' | 'World-Foundations' | string;

export interface KnowledgeGraph {
  id: string;
  campaign_id: string;
  graph_type: GraphType;
  graph_name: string;
  toggle_state: boolean;
  user_defined_schema?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Optional counts returned by list endpoint
  node_count?: number;
  edge_count?: number;
}

export interface GraphNode {
  id: string;
  graph_id: string;
  name: string;
  type: string;
  attributes: Record<string, any>;
  observations?: Array<{ text: string; created_at: number; last_accessed: number }>;
  confidence?: number;
  is_pinned: boolean;
  last_reinforced_at?: string;
  information_level?: 'System' | 'Common Knowledge' | 'Player Knowledge' | 'DM Secret' | string;
  created_at: string;
  updated_at: string;
}

export interface GraphEdge {
  id: string;
  graph_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  attributes: Record<string, any>;
  weight?: number;
  confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface GraphObservation {
  id: string;
  graph_id: string;
  observation: string;
  context?: Record<string, any>;
  created_at: string;
  created_by?: string;
}

// Version management types
export interface GraphVersion {
  id: string;
  graph_id: string;
  version_number: number;
  snapshot: GraphSnapshot;
  description?: string;
  created_at: string;
  created_by?: string;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    node_count: number;
    edge_count: number;
    timestamp: string;
  };
}

// Confidence decay types
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'stale';

export interface ConfidenceCalculationResult {
  node_id: string;
  base_confidence: number;
  decay_factor: number;
  final_confidence: number;
  is_pinned: boolean;
  days_since_reinforcement?: number;
  confidence_level: ConfidenceLevel;
}

// Frontend-specific types
export interface GraphStats {
  total_nodes: number;
  total_edges: number;
  confidence_distribution: {
    high: number;    // >0.7
    medium: number;  // 0.4-0.7
    low: number;     // <0.4
    pinned: number;
  };
  avg_confidence: number;
  stale_nodes_count: number;
  last_updated: string;
}

export interface GraphOverview {
  graph: KnowledgeGraph;
  stats: GraphStats;
  recent_activity?: GraphActivity[];
}

export interface GraphActivity {
  id: string;
  action: 'node_added' | 'node_updated' | 'edge_added' | 'edge_removed' | 'reinforced' | 'pinned';
  entity_id: string;
  entity_name: string;
  timestamp: string;
  user?: string;
}

// UI-specific types for visualizations
export interface GraphVisualizationNode {
  id: string;
  label: string;
  group?: string;
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  confidence?: number;
  isPinned?: boolean;
  data: GraphNode;
}

export interface GraphVisualizationEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  weight?: number;
  color?: string;
  data: GraphEdge;
}

export interface GraphVisualizationData {
  nodes: GraphVisualizationNode[];
  edges: GraphVisualizationEdge[];
}

// Filter and query types
export interface GraphFilter {
  confidenceThreshold?: number;
  nodeTypes?: string[];
  informationLevels?: string[];
  showPinnedOnly?: boolean;
  searchTerm?: string;
}

export interface GraphQueryResult {
  graphs: KnowledgeGraph[];
  observations: GraphObservation[];
  relevantNodes: GraphNode[];
  relevantEdges: GraphEdge[];
}