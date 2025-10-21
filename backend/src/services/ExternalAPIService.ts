import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { db } from './DatabaseService';
import { NPCService } from './NPCService';
import { LocationService } from './LocationService';
import { FactionService } from './FactionService';
import { SessionRecapService } from './SessionRecapService';
import { QuestService } from './QuestService';
import { PlayerCharacterService } from './PlayerCharacterService';
import { LoreEntryService } from './LoreEntryService';
import { WorldRuleService } from './WorldRuleService';
import { PlanarForceService } from './PlanarForceService';
import { SessionPrepService } from './SessionPrepService';
import { CustomMechanicService } from './CustomMechanicService';
import { ItemService } from './ItemService';
import { CreatureService } from './CreatureService';
import { KnowledgeGraphService } from './KnowledgeGraphService';

/**
 * ExternalAPIService - Orchestration for external API operations
 *
 * Feature 018: Integrates with Feature 014 category services for real database operations.
 * Provides unified interface for query/create/update/delete across all 13 categories.
 */

// Valid category names from Feature 014
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
  'creatures',
] as const;

export type ValidCategory = (typeof VALID_CATEGORIES)[number];

// Categories supporting hierarchy navigation
const HIERARCHY_CATEGORIES = ['locations', 'npcs'] as const;
export type HierarchyCategory = (typeof HIERARCHY_CATEGORIES)[number];

// Initialize all category services
const categoryServices = {
  npcs: new NPCService(db),
  locations: new LocationService(db),
  factions: new FactionService(db),
  session_recaps: new SessionRecapService(db),
  quests: new QuestService(db),
  player_characters: new PlayerCharacterService(db),
  lore_entries: new LoreEntryService(db),
  world_rules: new WorldRuleService(db),
  planar_forces: new PlanarForceService(db),
  session_prep: new SessionPrepService(db),
  custom_mechanics: new CustomMechanicService(db),
  items: new ItemService(db),
  creatures: new CreatureService(db),
};

// Confirmation tokens for delete operations (in-memory cache with 60s TTL)
interface DeleteConfirmation {
  entryId: string;
  category: ValidCategory;
  campaignId: string;
  expiresAt: number;
}

const deleteConfirmations = new Map<string, DeleteConfirmation>();

/**
 * Query result interface
 */
export interface QueryResult {
  success: boolean;
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  execution_time_ms: number;
}

/**
 * Create result interface
 */
export interface CreateResult {
  success: boolean;
  data: any;
  execution_time_ms: number;
}

/**
 * Update result interface
 */
export interface UpdateResult {
  success: boolean;
  data: any;
  execution_time_ms: number;
}

/**
 * Delete preview result interface
 */
export interface DeletePreviewResult {
  success: boolean;
  message: string;
  preview: {
    entry: any;
    affected_references: Array<{
      table: string;
      field: string;
      count: number;
    }>;
    will_cascade: boolean;
  };
  confirmation_token: string;
  expires_at: string;
  execution_time_ms: number;
}

/**
 * Hierarchy result interface
 */
export interface HierarchyResult {
  success: boolean;
  data: {
    parent: any;
    children: any[];
    depth: number;
  };
  execution_time_ms: number;
}

/**
 * ExternalAPIService class
 */
export class ExternalAPIService {
  /**
   * Validate category name
   */
  static isValidCategory(category: string): category is ValidCategory {
    return VALID_CATEGORIES.includes(category as ValidCategory);
  }

  /**
   * Validate hierarchy category
   */
  static isHierarchyCategory(category: string): category is HierarchyCategory {
    return HIERARCHY_CATEGORIES.includes(category as HierarchyCategory);
  }

  /**
   * Get service instance for a category
   */
  private static getService(category: ValidCategory) {
    return categoryServices[category];
  }

