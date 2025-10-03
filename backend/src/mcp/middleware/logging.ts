/**
 * MCP Logging Middleware
 * Logs all tool calls to the mcp_tool_logs table for audit and debugging
 */

import { db } from '../../services/DatabaseService';

/**
 * Middleware to log all tool calls
 */
export function withLogging<T extends (...args: any[]) => any>(
  handler: T,
  toolName: string
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now();
    const [params, context] = args;

    // Extract common fields
    const campaignId = params?.campaign_id || null;
    const userId = context?.userId || 'system';

    let resultStatus = 'success';
    let errorMessage: string | null = null;
    let result: any;

    try {
      // Execute the handler
      result = await handler(...args);

      // Check if handler returned an error
      if (result?.isError) {
        resultStatus = 'error';
        const errorContent = result.content?.[0]?.text;
        if (errorContent) {
          try {
            const parsed = JSON.parse(errorContent);
            errorMessage = parsed.message || parsed.error || 'Unknown error';
          } catch {
            errorMessage = errorContent;
          }
        }
      }

      return result;
    } catch (error: any) {
      resultStatus = 'error';
      errorMessage = error.message;

      // Re-throw to maintain error propagation
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;

      // Log to database (fire-and-forget, don't fail the operation if logging fails)
      try {
        db.prepare(`
          INSERT INTO mcp_tool_logs (
            tool_name, campaign_id, user_id, parameters,
            result_status, error_message, execution_time_ms, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          toolName,
          campaignId,
          userId,
          JSON.stringify(params),
          resultStatus,
          errorMessage,
          executionTime,
          Date.now()
        );
      } catch (logError) {
        // Silently fail logging (don't break the tool execution)
        console.error(`Failed to log tool call for ${toolName}:`, logError);
      }
    }
  }) as T;
}

/**
 * Query tool logs for debugging and analysis
 */
export function getToolLogs(options: {
  campaignId?: string;
  userId?: string;
  toolName?: string;
  resultStatus?: 'success' | 'error';
  limit?: number;
  offset?: number;
} = {}) {
  const {
    campaignId,
    userId,
    toolName,
    resultStatus,
    limit = 100,
    offset = 0
  } = options;

  let query = 'SELECT * FROM mcp_tool_logs WHERE 1=1';
  const params: any[] = [];

  if (campaignId) {
    query += ' AND campaign_id = ?';
    params.push(campaignId);
  }

  if (userId) {
    query += ' AND user_id = ?';
    params.push(userId);
  }

  if (toolName) {
    query += ' AND tool_name = ?';
    params.push(toolName);
  }

  if (resultStatus) {
    query += ' AND result_status = ?';
    params.push(resultStatus);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

/**
 * Get tool usage statistics
 */
export function getToolStats(campaignId?: string, timeRangeMs = 86400000) {
  const since = Date.now() - timeRangeMs;

  const baseQuery = `
    SELECT
      tool_name,
      COUNT(*) as call_count,
      COUNT(CASE WHEN result_status = 'success' THEN 1 END) as success_count,
      COUNT(CASE WHEN result_status = 'error' THEN 1 END) as error_count,
      AVG(execution_time_ms) as avg_execution_time,
      MAX(execution_time_ms) as max_execution_time,
      MIN(execution_time_ms) as min_execution_time
    FROM mcp_tool_logs
    WHERE created_at >= ?
  `;

  let query = baseQuery;
  const params: any[] = [since];

  if (campaignId) {
    query += ' AND campaign_id = ?';
    params.push(campaignId);
  }

  query += ' GROUP BY tool_name ORDER BY call_count DESC';

  return db.prepare(query).all(...params);
}