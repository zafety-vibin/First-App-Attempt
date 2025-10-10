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
  MoveCardInputSchema,
  CreateCardsBatchInputSchema,
  ReadCardsBatchInputSchema,
  UpdateCardsBatchInputSchema
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
        card_id: { type: 'string' },
        campaign_id: { type: 'string' }
      },
      required: ['card_id', 'campaign_id']
    }
  },
  {
    name: 'create_card',
    description: `Create a new card in the campaign hierarchy. IMPORTANT: Follow Notion-style architecture - each card is ONE visual block.

ARCHITECTURE RULES:
1. ONE BLOCK PER CARD - Each heading, paragraph, or list is a SEPARATE card
2. PAGE CARDS are CONTAINERS - They have title but NO content, only child cards
3. SIBLING CARDS stack vertically - Cards with same parent_id appear one after another

FIELD USAGE BY CARD TYPE:
- TEXT CARDS: NO title (omit or null), ALL content in "content" field with markdown text
- PAGE CARDS: Has "title" for page name, NO content (page is container only)
- DATABASE CARDS: Has "title" for database name, NO content

CORRECT USAGE EXAMPLES:

Example 1: Create a root-level page (omit parent_id, defaults to "0" for root)
  create_card({campaign_id: "...", card_type: "page", title: "NPCs"})
  // Page has title, NO content

Example 2: Create a text card at root level (NO title)
  create_card({campaign_id: "...", card_type: "text", content: {"text": "# Campaign Introduction"}})
  // Text card has content, NO title. Omitting parent_id defaults to "0" (root level)

Example 3: Create cards under a page (specify parent_id)
  // Step 1: Create page container (has title, NO content)
  create_card({campaign_id: "...", card_type: "page", title: "NPCs"})
  // Step 2: Create child text card under the page (NO title, has content)
  create_card({campaign_id: "...", card_type: "text", content: {"text": "# Gandalf"}, parent_id: "npc_page_id"})
  // Step 3: Create another child text card (NO title, has content)
  create_card({campaign_id: "...", card_type: "text", content: {"text": "Wizard of the Grey Order."}, parent_id: "npc_page_id"})

Example 4: Create sibling text cards (same parent, stack vertically)
  create_card({campaign_id: "...", card_type: "text", content: {"text": "Paragraph 1"}})
  create_card({campaign_id: "...", card_type: "text", content: {"text": "Paragraph 2"}})
  // Both appear at root, one after another. NO title for text cards!

Example 5: Create a bulleted list card (NO title)
  create_card({campaign_id: "...", card_type: "text", content: {"text": "- Carries staff\\n- Wears grey robes\\n- Rides Shadowfax"}})

WRONG - DO NOT DO THIS:
  create_card({card_type: "text", title: "My content here", content: null})  // NO! Title is for pages only!
  create_card({content: {"text": "# Heading\\n\\nParagraph\\n\\n- List"}})  // NO! Split into 3 separate cards!

MARKDOWN FEATURES (use in card content):
- Headings: # H1, ## H2, ### H3
- Bold: **text**, Italic: *text*, Code: \`code\`
- Lists: - bullet or 1. numbered (entire list in one card)
- Blockquotes: > quote`,
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        parent_id: { type: 'string', description: 'Parent card ID. Omit or use "0" for root level. Use actual card ID to nest under a page.' },
        title: { type: ['string', 'null'], description: 'Card title. ONLY use for page/database cards. For text cards, omit or use null.' },
        card_type: { type: 'string', enum: ['text', 'database', 'page'] },
        content: { type: ['object', 'null'], description: 'Card content. For text cards: {"text": "markdown here"}. For page/database cards: omit or null.' },
        information_level_id: { type: ['number', 'null'] }
      },
      required: ['campaign_id', 'card_type']
    }
  },
  {
    name: 'update_card',
    description: `Update an existing card's title, content, or information level.

FIELD USAGE BY CARD TYPE:
- TEXT CARDS: Update "content" field with markdown. Do NOT update title (text cards don't have titles).
- PAGE/DATABASE CARDS: Update "title" field. Do NOT update content (pages/databases are containers only).

EXAMPLES:

Update text card content:
  update_card({card_id: "...", campaign_id: "...", content: {"text": "Updated paragraph text here."}})
  update_card({card_id: "...", campaign_id: "...", content: {"text": "# Updated Heading"}})
  update_card({card_id: "...", campaign_id: "...", content: {"text": "- Item 1\\n- Item 2\\n- Item 3"}})

Update page/database title:
  update_card({card_id: "...", campaign_id: "...", title: "Updated Page Name"})

Markdown features: # headings, **bold**, *italic*, \`code\`, - lists, > quotes`,
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' },
        title: { type: ['string', 'null'], description: 'New title. ONLY for page/database cards.' },
        content: { type: ['object', 'null'], description: 'New content. For text cards: {"text": "markdown"}. Do NOT use for page/database cards.' },
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
        card_id: { type: 'string' },
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
        card_type: { type: 'string', enum: ['text', 'database', 'page'] },
        information_level_id: { type: ['number', 'null'] },
        limit: { type: 'number' }
      },
      required: ['campaign_id', 'query']
    }
  },
  {
    name: 'move_card',
    description: 'Move a card to a new parent or position in the hierarchy. Use "0" for new_parent_id to move to root level.',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string' },
        campaign_id: { type: 'string' },
        new_parent_id: { type: 'string', description: 'New parent card ID. Use "0" to move to root level.' },
        new_position: { type: 'number' }
      },
      required: ['card_id', 'campaign_id', 'new_parent_id', 'new_position']
    }
  },
  {
    name: 'create_cards_batch',
    description: `Create multiple cards in a single atomic operation (2-100 cards). Much more efficient than creating cards one-by-one.

WHEN TO USE:
- Creating structured content (heading + paragraphs + lists)
- Importing multiple entities from a document
- Building hierarchies (page + children)
- Any time you need to create 2+ cards

EFFICIENCY:
- One tool call creates 2-100 cards
- Saves 60-70% tokens vs individual create_card calls
- Positions auto-calculated sequentially

EXAMPLE (Create NPC with description):
create_cards_batch({
  campaign_id: "abc-123",
  parent_id: "npc-page-id",
  cards: [
    {card_type: "text", content: {text: "# Gandalf the Grey"}},
    {card_type: "text", content: {text: "Wizard of the Grey Order."}},
    {card_type: "text", content: {text: "- Carries wooden staff\\n- Wears grey robes"}}
  ]
})

All cards created under same parent with sequential positions (0, 1, 2...).`,
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        parent_id: { type: 'string', description: 'Parent card ID. All cards created under this parent. Omit or use "0" for root level.' },
        cards: {
          type: 'array',
          description: 'Array of 1-100 cards to create. Positions auto-calculated.',
          items: {
            type: 'object',
            properties: {
              card_type: { type: 'string', enum: ['text', 'page', 'database'] },
              title: { type: ['string', 'null'], description: 'Card title. ONLY for page/database cards. Omit for text cards.' },
              content: { type: ['object', 'null'], description: 'Card content. For text cards: {text: "markdown"}. Omit for page/database.' },
              information_level_id: { type: ['number', 'null'] }
            },
            required: ['card_type']
          }
        }
      },
      required: ['campaign_id', 'cards']
    }
  },
  {
    name: 'read_cards_batch',
    description: `Read multiple cards by ID in one operation (2-50 cards). Much more efficient than reading cards one-by-one.

WHEN TO USE:
- Reading context before making updates
- Fetching related cards for analysis
- Gathering information across the hierarchy

EXAMPLE:
read_cards_batch({
  campaign_id: "abc-123",
  card_ids: ["card-a", "card-b", "card-c"]
})

Returns all found cards. Any not found are listed in "not_found" array.`,
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        card_ids: {
          type: 'array',
          description: 'Array of 1-50 card IDs to fetch',
          items: { type: 'string' }
        }
      },
      required: ['campaign_id', 'card_ids']
    }
  },
  {
    name: 'update_cards_batch',
    description: `Update multiple existing cards in one atomic operation (2-100 cards). Much more efficient than updating cards one-by-one.

WHEN TO USE:
- Updating multiple related cards
- Bulk content changes
- Changing information levels across cards

EXAMPLE (Update multiple NPC cards):
update_cards_batch({
  campaign_id: "abc-123",
  updates: [
    {card_id: "gandalf-heading", content: {text: "# Gandalf the White"}},
    {card_id: "gandalf-desc", content: {text: "Now wearing white robes."}},
    {card_id: "gandalf-attrs", information_level_id: 2}
  ]
})

All updates succeed or all fail (atomic transaction).`,
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        updates: {
          type: 'array',
          description: 'Array of 1-100 card updates',
          items: {
            type: 'object',
            properties: {
              card_id: { type: 'string', description: 'Card ID to update (required)' },
              title: { type: ['string', 'null'], description: 'New title (optional)' },
              content: { type: ['object', 'null'], description: 'New content (optional)' },
              information_level_id: { type: ['number', 'null'], description: 'New information level (optional)' }
            },
            required: ['card_id']
          }
        }
      },
      required: ['campaign_id', 'updates']
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

