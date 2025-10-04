import { Request } from 'express';

/**
 * Extended Express Request with authentication information
 */
export interface AuthRequest extends Request {
  authUser?: {
    sub: string; // Keycloak subject ID
    email?: string;
    name?: string;
    roles?: string[];
  };
  campaignId?: string;
  sessionId?: string;
}

// For compatibility with existing code that expects 'user'
declare module 'express' {
  interface Request {
    user?: {
      sub: string;
      email?: string;
      name?: string;
      roles?: string[];
    };
  }
}