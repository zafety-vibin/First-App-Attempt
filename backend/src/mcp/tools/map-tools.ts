/**
 * MCP Map Tools Implementation
 * Provides 2 tools for map management: list_map_pins, create_map_pin
 */

import {
  ListMapPinsInputSchema,
  CreateMapPinInputSchema
} from '../schemas/map-schemas';
import { db } from '../../services/DatabaseService';

/**
 * Handler for list_map_pins tool
 */
export async function handleListMapPins(params: any) {
  try {
    const validated = ListMapPinsInputSchema.parse(params);

    // Get the card and verify it's map-enabled
    const cardRow = db.prepare(`
      SELECT * FROM cards
      WHERE id = ? AND campaign_id = ?
    `).get(validated.map_id, validated.campaign_id) as any;

    if (!cardRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_FOUND',
            message: `Map card not found: ${validated.map_id}`
          })
        }]
      };
    }

    // Check if card is map-enabled (either has map_enabled flag or is type 'page' which can be map-enabled)
    const content = JSON.parse(cardRow.content || '{}');
    if (!content.map_enabled) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_MAP_ENABLED',
            message: `Card ${validated.map_id} is not map-enabled`
          })
        }]
      };
    }

    // Get all pin children
    let pinQuery = `
      SELECT c.*, il.hierarchy_level
      FROM cards c
      LEFT JOIN information_levels il ON c.information_level_id = il.id
      WHERE c.parent_id = ? AND c.campaign_id = ?
        AND json_extract(c.content, '$.pin_type') = 'pin'
    `;

    const queryParams: any[] = [validated.map_id, validated.campaign_id];

    // Add layer filter if specified
    if (validated.layer_id !== undefined) {
      pinQuery += ` AND json_extract(c.content, '$.layer_id') = ?`;
      queryParams.push(validated.layer_id);
    }

    // Add bounds filter if specified
    if (validated.bounds) {
      pinQuery += ` AND json_extract(c.content, '$.x') >= ?
                    AND json_extract(c.content, '$.x') <= ?
                    AND json_extract(c.content, '$.y') >= ?
                    AND json_extract(c.content, '$.y') <= ?`;
      queryParams.push(validated.bounds.min_x, validated.bounds.max_x, validated.bounds.min_y, validated.bounds.max_y);
    }

    pinQuery += ` ORDER BY c.position ASC`;

    const pinRows = db.prepare(pinQuery).all(...queryParams) as any[];

    const pins = pinRows.map(row => {
      const pinContent = JSON.parse(row.content || '{}');
      return {
        id: row.id,
        title: row.title,
        x: pinContent.x || 0,
        y: pinContent.y || 0,
        icon: pinContent.icon || 'default',
        color: pinContent.color || '#FF0000',
        layer_id: pinContent.layer_id || null,
        references_card_id: pinContent.references_card_id || null,
        description: pinContent.description
      };
    });

    // Get zones for this map
    const zoneRows = db.prepare(`
      SELECT c.*
      FROM cards c
      WHERE c.parent_id = ? AND c.campaign_id = ?
        AND json_extract(c.content, '$.zone_type') = 'zone'
      ORDER BY c.position ASC
    `).all(validated.map_id, validated.campaign_id) as any[];

    const zones = zoneRows.map(row => {
      const zoneContent = JSON.parse(row.content || '{}');
      return {
        id: row.id,
        name: row.title,
        vertices: zoneContent.vertices || [],
        fill_color: zoneContent.fill_color || '#0000FF',
        stroke_color: zoneContent.stroke_color || '#000000',
        opacity: zoneContent.opacity || 0.3,
        layer_id: zoneContent.layer_id || null
      };
    });

    // Get layers for this map
    const layerRows = db.prepare(`
      SELECT c.*
      FROM cards c
      WHERE c.parent_id = ? AND c.campaign_id = ?
        AND json_extract(c.content, '$.layer_type') = 'layer'
      ORDER BY c.position ASC
    `).all(validated.map_id, validated.campaign_id) as any[];

    const layers = layerRows.map(row => {
      const layerContent = JSON.parse(row.content || '{}');
      return {
        id: row.id,
        name: row.title,
        visible: layerContent.visible !== false,
        position: row.position
      };
    });

    // Get map dimensions and image URL from parent card
    const mapData = {
      id: cardRow.id,
      title: cardRow.title,
      image_url: content.map_image_url || '',
      width: content.map_width || 1920,
      height: content.map_height || 1080
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          map: mapData,
          pins,
          zones,
          layers
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
 * Handler for create_map_pin tool
 */
export async function handleCreateMapPin(params: any) {
  try {
    const validated = CreateMapPinInputSchema.parse(params);

    // Use transaction for atomicity
    const result = db.transaction(() => {
      // Get the parent card and verify it's map-enabled
      const cardRow = db.prepare(`
        SELECT * FROM cards
        WHERE id = ? AND campaign_id = ?
      `).get(validated.map_id, validated.campaign_id) as any;

      if (!cardRow) {
        throw new Error(`Map card not found: ${validated.map_id}`);
      }

      // Check if card is map-enabled
      const content = JSON.parse(cardRow.content || '{}');
      if (!content.map_enabled) {
        throw new Error(`Card ${validated.map_id} is not map-enabled`);
      }

      // Get map dimensions
      const mapWidth = content.map_width || 1920;
      const mapHeight = content.map_height || 1080;

      // Validate coordinates are within bounds
      if (validated.x < 0 || validated.x > mapWidth) {
        throw new Error(`X coordinate ${validated.x} is out of bounds (0-${mapWidth})`);
      }
      if (validated.y < 0 || validated.y > mapHeight) {
        throw new Error(`Y coordinate ${validated.y} is out of bounds (0-${mapHeight})`);
      }

      // If references_card_id is provided, verify it exists
      let inheritedInfoLevelId: number | null = null;
      const warnings: string[] = [];

      if (validated.references_card_id) {
        const referencedCard = db.prepare(`
          SELECT id, information_level_id FROM cards
          WHERE id = ? AND campaign_id = ?
        `).get(validated.references_card_id, validated.campaign_id) as any;

        if (!referencedCard) {
          warnings.push(`Referenced card not found: ${validated.references_card_id}`);
        } else if (referencedCard.information_level_id) {
          // Inherit information level from referenced card
          inheritedInfoLevelId = parseInt(referencedCard.information_level_id);
        }
      }

      // Get next position
      const maxPositionRow = db.prepare(`
        SELECT MAX(position) as max_pos FROM cards
        WHERE parent_id = ? AND campaign_id = ?
      `).get(validated.map_id, validated.campaign_id) as { max_pos: number | null };

      const nextPosition = (maxPositionRow.max_pos || 0) + 1;

      // Create the pin content
      const pinContent = {
        pin_type: 'pin',
        x: validated.x,
        y: validated.y,
        icon: validated.icon || 'default',
        color: validated.color || '#FF0000',
        references_card_id: validated.references_card_id,
        layer_id: validated.layer_id,
        description: validated.description
      };

      // Insert the pin as a child card
      const stmt = db.prepare(`
        INSERT INTO cards (
          campaign_id, parent_id, type, title, content,
          information_level_id, position, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = Date.now();
      const info = stmt.run(
        validated.campaign_id,
        validated.map_id,
        'pin', // Special type for pins
        validated.title,
        JSON.stringify(pinContent),
        inheritedInfoLevelId?.toString() || null,
        nextPosition,
        now,
        now
      );

      const pinId = Number(info.lastInsertRowid);

      const result: any = {
        pin: {
          id: pinId,
          map_id: validated.map_id,
          title: validated.title,
          x: validated.x,
          y: validated.y,
          icon: validated.icon || 'default',
          color: validated.color || '#FF0000',
          layer_id: validated.layer_id || null,
          references_card_id: validated.references_card_id || null,
          description: validated.description,
          created_at: now
        }
      };

      if (warnings.length > 0) {
        result.warnings = warnings;
      }

      return result;
    })();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result)
      }]
    };
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      const errorType = error.message.includes('Referenced card') ? 'REFERENCED_CARD_NOT_FOUND' : 'CARD_NOT_FOUND';
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: errorType,
            message: error.message
          })
        }]
      };
    } else if (error.message?.includes('not map-enabled')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CARD_NOT_MAP_ENABLED',
            message: error.message
          })
        }]
      };
    } else if (error.message?.includes('out of bounds')) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'INVALID_COORDINATES',
            message: error.message
          })
        }]
      };
    }

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
 * Tool definitions for map management
 */
export const mapToolDefinitions = [
  {
    name: 'list_map_pins',
    description: 'List all pins, zones, and layers on a map-enabled card',
    inputSchema: {
      type: 'object',
      properties: {
        map_id: { type: 'number' },
        campaign_id: { type: 'string' },
        layer_id: { type: 'number' },
        bounds: {
          type: 'object',
          properties: {
            min_x: { type: 'number', minimum: 0 },
            min_y: { type: 'number', minimum: 0 },
            max_x: { type: 'number', minimum: 1 },
            max_y: { type: 'number', minimum: 1 }
          },
          required: ['min_x', 'min_y', 'max_x', 'max_y']
        }
      },
      required: ['map_id', 'campaign_id']
    },
    handler: handleListMapPins
  },
  {
    name: 'create_map_pin',
    description: 'Create a new pin on a map-enabled card',
    inputSchema: {
      type: 'object',
      properties: {
        map_id: { type: 'number' },
        campaign_id: { type: 'string' },
        title: { type: 'string', minLength: 1, maxLength: 255 },
        x: { type: 'number', minimum: 0 },
        y: { type: 'number', minimum: 0 },
        icon: { type: 'string' },
        color: { type: 'string' },
        layer_id: { type: ['number', 'null'] },
        references_card_id: { type: ['number', 'null'] },
        description: { type: 'string' }
      },
      required: ['map_id', 'campaign_id', 'title', 'x', 'y']
    },
    handler: handleCreateMapPin
  }
];