  /**
   * Query entries from a category table
   */
  static async queryEntries(
    campaignId: string,
    category: ValidCategory,
    filters?: Record<string, any>,
    options?: {
      page?: number;
      limit?: number;
      sort?: string;
      viewMode?: 'dm_view' | 'player_view';
      search?: string;
    }
  ): Promise<QueryResult> {
    const startTime = Date.now();

    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const offset = (page - 1) * limit;

    // Parse sort parameter ("-created_at" -> sortBy: created_at, sortOrder: desc)
    let sortBy: 'created_at' | 'updated_at' | 'name' = 'created_at';
    let sortOrder: 'asc' | 'desc' = 'desc';

    if (options?.sort) {
      if (options.sort.startsWith('-')) {
        sortBy = options.sort.slice(1) as any;
        sortOrder = 'desc';
      } else {
        sortBy = options.sort as any;
        sortOrder = 'asc';
      }
    }

    // Get service and list entities
    const service = this.getService(category);
    const result = service.list(
      { campaign_id: campaignId, ...filters },
      { limit, offset },
      sortBy,
      sortOrder
    );

    // Apply view mode filtering (strip dm_only entities)
    let filteredData = result.data;
    if (options?.viewMode === 'player_view') {
      filteredData = result.data.filter((entity: any) => {
        if (!entity.player_knowledge) return true;
        return ['common_knowledge', 'player_knowledge'].includes(entity.player_knowledge);
      });

      // Strip dm_* fields
      filteredData = filteredData.map((entity: any) => {
        const stripped = { ...entity };
        Object.keys(stripped).forEach((key) => {
          if (key.startsWith('dm_')) {
            delete stripped[key];
          }
        });
        return stripped;
      });
    }

    const execution_time_ms = Date.now() - startTime;

    return {
      success: true,
      data: filteredData,
      pagination: {
        page,
        limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit),
      },
      execution_time_ms,
    };
  }

  /**
   * Create a new entry in a category table
   */
  static async createEntry(
    campaignId: string,
    category: ValidCategory,
    data: Record<string, any>
  ): Promise<CreateResult> {
    const startTime = Date.now();

    // Ensure campaign_id is set
    const entityData = {
      ...data,
      campaign_id: campaignId,
    };

    // Get service and create entity
    const service = this.getService(category);
    const entity = service.create(entityData);

    const execution_time_ms = Date.now() - startTime;

    return {
      success: true,
      data: entity,
      execution_time_ms,
    };
  }

  /**
   * Update an existing entry
   */
  static async updateEntry(
    campaignId: string,
    category: ValidCategory,
    entryId: string,
    updates: Record<string, any>
  ): Promise<UpdateResult> {
    const startTime = Date.now();

    // Get service
    const service = this.getService(category);

    // Check entity exists and belongs to campaign
    const existing = service.findById(entryId);
    if (!existing) {
      throw new Error(`Entry ${entryId} not found`);
    }

    if (existing.campaign_id !== campaignId) {
      throw new Error('Entry does not belong to this campaign');
    }

    // Update entity
    const updatedEntity = service.update(entryId, updates);

    const execution_time_ms = Date.now() - startTime;

    return {
      success: true,
      data: updatedEntity,
      execution_time_ms,
    };
  }

  /**
   * Delete preview - Phase 1 of two-phase confirmation
   */
  static async previewDelete(
    campaignId: string,
    category: ValidCategory,
    entryId: string
  ): Promise<DeletePreviewResult> {
    const startTime = Date.now();

    // Get service and fetch entry
    const service = this.getService(category);
    const entry = service.findById(entryId);

    if (!entry) {
      throw new Error(`Entry ${entryId} not found`);
    }

    if (entry.campaign_id !== campaignId) {
      throw new Error('Entry does not belong to this campaign');
    }

    // Calculate affected references based on category
    const affected_references = this.calculateAffectedReferences(category, entryId);

    // Generate confirmation token
    const confirmation_token = crypto.randomBytes(16).toString('hex');
    const expires_at = new Date(Date.now() + 60000); // 60 seconds

    // Store confirmation in memory cache
    deleteConfirmations.set(confirmation_token, {
      entryId,
      category,
      campaignId,
      expiresAt: expires_at.getTime(),
    });

    const execution_time_ms = Date.now() - startTime;

    return {
      success: true,
      message: 'Deletion preview - confirm to proceed',
      preview: {
        entry,
        affected_references,
        will_cascade: false, // Feature 014 uses SET NULL for most FKs
      },
      confirmation_token,
      expires_at: expires_at.toISOString(),
      execution_time_ms,
    };
  }

  /**
   * Delete confirm - Phase 2 of two-phase confirmation
   */
  static async confirmDelete(confirmation_token: string): Promise<void> {
    const confirmation = deleteConfirmations.get(confirmation_token);

    if (!confirmation) {
      throw new Error('Invalid confirmation token');
    }

    // Check expiry
    if (Date.now() > confirmation.expiresAt) {
      deleteConfirmations.delete(confirmation_token);
      throw new Error('Confirmation token expired (60s limit)');
    }

    // Get service and delete
    const service = this.getService(confirmation.category);
    service.delete(confirmation.entryId);

    // Remove confirmation token after successful deletion
    deleteConfirmations.delete(confirmation_token);
  }

  /**
   * Get children of a parent entry (hierarchy navigation)
   */
  static async getChildren(
    campaignId: string,
    category: HierarchyCategory,
    entryId: string,
    depth: number = 1
  ): Promise<HierarchyResult> {
    const startTime = Date.now();

    if (!this.isHierarchyCategory(category)) {
      throw new Error(`Category '${category}' does not support hierarchy navigation`);
    }

    // Get service and fetch parent
    const service = this.getService(category);
    const parent = service.findById(entryId);

    if (!parent) {
      throw new Error(`Parent entry ${entryId} not found`);
    }

    // Fetch children based on category
    let children: any[] = [];

    if (category === 'locations') {
      // Query locations where parent_location_id = entryId
      const stmt = db.prepare(`
        SELECT * FROM locations
        WHERE parent_location_id = ? AND campaign_id = ?
        ORDER BY name ASC
      `);
      children = stmt.all(entryId, campaignId) as any[];

      // If depth > 1, recursively fetch grandchildren
      if (depth > 1) {
        for (const child of children) {
          const grandchildrenResult = await this.getChildren(campaignId, category, child.id, depth - 1);
          (child as any).children = grandchildrenResult.data.children;
        }
      }
    } else if (category === 'npcs') {
      // Query NPCs where superior_npc_id = entryId
      const stmt = db.prepare(`
        SELECT * FROM npcs
        WHERE superior_npc_id = ? AND campaign_id = ?
        ORDER BY name ASC
      `);
      children = stmt.all(entryId, campaignId) as any[];

      // If depth > 1, recursively fetch subordinates
      if (depth > 1) {
        for (const child of children) {
          const subordinatesResult = await this.getChildren(campaignId, category, child.id, depth - 1);
          (child as any).children = subordinatesResult.data.children;
        }
      }
    }

    const execution_time_ms = Date.now() - startTime;

    return {
      success: true,
      data: {
        parent,
        children,
        depth,
      },
      execution_time_ms,
    };
  }

  /**
   * Calculate affected references for delete preview
   */
  private static calculateAffectedReferences(
    category: ValidCategory,
    entryId: string
  ): Array<{ table: string; field: string; count: number }> {
    const affected: Array<{ table: string; field: string; count: number }> = [];

    // Check references based on category
    switch (category) {
      case 'factions':
        // NPCs referencing this faction
        const npcCount = db
          .prepare('SELECT COUNT(*) as count FROM npcs WHERE faction_id = ?')
          .get(entryId) as { count: number };
        if (npcCount.count > 0) {
          affected.push({ table: 'npcs', field: 'faction_id', count: npcCount.count });
        }

        // Quests referencing this faction
        const questCount = db
          .prepare('SELECT COUNT(*) as count FROM quests WHERE faction_id = ?')
          .get(entryId) as { count: number };
        if (questCount.count > 0) {
          affected.push({ table: 'quests', field: 'faction_id', count: questCount.count });
        }
        break;

      case 'npcs':
        // NPCs with this as superior
        const subordinateCount = db
          .prepare('SELECT COUNT(*) as count FROM npcs WHERE superior_npc_id = ?')
          .get(entryId) as { count: number };
        if (subordinateCount.count > 0) {
          affected.push({ table: 'npcs', field: 'superior_npc_id', count: subordinateCount.count });
        }

        // Quests with this NPC as quest_giver
        const questGiverCount = db
          .prepare('SELECT COUNT(*) as count FROM quests WHERE quest_giver_id = ?')
          .get(entryId) as { count: number };
        if (questGiverCount.count > 0) {
          affected.push({ table: 'quests', field: 'quest_giver_id', count: questGiverCount.count });
        }
        break;

      case 'locations':
        // Child locations
        const childLocCount = db
          .prepare('SELECT COUNT(*) as count FROM locations WHERE parent_location_id = ?')
          .get(entryId) as { count: number };
        if (childLocCount.count > 0) {
          affected.push({ table: 'locations', field: 'parent_location_id', count: childLocCount.count });
        }
        break;

      case 'session_recaps':
        // Quests referencing this session
        const startedQuestsCount = db
          .prepare('SELECT COUNT(*) as count FROM quests WHERE started_session_id = ?')
          .get(entryId) as { count: number };
        if (startedQuestsCount.count > 0) {
          affected.push({ table: 'quests', field: 'started_session_id', count: startedQuestsCount.count });
        }

        const completedQuestsCount = db
          .prepare('SELECT COUNT(*) as count FROM quests WHERE completed_session_id = ?')
          .get(entryId) as { count: number };
        if (completedQuestsCount.count > 0) {
          affected.push({ table: 'quests', field: 'completed_session_id', count: completedQuestsCount.count });
        }
        break;

      // Other categories don't have explicit FK relationships tracked
    }

    return affected;
  }

  /**
   * Cleanup expired delete confirmation tokens (called periodically)
   */
  static cleanupExpiredConfirmations(): void {
    const now = Date.now();

    for (const [token, confirmation] of deleteConfirmations.entries()) {
      if (now > confirmation.expiresAt) {
        deleteConfirmations.delete(token);
      }
    }
  }

  /**
   * Validate campaign exists
   */
  static validateCampaign(campaignId: string): boolean {
    const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaignId);
    return !!campaign;
  }

  /**
   * Query knowledge graphs for a campaign
   */
  static async queryGraphs(
    campaignId: string,
    filters?: {
      graph_type?: string;
      node_type?: string;
      include_edges?: boolean;
    }
  ): Promise<any> {
    const startTime = Date.now();

    // Use KnowledgeGraphService from Feature 005/006
    const knowledgeGraphService = new KnowledgeGraphService(db);

    // List all graphs for campaign
    const graphs = knowledgeGraphService.listGraphsByCampaign(campaignId);

    // Filter by graph_type if provided
    let filteredGraphs = graphs;
    if (filters?.graph_type) {
      filteredGraphs = graphs.filter((g: any) => g.graph_type === filters.graph_type);
    }

    // Format response with nodes and edges
    const data = filteredGraphs.map((graph: any) => {
      const nodes = knowledgeGraphService.getGraphNodes(graph.id);
      const edges = filters?.include_edges !== false
        ? knowledgeGraphService.getGraphEdges(graph.id)
        : [];

      // Filter nodes by type if provided
      let filteredNodes = nodes;
      if (filters?.node_type) {
        filteredNodes = nodes.filter((n: any) => n.type === filters.node_type);
      }

      return {
        graph_type: graph.graph_type,
        nodes: filteredNodes,
        edges,
      };
    });

    const execution_time_ms = Date.now() - startTime;

    return {
      success: true,
      data,
      execution_time_ms,
    };
  }

  /**
   * Query session recaps with timeline filtering
   */
  static async queryRecaps(
    campaignId: string,
    filters?: {
      start_session?: number;
      end_session?: number;
      search?: string;
      limit?: number;
      sort?: string;
    }
  ): Promise<any> {
    const startTime = Date.now();

    const limit = filters?.limit || 10;
    const offset = 0;

    // Build filters for SessionRecapService
    const serviceFilters: any = { campaign_id: campaignId };

    // Query session_recaps table with filters
    let query = 'SELECT * FROM session_recaps WHERE campaign_id = ?';
    const params: any[] = [campaignId];

    if (filters?.start_session) {
      query += ' AND session_number >= ?';
      params.push(filters.start_session);
    }

    if (filters?.end_session) {
      query += ' AND session_number <= ?';
      params.push(filters.end_session);
    }

    if (filters?.search) {
      query += ` AND (summary LIKE ? OR key_events LIKE ? OR player_decisions LIKE ?)`;
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Default sort: descending session_number
    query += ' ORDER BY session_number DESC';
    query += ' LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(query);
    const data = stmt.all(...params);

    const execution_time_ms = Date.now() - startTime;

    return {
      success: true,
      data,
      pagination: {
        limit,
        total: (data as any[]).length,
      },
      execution_time_ms,
    };
  }
}

// Cleanup expired confirmations every minute
setInterval(() => {
  ExternalAPIService.cleanupExpiredConfirmations();
}, 60000);
