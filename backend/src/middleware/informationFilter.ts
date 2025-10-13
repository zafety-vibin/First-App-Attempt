/**
 * Category View Mode Filtering Middleware (System 2)
 * Feature: 014-create-the-database
 * Task: T044
 *
 * Handles X-View-Mode header filtering for category database endpoints:
 * - dm_view (default): Returns all entities and fields
 * - player_view: Filters entities and strips dm_* fields
 *
 * IMPORTANT: This is System 2 (Database/Categories) using 'dm_view' | 'player_view' values.
 * System 1 (Wiki/Cards) uses 'dm' | 'player' via viewMode.ts
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Category view mode from X-View-Mode header
 */
export type CategoryViewMode = 'dm_view' | 'player_view';

// Augment Express Request type for System 2
declare module 'express-serve-static-core' {
  interface Request {
    categoryViewMode?: CategoryViewMode;
  }
}

/**
 * Extract X-View-Mode header and attach to request as categoryViewMode
 * Defaults to dm_view if not provided
 */
export function extractViewMode(req: Request, res: Response, next: NextFunction): void {
  const headerValue = req.get('X-View-Mode');

  if (!headerValue) {
    req.categoryViewMode = "dm_view" as any; // Default to DM view
    next();
    return;
  }

  // Validate header value
  if (headerValue !== 'dm_view' && headerValue !== 'player_view') {
    res.status(400).json({
      error: 'Invalid X-View-Mode header',
      details: 'Must be "dm_view" or "player_view"',
    });
    return;
  }

  req.categoryViewMode = headerValue as any;
  next();
}

/**
 * Get SQL WHERE clause fragment for player_knowledge filtering
 * Use in service layer queries
 *
 * @param categoryViewMode - Current category view mode from request
 * @param tableAlias - Optional table alias for multi-table queries
 * @returns SQL WHERE clause fragment or empty string
 */
export function getPlayerKnowledgeFilter(categoryViewMode: CategoryViewMode, tableAlias?: string): string {
  if (categoryViewMode === 'dm_view') {
    return ''; // No filtering for DM view
  }

  const prefix = tableAlias ? `${tableAlias}.` : '';

  // Player view: include common_knowledge, player_knowledge, and null
  // Exclude dm_only and custom secret levels
  return `${prefix}player_knowledge IN ('common_knowledge', 'player_knowledge') OR ${prefix}player_knowledge IS NULL`;
}

/**
 * Strip dm_* fields from a single entity object
 * Mutates the object in place
 *
 * @param entity - Entity object to filter
 * @returns Filtered entity (same reference)
 */
export function stripDmFields<T extends Record<string, any>>(entity: T): T {
  if (!entity) return entity;

  // Remove all fields starting with dm_
  for (const key of Object.keys(entity)) {
    if (key.startsWith('dm_')) {
      delete entity[key];
    }
  }

  return entity;
}

/**
 * Strip dm_* fields from array of entities
 * Mutates array in place
 *
 * @param entities - Array of entity objects
 * @returns Filtered array (same reference)
 */
export function stripDmFieldsFromArray<T extends Record<string, any>>(entities: T[]): T[] {
  if (!Array.isArray(entities)) return entities;

  entities.forEach(entity => stripDmFields(entity));
  return entities;
}

/**
 * Middleware to automatically strip dm_* fields from response in player_view mode
 * Apply this AFTER route handler via res.json() interception
 *
 * IMPORTANT: This is a response interceptor - apply globally or per-route
 */
export function applyInformationFilter(req: Request, res: Response, next: NextFunction): void {
  if ((req.categoryViewMode as any) === 'player_view') {
    // Intercept res.json to strip dm_* fields before sending
    const originalJson = res.json.bind(res);

    res.json = function(body: any): Response {
      if (body) {
        // Handle single object
        if (typeof body === 'object' && !Array.isArray(body)) {
          // Check for data array (paginated response)
          if (body.data && Array.isArray(body.data)) {
            stripDmFieldsFromArray(body.data);
          } else {
            stripDmFields(body);
          }
        }
        // Handle array response
        else if (Array.isArray(body)) {
          stripDmFieldsFromArray(body);
        }
      }

      return originalJson(body);
    };
  }

  next();
}

/**
 * Helper: Build complete WHERE clause for category queries
 * Combines campaign_id filter with player_knowledge filter
 *
 * @param campaignId - Campaign ID to filter by
 * @param categoryViewMode - Category view mode from request
 * @param additionalFilters - Additional SQL filter fragments (without WHERE keyword)
 * @returns Complete WHERE clause (without WHERE keyword)
 */
export function buildWhereClause(
  campaignId: string,
  categoryViewMode: CategoryViewMode,
  additionalFilters: string[] = []
): string {
  const filters: string[] = [`campaign_id = '${campaignId}'`];

  // Add player knowledge filter for player_view
  const pkFilter = getPlayerKnowledgeFilter(categoryViewMode);
  if (pkFilter) {
    filters.push(`(${pkFilter})`);
  }

  // Add any additional filters
  filters.push(...additionalFilters);

  return filters.join(' AND ');
}

/**
 * Export all filtering utilities
 */
export default {
  extractViewMode,
  getPlayerKnowledgeFilter,
  stripDmFields,
  stripDmFieldsFromArray,
  applyInformationFilter,
  buildWhereClause,
};
