/**
 * Campaign-Story Service
 * Feature 006 Extension: Dual-Tier Timeline System
 */

import { apiClient } from './apiClient';
import { GraphNode, GraphEdge } from '../types/graph';

export interface TemporalAnchors {
  session_number: number;
  in_game_date?: string;
  real_world_date: string;
  days_elapsed_total?: number;
}

export interface FinalizeSessionRequest {
  name: string;
  temporal_anchors: TemporalAnchors;
  observations: string[];
  tags?: string[];
  detect_changes?: boolean;
}

export interface FinalizeSessionResponse {
  recap_node: GraphNode;
  batch_node: GraphNode | null;
  changes: {
    additions: any[];
    modifications: any[];
  };
  pruned: number;
  summary: string;
}

export interface BulkImportResponse {
  sessions_imported: number;
  metadata_nodes_created: number;
  entities_logged: number;
  recap_nodes: GraphNode[];
  summary: string;
}

export interface TimelineResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  tier_filter: 'narrative' | 'metadata' | 'all';
}

export const campaignStoryService = {
  /**
   * Finalize a session import (creates recap + metadata nodes)
   */
  async finalizeSession(
    campaignId: string,
    graphId: string,
    data: FinalizeSessionRequest
  ): Promise<FinalizeSessionResponse> {
    const response = await apiClient.post(
      `/campaigns/${campaignId}/graphs/${graphId}/sessions/finalize`,
      data
    );
    return response.data;
  },

  /**
   * Bulk import from session_recaps database table
   */
  async bulkImportSessions(
    campaignId: string,
    graphId: string
  ): Promise<BulkImportResponse> {
    const response = await apiClient.post(
      `/campaigns/${campaignId}/graphs/${graphId}/sessions/bulk-import`
    );
    return response.data;
  },

  /**
   * Get session timeline with tier filtering
   */
  async getTimeline(
    campaignId: string,
    graphId: string,
    tier: 'narrative' | 'metadata' | 'all' = 'narrative'
  ): Promise<TimelineResponse> {
    const response = await apiClient.get(
      `/campaigns/${campaignId}/graphs/${graphId}/sessions/timeline`,
      { params: { tier } }
    );
    return response.data;
  }
};
