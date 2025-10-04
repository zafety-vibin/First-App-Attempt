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
  createdAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
}

export interface GraphUpdate {
  type: 'node_add' | 'node_update' | 'edge_add' | 'edge_delete';
  graphType: 'geographical' | 'political_web' | 'world_foundations' | 'campaign_story';
  nodeId?: string;
  edgeId?: string;
  data: Record<string, unknown>; // Node/Edge attributes
  appliedAt: string; // ISO 8601
}
