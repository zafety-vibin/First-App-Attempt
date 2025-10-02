/**
 * Image upload routes
 * Feature: 003-create-a-notion
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { protect } from '../middleware/auth';
import { db } from '../services/DatabaseService';
import { CardRow } from '../models/Card';

// Separate routers for serving images (public) and uploading (authenticated)
export const imageServeRouter = express.Router();
export const imageUploadRouter = express.Router();

const router = express.Router(); // Keep for backward compatibility

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * GET /api/images/:id
 * Serve image by ID (public endpoint - no auth required for <img> tags to work)
 */
imageServeRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const image = db.prepare(`
      SELECT data, mime_type FROM images WHERE id = ?
    `).get(id) as { data: Buffer; mime_type: string } | undefined;

    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    res.setHeader('Content-Type', image.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(image.data);
  } catch (error: any) {
    console.error('Get image error:', error);
    res.status(500).json({ error: 'Failed to retrieve image' });
  }
});

/**
 * POST /api/cards/:id/image
 * Upload image for an image card (requires authentication)
 */
imageUploadRouter.post('/:id/image', protect, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!req.file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    // Verify ownership and card type
    const card = db.prepare(`
      SELECT c.* FROM cards c
      JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = ? AND cam.owner_id = ?
    `).get(id, userId) as CardRow | undefined;

    if (!card) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    if (card.type !== 'image') {
      res.status(422).json({ error: `Card is not an image card (type='${card.type}')` });
      return;
    }

    // Process image with sharp (compress and get metadata)
    const processedImage = await sharp(req.file.buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const metadata = await sharp(processedImage).metadata();

    // Store image in database as BLOB
    const imageId = generateImageId();
    db.prepare(`
      INSERT INTO images (id, card_id, data, mime_type, size, width, height, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
    `).run(
      imageId,
      id,
      processedImage,
      'image/jpeg',
      processedImage.length,
      metadata.width || 0,
      metadata.height || 0
    );

    // Return image URL with full backend URL so browser knows where to fetch it
    const imageUrl = `http://localhost:3001/api/images/${imageId}`;

    res.status(200).json({
      url: imageUrl,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: processedImage.length,
    });
  } catch (error: any) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export default router;
