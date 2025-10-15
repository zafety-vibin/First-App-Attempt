import { apiClient } from './apiClient';
import { GraphNode, GraphEdge } from '../types/graph';

export const graphNodeService = {
  // Node CRUD operations
  async listNodes(campaignId: string, graphId: string): Promise<GraphNode[]> {
    const response = await apiClient.get(`/campaigns/${campaignId}/graphs/${graphId}/nodes`);
    return response.data.nodes;
  },

  async getNode(
    campaignId: string,
    graphId: string,
    nodeId: string
  ): Promise<GraphNode> {
    const response = await apiClient.get(
      `/campaigns/${campaignId}/graphs/${graphId}/nodes/${nodeId}`
    );
    return response.data.node;
  },

  async createNode(
    campaignId: string,
    graphId: string,
    nodeData: Partial<GraphNode>
  ): Promise<GraphNode> {
    const response = await apiClient.post(
      `/campaigns/${campaignId}/graphs/${graphId}/nodes`,
      nodeData
    );
    return response.data.node;
  },

  async updateNode(
    campaignId: string,
    graphId: string,
    nodeId: string,
    updates: Partial<GraphNode>
  ): Promise<GraphNode> {
    const response = await apiClient.patch(
      `/campaigns/${campaignId}/graphs/${graphId}/nodes/${nodeId}`,
      updates
    );
    return response.data.node;
  },

  async deleteNode(
    campaignId: string,
    graphId: string,
    nodeId: string
  ): Promise<void> {
    await apiClient.delete(
      `/campaigns/${campaignId}/graphs/${graphId}/nodes/${nodeId}`
    );
  },

  // Batch operations
  async batchCreateNodes(
    campaignId: string,
    graphId: string,
    nodes: Partial<GraphNode>[]
  ): Promise<GraphNode[]> {
    const response = await apiClient.post(
      `/campaigns/${campaignId}/graphs/${graphId}/nodes/batch`,
      { nodes }
    );
    return response.data.nodes;
  },

  async batchUpdateNodes(
    campaignId: string,
    graphId: string,
    updates: Array<{ id: string; updates: Partial<GraphNode> }>
  ): Promise<GraphNode[]> {
    const response = await apiClient.patch(
      `/campaigns/${campaignId}/graphs/${graphId}/nodes/batch`,
      { updates }
    );
    return response.data.nodes;
  },

  // Edge CRUD operations
  async listEdges(campaignId: string, graphId: string): Promise<GraphEdge[]> {
    const response = await apiClient.get(`/campaigns/${campaignId}/graphs/${graphId}/edges`);
    return response.data.edges;
  },

  async getEdge(
    campaignId: string,
    graphId: string,
    edgeId: string
  ): Promise<GraphEdge> {
    const response = await apiClient.get(
      `/campaigns/${campaignId}/graphs/${graphId}/edges/${edgeId}`
    );
    return response.data.edge;
  },

  async createEdge(
    campaignId: string,
    graphId: string,
    edgeData: Partial<GraphEdge>
  ): Promise<GraphEdge> {
    const response = await apiClient.post(
      `/campaigns/${campaignId}/graphs/${graphId}/edges`,
      edgeData
    );
    return response.data.edge;
  },

  async updateEdge(
    campaignId: string,
    graphId: string,
    edgeId: string,
    updates: Partial<GraphEdge>
  ): Promise<GraphEdge> {
    const response = await apiClient.patch(
      `/campaigns/${campaignId}/graphs/${graphId}/edges/${edgeId}`,
      updates
    );
    return response.data.edge;
  },

  async deleteEdge(
    campaignId: string,
    graphId: string,
    edgeId: string
  ): Promise<void> {
    await apiClient.delete(
      `/campaigns/${campaignId}/graphs/${graphId}/edges/${edgeId}`
    );
  },

  // Batch edge operations
  async batchCreateEdges(
    campaignId: string,
    graphId: string,
    edges: Partial<GraphEdge>[]
  ): Promise<GraphEdge[]> {
    const response = await apiClient.post(
      `/campaigns/${campaignId}/graphs/${graphId}/edges/batch`,
      { edges }
    );
    return response.data.edges;
  },

  // Node relationship queries
  async getNodeNeighbors(
    campaignId: string,
    graphId: string,
    nodeId: string
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const response = await apiClient.get(
      `/campaigns/${campaignId}/graphs/${graphId}/nodes/${nodeId}/neighbors`
    );
    return response.data;
  },

  async getNodeRelationships(
    campaignId: string,
    graphId: string,
    nodeId: string
  ): Promise<GraphEdge[]> {
    const response = await apiClient.get(
      `/campaigns/${campaignId}/graphs/${graphId}/nodes/${nodeId}/edges`
    );
    return response.data.edges;
  }
};

export default graphNodeService;