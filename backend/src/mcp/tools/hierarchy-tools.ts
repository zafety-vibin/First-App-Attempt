/**
 * MCP Hierarchy Tools Implementation
 * Provides 5 tools for navigating card hierarchy: get_card_path, get_subtree, list_children, get_siblings, get_ancestor
 */

import {
  GetCardPathInputSchema,
  GetSubtreeInputSchema,
  ListChildrenInputSchema,
  GetSiblingsInputSchema,
  GetAncestorInputSchema
} from '../schemas/hierarchy-schemas';
import { db } from '../../services/DatabaseService';
import { rowToCard, CardRow } from '../../models/Card';


/**
 * Tool definitions for hierarchy operations
 */
export const hierarchyToolDefinitions = [
  {
    name: 'get_card_path',
    description: 'Get the hierarchical path from root to a specific card',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number' },
        campaign_id: { type: 'string' }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'get_subtree',
    description: 'Get a card and all its descendants up to a specified depth',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number' },
        campaign_id: { type: 'string' },
        max_depth: { type: 'number', minimum: 1, maximum: 10 }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'list_children',
    description: `List all direct child cards of a specific card.

IMPORTANT: To list ROOT level cards (the campaign's landing page), use parent_id: null (NOT 0, NOT "null" string).

Examples:
- List root cards: list_children({"campaign_id": "...", "parent_id": null})
- List children of card 42: list_children({"campaign_id": "...", "parent_id": 42})

Root cards are typically organizational pages like: NPCs, Locations, Lore, Quests, Session Notes.`,
    inputSchema: {
      type: 'object',
      properties: {
        parent_id: { type: ['number', 'null'] },
        campaign_id: { type: 'string' }
      },
      required: ['campaign_id']
    }
  },
  {
    name: 'get_siblings',
    description: 'Get all sibling cards (cards with the same parent) of a specific card',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number' },
        campaign_id: { type: 'string' }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'get_ancestor',
    description: 'Get the nearest ancestor of a specific type',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number' },
        campaign_id: { type: 'string' },
        ancestor_type: { type: 'string', enum: ['text', 'database', 'map'] }
      },
      required: ['card_id', 'campaign_id', 'ancestor_type']
    }
  }
];

/**
 * Handler for get_card_path tool
 */
export async function handleGetCardPath(params: any) {
  try {
    const validated = GetCardPathInputSchema.parse(params);

    const path: any[] = [];
    let currentCardId: number | null = validated.card_id;

    // Traverse up the hierarchy
    while (currentCardId !== null) {
      const row = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(currentCardId, validated.campaign_id) as CardRow | undefined;

      if (!row) {
        if (path.length === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'CARD_NOT_FOUND',
                message: `Card not found: ${currentCardId}`
              })
            }]
          };
        }
        break;
      }

      const card = rowToCard(row);
      path.unshift({
        id: parseInt(card.id),
        title: card.title,
        card_type: card.type === 'page' ? 'map' : card.type,
        information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId)
      });

      currentCardId = card.parentId ? parseInt(card.parentId) : null;
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          path,
          depth: path.length
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for get_subtree tool
 */
export async function handleGetSubtree(params: any) {
  try {
    const validated = GetSubtreeInputSchema.parse(params);
    const maxDepth = validated.max_depth || 3;

    // Recursive function to build tree
    function buildSubtree(cardId: number, currentDepth: number): any {
      if (currentDepth > maxDepth) {
        return null;
      }

      const row = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(cardId, validated.campaign_id) as CardRow | undefined;

      if (!row) {
        return null;
      }

      const card = rowToCard(row);

      // Get children
      const childRows = db.prepare(`
        SELECT * FROM cards
        WHERE parent_id = ? AND campaign_id = ?
        ORDER BY position ASC
      `).all(cardId, validated.campaign_id) as CardRow[];

      const children = currentDepth < maxDepth
        ? childRows.map(childRow => buildSubtree(parseInt(childRow.id), currentDepth + 1)).filter(Boolean)
        : [];

      return {
        id: parseInt(card.id),
        title: card.title,
        card_type: card.type === 'page' ? 'map' : card.type,
        information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
        children,
        has_more_children: currentDepth >= maxDepth && childRows.length > 0
      };
    }

    const tree = buildSubtree(validated.card_id, 1);

    if (!tree) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          tree,
          max_depth: maxDepth
        })
      }]
    };
  } catch (error: any) {
    if (error.message?.includes('depth')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'DEPTH_LIMIT_EXCEEDED',
            message: 'Maximum depth exceeded'
          })
        }]
      };
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for list_children tool
 */
