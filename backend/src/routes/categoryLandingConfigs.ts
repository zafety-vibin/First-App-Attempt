/**
 * Category Landing Config Routes
 * Feature: 015-create-the-dashboard
 *
 * REST endpoints for category landing configuration operations with:
 * - Keycloak authentication
 * - User ID extraction from token
 * - Category enum validation (13 categories from Feature 014)
 * - Layout JSON and TipTap description validation
 * - Title max length validation (200 chars)
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { CategoryLandingConfigService } from '../services/CategoryLandingConfigService';
import { protect } from '../middleware/auth';
import { db } from '../services/DatabaseService';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Initialize service
const categoryLandingConfigService = new CategoryLandingConfigService(db);

// Valid categories from Feature 014
const VALID_CATEGORIES = [
  'npcs',
  'locations',
  'factions',
  'session_recaps',
  'quests',
  'player_characters',
  'lore_entries',
  'world_rules',
  'planar_forces',
  'session_prep',
  'custom_mechanics',
  'items',
  'creatures'
] as const;

// Zod schema for GridLayoutItem
const GridLayoutItemSchema = z.object({
  i: z.string(), // Unique instance ID
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
  maxW: z.number().optional(),
  maxH: z.number().optional(),
  widgetId: z.string(), // Widget type ID
  static: z.boolean().optional(),
});

// Zod schema for layout configuration
const LayoutConfigSchema = z.object({
  layouts: z.object({
    lg: z.array(GridLayoutItemSchema),
    md: z.array(GridLayoutItemSchema).optional(),
    sm: z.array(GridLayoutItemSchema).optional(),
  }),
  breakpoint: z.enum(['lg', 'md', 'sm']).default('lg'),
});

// Zod schema for TipTap JSON (basic validation - just ensure it's an object)
const TipTapJsonSchema = z.object({
  type: z.string().optional(),
  content: z.array(z.any()).optional(),
}).passthrough(); // Allow additional properties

// Zod schema for category enum
const CategorySchema = z.enum(VALID_CATEGORIES);

/**
 * GET /api/category-landing-configs
 * Get category landing config by campaign and category (user extracted from token)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const campaign_id = req.query.campaign_id as string | undefined;
    const category = req.query.category as string | undefined;

    // Validate required parameters
    if (!campaign_id) {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    if (!category) {
      res.status(400).json({ error: 'category query parameter is required' });
      return;
    }

    // Validate category enum
    const categoryValidation = CategorySchema.safeParse(category);
    if (!categoryValidation.success) {
      res.status(400).json({
        error: `Invalid category: ${category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
      return;
    }

    // Extract user_id from Keycloak token
    const user_id = req.user!.id;
    if (!user_id) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    // Verify campaign exists (optional but recommended)
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaign_id);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Get config for user, campaign, and category
    const config = categoryLandingConfigService.getCategoryLandingConfig(
      campaign_id,
      user_id,
      categoryValidation.data
    );

    if (!config) {
      // Return 404 if config not found
      res.status(404).json({ error: 'Category landing config not found' });
      return;
    }

    res.status(200).json(config);
  } catch (error: any) {
    console.error('Get category landing config error:', error);
    res.status(500).json({ error: 'Failed to get category landing config', details: error.message });
  }
});

/**
 * POST /api/category-landing-configs
 * Create new category landing config
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { campaign_id, category, layout, title, description } = req.body;

    // Validate required fields
    if (!campaign_id) {
      res.status(400).json({ error: 'campaign_id is required' });
      return;
    }

    if (!category) {
      res.status(400).json({ error: 'category is required' });
      return;
    }

    // Validate category enum
    const categoryValidation = CategorySchema.safeParse(category);
    if (!categoryValidation.success) {
      res.status(400).json({
        error: `Invalid category: ${category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
      return;
    }

    // Validate layout schema
    const layoutValidation = LayoutConfigSchema.safeParse(layout);
    if (!layoutValidation.success) {
      res.status(400).json({
        error: 'Invalid layout format',
        details: layoutValidation.error.flatten()
      });
      return;
    }

    // Validate title max length
    if (title && title.length > 200) {
      res.status(400).json({ error: 'Title must be 200 characters or less' });
      return;
    }

    // Validate description is TipTap JSON if provided
    if (description) {
      try {
        const parsedDescription = typeof description === 'string' ? JSON.parse(description) : description;
        const descriptionValidation = TipTapJsonSchema.safeParse(parsedDescription);
        if (!descriptionValidation.success) {
          res.status(400).json({
            error: 'Invalid TipTap description format',
            details: descriptionValidation.error.flatten()
          });
          return;
        }
      } catch (e) {
        res.status(400).json({ error: 'Description must be valid TipTap JSON' });
        return;
      }
    }

    // Extract user_id from token
    const user_id = req.user!.id;
    if (!user_id) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    // Create config
    const config = categoryLandingConfigService.createCategoryLandingConfig(
      campaign_id,
      user_id,
      categoryValidation.data,
      layoutValidation.data,
      title || null,
      typeof description === 'object' ? JSON.stringify(description) : description || null
    );

    res.status(201).json(config);
  } catch (error: any) {
    console.error('Create category landing config error:', error);

    // Handle validation errors
    if (error.message.includes('required') ||
        error.message.includes('Invalid') ||
        error.message.includes('references non-existent') ||
        error.message.includes('already exists')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create category landing config', details: error.message });
  }
});

/**
 * PUT /api/category-landing-configs/:id
 * Update category landing config (layout, title, and/or description)
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { layout, title, description } = req.body;

    // Validate layout if provided
    let validatedLayout = undefined;
    if (layout !== undefined) {
      const layoutValidation = LayoutConfigSchema.safeParse(layout);
      if (!layoutValidation.success) {
        res.status(400).json({
          error: 'Invalid layout format',
          details: layoutValidation.error.flatten()
        });
        return;
      }
      validatedLayout = layoutValidation.data;
    }

    // Validate title max length if provided
    if (title !== undefined && title !== null && title.length > 200) {
      res.status(400).json({ error: 'Title must be 200 characters or less' });
      return;
    }

    // Validate description is TipTap JSON if provided
    let validatedDescription = undefined;
    if (description !== undefined) {
      if (description !== null) {
        try {
          const parsedDescription = typeof description === 'string' ? JSON.parse(description) : description;
          const descriptionValidation = TipTapJsonSchema.safeParse(parsedDescription);
          if (!descriptionValidation.success) {
            res.status(400).json({
              error: 'Invalid TipTap description format',
              details: descriptionValidation.error.flatten()
            });
            return;
          }
          validatedDescription = typeof description === 'object' ? JSON.stringify(description) : description;
        } catch (e) {
          res.status(400).json({ error: 'Description must be valid TipTap JSON' });
          return;
        }
      } else {
        validatedDescription = null;
      }
    }

    // Extract user_id from token for validation
    const user_id = req.user!.id;

    // Get existing config to verify ownership
    const existing = db.prepare('SELECT user_id FROM category_landing_configs WHERE id = ?').get(id) as { user_id: string } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Category landing config not found' });
      return;
    }

    // Verify user owns this config
    if (existing.user_id !== user_id) {
      res.status(403).json({ error: 'Not authorized to update this category landing config' });
      return;
    }

    // Update config
    const updated = categoryLandingConfigService.updateCategoryLandingConfig(
      id,
      validatedLayout,
      title,
      validatedDescription
    );

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update category landing config error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('must be')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update category landing config', details: error.message });
  }
});

/**
 * DELETE /api/category-landing-configs/:id
 * Delete category landing config
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Extract user_id from token for validation
    const user_id = req.user!.id;

    // Get existing config to verify ownership
    const existing = db.prepare('SELECT user_id FROM category_landing_configs WHERE id = ?').get(id) as { user_id: string } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Category landing config not found' });
      return;
    }

    // Verify user owns this config
    if (existing.user_id !== user_id) {
      res.status(403).json({ error: 'Not authorized to delete this category landing config' });
      return;
    }

    // Delete config
    categoryLandingConfigService.deleteCategoryLandingConfig(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete category landing config error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete category landing config', details: error.message });
  }
});

export default router;