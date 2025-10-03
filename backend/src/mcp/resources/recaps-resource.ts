/**
 * MCP Recaps Resource Implementation
 * Provides browsable session recap timeline via campaign://recaps URI
 */

import { db } from '../../services/DatabaseService';

/**
 * Resource definition for recaps
 */
export const recapsResourceDefinition = {
  uri: 'campaign://recaps',
  name: 'Session Recap Timeline',
  description: 'Browse session recaps chronologically',
  mimeType: 'application/json',
  handler: handleRecapsResource
};

/**
 * Handle recaps resource requests
 */
export async function handleRecapsResource(uri: string): Promise<{
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}> {
  try {
    // Parse the URI to extract campaign_id
    // Format: campaign://<campaign_id>/recaps or campaign://<campaign_id>/recaps/<session_id>
    const uriParts = uri.replace('campaign://', '').split('/');
    const campaignId = uriParts[0];
    const sessionId = uriParts[2] || null;

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
    `).get(campaignId) as any;

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

    if (sessionId) {
      // Get specific session recap
      const sessionRow = db.prepare(`
        SELECT * FROM sessions
        WHERE id = ? AND campaign_id = ?
      `).get(sessionId, campaignId) as any;

      if (!sessionRow) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: 'SESSION_NOT_FOUND',
              message: `Session not found: ${sessionId}`
            })
          }]
        };
      }

      // Parse timeline events
      const timelineEvents = sessionRow.timeline_events ? JSON.parse(sessionRow.timeline_events) : [];

      // Get previous and next sessions
      const prevSession = db.prepare(`
        SELECT id, session_number FROM sessions
        WHERE campaign_id = ? AND session_date < ?
        ORDER BY session_date DESC
        LIMIT 1
      `).get(campaignId, sessionRow.session_date) as any;

      const nextSession = db.prepare(`
        SELECT id, session_number FROM sessions
        WHERE campaign_id = ? AND session_date > ?
        ORDER BY session_date ASC
        LIMIT 1
      `).get(campaignId, sessionRow.session_date) as any;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            session: {
              id: sessionRow.id,
              session_number: sessionRow.session_number,
              session_date: sessionRow.session_date,
              recap: sessionRow.recap,
              timeline_events: timelineEvents,
              created_at: sessionRow.created_at,
              updated_at: sessionRow.updated_at
            },
            navigation: {
              previous: prevSession ? {
                id: prevSession.id,
                session_number: prevSession.session_number,
                uri: `campaign://${campaignId}/recaps/${prevSession.id}`
              } : null,
              next: nextSession ? {
                id: nextSession.id,
                session_number: nextSession.session_number,
                uri: `campaign://${campaignId}/recaps/${nextSession.id}`
              } : null
            }
          })
        }]
      };
    } else {
      // Get all session recaps (limited to recent 20)
      const sessions = db.prepare(`
        SELECT id, session_number, session_date, recap
        FROM sessions
        WHERE campaign_id = ?
        ORDER BY session_date DESC, session_number DESC
        LIMIT 20
      `).all(campaignId) as any[];

      // Build timeline
      const timeline = sessions.map((session: any) => {
        // Get recap preview (first 200 chars)
        const recapPreview = session.recap ? session.recap.substring(0, 200) + '...' : 'No recap available';

        return {
          id: session.id,
          session_number: session.session_number,
          session_date: session.session_date,
          recap_preview: recapPreview,
          uri: `campaign://${campaignId}/recaps/${session.id}`
        };
      });

      // Get total session count
      const totalCount = db.prepare(`
        SELECT COUNT(*) as count FROM sessions WHERE campaign_id = ?
      `).get(campaignId) as { count: number };

      // Get date range
      const dateRange = db.prepare(`
        SELECT MIN(session_date) as first_session, MAX(session_date) as last_session
        FROM sessions WHERE campaign_id = ?
      `).get(campaignId) as any;

      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            campaign: {
              id: campaignId,
              name: campaignRow.name
            },
            timeline,
            total_sessions: totalCount.count,
            displayed_count: timeline.length,
            date_range: {
              first_session: dateRange?.first_session || null,
              last_session: dateRange?.last_session || null
            }
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