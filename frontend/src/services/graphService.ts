import { apiClient } from './apiClient';
import {
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  GraphStats,
  GraphObservation
} from '../types/graph';

export const graphService = {
  // Graph CRUD operations
  async listGraphs(campaignId: string): Promise<KnowledgeGraph[]> {
    const response = await apiClient.get(`/campaigns/${campaignId}/graphs`);
    return response.data.graphs;
  },

  async getGraph(
    campaignId: string,
    graphId: string,
    includeNodes = true,
    includeEdges = true
  ): Promise<KnowledgeGraph> {
    const response = await apiClient.get(`/campaigns/${campaignId}/graphs/${graphId}`, {
      params: {
        include_nodes: includeNodes,
        include_edges: includeEdges
      }
    });
    return response.data;
  },

  async createGraph(
    campaignId: string,
    graphData: Partial<KnowledgeGraph>
  ): Promise<KnowledgeGraph> {
    const response = await apiClient.post(`/campaigns/${campaignId}/graphs`, graphData);
    return response.data.graph;
  },

  async updateGraph(
    campaignId: string,
    graphId: string,
    updates: Partial<KnowledgeGraph>
  ): Promise<KnowledgeGraph> {
    const response = await apiClient.patch(`/campaigns/${campaignId}/graphs/${graphId}`, updates);
    return response.data.graph;
  },

  async deleteGraph(campaignId: string, graphId: string): Promise<void> {
    await apiClient.delete(`/campaigns/${campaignId}/graphs/${graphId}`);
  },

  // Toggle controls
  async toggleGraph(campaignId: string, graphId: string, state: boolean): Promise<void> {
    await apiClient.post(`/campaigns/${campaignId}/graphs/${graphId}/toggle`, { state });
  },

  async getActiveGraphs(campaignId: string): Promise<KnowledgeGraph[]> {
    const response = await apiClient.get(`/campaigns/${campaignId}/graphs/active`);
    return response.data.graphs;
  },

  // Confidence management endpoints
  async pinNode(campaignId: string, graphId: string, nodeId: string): Promise<void> {
    await apiClient.post(`/campaigns/${campaignId}/graphs/${graphId}/nodes/${nodeId}/pin`);
  },

  async unpinNode(campaignId: string, graphId: string, nodeId: string): Promise<void> {
    await apiClient.post(`/campaigns/${campaignId}/graphs/${graphId}/nodes/${nodeId}/unpin`);
  },

  async reinforceNode(campaignId: string, graphId: string, nodeId: string): Promise<void> {
    await apiClient.post(`/campaigns/${campaignId}/graphs/${graphId}/nodes/${nodeId}/reinforce`);
  },

  async getStaleEntities(
    campaignId: string,
    graphId: string,
    threshold = 0.3
  ): Promise<GraphNode[]> {
    const response = await apiClient.get(`/campaigns/${campaignId}/graphs/${graphId}/stale`, {
      params: { threshold }
    });
    return response.data.nodes;
  },

  // Version management
  async getVersions(campaignId: string, graphId: string): Promise<any[]> {
    const response = await apiClient.get(`/campaigns/${campaignId}/graphs/${graphId}/versions`);
    return response.data.versions;
  },

  async restoreVersion(campaignId: string, graphId: string, versionId: string): Promise<void> {
    await apiClient.post(`/campaigns/${campaignId}/graphs/${graphId}/versions/${versionId}/restore`);
  },

  // Cross-graph queries
  async crossGraphQuery(
    campaignId: string,
    observation: string,
    targetGraphIds?: string[]
  ): Promise<GraphObservation[]> {
    const response = await apiClient.post(`/campaigns/${campaignId}/graphs/query`, {
      observation,
      target_graph_ids: targetGraphIds
    });
    return response.data.observations;
  },

  // Stats and metadata
  async getGraphStats(campaignId: string, graphId: string): Promise<GraphStats> {
    const response = await apiClient.get(`/campaigns/${campaignId}/graphs/${graphId}/stats`);
    return response.data.stats;
  }
};

export default graphService;