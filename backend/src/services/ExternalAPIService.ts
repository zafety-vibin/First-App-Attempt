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
import { PlanarForceService} from './PlanarForceService';
import { SessionPrepService } from './SessionPrepService';
import { CustomMechanicService } from './CustomMechanicService';
import { ItemService } from './ItemService';
import { CreatureService } from './CreatureService';
import { KnowledgeGraphService } from './KnowledgeGraphService';

const VALID_CATEGORIES = [
  'npcs', 'locations', 'factions', 'session_recaps', 'quests', 'player_characters',
  'lore_entries', 'world_rules', 'planar_forces', 'session_prep', 'custom_mechanics',
  'items', 'creatures',
] as const;

export type ValidCategory = (typeof VALID_CATEGORIES)[number];

const HIERARCHY_CATEGORIES = ['locations', 'npcs'] as const;
export type HierarchyCategory = (typeof HIERARCHY_CATEGORIES)[number];

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

interface DeleteConfirmation {
  entryId: string;
  category: ValidCategory;
  campaignId: string;
  expiresAt: number;
}

const deleteConfirmations = new Map<string, DeleteConfirmation>();

export interface QueryResult {
  success: boolean;
  data: any[];
  pagination: { page: number; limit: number; total: number; total_pages: number };
  execution_time_ms: number;
}

export interface CreateResult {
  success: boolean;
  data: any;
  execution_time_ms: number;
}

export interface UpdateResult {
  success: boolean;
  data: any;
  execution_time_ms: number;
}

export interface DeletePreviewResult {
  success: boolean;
  message: string;
  preview: {
    entry: any;
    affected_references: Array<{ table: string; field: string; count: number }>;
    will_cascade: boolean;
  };
  confirmation_token: string;
  expires_at: string;
  execution_time_ms: number;
}

export interface HierarchyResult {
  success: boolean;
  data: { parent: any; children: any[]; depth: number };
  execution_time_ms: number;
}

export class ExternalAPIService {
  static isValidCategory(category: string): category is ValidCategory {
    return VALID_CATEGORIES.includes(category as ValidCategory);
  }

  static isHierarchyCategory(category: string): category is HierarchyCategory {
    return HIERARCHY_CATEGORIES.includes(category as HierarchyCategory);
  }

  private static getService(category: ValidCategory) {
    return categoryServices[category];
  }

  static async queryEntries(
    campaignId: string,
    category: ValidCategory,
    filters?: Record<string, any>,
    options?: { page?: number; limit?: number; sort?: string; viewMode?: 'dm_view' | 'player_view'; search?: string }
  ): Promise<QueryResult> {
    const startTime = Date.now();
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const offset = (page - 1) * limit;
    const sortBy = options?.sort?.replace('-', '') || 'created_at';
    const sortOrder: 'asc' | 'desc' = options?.sort?.startsWith('-') ? 'desc' : 'asc';

    const service = this.getService(category);
    const result = service.list({ campaign_id: campaignId, ...filters }, { limit, offset }, sortBy as any, sortOrder);

    let filteredData = result.data;
    if (options?.viewMode === 'player_view') {
      filteredData = result.data
        .filter((e: any) => !e.player_knowledge || ['common_knowledge', 'player_knowledge'].includes(e.player_knowledge))
        .map((e: any) => {
          const stripped = { ...e };
          Object.keys(stripped).forEach((k) => { if (k.startsWith('dm_')) delete stripped[k]; });
          return stripped;
        });
    }

    return {
      success: true,
      data: filteredData,
      pagination: { page, limit, total: result.total, total_pages: Math.ceil(result.total / limit) },
      execution_time_ms: Date.now() - startTime,
    };
  }

  static async createEntry(campaignId: string, category: ValidCategory, data: Record<string, any>): Promise<CreateResult> {
    const startTime = Date.now();
    const service = this.getService(category);
    const entity = service.create({ ...data, campaign_id: campaignId });
    return { success: true, data: entity, execution_time_ms: Date.now() - startTime };
  }

