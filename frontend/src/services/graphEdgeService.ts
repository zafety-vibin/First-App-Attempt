import { apiClient } from './apiClient';
import { GraphEdge } from '../types/graph';

export interface CreateEdgeRequest {
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  attributes?: Record<string, any>;
  weight?: number;
  confidence?: number;
}

export interface UpdateEdgeRequest {
  relationship_type?: string;
  attributes?: Record<string, any>;
  weight?: number;
  confidence?: number;
}

export interface ListEdgesParams {
  edge_type?: string;
  source_node_id?: string;
  target_node_id?: string;
  directed?: boolean;
  limit?: number;
  offset?: number;
}

export const graphEdgeService = {
  // List edges for a graph
  async listEdges(
    campaignId: string,
    graphId: string,
    params?: ListEdgesParams
  ): Promise<GraphEdge[]> {
    const response = await apiClient.get(
      `/campaigns/${campaignId}/graphs/${graphId}/edges`,
      { params }
    );
    return response.data.edges;
  },

  // Create a new edge
  async createEdge(
    campaignId: string,
    graphId: string,
    edgeData: CreateEdgeRequest
  ): Promise<GraphEdge> {
    const response = await apiClient.post(
      `/campaigns/${campaignId}/graphs/${graphId}/edges`,
      edgeData
    );
    return response.data;
  },

  // Get a specific edge
  async getEdge(
    campaignId: string,
    graphId: string,
    edgeId: string
  ): Promise<GraphEdge> {
    const response = await apiClient.get(
      `/campaigns/${campaignId}/graphs/${graphId}/edges/${edgeId}`
    );
    return response.data;
  },

  // Update an edge
  async updateEdge(
    campaignId: string,
    graphId: string,
    edgeId: string,
    updates: UpdateEdgeRequest
  ): Promise<GraphEdge> {
    const response = await apiClient.patch(
      `/campaigns/${campaignId}/graphs/${graphId}/edges/${edgeId}`,
      updates
    );
    return response.data;
  },

  // Delete an edge
  async deleteEdge(
    campaignId: string,
    graphId: string,
    edgeId: string
  ): Promise<void> {
    await apiClient.delete(
      `/campaigns/${campaignId}/graphs/${graphId}/edges/${edgeId}`
    );
  }
};

export default graphEdgeService;