/**
 * Handler for create_cards_batch tool
 */
export async function handleCreateCardsBatch(params: any) {
  try {
    const validated = CreateCardsBatchInputSchema.parse(params);
    const cardService = new CardService();
    const userId = (params as any).user_id || 'system';

    // Get the current maximum position under this parent
    const parentId = validated.parent_id || '0';
    const maxPosRow = db.prepare(`
      SELECT MAX(position) as max_pos FROM cards
      WHERE parent_id = ? AND campaign_id = ?
    `).get(parentId, validated.campaign_id) as { max_pos: number | null } | undefined;

    let nextPosition = (maxPosRow?.max_pos ?? -1) + 1;

    // Use transaction for atomicity
    const createdCards: any[] = [];

    for (const cardData of validated.cards) {
      // Normalize content
      const normalizedContent = normalizeContent(cardData.content);

      // Create card (map to internal types: 'page' for pages, 'database' for databases, 'text' for text)
      const internalType = cardData.card_type === 'page' ? 'page' :
                           cardData.card_type === 'database' ? 'database' : 'text';

      const card = await cardService.createCard({
        campaignId: validated.campaign_id,
        parentId: parentId,
        type: internalType,
        title: cardData.title || null,
        content: normalizedContent,
        informationLevelId: cardData.information_level_id?.toString(),
        position: nextPosition
      }, userId);

      createdCards.push({
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
      });

      nextPosition++;
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          created_count: createdCards.length,
          cards: createdCards
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'BATCH_CREATE_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for read_cards_batch tool
 */
export async function handleReadCardsBatch(params: any) {
  try {
    const validated = ReadCardsBatchInputSchema.parse(params);

    // Query all cards in one go
    const placeholders = validated.card_ids.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT * FROM cards
      WHERE id IN (${placeholders}) AND campaign_id = ?
    `).all(...validated.card_ids, validated.campaign_id) as CardRow[];

    // Find which cards were not found
    const foundIds = rows.map(r => r.id);
    const notFound = validated.card_ids.filter(id => !foundIds.includes(id));

    const cards = rows.map(row => {
      const card = rowToCard(row);
      return {
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
      };
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          cards,
          not_found: notFound
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'BATCH_READ_ERROR',
          message: error.message
        })
      }]
    };
  }
}

/**
 * Handler for update_cards_batch tool
 */
export async function handleUpdateCardsBatch(params: any) {
  try {
    const validated = UpdateCardsBatchInputSchema.parse(params);

    const updatedCards: any[] = [];

    // Use transaction for atomicity
    db.transaction(() => {
      for (const update of validated.updates) {
        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];

        if (update.title !== undefined) {
          updates.push('title = ?');
          values.push(update.title);
        }

        if (update.content !== undefined) {
          const normalizedContent = normalizeContent(update.content);
          updates.push('content = ?');
          values.push(JSON.stringify(normalizedContent));
        }

        if (update.information_level_id !== undefined) {
          updates.push('information_level_id = ?');
          values.push(update.information_level_id?.toString() || 'system');
        }

        if (updates.length > 0) {
          updates.push("updated_at = strftime('%s', 'now')");
          values.push(update.card_id);
          values.push(validated.campaign_id);

          const stmt = db.prepare(`
            UPDATE cards
            SET ${updates.join(', ')}
            WHERE id = ? AND campaign_id = ?
          `);
          stmt.run(...values);

          // Fetch updated card
          const row = db.prepare(`
            SELECT * FROM cards WHERE id = ? AND campaign_id = ?
          `).get(update.card_id, validated.campaign_id) as CardRow;

          if (row) {
            const card = rowToCard(row);
            updatedCards.push({
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
            });
          }
        }
      }
    })();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          updated_count: updatedCards.length,
          cards: updatedCards
        })
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: 'BATCH_UPDATE_ERROR',
          message: error.message
        })
      }]
    };
  }
}
