/**
 * Knowledge Graph Types
 * Feature: 005-create-the-ai
 */
export interface KnowledgeGraph {
    id: string;
    campaignId: string;
    type: 'geographical' | 'political_web' | 'world_foundations' | 'campaign_story';
    lastUpdated: string;
    createdAt: string;
}
export interface GraphNode {
    id: string;
    graphId: string;
    type: string;
    name: string;
    attributes: {
        description?: string;
        tags?: string[];
        [key: string]: unknown;
    };
    sourceCardId?: string;
    informationLevelId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface GraphEdge {
    id: string;
    graphId: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationshipType: string;
    attributes: {
        strength?: number;
        description?: string;
        [key: string]: unknown;
    };
    createdAt: string;
    updatedAt: string;
}
export interface ImportBatch {
    id: string;
    importSessionId: string;
    nodeIds: string[];
    edgeIds: string[];
    cardIds: string[];
    createdAt: string;
}
//# sourceMappingURL=KnowledgeGraph.d.ts.map