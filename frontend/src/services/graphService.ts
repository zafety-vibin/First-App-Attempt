/**
 * Graph Service - API client for knowledge graphs
 * References:
 * - specs/005-create-the-ai/contracts/knowledge-graphs.yaml
 * - specs/005-create-the-ai/plan.md T065
 */

import { apiClient } from './apiClient';

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
  attributes?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: string;
  weight?: number;
}

export interface KnowledgeGraph {
  id: string;
  campaign_id: string;
  graph_type: string;
  is_active_filtered: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  created_at: number;
  updated_at: number;
}

export interface CreateNodeRequest {
  name: string;
  type: string;
  description?: string;
  tags?: string[];
  is_active?: boolean;
  attributes?: Record<string, any>;
}

export interface CreateEdgeRequest {
  source_id: string;
  target_id: string;
  relationship_type: string;
  weight?: number;
}

class GraphService {
  /**
   * List all knowledge graphs for a campaign
   */
  async listGraphs(campaignId: string): Promise<KnowledgeGraph[]> {
    const response = await apiClient.get(`/api/campaigns/${campaignId}/graphs`);
    return response.data;
  }

  /**
   * Get a specific knowledge graph
   */
  async getGraph(
    campaignId: string,
    graphType: string,
    activeFilter: boolean = false
  ): Promise<KnowledgeGraph> {
    const params = activeFilter ? '?active_filter=true' : '';
    const response = await apiClient.get(
      `/api/campaigns/${campaignId}/graphs/${graphType}${params}`
    );
    return response.data;
  }

  /**
   * Create a new node in a knowledge graph
   */
  async createNode(
    campaignId: string,
    graphType: string,
    node: CreateNodeRequest
  ): Promise<GraphNode> {
    const response = await apiClient.post(
      `/api/campaigns/${campaignId}/graphs/${graphType}/nodes`,
      node
    );
    return response.data;
  }

  /**
   * Update an existing node
   */
  async updateNode(
    campaignId: string,
    graphType: string,
    nodeId: string,
    updates: Partial<GraphNode>
  ): Promise<GraphNode> {
    const response = await apiClient.put(
      `/api/campaigns/${campaignId}/graphs/${graphType}/nodes/${nodeId}`,
      updates
    );
    return response.data;
  }

  /**
   * Delete a node (and its connected edges)
   */
  async deleteNode(
    campaignId: string,
    graphType: string,
    nodeId: string
  ): Promise<void> {
    await apiClient.delete(
      `/api/campaigns/${campaignId}/graphs/${graphType}/nodes/${nodeId}`
    );
  }

  /**
   * Create a new edge in a knowledge graph
   */
  async createEdge(
    campaignId: string,
    graphType: string,
    edge: CreateEdgeRequest
  ): Promise<GraphEdge> {
    const response = await apiClient.post(
      `/api/campaigns/${campaignId}/graphs/${graphType}/edges`,
      edge
    );
    return response.data;
  }

  /**
   * Update an existing edge
   */
  async updateEdge(
    campaignId: string,
    graphType: string,
    edgeId: string,
    updates: Partial<GraphEdge>
  ): Promise<GraphEdge> {
    const response = await apiClient.put(
      `/api/campaigns/${campaignId}/graphs/${graphType}/edges/${edgeId}`,
      updates
    );
    return response.data;
  }

  /**
   * Delete an edge
   */
  async deleteEdge(
    campaignId: string,
    graphType: string,
    edgeId: string
  ): Promise<void> {
    await apiClient.delete(
      `/api/campaigns/${campaignId}/graphs/${graphType}/edges/${edgeId}`
    );
  }

  /**
   * Toggle active filter for a graph
   */
  async toggleActiveFilter(
    campaignId: string,
    graphType: string,
    enabled: boolean
  ): Promise<{ message: string; is_active_filtered: boolean }> {
    const response = await apiClient.post(
      `/api/campaigns/${campaignId}/graphs/${graphType}/toggle-filter`,
      { enabled }
    );
    return response.data;
  }

  /**
   * Search nodes across all graphs
   */
  async searchNodes(
    campaignId: string,
    query: string,
    graphType?: string
  ): Promise<GraphNode[]> {
    const params = new URLSearchParams({ q: query });
    if (graphType) {
      params.append('graph_type', graphType);
    }
    const response = await apiClient.get(
      `/api/campaigns/${campaignId}/graphs/search?${params}`
    );
    return response.data;
  }

  /**
   * Get node relationships (edges connected to a node)
   */
  async getNodeRelationships(
    campaignId: string,
    graphType: string,
    nodeId: string
  ): Promise<{
    incoming: GraphEdge[];
    outgoing: GraphEdge[];
  }> {
    const response = await apiClient.get(
      `/api/campaigns/${campaignId}/graphs/${graphType}/nodes/${nodeId}/relationships`
    );
    return response.data;
  }

  /**
   * Bulk create nodes
   */
  async bulkCreateNodes(
    campaignId: string,
    graphType: string,
    nodes: CreateNodeRequest[]
  ): Promise<GraphNode[]> {
    const response = await apiClient.post(
      `/api/campaigns/${campaignId}/graphs/${graphType}/nodes/bulk`,
      { nodes }
    );
    return response.data;
  }

  /**
   * Bulk create edges
   */
  async bulkCreateEdges(
    campaignId: string,
    graphType: string,
    edges: CreateEdgeRequest[]
  ): Promise<GraphEdge[]> {
    const response = await apiClient.post(
      `/api/campaigns/${campaignId}/graphs/${graphType}/edges/bulk`,
      { edges }
    );
    return response.data;
  }
}

export const graphService = new GraphService();