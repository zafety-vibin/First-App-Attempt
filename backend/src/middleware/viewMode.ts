/**
 * Unified View Mode Middleware
 * Feature: 004-create-a-tagging (System 1 & System 2 merged)
 *
 * Handles X-View-Mode header extraction and filtering for both:
 * - System 1 (Wiki Cards): Uses ViewModeService for hierarchical filtering
 * - System 2 (Category Databases): Strips dm_* fields from responses
 *
 * Unification: Both systems now use 'dm_view' | 'player_view' values
 */

import { Request, Response, NextFunction } from 'express';
import { ViewMode } from '../shared/types/ViewMode';

/**
 * Add viewMode to Request type
 */
declare global {
  namespace Express {
    interface Request {
      viewMode?: ViewMode;
      // Legacy property for backward compatibility (deprecated)
      categoryViewMode?: ViewMode;
    }
  }
}

/**
 * Extract and validate view mode from X-View-Mode header
 * Sets both req.viewMode and req.categoryViewMode for backward compatibility
 * Defaults to 'dm_view' if not provided
 */
export function extractViewMode(req: Request, res: Response, next: NextFunction): void {
  const headerValue = req.get('X-View-Mode');

  if (!headerValue) {
    // Default to DM view
    req.viewMode = 'dm_view';
    req.categoryViewMode = 'dm_view'; // Backward compatibility
    next();
    return;
  }

  // Validate view mode (unified format)
  if (headerValue !== 'dm_view' && headerValue !== 'player_view') {
    res.status(400).json({
      error: 'Invalid X-View-Mode header value',
      details: 'Must be "dm_view" or "player_view"'
    });
    return;
  }

  req.viewMode = headerValue as ViewMode;
  req.categoryViewMode = headerValue as ViewMode; // Backward compatibility
  next();
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
 * Use this for category database routes that return entities with dm_* fields
 * NOT needed for wiki cards (no dm_* fields)
 */
export function applyInformationFilter(req: Request, res: Response, next: NextFunction): void {
  if (req.viewMode === 'player_view') {
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
 * Export all filtering utilities
 */
export default {
  extractViewMode,
  stripDmFields,
  stripDmFieldsFromArray,
  applyInformationFilter,
};
