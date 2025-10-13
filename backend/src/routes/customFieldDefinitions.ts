/**
 * Custom Field Definition Routes
 * Feature: 014-create-the-database
 *
 * REST endpoints for custom field definition operations with:
 * - Keycloak authentication
 * - Campaign ownership verification
 * - UNIQUE constraint handling (campaign_id, category, field_name)
 * - field_type enum validation
 * - Options validation for select/multi_select types
 * - Filter by category support
 */

import express, { Request, Response } from 'express';
import { CustomFieldDefinitionService } from '../services/customFieldDefinitionService';
import { protect } from '../middleware/auth';
import { db } from '../services/DatabaseService';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * GET /api/custom-field-definitions
 * List custom field definitions for campaign (optionally filtered by category)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const campaign_id = req.query.campaign_id as string | undefined;
    const category = req.query.category as string | undefined;

    // Validate campaign_id is provided
    if (!campaign_id) {
      res.status(400).json({ error: 'campaign_id query parameter is required' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to access this campaign' });
      return;
    }

    // Get definitions - filtered by category if provided
    const definitions = category
      ? CustomFieldDefinitionService.getByCampaignAndCategory(campaign_id, category)
      : CustomFieldDefinitionService.getByCampaign(campaign_id);

    res.status(200).json({
      data: definitions,
      total: definitions.length,
    });
  } catch (error: any) {
    console.error('List custom field definitions error:', error);
    res.status(500).json({ error: 'Failed to list custom field definitions', details: error.message });
  }
});

/**
 * POST /api/custom-field-definitions
 * Create new custom field definition
 * CRITICAL: Handles UNIQUE constraint violations (campaign_id, category, field_name) - returns 409 Conflict
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { campaign_id, category, field_name, field_label, field_type, options } = req.body;

    // Validate required fields
    if (!campaign_id || !category || !field_name || !field_label || !field_type) {
      res.status(400).json({ error: 'Missing required fields: campaign_id, category, field_name, field_label, field_type' });
      return;
    }

    // Validate field_type enum
    const validFieldTypes = ['text', 'number', 'select', 'multi_select', 'date'];
    if (!validFieldTypes.includes(field_type)) {
      res.status(400).json({ error: `Invalid field_type. Must be one of: ${validFieldTypes.join(', ')}` });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to create custom field definitions in this campaign' });
      return;
    }

    // Validate options are provided for select/multi_select types
    if ((field_type === 'select' || field_type === 'multi_select')) {
      if (!options || !Array.isArray(options) || options.length === 0) {
        res.status(400).json({ error: `Options array is required and must not be empty for ${field_type} field type` });
        return;
      }
    }

    // Create custom field definition
    const definition = CustomFieldDefinitionService.create({
      campaignId: campaign_id,
      category,
      fieldName: field_name,
      fieldLabel: field_label,
      fieldType: field_type as 'text' | 'number' | 'select' | 'multi_select' | 'date',
      options: options || null,
    });

    res.status(201).json(definition);
  } catch (error: any) {
    console.error('Create custom field definition error:', error);

    // Handle UNIQUE constraint violations - return 409 Conflict
    if (error.code === 'CONFLICT') {
      res.status(409).json({ error: error.message });
      return;
    }

    // Handle validation errors
    if (error.code === 'VALIDATION_ERROR' ||
        error.message.includes('required') ||
        error.message.includes('Invalid') ||
        error.message.includes('must be')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create custom field definition', details: error.message });
  }
});

/**
 * GET /api/custom-field-definitions/:id
 * Get custom field definition by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const definition = CustomFieldDefinitionService.getById(id);

    if (!definition) {
      res.status(404).json({ error: 'Custom field definition not found' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(definition.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to access this custom field definition' });
      return;
    }

    res.status(200).json(definition);
  } catch (error: any) {
    console.error('Get custom field definition error:', error);
    res.status(500).json({ error: 'Failed to get custom field definition', details: error.message });
  }
});

/**
 * PUT /api/custom-field-definitions/:id
 * Update custom field definition
 * Note: Cannot change campaign_id, category, or field_name (these form the unique constraint)
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { field_label, field_type, options } = req.body;

    const existing = CustomFieldDefinitionService.getById(id);

    if (!existing) {
      res.status(404).json({ error: 'Custom field definition not found' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(existing.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to update this custom field definition' });
      return;
    }

    // Prevent changing immutable fields
    if (req.body.campaign_id && req.body.campaign_id !== existing.campaign_id) {
      res.status(400).json({ error: 'Cannot change campaign_id of existing custom field definition' });
      return;
    }

    if (req.body.category && req.body.category !== existing.category) {
      res.status(400).json({ error: 'Cannot change category of existing custom field definition' });
      return;
    }

    if (req.body.field_name && req.body.field_name !== existing.field_name) {
      res.status(400).json({ error: 'Cannot change field_name of existing custom field definition' });
      return;
    }

    // Validate field_type enum if provided
    if (field_type !== undefined) {
      const validFieldTypes = ['text', 'number', 'select', 'multi_select', 'date'];
      if (!validFieldTypes.includes(field_type)) {
        res.status(400).json({ error: `Invalid field_type. Must be one of: ${validFieldTypes.join(', ')}` });
        return;
      }
    }

    // Validate options for select/multi_select types
    const finalFieldType = field_type !== undefined ? field_type : existing.field_type;
    if ((finalFieldType === 'select' || finalFieldType === 'multi_select')) {
      const finalOptions = options !== undefined ? options : existing.options;
      if (!finalOptions || !Array.isArray(finalOptions) || finalOptions.length === 0) {
        res.status(400).json({ error: `Options array is required and must not be empty for ${finalFieldType} field type` });
        return;
      }
    }

    // Update custom field definition
    const updated = CustomFieldDefinitionService.update(id, {
      fieldLabel: field_label,
      fieldType: field_type as 'text' | 'number' | 'select' | 'multi_select' | 'date' | undefined,
      options: options,
    });

    res.status(200).json(updated);
  } catch (error: any) {
    console.error('Update custom field definition error:', error);

    // Handle not found errors
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    // Handle validation errors
    if (error.code === 'VALIDATION_ERROR' ||
        error.message.includes('Invalid') ||
        error.message.includes('must be') ||
        error.message.includes('required')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update custom field definition', details: error.message });
  }
});

/**
 * DELETE /api/custom-field-definitions/:id
 * Delete custom field definition
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = CustomFieldDefinitionService.getById(id);

    if (!existing) {
      res.status(404).json({ error: 'Custom field definition not found' });
      return;
    }

    // Verify campaign ownership
    const campaign = db.prepare('SELECT owner_id FROM campaigns WHERE id = ?').get(existing.campaign_id) as { owner_id: string } | undefined;
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.owner_id !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to delete this custom field definition' });
      return;
    }

    // Delete custom field definition
    CustomFieldDefinitionService.delete(id);

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete custom field definition error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete custom field definition', details: error.message });
  }
});

export default router;
