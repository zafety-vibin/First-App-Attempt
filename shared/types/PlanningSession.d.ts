/**
 * Planning Session Types
 * Feature: 005-create-the-ai
 */
import { ChatMessage } from './ImportSession';
export interface PlanningSession {
    id: string;
    campaignId: string;
    status: 'active' | 'completed';
    chatHistory: ChatMessage[];
    graphUpdates: GraphUpdate[];
    createdAt: string;
    completedAt?: string;
}
export interface GraphUpdate {
    type: 'node_add' | 'node_update' | 'edge_add' | 'edge_delete';
    graphType: 'geographical' | 'political_web' | 'world_foundations' | 'campaign_story';
    nodeId?: string;
    edgeId?: string;
    data: Record<string, unknown>;
    appliedAt: string;
}
//# sourceMappingURL=PlanningSession.d.ts.map