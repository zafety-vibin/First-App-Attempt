/**
 * Dashboard Config Routes
 * Feature: 015-create-the-dashboard
 *
 * REST endpoints for dashboard configuration operations with:
 * - Keycloak authentication
 * - User ID extraction from token
 * - Zod validation for react-grid-layout schema
 * - CRUD operations for dashboard canvas configuration
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { DashboardConfigService } from '../services/DashboardConfigService';
import { protect } from '../middleware/auth';
import { db } from '../services/DatabaseService';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Initialize service
const dashboardConfigService = new DashboardConfigService(db);

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

/**
 * GET /api/dashboard-configs
 * Get dashboard config by campaign (user extracted from token)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const campaign_id = req.query.campaign_id as string | undefined;

    // Validate campaign_id is provided
    if (!campaign_id) {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Extract user_id from Keycloak token
    const user_id = req.user!.id;
    if (!user_id) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    // Verify campaign ownership (optional but recommended)
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Get config for user and campaign
    const config = dashboardConfigService.getDashboardConfig(campaign_id, user_id);

    if (!config) {
      // Return 404 if config not found
      res.status(404).json({ error: 'Dashboard config not found' });
      return;
    }

    res.status(200).json(config);
  } catch (error: any) {
    console.error('Get dashboard config error:', error);
    res.status(500).json({ error: 'Failed to get dashboard config', details: error.message });
  }
});

/**
 * POST /api/dashboard-configs
 * Create new dashboard config
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { campaign_id, layout } = req.body;

    // Validate campaign_id
    if (!campaign_id) {
      res.status(400).json({ error: 'campaign_id is required' });
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

    // Extract user_id from token
    const user_id = req.user!.id;
    if (!user_id) {
      res.status(401).json({ error: 'User ID not found in token' });
      return;
    }

    // Create config
    const config = dashboardConfigService.createDashboardConfig(
      campaign_id,
      user_id,
      layoutValidation.data
    );

    res.status(201).json(config);
  } catch (error: any) {
    console.error('Create dashboard config error:', error);

    // Handle validation errors
    if (error.message.includes('required') ||
        error.message.includes('references non-existent') ||
        error.message.includes('already exists')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create dashboard config', details: error.message });
  }
});

/**
 * PUT /api/dashboard-configs/:id
 * Update dashboard config layout
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { layout } = req.body;

    // Validate layout schema
    const layoutValidation = LayoutConfigSchema.safeParse(layout);
    if (!layoutValidation.success) {
      res.status(400).json({
        error: 'Invalid layout format',
        details: layoutValidation.error.flatten()
      });
      return;
    }

    // Extract user_id from token for validation
    const user_id = req.user!.id;

    // Get existing config to verify ownership
    const existing = db.prepare('SELECT user_id FROM dashboard_configs WHERE id = ?').get(id) as { user_id: string } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Dashboard config not found' });
      return;
    }

    // Verify user owns this config
    if (existing.user_id !== user_id) {
      res.status(403).json({ error: 'Not authorized to update this dashboard config' });
      return;
    }

    // Update config
    const updated = dashboardConfigService.updateDashboardConfig(id, layoutValidation.data);

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update dashboard config error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update dashboard config', details: error.message });
  }
});

/**
 * DELETE /api/dashboard-configs/:id
 * Delete dashboard config
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Extract user_id from token for validation
    const user_id = req.user!.id;

    // Get existing config to verify ownership
    const existing = db.prepare('SELECT user_id FROM dashboard_configs WHERE id = ?').get(id) as { user_id: string } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Dashboard config not found' });
      return;
    }

    // Verify user owns this config
    if (existing.user_id !== user_id) {
      res.status(403).json({ error: 'Not authorized to delete this dashboard config' });
      return;
    }

    // Delete config
    dashboardConfigService.deleteDashboardConfig(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete dashboard config error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete dashboard config', details: error.message });
  }
});

export default router;