import { Router, Request, Response } from 'express';
import { externalApiCors } from '../middleware/externalApiCors';
import { auditLogger } from '../middleware/auditLogger';
import { ExternalAPIService, ValidCategory } from '../services/ExternalAPIService';

/**
 * External API Routes for Conversational Database Operations
 *
 * Feature 018: REST API for AI tools like Claude Desktop
 * Port: 3002 (separate from main app on 3001)
 *
 * 8 Endpoint Groups:
 * 1. Health - Connection verification
 * 2. Database Query - GET operations with filtering
 * 3. Database Create - POST operations with validation
 * 4. Database Update - PATCH operations with partial updates
 * 5. Database Delete - Two-phase confirmation workflow
 * 6. Hierarchy - Navigate parent-child relationships
 * 7. Session Recaps - Timeline queries
 * 8. Knowledge Graphs - Graph operations
 */

const router = Router();

// Apply CORS and audit logging middleware to all routes
router.use(externalApiCors);
router.use(auditLogger);

/**
 * Endpoint Group 1: Health Check
 * GET /health
 */
router.get('/health', (req: Request, res: Response) => {
  const uptime = process.uptime();

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime_seconds: Math.floor(uptime),
  });
});

/**
 * Endpoint Group 2: Database Query Operations
 * GET /campaigns/:campaignId/database/:category
 */
router.get('/campaigns/:campaignId/database/:category', async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId, category } = req.params;

    // Validate category
    if (!ExternalAPIService.isValidCategory(category)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `Category '${category}' is not valid`,
          details: { category },
          suggestion: `Valid categories are: npcs, locations, factions, session_recaps, quests, player_characters, lore_entries, world_rules, planar_forces, session_prep, custom_mechanics, items, creatures`,
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const sort = req.query.sort as string;
    const search = req.query.search as string;
    const viewMode = (req.headers['x-view-mode'] as 'dm_view' | 'player_view') || 'dm_view';

    // Parse filter parameter (JSON)
    let filters: Record<string, any> | undefined;
    if (req.query.filter) {
      try {
        filters = JSON.parse(req.query.filter as string);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid filter parameter - must be valid JSON',
            details: { filter: req.query.filter },
            suggestion: 'Ensure filter is a valid JSON object, e.g., {"core_status":"active"}',
          },
          operation_id: res.getHeader('X-Operation-ID'),
        });
      }
    }

    // Query entries
    const result = await ExternalAPIService.queryEntries(
      campaignId,
      category as ValidCategory,
      filters,
      { page, limit, sort, viewMode, search }
    );

    return res.status(200).json({
      ...result,
      operation_id: res.getHeader('X-Operation-ID'),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {},
        suggestion: 'Please try again or contact support if the issue persists',
      },
      operation_id: res.getHeader('X-Operation-ID'),
    });
  }
});

/**
 * Endpoint Group 3: Database Create Operations
 * POST /campaigns/:campaignId/database/:category
 */
router.post('/campaigns/:campaignId/database/:category', async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId, category } = req.params;
    const data = req.body;

    // Validate category
    if (!ExternalAPIService.isValidCategory(category)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `Category '${category}' is not valid`,
          details: { category },
          suggestion: 'Check the category name and try again',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    // Validate required field
    if (!data.name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Required field "name" is missing',
          details: { provided_fields: Object.keys(data) },
          suggestion: 'Please provide a "name" field in your request body',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    // Create entry
    const result = await ExternalAPIService.createEntry(
      campaignId,
      category as ValidCategory,
      data
    );

    return res.status(201).json({
      ...result,
      operation_id: res.getHeader('X-Operation-ID'),
    });
  } catch (error: any) {
    // Check for constraint violations
    if (error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONSTRAINT_VIOLATION',
          message: 'Foreign key constraint violation',
          details: { error: error.message },
          suggestion: 'Ensure all referenced entities exist before creating this entry',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {},
        suggestion: 'Please try again or contact support',
      },
      operation_id: res.getHeader('X-Operation-ID'),
    });
  }
});

/**
 * Endpoint Group 4: Database Update Operations
 * PATCH /campaigns/:campaignId/database/:category/:entryId
 */