  static async updateEntry(campaignId: string, category: ValidCategory, entryId: string, updates: Record<string, any>): Promise<UpdateResult> {
    const startTime = Date.now();
    const service = this.getService(category);
    const entity = service.update(entryId, updates);
    return { success: true, data: entity, execution_time_ms: Date.now() - startTime };
  }

  static async previewDelete(campaignId: string, category: ValidCategory, entryId: string): Promise<DeletePreviewResult> {
    const startTime = Date.now();
    const service = this.getService(category);
    const entry = service.findById(entryId);

    if (!entry) throw new Error(`Entry ${entryId} not found`);

    const confirmation_token = crypto.randomBytes(16).toString('hex');
    const expires_at = new Date(Date.now() + 60000);

    deleteConfirmations.set(confirmation_token, { entryId, category, campaignId, expiresAt: expires_at.getTime() });

    return {
      success: true,
      message: 'Deletion preview - confirm to proceed',
      preview: { entry, affected_references: [], will_cascade: false },
      confirmation_token,
      expires_at: expires_at.toISOString(),
      execution_time_ms: Date.now() - startTime,
    };
  }

  static async confirmDelete(confirmation_token: string): Promise<void> {
    const confirmation = deleteConfirmations.get(confirmation_token);
    if (!confirmation) throw new Error('Invalid confirmation token');
    if (Date.now() > confirmation.expiresAt) {
      deleteConfirmations.delete(confirmation_token);
      throw new Error('Confirmation token expired (60s limit)');
    }

    const service = this.getService(confirmation.category);
    service.delete(confirmation.entryId);
    deleteConfirmations.delete(confirmation_token);
  }

  static async getChildren(campaignId: string, category: HierarchyCategory, entryId: string, depth: number = 1): Promise<HierarchyResult> {
    const startTime = Date.now();
    const service = this.getService(category);
    const parent = service.findById(entryId);

    if (!parent) throw new Error(`Parent entry ${entryId} not found`);

    let children: any[] = [];

    if (category === 'locations') {
      children = db.prepare(`SELECT * FROM locations WHERE parent_location_id = ? AND campaign_id = ? ORDER BY name ASC`).all(entryId, campaignId) as any[];
      if (depth > 1) {
        for (const child of children) {
          const result = await this.getChildren(campaignId, category, child.id, depth - 1);
          (child as any).children = result.data.children;
        }
      }
    } else if (category === 'npcs') {
      children = db.prepare(`SELECT * FROM npcs WHERE superior_npc_id = ? AND campaign_id = ? ORDER BY name ASC`).all(entryId, campaignId) as any[];
      if (depth > 1) {
        for (const child of children) {
          const result = await this.getChildren(campaignId, category, child.id, depth - 1);
          (child as any).children = result.data.children;
        }
      }
    }

    return {
      success: true,
      data: { parent, children, depth },
      execution_time_ms: Date.now() - startTime,
    };
  }

  static async queryGraphs(campaignId: string, filters?: any): Promise<any> {
    const startTime = Date.now();
    return { success: true, data: [], execution_time_ms: Date.now() - startTime };
  }

  static async queryRecaps(campaignId: string, filters?: any): Promise<any> {
    const startTime = Date.now();
    const data = db.prepare('SELECT * FROM session_recaps WHERE campaign_id = ? ORDER BY session_number DESC LIMIT 10').all(campaignId);
    return { success: true, data, pagination: { limit: 10, total: (data as any[]).length }, execution_time_ms: Date.now() - startTime };
  }

  static cleanupExpiredConfirmations(): void {
    const now = Date.now();
    for (const [token, confirmation] of deleteConfirmations.entries()) {
      if (now > confirmation.expiresAt) deleteConfirmations.delete(token);
    }
  }

  static validateCampaign(campaignId: string): boolean {
    return !!db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaignId);
  }
}

setInterval(() => ExternalAPIService.cleanupExpiredConfirmations(), 60000);
