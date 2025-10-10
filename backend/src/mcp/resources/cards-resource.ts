/**
 * MCP Cards Resource Implementation
 * Provides browsable card hierarchy via campaign://cards URI
 */

import { db } from '../../services/DatabaseService';

/**
 * Resource definition for cards
 */
export const cardsResourceDefinition = {
  uri: 'campaign://cards',
  name: 'Campaign Cards Hierarchy',
  description: 'Browse the hierarchical structure of campaign cards',
  mimeType: 'application/json',
  handler: handleCardsResource
};

/**
 * Handle cards resource requests
 */
export async function handleCardsResource(uri: string): Promise<{
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}> {
  try {
    // Parse the URI to extract campaign_id
    // Format: campaign://<campaign_id>/cards or campaign://<campaign_id>/cards/<card_id>
    const uriParts = uri.replace('campaign://', '').split('/');
    const campaignId = uriParts[0];
    const cardId = uriParts[2] ? parseInt(uriParts[2]) : null;

    if (!campaignId) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: 'INVALID_URI',
            message: 'Campaign ID is required in URI'
          })
        }]
      };
    }

    // Verify campaign exists
    const campaignRow = db.prepare(`
      SELECT id, name FROM campaigns WHERE id = ?
    `).get(campaignId);

    if (!campaignRow) {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            error: 'CAMPAIGN_NOT_FOUND',
            message: `Campaign not found: ${campaignId}`
          })
        }]
      };
    }

    if (cardId) {
      // Get specific card and its children
      const cardRow = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(cardId, campaignId) as any;

      if (!cardRow) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: 'CARD_NOT_FOUND',
              message: `Card not found: ${cardId}`
            })
          }]
        };
      }

      // Get children
      const children = db.prepare(`
        SELECT id, title, type, information_level_id, position
        FROM cards
        WHERE parent_id = ? AND campaign_id = ?
        ORDER BY position ASC
      `).all(cardId, campaignId) as any[];

      const content = JSON.parse(cardRow.content || '{}');

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            card: {
              id: cardRow.id,
              title: cardRow.title,
              type: cardRow.type,
              content_preview: content.text ? content.text.substring(0, 200) : null,
              information_level_id: cardRow.information_level_id,
              parent_id: cardRow.parent_id,
              position: cardRow.position,
              children: children.map((c: any) => ({
                id: c.id,
                title: c.title,
                type: c.type,
                uri: `campaign://${campaignId}/cards/${c.id}`,
                has_children: (db.prepare(`
                  SELECT COUNT(*) as count FROM cards
                  WHERE parent_id = ? AND campaign_id = ?
                `).get(c.id, campaignId) as any).count > 0
              }))
            }
          })
        }]
      };
    } else {
      // Get root-level cards (parent_id = "0")
      const rootCards = db.prepare(`
        SELECT id, title, type, information_level_id, position
        FROM cards
        WHERE parent_id = ? AND campaign_id = ?
        ORDER BY position ASC
      `).all('0', campaignId) as any[];

      // Build hierarchical structure for each root card
      const hierarchy = rootCards.map((card: any) => {
        const childCount = db.prepare(`
          SELECT COUNT(*) as count FROM cards
          WHERE parent_id = ? AND campaign_id = ?
        `).get(card.id, campaignId) as any;

        return {
          id: card.id,
          title: card.title,
          type: card.type,
          information_level_id: card.information_level_id,
          uri: `campaign://${campaignId}/cards/${card.id}`,
          has_children: childCount.count > 0,
          child_count: childCount.count
        };
      });

      // Get total card count
      const totalCount = db.prepare(`
        SELECT COUNT(*) as count FROM cards WHERE campaign_id = ?
      `).get(campaignId) as { count: number };

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            campaign: {
              id: campaignId,
              name: (campaignRow as any).name
            },
            root_cards: hierarchy,
            total_cards: totalCount.count,
            root_count: rootCards.length
          })
        }]
      };
    }
  } catch (error: any) {
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({
          error: 'RESOURCE_ERROR',
          message: error.message
        })
      }]
    };
  }
}