/**
 * MCP Recap Tools Implementation
 * Provides 2 tools for session recap management: get_session_recaps, get_timeline_events
 */

import {
  GetSessionRecapsInputSchema,
  GetTimelineEventsInputSchema
} from '../schemas/recap-schemas';
import { db } from '../../services/DatabaseService';


/**
 * Tool definitions for recap operations
 */
export const recapToolDefinitions = [
  {
    name: 'get_session_recaps',
    description: 'Get session recaps for a campaign, ordered by date',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 50 }
      },
      required: ['campaign_id']
    }
  },
  {
    name: 'get_timeline_events',
    description: 'Get timeline events within a date range',
    inputSchema: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string' },
        start_date: { type: 'number' },
        end_date: { type: 'number' }
      },
      required: ['campaign_id', 'start_date', 'end_date']
    }
  }
];

/**
 * Handler for get_session_recaps tool
 */
export async function handleGetSessionRecaps(params: any) {
  try {
    const validated = GetSessionRecapsInputSchema.parse(params);
    const limit = validated.limit || 10;

    // Verify campaign exists
    const campaignRow = db.prepare(`
      SELECT id FROM campaigns WHERE id = ?
    `).get(validated.campaign_id);

    if (!campaignRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CAMPAIGN_NOT_FOUND',
            message: `Campaign not found: ${validated.campaign_id}`
          })
        }]
      };
    }

    // Get session recaps
    const sessions = db.prepare(`
      SELECT id, session_number, session_date, recap, timeline_events, created_at, updated_at
      FROM sessions
      WHERE campaign_id = ?
      ORDER BY session_date DESC, session_number DESC
      LIMIT ?
    `).all(validated.campaign_id, limit) as any[];

    const recaps = sessions.map(s => ({
      session_id: s.id,
      session_number: s.session_number,
      session_date: s.session_date,
      recap: s.recap,
      timeline_events: s.timeline_events ? JSON.parse(s.timeline_events) : [],
      created_at: s.created_at,
      updated_at: s.updated_at
    }));

    // Get total count
    const countRow = db.prepare(`
      SELECT COUNT(*) as total FROM sessions WHERE campaign_id = ?
    `).get(validated.campaign_id) as { total: number };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          recaps,
          total_count: countRow.total,
          returned_count: recaps.length,
          limit
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
 * Handler for get_timeline_events tool
 */
export async function handleGetTimelineEvents(params: any) {
  try {
    const validated = GetTimelineEventsInputSchema.parse(params);

    // Validate date range if both dates are provided
    if (validated.start_date !== undefined && validated.end_date !== undefined && validated.start_date > validated.end_date) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'INVALID_DATE_RANGE',
            message: 'start_date must be before or equal to end_date'
          })
        }]
      };
    }

    // Verify campaign exists
    const campaignRow = db.prepare(`
      SELECT id FROM campaigns WHERE id = ?
    `).get(validated.campaign_id);

    if (!campaignRow) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'CAMPAIGN_NOT_FOUND',
            message: `Campaign not found: ${validated.campaign_id}`
          })
        }]
      };
    }

    // Get sessions within date range
    const sessions = db.prepare(`
      SELECT id, session_number, session_date, timeline_events
      FROM sessions
      WHERE campaign_id = ?
        AND session_date >= ?
        AND session_date <= ?
      ORDER BY session_date ASC, session_number ASC
    `).all(validated.campaign_id, validated.start_date || 0, validated.end_date || Number.MAX_SAFE_INTEGER) as any[];

    // Flatten timeline events from all matching sessions
    const allEvents: any[] = [];

    for (const session of sessions) {
      if (session.timeline_events) {
        const events = JSON.parse(session.timeline_events);
        if (Array.isArray(events)) {
          events.forEach(event => {
            allEvents.push({
              ...event,
              session_id: session.id,
              session_number: session.session_number,
              session_date: session.session_date
            });
          });
        }
      }
    }

    // Sort events chronologically (by event date if available, otherwise by session date)
    allEvents.sort((a, b) => {
      const dateA = a.event_date || a.session_date;
      const dateB = b.event_date || b.session_date;
      return dateA - dateB;
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          events: allEvents,
          total_events: allEvents.length,
          sessions_searched: sessions.length,
          date_range: {
            start: validated.start_date,
            end: validated.end_date
          }
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

// Export placeholder handlers for tools that don't actually exist but were listed in index.ts
export async function handleReadRecap() {
  // This tool doesn't exist - use get_session_recaps instead
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'Use get_session_recaps tool instead'
      })
    }]
  };
}

export async function handleListRecaps() {
  // This tool doesn't exist - use get_session_recaps instead
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'Use get_session_recaps tool instead'
      })
    }]
  };
}

export async function handleCreateRecap() {
  // This tool doesn't exist in the original implementation
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'create_recap tool is not implemented'
      })
    }]
  };
}

export async function handleUpdateRecap() {
  // This tool doesn't exist in the original implementation
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'NOT_IMPLEMENTED',
        message: 'update_recap tool is not implemented'
      })
    }]
  };
}
