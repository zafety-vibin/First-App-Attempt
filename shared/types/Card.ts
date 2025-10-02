/**
 * Card Entity - Polymorphic content unit (Notion-inspired)
 * Feature: 003-create-a-notion
 *
 * Supports infinite nesting via adjacency list + materialized path.
 * Types: page, database, text, image
 */

import { DatabaseCardMetadata } from './DatabaseSchema';

/**
 * Card Type Discriminator
 */
export type CardType = 'page' | 'database' | 'text' | 'image';

/**
 * Base Card interface (common fields for all card types)
 */
export interface BaseCard {
  id: string; // UUID v4
  type: CardType; // Immutable
  parentId: string | null; // NULL = root card
  campaignId: string; // Immutable
  path: string; // Materialized path: '/campaign-id/card-id/child-id'
  position: number; // Order within parent (0-indexed)
  depth: number; // Nesting level (0-50)
  title: string | null; // NULL for text/image cards
  content: any | null; // ProseMirror JSON for rich text
  metadata: any | null; // Type-specific metadata
  coverImageUrl: string | null; // Cover image (page cards only)
  iconEmoji: string | null; // Icon emoji (page cards only)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Page Card - Standard content page
 */
export interface PageCard extends BaseCard {
  type: 'page';
  title: string; // Required for page cards
  content: ProseMirrorDoc | null;
  metadata: PageCardMetadata | null;
}

export interface PageCardMetadata {
  // Minimal - page cards use content for rich text
  // Reserved for future extensions
}

/**
 * Database Card - Notion-style database
 */
export interface DatabaseCard extends BaseCard {
  type: 'database';
  title: string; // Required for database cards
  metadata: DatabaseCardMetadata; // Schema, views, etc.
}

/**
 * Text Card - Text block
 */
export interface TextCard extends BaseCard {
  type: 'text';
  title: null; // Text cards don't have titles
  content: ProseMirrorDoc | null; // Rich text content
  metadata: null;
}

/**
 * Image Card - Image with optional caption
 */
export interface ImageCard extends BaseCard {
  type: 'image';
  title: null; // Image cards don't have titles
  metadata: ImageCardMetadata;
}

export interface ImageCardMetadata {
  url: string; // Image URL or upload path
  caption?: string; // Optional caption
  width?: number; // Original width (px)
  height?: number; // Original height (px)
  size?: number; // File size (bytes)
}

/**
 * Discriminated Union of all card types
 */
export type Card = PageCard | DatabaseCard | TextCard | ImageCard;

/**
 * ProseMirror Document Structure
 * Simplified type - actual ProseMirror schema is more complex
 */
export interface ProseMirrorDoc {
  type: 'doc';
  content?: ProseMirrorNode[];
}

export interface ProseMirrorNode {
  type: string; // 'paragraph', 'heading', 'text', etc.
  attrs?: Record<string, any>;
  content?: ProseMirrorNode[];
  marks?: ProseMirrorMark[];
  text?: string; // For text nodes
}

export interface ProseMirrorMark {
  type: string; // 'bold', 'italic', 'link', etc.
  attrs?: Record<string, any>;
}

/**
 * Create Card Request (from client)
 */
export interface CreateCardRequest {
  type: CardType;
  campaignId: string;
  parentId?: string | null;
  position: number;
  title?: string | null;
  content?: any | null;
  metadata?: any | null;
  coverImageUrl?: string | null;
  iconEmoji?: string | null;
}

/**
 * Update Card Request (from client)
 */
export interface UpdateCardRequest {
  type?: CardType; // Allow type transformation (e.g., text → database)
  title?: string | null;
  content?: any | null;
  metadata?: any | null;
  coverImageUrl?: string | null;
  iconEmoji?: string | null;
}

/**
 * Move Card Request
 */
export interface MoveCardRequest {
  newParentId: string | null; // NULL = move to root
  position: number;
}

/**
 * Reorder Card Request
 */
export interface ReorderCardRequest {
  position: number;
}
