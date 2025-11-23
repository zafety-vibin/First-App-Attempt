/**
 * PortalMessage Model
 * Feature 009: Player Question Portal
 *
 * Individual Q&A message in conversation (question, AI response, citations)
 */

export interface Citation {
  number: number; // Citation number [1], [2], etc.
  cardId: string; // UUID of source card
  cardTitle: string; // Title for display
  url: string; // Link to card detail page
}

export interface PortalMessage {
  id: string; // UUID
  conversationId: string; // FK to portal_conversations
  playerId: string; // FK to portal_players (denormalized for quick queries)
  question: string;
  response: string;
  citations: Citation[]; // Stored as JSON TEXT in database
  tokenCount: number;
  createdAt: number; // Unix timestamp (milliseconds)
}
