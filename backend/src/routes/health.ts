/**
 * Health check route
 * Based on: specs/002-create-the-authentication/research.md section 2
 */

import express, { Request, Response } from 'express';
import { db } from '../services/DatabaseService';

const router = express.Router();

/**
 * GET /health
 * Health check endpoint - verifies database connectivity
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check database connection
    const dbCheck = db.prepare('SELECT 1 as result').get() as { result: number };

    if (dbCheck.result === 1) {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } else {
      throw new Error('Database check failed');
    }
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

export default router;
