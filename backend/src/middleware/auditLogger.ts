import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuditLogService } from '../services/AuditLogService';

/**
 * Audit Logger Middleware for External API (Feature 018)
 *
 * Wraps API requests to capture timing, parameters, and results.
 * Logs asynchronously to both Winston file logs and database audit table.
 *
 * Flow:
 * 1. Capture start time
 * 2. Generate operation ID
 * 3. Pass control to route handler
 * 4. On response finish, log async (fire-and-forget)
 */

export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const operation_id = uuidv4();

  // Add operation_id to response headers
  res.setHeader('X-Operation-ID', operation_id);

  // Capture original res.json to intercept response data
  const originalJson = res.json.bind(res);
  let responseData: any = null;

  res.json = function (data: any) {
    responseData = data;
    return originalJson(data);
  };

  // Listen for response finish event
  res.on('finish', () => {
    // Extract context from request/response
    const campaign_id = req.params.campaignId;
    const entity_type = req.params.category;

    // Determine result_status from HTTP status code
    let result_status: 'success' | 'error' | 'partial_success' = 'success';

    if (res.statusCode >= 400) {
      result_status = 'error';
    } else if (responseData?.partial_success) {
      result_status = 'partial_success';
    }

    // Generate result_summary from response data
    let result_summary: string | undefined;

    if (result_status === 'error' && responseData?.error) {
      result_summary = `Error: ${responseData.error.message || responseData.error.code}`;
    } else if (responseData?.data) {
      const dataLength = Array.isArray(responseData.data)
        ? responseData.data.length
        : 1;

      result_summary = `${req.method} ${req.path} returned ${dataLength} result(s)`;
    }

    // Log async (fire-and-forget)
    AuditLogService.logRequest(req, res, startTime, {
      campaign_id,
      entity_type,
      result_status,
      result_summary,
    }).catch((err) => {
      // Graceful degradation - log error but don't throw
      console.error('Audit logging failed:', err);
    });
  });

  next();
}
