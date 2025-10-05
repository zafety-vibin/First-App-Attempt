/**
 * MCP Card Tools Implementation
 * Provides 6 tools for card management: read, create, update, delete, search, move
 */

import {
  ReadCardInputSchema,
  CreateCardInputSchema,
  UpdateCardInputSchema,
  DeleteCardInputSchema,
  SearchCardsInputSchema,
  MoveCardInputSchema
} from '../schemas/card-schemas';
import { CardService } from '../../services/CardService';
import { db } from '../../services/DatabaseService';
import { rowToCard, CardRow } from '../../models/Card';
import { markdownToProseMirror } from '../utils/markdown-to-prosemirror';


/**
 * Tool definitions for card operations
 */
export const cardToolDefinitions = [
  {
    name: 'read_card',
    description: 'Read a campaign card by ID, including content, metadata, and hierarchy position',
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
    name: 'create_card',
    description: 'Create a new card in the campaign hierarchy. Content can be provided as ProseMirror JSON or as markdown text in the "text" or "markdown" field.',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        parent_id: { type: ['number', 'null'] },
        title: { type: 'string' },
        card_type: { type: 'string', enum: ['text', 'database', 'map'] },
        content: { type: 'object' },
        information_level_id: { type: ['number', 'null'] }
      },
      required: ['campaign_id', 'title', 'card_type']
    }
  },
  {
    name: 'update_card',
    description: 'Update an existing card\'s title, content, or information level. Content can be provided as ProseMirror JSON or as markdown text in the "text" or "markdown" field.',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number' },
        campaign_id: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'object' },
        information_level_id: { type: ['number', 'null'] }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'delete_card',
    description: 'Delete a card and its entire subtree from the campaign',
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
    name: 'search_cards',
    description: 'Search for cards by title or content text within a campaign',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        query: { type: 'string' },
        card_type: { type: 'string', enum: ['text', 'database', 'map'] },
        information_level_id: { type: ['number', 'null'] },
        limit: { type: 'number' }
      },
      required: ['campaign_id', 'query']
    }
  },
  {
    name: 'move_card',
    description: 'Move a card to a new parent or position in the hierarchy',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'number' },
        campaign_id: { type: 'string' },
        new_parent_id: { type: ['number', 'null'] },
        new_position: { type: 'number' }
      },
      required: ['card_id', 'campaign_id', 'new_parent_id', 'new_position']
    }
  }
];

/**
 * Convert content to ProseMirror format if needed
 * Detects if content is markdown and converts it
 */
function normalizeContent(content: any): any {
  if (!content) return null;

  // If already ProseMirror format, return as-is
  if (content.type === 'doc' && content.content) {
    return content;
  }

  // If content has a "text" or "markdown" field, convert it
  if (typeof content.text === 'string') {
    return markdownToProseMirror(content.text);
  }
  if (typeof content.markdown === 'string') {
    return markdownToProseMirror(content.markdown);
  }

  // Otherwise return as-is (could be database schema, etc.)
  return content;
}

/**
 * Handler for read_card tool
 */
