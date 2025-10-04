/**
 * Knowledge Graph Types
 * Feature: 005-create-the-ai
 */

export interface KnowledgeGraph {
  id: string;
  campaignId: string;
  type: 'geographical' | 'political_web' | 'world_foundations' | 'campaign_story';
  lastUpdated: string; // ISO 8601
  createdAt: string; // ISO 8601
}

export interface GraphNode {
  id: string;
  graphId: string;
  type: string; // Domain-specific: 'location', 'npc', 'faction', 'plot_thread', etc.
  name: string;
  attributes: {
    description?: string;
    tags?: string[]; // For active filtering (FR-065: "active", "party-relevant")
    [key: string]: unknown; // Custom fields
  };
  sourceCardId?: string;
  informationLevelId?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface GraphEdge {
  id: string;
  graphId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string; // Domain-specific: 'located_in', 'allied_with', etc.
  attributes: {
    strength?: number; // 0.0 to 1.0 for weighted relationships
    description?: string;
    [key: string]: unknown; // Custom fields
  };
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface ImportBatch {
  id: string;
  importSessionId: string;
  nodeIds: string[];
  edgeIds: string[];
  cardIds: string[];
  createdAt: string; // ISO 8601
}
