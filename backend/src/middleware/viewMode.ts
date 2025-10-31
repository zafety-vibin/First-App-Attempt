/**
 * View Mode Middleware
 * Feature: 004-create-a-tagging
 * Task: T024
 *
 * Extracts X-View-Mode header from requests and makes it available to routes.
 * Does NOT apply filtering directly - routes decide how to use view mode.
 */

import { Request, Response, NextFunction } from 'express';
import { ViewMode } from '../../shared/types/ViewMode';
import { ViewModeService } from '../services/ViewModeService';

const viewModeService = new ViewModeService();

/**
 * Add viewMode to Request type
 */
declare global {
  namespace Express {
    interface Request {
      viewMode?: ViewMode;
    }
  }
}

/**
 * Extract and validate view mode from X-View-Mode header
 * Defaults to 'dm' if not provided
 */
export function extractViewMode(req: Request, res: Response, next: NextFunction): void {
  const headerValue = req.get('X-View-Mode');

  if (!headerValue) {
    // Default to DM view
    req.viewMode = 'dm_view';
    next();
    return;
  }

  // Validate view mode (unified format)
  if (headerValue !== 'dm_view' && headerValue !== 'player_view') {
    res.status(400).json({ error: 'Invalid X-View-Mode header value. Must be "dm_view" or "player_view"' });
    return;
  }

  req.viewMode = headerValue as ViewMode;
  next();
}