export async function handleReadCard(params: any) {
  try {
    const validated = ReadCardInputSchema.parse(params);

    // Query card with campaign validation
    const row = db.prepare(`
      SELECT * FROM cards
      WHERE id = ? AND campaign_id = ?
    `).get(validated.card_id, validated.campaign_id) as CardRow | undefined;

    if (!row) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    const card = rowToCard(row);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: card.id,
          campaign_id: card.campaignId,
          parent_id: card.parentId || null,
          title: card.title,
          card_type: card.type === 'page' ? 'map' : card.type,
          content: card.content,
          information_level_id: card.informationLevelId === 'system' ? null : card.informationLevelId,
          position: card.position,
          created_at: Math.floor(card.createdAt.getTime() / 1000),
          updated_at: Math.floor(card.updatedAt.getTime() / 1000)
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
 * Handler for create_card tool
 */
export async function handleCreateCard(params: any) {
  try {
    const validated = CreateCardInputSchema.parse(params);
    const cardService = new CardService();

    // Get user context from enriched params (passed from import route)
    const userId = (params as any).user_id || 'system';

    // Convert content to ProseMirror format if needed
    const normalizedContent = normalizeContent(validated.content);

    // Create card using CardService
    const card = await cardService.createCard({
      campaignId: validated.campaign_id,
      parentId: validated.parent_id?.toString() || undefined,
      type: validated.card_type === 'text' ? 'text' : validated.card_type === 'map' ? 'page' : validated.card_type,
      title: validated.title,
      content: normalizedContent,
      informationLevelId: validated.information_level_id?.toString(),
      position: 0 // Will be calculated by service
    }, userId);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: card.id,
          campaign_id: card.campaignId,
          parent_id: card.parentId || null,
          title: card.title,
          card_type: card.type === 'page' ? 'map' : card.type,
          content: card.content,
          information_level_id: card.informationLevelId === 'system' ? null : card.informationLevelId,
          position: card.position,
          created_at: Math.floor(card.createdAt.getTime() / 1000),
          updated_at: Math.floor(card.updatedAt.getTime() / 1000)
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'CREATE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for update_card tool
 */
export async function handleUpdateCard(params: any) {
  try {
    const validated = UpdateCardInputSchema.parse(params);

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (validated.title !== undefined) {
      updates.push('title = ?');
      values.push(validated.title);
    }

    if (validated.content !== undefined) {
      // Convert content to ProseMirror format if needed
      const normalizedContent = normalizeContent(validated.content);
      updates.push('content = ?');
      values.push(JSON.stringify(normalizedContent));
    }

    if (validated.information_level_id !== undefined) {
      updates.push('information_level_id = ?');
      values.push(validated.information_level_id?.toString() || 'system');
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at
    updates.push("updated_at = strftime('%s', 'now')");

    // Add WHERE clause parameters
    values.push(validated.card_id);
    values.push(validated.campaign_id);

    // Execute update
    const result = db.prepare(`
      UPDATE cards
      SET ${updates.join(', ')}
      WHERE id = ? AND campaign_id = ?
    `).run(...values);

    if (result.changes === 0) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    // Fetch updated card
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(validated.card_id) as CardRow;
    const card = rowToCard(row);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          id: card.id,
          campaign_id: card.campaignId,
          parent_id: card.parentId || null,
          title: card.title,
          card_type: card.type === 'page' ? 'map' : card.type,
          content: card.content,
          information_level_id: card.informationLevelId === 'system' ? null : card.informationLevelId,
          position: card.position,
          created_at: Math.floor(card.createdAt.getTime() / 1000),
          updated_at: Math.floor(card.updatedAt.getTime() / 1000)
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'UPDATE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for delete_card tool
 */
export async function handleDeleteCard(params: any) {
  try {
    const validated = DeleteCardInputSchema.parse(params);
    const cardService = new CardService();

    // Get card and its path for subtree deletion
    const card = db.prepare(`
      SELECT id, path FROM cards
      WHERE id = ? AND campaign_id = ?
    `).get(validated.card_id, validated.campaign_id) as { id: string; path: string } | undefined;

    if (!card) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'NOT_FOUND',
            message: `Card not found: ${validated.card_id}`
          })
        }]
      };
    }

    // Get all cards that will be deleted (card + subtree)
    const toDelete = db.prepare(`
      SELECT id FROM cards
      WHERE path LIKE ? OR id = ?
    `).all(`${card.path}/%`, validated.card_id) as { id: string }[];

    // Delete using CardService (handles references and CASCADE)
    const result = await cardService.deleteCard(validated.card_id.toString(), { force: true });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          deleted_count: result.deleted_count,
          deleted_cards: toDelete.map(c => parseInt(c.id))
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'DELETE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for search_cards tool
 */
export async function handleSearchCards(params: any) {
  try {
    const validated = SearchCardsInputSchema.parse(params);

    // Build search query
    let query = `
      SELECT id, title, type, parent_id, path, content, information_level_id
      FROM cards
      WHERE campaign_id = ?
      AND (title LIKE ? OR content LIKE ?)
    `;
    const values: any[] = [
      validated.campaign_id,
      `%${validated.query}%`,
      `%${validated.query}%`
    ];

    // Add optional filters
    if (validated.card_type) {
      const dbType = validated.card_type === 'map' ? 'page' : validated.card_type;
      query += ' AND type = ?';
      values.push(dbType);
    }

    if (validated.information_level_id !== undefined) {
      query += ' AND information_level_id = ?';
      values.push(validated.information_level_id?.toString() || 'system');
    }

    query += ` LIMIT ${validated.limit || 20}`;

    const rows = db.prepare(query).all(...values) as CardRow[];

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as count
      FROM cards
      WHERE campaign_id = ?
      AND (title LIKE ? OR content LIKE ?)
    `;
    const countValues = [validated.campaign_id, `%${validated.query}%`, `%${validated.query}%`];

    if (validated.card_type) {
      countQuery += ' AND type = ?';
      countValues.push(validated.card_type === 'map' ? 'page' : validated.card_type);
    }

    if (validated.information_level_id !== undefined) {
      countQuery += ' AND information_level_id = ?';
      countValues.push(validated.information_level_id?.toString() || 'system');
    }

    const { count } = db.prepare(countQuery).get(...countValues) as { count: number };

    // Format results
    const cards = rows.map(row => {
      const content = row.content ? JSON.parse(row.content) : null;
      const snippet = content?.content?.[0]?.content?.[0]?.text || row.title || '';

      return {
        id: parseInt(row.id),
        title: row.title || 'Untitled',
        card_type: row.type === 'page' ? 'map' : row.type as any,
        parent_id: row.parent_id ? parseInt(row.parent_id) : null,
        path: row.path,
        snippet: snippet.substring(0, 200),
        information_level_id: row.information_level_id === 'system' ? null : parseInt(row.information_level_id)
      };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          cards,
          total_count: count
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'SEARCH_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for move_card tool
 */
export async function handleMoveCard(params: any) {
  try {
    const validated = MoveCardInputSchema.parse(params);
    const cardService = new CardService();

    // Get user context from enriched params (passed from import route)
    const userId = (params as any).user_id || 'system';

    // Move card using CardService
    const card = await cardService.moveCard(
      validated.card_id.toString(),
      validated.new_parent_id?.toString() || null,
      validated.new_position,
      userId
    );

    // Get affected cards (siblings at new position)
    const affectedRows = db.prepare(`
      SELECT id, position FROM cards
      WHERE campaign_id = ?
      AND parent_id ${validated.new_parent_id ? '= ?' : 'IS NULL'}
      AND position >= ?
      AND id != ?
      ORDER BY position
    `).all(
      validated.campaign_id,
      ...(validated.new_parent_id ? [validated.new_parent_id] : []),
      validated.new_position,
      validated.card_id
    ) as { id: string; position: number }[];

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          card: {
            id: parseInt(card.id),
            campaign_id: card.campaignId,
            parent_id: card.parentId ? parseInt(card.parentId) : null,
            title: card.title,
            card_type: card.type === 'page' ? 'map' : card.type,
            content: card.content,
            information_level_id: card.informationLevelId === 'system' ? null : parseInt(card.informationLevelId),
            position: card.position,
            created_at: Math.floor(card.createdAt.getTime() / 1000),
            updated_at: Math.floor(card.updatedAt.getTime() / 1000)
          },
          affected_cards: affectedRows.map(r => ({
            id: parseInt(r.id),
            position: r.position
          }))
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'MOVE_ERROR',
          message: error.message
        })
      }]
    };
  }
}
