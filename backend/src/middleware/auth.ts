/**
 * Authentication middleware
 * Simplified version - validates Bearer tokens and attaches user to request
 *
 * Note: This is a simplified implementation for prototype.
 * Full Keycloak token validation will be added later.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}

/**
 * Protect route - require valid authentication
 */
export function protect(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No authentication token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token and get session
    const session = AuthService.getSessionByToken(token);

    if (!session) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Check if session expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      AuthService.deleteSession(session.sessionId);
      res.status(401).json({ error: 'Token expired' });
      return;
    }

    // Get user
    const user = AuthService.getUserById(session.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Optional auth - attach user if token provided, but don't require it
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without user
    next();
    return;
  }

  // Try to authenticate, but don't fail if invalid
  try {
    const token = authHeader.substring(7);
    const session = AuthService.getSessionByToken(token);

    if (session && session.expiresAt >= new Date()) {
      const user = AuthService.getUserById(session.userId);
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
        };
      }
    }
  } catch (error) {
    // Ignore errors in optional auth
    console.warn('Optional auth failed:', error);
  }

  next();
}
