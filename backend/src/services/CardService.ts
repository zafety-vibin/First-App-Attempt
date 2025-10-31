/**
 * CardService - Business logic for card operations
 * Feature: 003-create-a-notion
 * Extended in Feature: 004-create-a-tagging (added information level validation)
 *
 * Implements:
 * - Circular reference detection (DFS cycle detection)
 * - Materialized path calculation and recalculation
 * - Depth validation (50 level limit)
 * - Subtree deletion with CASCADE
 * - Entity reference validation
 * - Information level assignment and validation (Feature 004)
 */

import { db } from './DatabaseService';
import { Card, CreateCardRequest } from '../shared/types/Card';
import { rowToCard, cardToRow, CardRow, generateCardId } from '../models/Card';
import { InformationLevelService } from './InformationLevelService';

export class CardService {
  private readonly MAX_DEPTH = 50;
  private informationLevelService: InformationLevelService;

  constructor() {
    this.informationLevelService = new InformationLevelService();
  }

  /**
   * Create new card with hierarchy validation
   */
  async createCard(data: CreateCardRequest, ownerId: string): Promise<Card> {
    // Validate campaign ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(data.campaignId, ownerId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate parent exists and belongs to same campaign
    if (data.parentId) {
      const parent = db.prepare('SELECT * FROM cards WHERE id = ? AND campaign_id = ?').get(data.parentId, data.campaignId);
      if (!parent) {
        throw new Error('Parent card not found');
      }
    }

    // Feature 004: Validate and default information level
    const informationLevelId = data.informationLevelId || 'system';
    if (informationLevelId !== 'system') {
      const isValid = await this.informationLevelService.validateLevelForCampaign(informationLevelId, data.campaignId);
      if (!isValid) {
        throw new Error('Information level not found or not available for this campaign');
      }
    }

    // Generate ID and calculate hierarchy fields
    const cardId = generateCardId();
    const path = this.calculatePath(cardId, data.parentId || null, data.campaignId);
    const depth = this.calculateDepthFromPath(path);

    // Validate depth limit
    if (depth > this.MAX_DEPTH) {
      throw new Error(`Maximum nesting depth exceeded (${this.MAX_DEPTH} levels)`);
    }

    // Prepare card data
    const now = new Date();
    const cardData = {
      id: cardId,
      type: data.type,
      parentId: data.parentId || null,
      campaignId: data.campaignId,
      path,
      position: data.position,
      depth,
      title: data.title || null,
      content: data.content || null,
      metadata: data.metadata || null,
      coverImageUrl: data.coverImageUrl || null,
      iconEmoji: data.iconEmoji || null,
      informationLevelId, // Feature 004
      createdAt: now,
      updatedAt: now,
    } as Card;

    const row = cardToRow(cardData);

    // Insert into database
    db.prepare(`
      INSERT INTO cards (
        id, type, parent_id, campaign_id, path, position, depth,
        title, content, metadata, cover_image_url, icon_emoji, information_level_id,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.id, row.type, row.parent_id, row.campaign_id, row.path, row.position, row.depth,
      row.title, row.content, row.metadata, row.cover_image_url, row.icon_emoji, row.information_level_id,
      row.created_at, row.updated_at
    );

    const createdRow = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as CardRow;
    return rowToCard(createdRow);
  }

  /**
   * Calculate materialized path for card
   * Format: /campaign-id/card-id or /campaign-id/parent-id/child-id
   */
  calculatePath(cardId: string, parentId: string | null, campaignId: string): string {
    if (!parentId) {
      // Root card
      return `/${campaignId}/${cardId}`;
    }

    // Get parent's path
    const parent = db.prepare('SELECT path FROM cards WHERE id = ?').get(parentId) as { path: string } | undefined;
    if (!parent) {
      throw new Error('Parent card not found');
    }

    return `${parent.path}/${cardId}`;
  }

  /**
   * Calculate depth from path segments
   * Depth = number of card IDs in path (excluding campaign ID)
   */
  calculateDepthFromPath(path: string): number {
    const segments = path.split('/').filter(s => s); // Remove empty strings
    return segments.length - 1; // Subtract 1 for campaign ID
  }

  /**
   * Validate move operation (circular reference detection)
   * Uses path-based cycle detection: prevent moving card into its own subtree
   */
  validateMove(cardId: string, newParentId: string | null): void {
    if (newParentId === null) {
      // Moving to root is always valid
      return;
    }

    // Cannot move card into itself
    if (cardId === newParentId) {
      throw new Error('Cannot move card into itself');
    }

    // Get card's current path
    const card = db.prepare('SELECT path FROM cards WHERE id = ?').get(cardId) as { path: string } | undefined;
    if (!card) {
      throw new Error('Card not found');
    }

    // Get new parent's path
    const newParent = db.prepare('SELECT path FROM cards WHERE id = ?').get(newParentId) as { path: string } | undefined;
    if (!newParent) {
      throw new Error('New parent card not found');
    }

    // Check if newParent.path starts with card.path (circular reference)
    if (newParent.path.startsWith(card.path + '/') || newParent.path === card.path) {
      throw new Error('Cannot move card into its own subtree (circular reference detected)');
    }
  }

  /**
   * Validate depth after move operation
   */
  validateDepthAfterMove(cardId: string, newParentId: string | null, campaignId: string): void {
    // Calculate new depth
    const newPath = this.recalculatePath(cardId, newParentId, campaignId);
    const newDepth = this.calculateDepthFromPath(newPath);

    // Get card's subtree to find deepest descendant
    const card = db.prepare('SELECT path, depth FROM cards WHERE id = ?').get(cardId) as { path: string; depth: number };
    const descendants = db.prepare('SELECT depth FROM cards WHERE path LIKE ?').all(`${card.path}/%`) as { depth: number }[];

    if (descendants.length > 0) {
      const maxDescendantDepth = Math.max(...descendants.map(d => d.depth));
      const relativeDepth = maxDescendantDepth - card.depth;
      const newMaxDepth = newDepth + relativeDepth;

      if (newMaxDepth > this.MAX_DEPTH) {
        throw new Error(`Move would exceed maximum nesting depth (${this.MAX_DEPTH} levels)`);
      }
    } else if (newDepth > this.MAX_DEPTH) {
      throw new Error(`Move would exceed maximum nesting depth (${this.MAX_DEPTH} levels)`);
    }
  }

  /**
   * Recalculate path for move operation (dry-run)
   */
  recalculatePath(cardId: string, newParentId: string | null, campaignId: string): string {
    if (!newParentId) {
      return `/${campaignId}/${cardId}`;
    }

    const newParent = db.prepare('SELECT path FROM cards WHERE id = ?').get(newParentId) as { path: string } | undefined;
    if (!newParent) {
      throw new Error('New parent card not found');
    }

    return `${newParent.path}/${cardId}`;
  }

  /**
   * Move card to new parent and recalculate paths for entire subtree
   */
  async moveCard(cardId: string, newParentId: string | null, position: number, ownerId: string): Promise<Card> {
    // Get card and validate ownership
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(cardId, ownerId) as CardRow | undefined;

    if (!card) {
      throw new Error('Card not found or access denied');
    }

    // Validate move
    this.validateMove(cardId, newParentId);
    this.validateDepthAfterMove(cardId, newParentId, card.campaign_id);

    // Calculate new path and depth
    const newPath = this.recalculatePath(cardId, newParentId, card.campaign_id);
    const newDepth = this.calculateDepthFromPath(newPath);

    // Update card in transaction
    db.transaction(() => {
      // Update card's parent, path, depth, position
      db.prepare(`
        UPDATE cards
        SET parent_id = ?, path = ?, depth = ?, position = ?, updated_at = strftime('%s', 'now')
        WHERE id = ?
      `).run(newParentId, newPath, newDepth, position, cardId);

      // Recalculate paths for entire subtree
      this.recalculateSubtreePaths(cardId, card.path, newPath, card.depth, newDepth);
    })();

    const updatedRow = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as CardRow;
    return rowToCard(updatedRow);
  }

  /**
   * Recalculate paths for all descendants after move
   */
  private recalculateSubtreePaths(_cardId: string, oldPath: string, newPath: string, oldDepth: number, newDepth: number): void {
    const descendants = db.prepare('SELECT * FROM cards WHERE path LIKE ?').all(`${oldPath}/%`) as CardRow[];

    for (const descendant of descendants) {
      // Replace old path prefix with new path prefix
      const updatedPath = descendant.path.replace(oldPath, newPath);
      const updatedDepth = descendant.depth - oldDepth + newDepth;

      db.prepare(`
        UPDATE cards
        SET path = ?, depth = ?, updated_at = strftime('%s', 'now')
        WHERE id = ?
      `).run(updatedPath, updatedDepth, descendant.id);
    }
  }

  /**
   * Delete card and entire subtree (CASCADE)
   */
  async deleteCard(cardId: string, options?: { force?: boolean }): Promise<{ deleted_count: number }> {
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as CardRow | undefined;
    if (!card) {
      throw new Error('Card not found');
    }

    // Check for entity references (unless force=true)
    if (!options?.force) {
      const references = this.findEntityReferences(cardId);
      if (references.length > 0) {
        const error: any = new Error(`Card is referenced by ${references.length} database entries`);
        error.references = references;
        throw error;
      }
    }

    // Delete card and entire subtree using path pattern
    const result = db.prepare(`
      DELETE FROM cards WHERE path LIKE ? OR id = ?
    `).run(`${card.path}/%`, cardId);

    return { deleted_count: result.changes };
  }

  /**
   * Find database entries that reference this card
   */
  private findEntityReferences(cardId: string): Array<{ card_id: string; card_title: string; database_id: string }> {
    // Query all database entries (page cards with parent type='database')
    const entries = db.prepare(`
      SELECT c.id, c.title, c.parent_id, c.metadata
      FROM cards c
      JOIN cards parent ON c.parent_id = parent.id
      WHERE parent.type = 'database'
    `).all() as Array<{ id: string; title: string; parent_id: string; metadata: string | null }>;

    const references: Array<{ card_id: string; card_title: string; database_id: string }> = [];

    for (const entry of entries) {
      if (!entry.metadata) continue;

      try {
        const metadata = JSON.parse(entry.metadata);
        const values = metadata.values || {};

        // Check if any column value references the cardId
        for (const value of Object.values(values)) {
          if (value === cardId) {
            references.push({
              card_id: entry.id,
              card_title: entry.title || 'Untitled',
              database_id: entry.parent_id,
            });
            break;
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }

    return references;
  }

  /**
   * Validate depth for new card creation
   */
  validateDepth(parentId: string | null, campaignId: string): void {
    if (!parentId) {
      // Root card (depth 0) is always valid
      return;
    }

    const parent = db.prepare('SELECT depth FROM cards WHERE id = ? AND campaign_id = ?').get(parentId, campaignId) as { depth: number } | undefined;
    if (!parent) {
      throw new Error('Parent card not found');
    }

    const newDepth = parent.depth + 1;
    if (newDepth > this.MAX_DEPTH) {
      throw new Error(`Maximum nesting depth exceeded (${this.MAX_DEPTH} levels)`);
    }
  }
}
