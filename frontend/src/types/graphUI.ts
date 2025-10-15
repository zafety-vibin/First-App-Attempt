/**
 * Graph UI Types
 * Feature 006: Knowledge Graphs with Confidence Decay
 *
 * UI-specific types for displaying knowledge graphs, confidence badges, and stale entity warnings
 */

import { GraphType } from '../../../backend/src/models/KnowledgeGraph';

/**
 * Confidence badge type for UI color coding
 * From confidence-decay.json thresholds:
 * - High: > 0.7 (green)
 * - Medium: 0.4 - 0.7 (yellow)
 * - Low: < 0.4 (red)
 */
export type ConfidenceBadge = 'high' | 'medium' | 'low';

/**
 * Get badge type from confidence score
 */
export function getConfidenceBadge(confidence: number): ConfidenceBadge {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

/**
 * Badge color mapping for UI components
 */
export const BADGE_COLORS: Record<ConfidenceBadge, { bg: string; text: string; border: string }> = {
  high: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
  },
  medium: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
  },
  low: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
  },
};

/**
 * Stale entity warning for UI display
 * Shown when entity confidence falls below threshold
 */
export interface StaleEntityWarning {
  /** Entity ID */
  entity_id: string;

  /** Entity name */
  entity_name: string;

  /** Entity type */
  entity_type: string;

  /** Current confidence score */
  confidence: number;

  /** Confidence level classification */
  confidence_level: ConfidenceBadge;

  /** Graph ID where entity exists */
  graph_id: string;

  /** Graph type */
  graph_type: GraphType;

  /** Graph name */
  graph_name: string;

  /** Last accessed timestamp (Unix seconds) */
  last_accessed: number;

  /** Weeks elapsed since last access */
  weeks_elapsed: number;

  /** Suggested action message */
  suggestion: string;
}

/**
 * Graph toggle state for AI access control
 * Displayed in Graph Summary Panel
 */
export interface GraphToggleState {
  /** Graph ID */
  graph_id: string;

  /** Graph type */
  graph_type: GraphType;

  /** Graph display name */
  graph_name: string;

  /** Toggle state: true = AI can access, false = filtered out */
  toggle_state: boolean;

  /** Decay rate configuration */
  decay_rate: number;

  /** Active entity count (entities above confidence threshold) */
  active_entity_count: number;

  /** Total entity count */
  total_entity_count: number;

  /** Active edge count (edges with both entities above threshold) */
  active_edge_count: number;

  /** Total edge count */
  total_edge_count: number;

  /** Confidence threshold for "active" classification */
  confidence_threshold: number;

  /** Last updated timestamp (Unix seconds) */
  updated_at: number;
}

/**
 * Graph summary statistics for panel display
 * Shown above Planning AI interface
 */
export interface GraphSummaryStats {
  /** Campaign ID */
  campaign_id: string;

  /** All graphs in campaign with toggle states */
  graphs: GraphToggleState[];

  /** Total entity count across all graphs */
  total_entities: number;

  /** Total active entity count (above threshold) */
  total_active_entities: number;

  /** Total edge count across all graphs */
  total_edges: number;

  /** Total active edge count */
  total_active_edges: number;

  /** Number of graphs with toggle_state = true */
  active_graph_count: number;

  /** Total graph count */
  total_graph_count: number;

  /** Last refresh timestamp (Unix seconds) */
  last_refresh: number;
}

/**
 * Entity display info for lists and cards
 */
export interface EntityDisplayInfo {
  /** Entity ID */
  id: string;

  /** Entity name */
  name: string;

  /** Entity type */
  entity_type: string;

  /** Confidence score (0.0-1.0) */
  confidence: number;

  /** Confidence badge type */
  badge: ConfidenceBadge;

  /** Pinned status */
  pinned: boolean;

  /** Last accessed timestamp (Unix seconds) */
  last_accessed: number;

  /** Formatted last accessed date (e.g., "2 weeks ago") */
  last_accessed_formatted: string;

  /** Graph context */
  graph: {
    graph_id: string;
    graph_type: GraphType;
    graph_name: string;
  };

  /** Information level (null = Common Knowledge) */
  information_level_id: string | null;
}

