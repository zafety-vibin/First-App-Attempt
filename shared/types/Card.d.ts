/**
 * Card Entity - Polymorphic content unit (Notion-inspired)
 * Feature: 003-create-a-notion
 * Extended in Feature: 004-create-a-tagging (added informationLevelId)
 *
 * Supports infinite nesting via adjacency list + materialized path.
 * Types: page, database, text, image
 */
import { DatabaseCardMetadata } from './DatabaseSchema';
import { InformationLevel } from './InformationLevel';
/**
 * Card Type Discriminator
 */
export type CardType = 'page' | 'database' | 'text' | 'image';
/**
 * Base Card interface (common fields for all card types)
 */
export interface BaseCard {
    id: string;
    type: CardType;
    parentId: string | null;
    campaignId: string;
    path: string;
    position: number;
    depth: number;
    title: string | null;
    content: any | null;
    metadata: any | null;
    coverImageUrl: string | null;
    iconEmoji: string | null;
    informationLevelId: string;
    informationLevel?: InformationLevel;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Page Card - Standard content page
 */
export interface PageCard extends BaseCard {
    type: 'page';
    title: string;
    content: ProseMirrorDoc | null;
    metadata: PageCardMetadata | null;
}
export interface PageCardMetadata {
}
/**
 * Database Card - Notion-style database
 */
export interface DatabaseCard extends BaseCard {
    type: 'database';
    title: string;
    metadata: DatabaseCardMetadata;
}
/**
 * Text Card - Text block
 */
export interface TextCard extends BaseCard {
    type: 'text';
    title: null;
    content: ProseMirrorDoc | null;
    metadata: null;
}
/**
 * Image Card - Image with optional caption
 */
export interface ImageCard extends BaseCard {
    type: 'image';
    title: null;
    metadata: ImageCardMetadata;
}
export interface ImageCardMetadata {
    url: string;
    caption?: string;
    width?: number;
    height?: number;
    size?: number;
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
    type: string;
    attrs?: Record<string, any>;
    content?: ProseMirrorNode[];
    marks?: ProseMirrorMark[];
    text?: string;
}
export interface ProseMirrorMark {
    type: string;
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
    informationLevelId?: string;
}
/**
 * Update Card Request (from client)
 */
export interface UpdateCardRequest {
    type?: CardType;
    title?: string | null;
    content?: any | null;
    metadata?: any | null;
    coverImageUrl?: string | null;
    iconEmoji?: string | null;
    informationLevelId?: string;
}
/**
 * Move Card Request
 */
export interface MoveCardRequest {
    newParentId: string | null;
    position: number;
}
/**
 * Reorder Card Request
 */
export interface ReorderCardRequest {
    position: number;
}
//# sourceMappingURL=Card.d.ts.map