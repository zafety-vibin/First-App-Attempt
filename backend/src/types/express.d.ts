/**
 * Type extensions for Express
 * Feature: 014-create-the-database
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      };
      viewMode?: 'dm_view' | 'player_view';
    }
  }
}
