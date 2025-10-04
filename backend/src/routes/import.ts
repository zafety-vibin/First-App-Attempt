/**
 * Import API Routes
 * Feature: 005-create-the-ai
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { db } from '../services/DatabaseService';
import { ImportAIService } from '../services/ImportAIService';
import { ImportBatchService } from '../services/ImportBatchService';
import { FileParseService } from '../services/FileParseService';
import { rowToImportSession } from '../models/ImportSession';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(process.env.TEMP_DIR || '/tmp', 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.pdf', '.docx', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * POST /api/import/session
 * Create a new import session
 */
router.post('/session', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID required' });
    }

    const sessionId = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO import_sessions (
        id, campaign_id, status, chat_history, approval_summary, created_at, completed_at
      )
      VALUES (?, ?, 'uploading', '[]', NULL, ?, NULL)
    `).run(sessionId, campaignId, timestamp);

    const session = {
      id: sessionId,
      campaignId,
      status: 'uploading' as const,
      chatHistory: [],
      createdAt: new Date(timestamp * 1000).toISOString()
    };

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/import/upload
 * Upload a file for import
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    const file = req.file;

    if (!sessionId || !file) {
      return res.status(400).json({ error: 'Session ID and file required' });
    }

    const fileParseService = new FileParseService();

    // Parse the file
    const parsed = await fileParseService.parseFile(file.path);

    // Update session status
    db.prepare(`
      UPDATE import_sessions
      SET status = 'processing'
      WHERE id = ?
    `).run(sessionId);

    // Clean up temp file
    await fileParseService.cleanupFile(file.path);

    res.json({
      success: true,
      metadata: parsed.metadata,
      textLength: parsed.text.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/import/chat
 * Chat with the import AI (SSE streaming)
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { sessionId, campaignId, message } = req.body;
    if (!sessionId || !campaignId || !message) {
      return res.status(400).json({ error: 'Session ID, campaign ID, and message required' });
    }

    // Get BYOLLM config
    const byollmConfig = db.prepare(`
      SELECT config FROM byollm_configs
      WHERE campaign_id = ? AND scope = 'campaign'
    `).get(campaignId) as any;

    if (!byollmConfig) {
      return res.status(400).json({ error: 'BYOLLM configuration not found' });
    }

    const config = JSON.parse(byollmConfig.config);

    // Initialize services
    const importAI = new ImportAIService(db, {
      llmConfig: {
        provider: config.provider,
        apiKey: config.apiKey,
        model: config.model
      },
      deduplicationThreshold: 0.7
    });

    await importAI.initialize();

    // Extract entities
    const entities = await importAI.extractEntities(sessionId, campaignId, message);

    // Generate approval summary
    const approvalSummary = await importAI.generateApprovalSummary(
      sessionId,
      entities,
      campaignId
    );

    // Update session with approval summary
    db.prepare(`
      UPDATE import_sessions
      SET status = 'pending_approval', approval_summary = ?
      WHERE id = ?
    `).run(JSON.stringify(approvalSummary), sessionId);

    // Stream response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: ${JSON.stringify({
      type: 'entities',
      entities: entities.length,
      summary: approvalSummary
    })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/import/approval-summary
 * Get the approval summary for a session
 */
router.get('/approval-summary', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = db.prepare(`
      SELECT * FROM import_sessions WHERE id = ?
    `).get(sessionId as string) as any;

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const importSession = rowToImportSession(session);
    res.json(importSession.approvalSummary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/import/approve
 * Approve and execute an import batch
 */
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const { sessionId, campaignId } = req.body;
    if (!sessionId || !campaignId) {
      return res.status(400).json({ error: 'Session ID and campaign ID required' });
    }

    // Get session
    const session = db.prepare(`
      SELECT * FROM import_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (!session || session.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Session not ready for approval' });
    }

    const importSession = rowToImportSession(session);
    if (!importSession.approvalSummary) {
      return res.status(400).json({ error: 'No approval summary found' });
    }

    // Execute batch
    const batchService = new ImportBatchService(db);
    const batch = await batchService.executeBatch(
      sessionId,
      campaignId,
      importSession.approvalSummary
    );

    res.json({
      success: true,
      batchId: batch.id,
      cardsCreated: batch.cardIds.length,
      nodesCreated: batch.nodeIds.length,
      edgesCreated: batch.edgeIds.length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/import/revert
 * Revert an import batch
 */
router.post('/revert', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID required' });
    }

    const batchService = new ImportBatchService(db);

    await batchService.revertBatch(batchId);

    res.json({
      success: true,
      message: 'Batch reverted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as importRouter };