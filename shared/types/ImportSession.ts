/**
 * Import Session Types
 * Feature: 005-create-the-ai
 */

export interface ImportSession {
  id: string;
  campaignId: string;
  status: 'uploading' | 'processing' | 'pending_approval' | 'approved' | 'reverted';
  chatHistory: ChatMessage[];
  approvalSummary?: AIApprovalSummary;
  createdAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // ISO 8601
}

export interface AIApprovalSummary {
  entitiesExtracted: EntityExtractionResult[];
  nodesAdded: {
    graphType: KnowledgeGraphType;
    nodeType: string;
    name: string;
    nodeId: string;
  }[];
  edgesAdded: {
    graphType: KnowledgeGraphType;
    relationshipType: string;
    source: string; // Node name
    target: string; // Node name
    edgeId: string;
  }[];
  cardsCreated: {
    title: string;
    category: string;
    cardId: string;
  }[];
  potentialConflicts: TimelineConflict[];
}

export interface EntityExtractionResult {
  name: string;
  type: string; // 'location', 'npc', 'faction', etc.
  confidence: number; // 0.0 to 1.0
  fuzzyMatchScore?: number; // If matched to existing entity
  existingEntityId?: string; // If deduplicated
}

export interface TimelineConflict {
  description: string;
  sourceCardId: string;
  conflictingRecapId: string;
  severity: 'low' | 'medium' | 'high';
}

export type KnowledgeGraphType = 'geographical' | 'political_web' | 'world_foundations' | 'campaign_story';