export async function handleListChildren(params: any) {
  try {
    const validated = ListChildrenInputSchema.parse(params);

    // If parent_id is provided, verify it exists
    if (validated.parent_id !== null) {
      const parentRow = db.prepare(`
        SELECT id FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(validated.parent_id, validated.campaign_id);

      if (!parentRow) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'CARD_NOT_FOUND',
              message: `Parent card not found: ${validated.parent_id}`
            })
          }]
        };
      }
    }

    // Get all children
    const childRows = db.prepare(`
      SELECT * FROM cards
      WHERE parent_id ${validated.parent_id !== null ? '= ?' : 'IS NULL'}
        AND campaign_id = ?
      ORDER BY position ASC
    `).all(
      ...(validated.parent_id !== null ? [validated.parent_id, validated.campaign_id] : [validated.campaign_id])
    ) as CardRow[];

    const children = childRows.map(row => {
      const card = rowToCard(row);
      return {
        id: parseInt(card.id),
        title: card.title,
        card_type: card.type === 'page' ? 'map' : card.type,
        information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
        position: card.position
      };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          children,
          count: children.length
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for get_siblings tool
 */
export async function handleGetSiblings(params: any) {
  try {
    const validated = GetSiblingsInputSchema.parse(params);

    // Get the target card to find its parent
    const targetRow = db.prepare(`
      SELECT parent_id FROM cards
      WHERE id = ? AND campaign_id = ?
    `).get(validated.card_id, validated.campaign_id) as { parent_id: string | null } | undefined;

    if (!targetRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    // Get all siblings (same parent, excluding self)
    const siblingRows = db.prepare(`
      SELECT * FROM cards
      WHERE parent_id ${targetRow.parent_id ? '= ?' : 'IS NULL'}
        AND campaign_id = ?
        AND id != ?
      ORDER BY position ASC
    `).all(
      ...(targetRow.parent_id ? [targetRow.parent_id, validated.campaign_id, validated.card_id] : [validated.campaign_id, validated.card_id])
    ) as CardRow[];

    const siblings = siblingRows.map(row => {
      const card = rowToCard(row);
      return {
        id: parseInt(card.id),
        title: card.title,
        card_type: card.type === 'page' ? 'map' : card.type,
        information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
        position: card.position
      };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          siblings,
          count: siblings.length
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for get_ancestor tool
 */
export async function handleGetAncestor(params: any) {
  try {
    const validated = GetAncestorInputSchema.parse(params);

    let currentCardId: number | null = validated.card_id;
    let depth = 0;

    // Traverse up the hierarchy looking for ancestor of specified type
    while (currentCardId !== null) {
      const row = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(currentCardId, validated.campaign_id) as CardRow | undefined;

      if (!row) {
        if (depth === 0) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'CARD_NOT_FOUND',
                message: `Card not found: ${currentCardId}`
              })
            }]
          };
        }
        break;
      }

      const card = rowToCard(row);
      const cardType = card.type === 'page' ? 'map' : card.type;

      // Skip the starting card, only check ancestors
      if (depth > 0 && cardType === validated.ancestor_type) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ancestor: {
                id: parseInt(card.id),
                title: card.title,
                card_type: cardType,
                depth
              },
              found: true
            })
          }]
        };
      }

      currentCardId = card.parentId ? parseInt(card.parentId) : null;
      depth++;
    }

    // No ancestor of the specified type found
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          ancestor: null,
          found: false
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'VALIDATION_ERROR',
          message: error.message
        })
      }]
    };
  }
}