router.patch('/campaigns/:campaignId/database/:category/:entryId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId, category, entryId } = req.params;
    const updates = req.body;

    // Validate category
    if (!ExternalAPIService.isValidCategory(category)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `Category '${category}' is not valid`,
          details: { category },
          suggestion: 'Check the category name and try again',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    // Update entry
    const result = await ExternalAPIService.updateEntry(
      campaignId,
      category as ValidCategory,
      entryId,
      updates
    );

    return res.status(200).json({
      ...result,
      operation_id: res.getHeader('X-Operation-ID'),
    });
  } catch (error: any) {
    // Check for not found
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Entry ${req.params.entryId} not found`,
          details: {},
          suggestion: 'Verify the entry ID is correct',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    // Check for constraint violations
    if (error.message.includes('FOREIGN KEY constraint')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONSTRAINT_VIOLATION',
          message: 'Foreign key constraint violation',
          details: { error: error.message },
          suggestion: 'Ensure all referenced entities exist',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {},
        suggestion: 'Please try again or contact support',
      },
      operation_id: res.getHeader('X-Operation-ID'),
    });
  }
});

/**
 * Endpoint Group 5: Database Delete Operations (Two-Phase Confirmation)
 * DELETE /campaigns/:campaignId/database/:category/:entryId
 */
router.delete('/campaigns/:campaignId/database/:category/:entryId', async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId, category, entryId } = req.params;
    const confirm = req.query.confirm === 'true';
    const confirmationToken = req.headers['x-confirmation-token'] as string;

    // Validate category
    if (!ExternalAPIService.isValidCategory(category)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `Category '${category}' is not valid`,
          details: { category },
          suggestion: 'Check the category name and try again',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    if (!confirm) {
      // Phase 1: Preview deletion
      const preview = await ExternalAPIService.previewDelete(
        campaignId,
        category as ValidCategory,
        entryId
      );

      return res.status(200).json({
        ...preview,
        operation_id: res.getHeader('X-Operation-ID'),
      });
    } else {
      // Phase 2: Confirm deletion
      if (!confirmationToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Confirmation token required for deletion',
            details: {},
            suggestion: 'Include X-Confirmation-Token header with token from preview response',
          },
          operation_id: res.getHeader('X-Operation-ID'),
        });
      }

      try {
        await ExternalAPIService.confirmDelete(confirmationToken);
        return res.status(204).send();
      } catch (error: any) {
        if (error.message.includes('expired')) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'CONFIRMATION_EXPIRED',
              message: 'Confirmation token expired (60 second limit)',
              details: {},
              suggestion: 'Request a new preview and confirm within 60 seconds',
            },
            operation_id: res.getHeader('X-Operation-ID'),
          });
        }

        throw error;
      }
    }
  } catch (error: any) {
    // Check for not found
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Entry ${req.params.entryId} not found`,
          details: {},
          suggestion: 'Verify the entry ID is correct',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {},
        suggestion: 'Please try again or contact support',
      },
      operation_id: res.getHeader('X-Operation-ID'),
    });
  }
});

/**
 * Endpoint Group 6: Hierarchy Navigation
 * GET /campaigns/:campaignId/database/:category/:entryId/children
 */
router.get('/campaigns/:campaignId/database/:category/:entryId/children', async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId, category, entryId } = req.params;
    const depth = parseInt(req.query.depth as string) || 1;

    // Validate category supports hierarchy
    if (!ExternalAPIService.isHierarchyCategory(category)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `Category '${category}' does not support hierarchy navigation`,
          details: { category },
          suggestion: 'Only "locations" and "npcs" categories support hierarchy navigation',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    // Get children
    const result = await ExternalAPIService.getChildren(
      campaignId,
      category as any,
      entryId,
      depth
    );

    return res.status(200).json({
      ...result,
      operation_id: res.getHeader('X-Operation-ID'),
    });
  } catch (error: any) {
    // Check for not found
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Parent entry ${req.params.entryId} not found`,
          details: {},
          suggestion: 'Verify the parent entry ID is correct',
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {},
        suggestion: 'Please try again or contact support',
      },
      operation_id: res.getHeader('X-Operation-ID'),
    });
  }
});

/**
 * Endpoint Group 7: Session Recap Timeline Queries
 * GET /campaigns/:campaignId/recaps
 */
router.get('/campaigns/:campaignId/recaps', async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId } = req.params;
    const start_session = parseInt(req.query.start_session as string);
    const end_session = parseInt(req.query.end_session as string);
    const search = req.query.search as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const sort = (req.query.sort as string) || '-session_number';

    // Mock implementation - would integrate with Feature 014 SessionRecapService
    const startTime = Date.now();

    const data: any[] = []; // Would query session_recaps table
    const execution_time_ms = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        limit,
        total: data.length,
      },
      operation_id: res.getHeader('X-Operation-ID'),
      execution_time_ms,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {},
        suggestion: 'Please try again or contact support',
      },
      operation_id: res.getHeader('X-Operation-ID'),
    });
  }
});

/**
 * Endpoint Group 8: Knowledge Graph Operations
 * GET /campaigns/:campaignId/graphs
 */
router.get('/campaigns/:campaignId/graphs', async (req: Request, res: Response): Promise<any> => {
  try {
    const { campaignId } = req.params;
    const graph_type = req.query.graph_type as string;
    const node_type = req.query.node_type as string;
    const include_edges = req.query.include_edges !== 'false';

    // Validate graph_type if provided
    const validGraphTypes = ['Geographical', 'Political-Web', 'World-Foundations', 'Campaign-Story'];
    if (graph_type && !validGraphTypes.includes(graph_type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid graph_type '${graph_type}'`,
          details: { graph_type },
          suggestion: `Valid graph types are: ${validGraphTypes.join(', ')}`,
        },
        operation_id: res.getHeader('X-Operation-ID'),
      });
    }

    // Mock implementation - would integrate with Feature 005/006 KnowledgeGraphService
    const startTime = Date.now();

    const data: any[] = []; // Would query knowledge_graphs, graph_nodes, graph_edges tables
    const execution_time_ms = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      data,
      operation_id: res.getHeader('X-Operation-ID'),
      execution_time_ms,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {},
        suggestion: 'Please try again or contact support',
      },
      operation_id: res.getHeader('X-Operation-ID'),
    });
  }
});

export default router;
