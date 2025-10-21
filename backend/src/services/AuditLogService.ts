import { Request, Response } from 'express';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { APIRequestModel, OperationType, ResultStatus } from '../models/APIRequest';

/**
 * AuditLogService - Dual logging strategy for external API operations
 *
 * Feature 018: Implements comprehensive audit logging with:
 * 1. Winston file logs: JSON format, daily rotation, 30-day retention
 * 2. Database logs: api_requests table for queryable audit trail
 *
 * Both logging mechanisms run asynchronously to avoid blocking API responses.
 */

// Configure Winston logger with daily rotation
const logDir = path.join(process.cwd(), 'logs', 'external-api');

const dailyRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, '%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '30d', // 30-day retention
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  zippedArchive: false,
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [dailyRotateTransport],
});

// Add console transport in development
if (process.env.NODE_ENV === 'development') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

/**
 * AuditLogService class
 */
export class AuditLogService {
  /**
   * Log an API request with dual logging (Winston file + database)
   *
   * @param req Express request object
   * @param res Express response object
   * @param startTime Request start timestamp (from Date.now())
   * @param options Additional logging context
   */
  static async logRequest(
    req: Request,
    res: Response,
    startTime: number,
    options?: {
      campaign_id?: string;
      operation_type?: OperationType;
      entity_type?: string;
      result_status?: ResultStatus;
      result_summary?: string;
      error?: Error;
    }
  ): Promise<void> {
    const execution_time_ms = Date.now() - startTime;
    const user_id = (req as any).user?.sub || null;
    const campaign_id = options?.campaign_id || (req.params.campaignId as string);
    const operation_type = options?.operation_type || this.inferOperationType(req);
    const entity_type = options?.entity_type || (req.params.category as string) || null;
    const result_status = options?.result_status || (res.statusCode < 400 ? 'success' : 'error');

    // Structured log data
    const logData = {
      timestamp: new Date().toISOString(),
      level: result_status === 'error' ? 'error' : 'info',
      api_endpoint: req.path,
      method: req.method,
      campaign_id,
      category: entity_type,
      operation_type,
      user_agent: req.get('user-agent') || 'unknown',
      response_time_ms: execution_time_ms,
      status_code: res.statusCode,
      error: options?.error?.message || null,
    };

    // Winston file logging (async, fire-and-forget)
    try {
      logger.log({
        message: `${req.method} ${req.path} - ${res.statusCode}`,
        ...logData,
      });
    } catch (err) {
      console.error('Winston logging failed:', err);
      // Don't throw - graceful degradation
    }

    // Database audit logging (async, fire-and-forget)
    try {
      if (campaign_id) {
        APIRequestModel.create({
          campaign_id,
          user_id,
          operation_type,
          entity_type,
          parameters: this.extractParameters(req),
          result_status,
          result_summary:
            options?.result_summary ||
            this.generateResultSummary(req, res, result_status, execution_time_ms),
          execution_time_ms,
        });
      }
    } catch (err) {
      console.error('Database audit logging failed:', err);
      // Don't throw - graceful degradation
    }
  }

  /**
   * Query operation logs from database
   */
  static async getOperationLogs(
    campaignId: string,
    filters?: {
      operation_type?: OperationType;
      entity_type?: string;
      result_status?: ResultStatus;
      limit?: number;
      offset?: number;
    }
  ) {
    return APIRequestModel.findByCampaignId(campaignId, filters);
  }

  /**
   * Clean up old logs (both Winston and database)
   *
   * @param retentionDays Number of days to retain logs (default: 30)
   * @returns Number of database records deleted
   */
  static async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    // Database cleanup
    const deletedCount = APIRequestModel.deleteOlderThan(retentionDays);

    // Winston cleanup is handled automatically by DailyRotateFile's maxFiles setting
    logger.info(`Cleaned up ${deletedCount} audit log records older than ${retentionDays} days`);

    return deletedCount;
  }

  /**
   * Get audit statistics for a campaign
   */
  static async getStatistics(campaignId: string) {
    return APIRequestModel.getStatistics(campaignId);
  }

  /**
   * Infer operation type from request method and path
   * @private
   */
  private static inferOperationType(req: Request): OperationType {
    const method = req.method;
    const path = req.path;

    if (path.includes('/children')) {
      return 'navigate_hierarchy';
    }

    if (path.includes('/recaps')) {
      return 'query_recap';
    }

    if (path.includes('/graphs')) {
      return 'query_graph';
    }

    switch (method) {
      case 'GET':
        return 'query';
      case 'POST':
        return 'create';
      case 'PATCH':
      case 'PUT':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'query';
    }
  }

  /**
   * Extract operation parameters from request
   * @private
   */
  private static extractParameters(req: Request): string | null {
    const params: any = {};

    // Query parameters (for GET requests)
    if (Object.keys(req.query).length > 0) {
      params.query = req.query;
    }

    // Body parameters (for POST/PATCH requests)
    if (req.body && Object.keys(req.body).length > 0) {
      params.body = req.body;
    }

    // Path parameters
    if (req.params && Object.keys(req.params).length > 0) {
      params.params = req.params;
    }

    return Object.keys(params).length > 0 ? JSON.stringify(params) : null;
  }

  /**
   * Generate human-readable result summary
   * @private
   */
  private static generateResultSummary(
    req: Request,
    res: Response,
    result_status: ResultStatus,
    execution_time_ms: number
  ): string {
    const method = req.method;
    const category = req.params.category;
    const entryId = req.params.entryId;

    if (result_status === 'error') {
      return `Error: ${res.statusMessage || 'Unknown error'} (${res.statusCode})`;
    }

    switch (method) {
      case 'GET':
        if (entryId) {
          return `Retrieved ${category} entry ${entryId} in ${execution_time_ms}ms`;
        }
        return `Queried ${category} in ${execution_time_ms}ms`;

      case 'POST':
        return `Created ${category} entry in ${execution_time_ms}ms`;

      case 'PATCH':
      case 'PUT':
        return `Updated ${category} entry ${entryId} in ${execution_time_ms}ms`;

      case 'DELETE':
        if (req.query.confirm === 'true') {
          return `Deleted ${category} entry ${entryId} in ${execution_time_ms}ms`;
        }
        return `Delete preview for ${category} entry ${entryId}`;

      default:
        return `${method} ${req.path} completed in ${execution_time_ms}ms`;
    }
  }
}
