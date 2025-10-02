/**
 * Auth routes
 * Based on: specs/002-create-the-authentication/contracts/auth.yaml
 */

import express, { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { protect } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/auth/login
 * Simplified login - accepts token and creates session
 */
router.post('/login', (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    // In a real implementation, we would validate the Keycloak token here
    // For now, we'll create a test user and session
    const testUser = {
      sub: 'test-user-id',
      preferred_username: 'testuser',
      email: 'test@localhost.com',
    };

    const user = AuthService.upsertUser(testUser);
    const session = AuthService.createSession(user.id, token, 900); // 15 minutes

    res.status(200).json({
      user,
      session: {
        sessionId: session.sessionId,
        userId: session.userId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Destroy session
 */
router.post('/logout', protect, (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (token) {
      const session = AuthService.getSessionByToken(token);
      if (session) {
        AuthService.deleteSession(session.sessionId);
      }
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/auth/validate
 * Validate current session
 */
router.get('/validate', protect, (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (!token) {
      res.status(401).json({ valid: false, error: 'No token provided' });
      return;
    }

    const session = AuthService.getSessionByToken(token);
    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ valid: false, error: 'Token expired or invalid' });
      return;
    }

    const user = AuthService.getUserById(session.userId);
    if (!user) {
      res.status(401).json({ valid: false, error: 'User not found' });
      return;
    }

    res.status(200).json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      expiresAt: session.expiresAt,
    });
  } catch (error: any) {
    console.error('Validate error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

export default router;
