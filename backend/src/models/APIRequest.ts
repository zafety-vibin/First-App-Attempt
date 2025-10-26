import { db } from '../services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

/**
 * APIRequest Entity - Audit logging for external API operations
 *
 * Lifecycle:
 * 1. Created: At the start of every API operation (before execution)
 * 2. Updated: Result fields populated after operation completes (success/error/partial)
 * 3. Retention: 30 days from created_at (configurable)
 * 4. Cleanup: Automated job deletes records older than retention period
 */

/**
 * Operation type enumeration
 */
export type OperationType =
  | 'query'
  | 'create'
  | 'update'
  | 'delete'
  | 'navigate_hierarchy'
  | 'query_recap'
  | 'query_graph'
  | 'bulk_operation';

/**
 * Result status enumeration
 */
export type ResultStatus = 'success' | 'error' | 'partial_success';

/**
 * APIRequest core interface
 */
export interface APIRequest {
  // Core identification
  id: string;
  campaign_id: string;
  user_id: string | null; // Keycloak sub, null for localhost testing

  // Operation tracking
  operation_type: OperationType;
  entity_type: string | null; // Category name ('npcs', 'locations'), 'session_recap', 'knowledge_graph', or null
  parameters: string | null; // JSON string of operation parameters

  // Result tracking
  result_status: ResultStatus;
  result_summary: string | null; // Human-readable result description
  execution_time_ms: number; // Performance tracking

  // Metadata
  created_at: number; // Unix timestamp
}

/**
 * Typed parameter interfaces for specific operations
 */
export interface QueryParameters {
  filters?: Record<string, any>;
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  conversational_query?: string;
}

export interface CreateParameters {
  entity_data: Record<string, any>;
}

export interface UpdateParameters {
  entry_id: string;
  updates: Record<string, any>;
}

export interface DeleteParameters {
  entry_id: string;
  confirmation?: boolean;
}

export interface NavigateHierarchyParameters {
  parent_id: string | null;
  depth?: number;
}

export interface QueryRecapParameters {
  timeline_range?: {
    start_session?: number;
    end_session?: number;
  };
  search_query?: string;
}

export interface QueryGraphParameters {
  graph_type?: string;
  node_filters?: Record<string, any>;
}

/**
 * APIRequest CRUD operations
 */
export class APIRequestModel {
  /**
   * Create a new API request audit log entry
   */
  static create(data: {
    campaign_id: string;
    user_id: string | null;
    operation_type: OperationType;
    entity_type?: string | null;
    parameters?: string | null;
    result_status?: ResultStatus;
    result_summary?: string | null;
    execution_time_ms?: number;
  }): APIRequest {
    const id = uuidv4();
    const created_at = Math.floor(Date.now() / 1000);

    const stmt = db.prepare(`
      INSERT INTO api_requests (
        id, campaign_id, user_id, operation_type, entity_type,
        parameters, result_status, result_summary, execution_time_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.campaign_id,
      data.user_id,
      data.operation_type,
      data.entity_type || null,
      data.parameters || null,
      data.result_status || 'success',
      data.result_summary || null,
      data.execution_time_ms || 0,
      created_at
    );

    return {
      id,
      campaign_id: data.campaign_id,
      user_id: data.user_id,
      operation_type: data.operation_type,
      entity_type: data.entity_type || null,
      parameters: data.parameters || null,
      result_status: data.result_status || 'success',
      result_summary: data.result_summary || null,
      execution_time_ms: data.execution_time_ms || 0,
      created_at,
    };
  }

  /**
   * Find API request by ID
   */
  static findById(id: string): APIRequest | null {
    const stmt = db.prepare(`
      SELECT * FROM api_requests WHERE id = ?
    `);

    const result = stmt.get(id) as APIRequest | undefined;
    return result || null;
  }

  /**
   * Find all API requests for a campaign with optional filters
   */
  static findByCampaignId(
    campaignId: string,
    filters?: {
      operation_type?: OperationType;
      entity_type?: string;
      result_status?: ResultStatus;
      limit?: number;
      offset?: number;
    }
  ): APIRequest[] {
    let query = `SELECT * FROM api_requests WHERE campaign_id = ?`;
    const params: any[] = [campaignId];

    if (filters?.operation_type) {
      query += ` AND operation_type = ?`;
      params.push(filters.operation_type);
    }

    if (filters?.entity_type) {
      query += ` AND entity_type = ?`;
      params.push(filters.entity_type);
    }

    if (filters?.result_status) {
      query += ` AND result_status = ?`;
      params.push(filters.result_status);
    }

    query += ` ORDER BY created_at DESC`;

    if (filters?.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);

      if (filters?.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }

    const stmt = db.prepare(query);
    return stmt.all(...params) as APIRequest[];
  }

  /**
   * Update result fields after operation completion
   */
  static updateResult(
    id: string,
    data: {
      result_status: ResultStatus;
      result_summary?: string;
      execution_time_ms: number;
    }
  ): void {
    const stmt = db.prepare(`
      UPDATE api_requests
      SET result_status = ?,
          result_summary = ?,
          execution_time_ms = ?
      WHERE id = ?
    `);

    stmt.run(data.result_status, data.result_summary || null, data.execution_time_ms, id);
  }

  /**
   * Delete API requests older than specified retention period
   * @param retentionDays Number of days to retain logs (default: 30)
   * @returns Number of deleted records
   */
  static deleteOlderThan(retentionDays: number = 30): number {
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60;

    const stmt = db.prepare(`
      DELETE FROM api_requests WHERE created_at < ?
    `);

    const result = stmt.run(cutoffTimestamp);
    return result.changes;
  }

  /**
   * Get total count of API requests for a campaign
   */
  static countByCampaignId(campaignId: string): number {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM api_requests WHERE campaign_id = ?
    `);

    const result = stmt.get(campaignId) as { count: number };
    return result.count;
  }

  /**
   * Get API request statistics for a campaign
   */
  static getStatistics(campaignId: string): {
    total: number;
    by_operation_type: Record<OperationType, number>;
    by_result_status: Record<ResultStatus, number>;
    avg_execution_time_ms: number;
  } {
    const total = this.countByCampaignId(campaignId);

    // Count by operation type
    const opTypeStmt = db.prepare(`
      SELECT operation_type, COUNT(*) as count
      FROM api_requests
      WHERE campaign_id = ?
      GROUP BY operation_type
    `);
    const opTypeCounts = opTypeStmt.all(campaignId) as Array<{
      operation_type: OperationType;
      count: number;
    }>;

    const by_operation_type = opTypeCounts.reduce(
      (acc, row) => {
        acc[row.operation_type] = row.count;
        return acc;
      },
      {} as Record<OperationType, number>
    );

    // Count by result status
    const statusStmt = db.prepare(`
      SELECT result_status, COUNT(*) as count
      FROM api_requests
      WHERE campaign_id = ?
      GROUP BY result_status
    `);
    const statusCounts = statusStmt.all(campaignId) as Array<{
      result_status: ResultStatus;
      count: number;
    }>;

    const by_result_status = statusCounts.reduce(
      (acc, row) => {
        acc[row.result_status] = row.count;
        return acc;
      },
      {} as Record<ResultStatus, number>
    );

    // Average execution time
    const avgStmt = db.prepare(`
      SELECT AVG(execution_time_ms) as avg
      FROM api_requests
      WHERE campaign_id = ?
    `);
    const avgResult = avgStmt.get(campaignId) as { avg: number | null };

    return {
      total,
      by_operation_type,
      by_result_status,
      avg_execution_time_ms: avgResult.avg || 0,
    };
  }
}