/**
 * Observation display info with individual confidence
 */
export interface ObservationDisplayInfo {
  /** Observation text */
  text: string;

  /** Observation confidence (0.0-1.0) */
  confidence: number;

  /** Confidence badge type */
  badge: ConfidenceBadge;

  /** Created timestamp (Unix seconds) */
  created_at: number;

  /** Last accessed timestamp (Unix seconds) */
  last_accessed: number;

  /** Formatted created date */
  created_formatted: string;

  /** Formatted last accessed date */
  last_accessed_formatted: string;
}

/**
 * Graph filter options for UI controls
 */
export interface GraphFilterOptions {
  /** Selected graph types (empty = all) */
  graph_types: GraphType[];

  /** Selected node types (empty = all) */
  node_types: string[];

  /** Minimum confidence filter */
  min_confidence: number;

  /** Maximum confidence filter */
  max_confidence: number;

  /** Only show pinned entities */
  pinned_only: boolean;

  /** Text search query */
  search_query: string;

  /** Sort field */
  sort_by: 'confidence' | 'name' | 'last_accessed' | 'created_at';

  /** Sort direction */
  sort_order: 'asc' | 'desc';
}

/**
 * Default filter options
 */
export const DEFAULT_GRAPH_FILTER: GraphFilterOptions = {
  graph_types: [],
  node_types: [],
  min_confidence: 0.0,
  max_confidence: 1.0,
  pinned_only: false,
  search_query: '',
  sort_by: 'confidence',
  sort_order: 'desc',
};

/**
 * Confidence indicator component props
 */
export interface ConfidenceIndicatorProps {
  /** Confidence score (0.0-1.0) */
  confidence: number;

  /** Whether entity is pinned */
  pinned: boolean;

  /** Last accessed timestamp (Unix seconds) */
  last_accessed: number;

  /** Show as badge or progress bar */
  variant: 'badge' | 'bar';

  /** Size variant */
  size: 'sm' | 'md' | 'lg';

  /** Optional click handler for pin/reinforce actions */
  onAction?: (action: 'pin' | 'reinforce' | 'view') => void;
}

/**
 * Graph summary panel component props
 */
export interface GraphSummaryPanelProps {
  /** Campaign ID */
  campaign_id: string;

  /** Graph summary statistics */
  summary: GraphSummaryStats;

  /** Toggle state change handler */
  onToggleChange: (graph_id: string, new_state: boolean) => void;

  /** Refresh handler */
  onRefresh: () => void;

  /** Show/hide collapsed state */
  collapsed?: boolean;
}

/**
 * Stale entity list component props
 */
export interface StaleEntityListProps {
  /** Campaign ID */
  campaign_id: string;

  /** Stale entities to display */
  entities: StaleEntityWarning[];

  /** Confidence threshold for stale classification */
  threshold: number;

  /** Action handlers */
  onReinforce: (entity_id: string) => void;
  onPin: (entity_id: string) => void;
  onView: (entity_id: string) => void;

  /** Maximum entities to show before pagination */
  max_display?: number;
}

/**
 * Time formatting helper type
 */
export type TimeAgoFormat = 'short' | 'long';

/**
 * Format Unix timestamp as "time ago" string
 */
export function formatTimeAgo(timestamp: number, format: TimeAgoFormat = 'short'): string {
  const now = Math.floor(Date.now() / 1000);
  const secondsAgo = now - timestamp;

  const weeks = Math.floor(secondsAgo / (7 * 24 * 60 * 60));
  const days = Math.floor(secondsAgo / (24 * 60 * 60));
  const hours = Math.floor(secondsAgo / (60 * 60));
  const minutes = Math.floor(secondsAgo / 60);

  if (weeks > 0) {
    return format === 'short' ? `${weeks}w ago` : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (days > 0) {
    return format === 'short' ? `${days}d ago` : `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (hours > 0) {
    return format === 'short' ? `${hours}h ago` : `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (minutes > 0) {
    return format === 'short' ? `${minutes}m ago` : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/**
 * Confidence score formatting
 */
export function formatConfidence(confidence: number, precision: number = 2): string {
  return (confidence * 100).toFixed(precision) + '%';
}
