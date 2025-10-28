/**
 * Campaign Settings Service
 * Feature: 016-create-a-campaign
 * T007: Wizard status, theme retrieval, and atomic completion transaction
 */

import crypto from 'crypto';
import { db } from './DatabaseService';
import { CampaignSettings, ThemeOption, CategoryLabelsMap } from '../models/CampaignSettings';
import { CampaignService } from './CampaignService';
import { BibleGenerationService, BibleQuestionAnswer } from './BibleGenerationService';

// Theme descriptors (static data)
const HIGH_FANTASY_LABELS: CategoryLabelsMap = {
  npcs: 'Characters',
  locations: 'Realms',
  factions: 'Kingdoms',
  planar_forces: 'Pantheon',
  items: 'Artifacts',
  creatures: 'Beasts',
  lore_entries: 'Lore',
  world_rules: 'World Rules',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Quests',
  player_characters: 'Player Characters',
  custom_mechanics: 'Custom Mechanics'
};

const CYBERPUNK_LABELS: CategoryLabelsMap = {
  npcs: 'NPCs',
  locations: 'Districts',
  factions: 'Corporations',
  planar_forces: 'Planar Forces',
  items: 'Gear',
  creatures: 'Creatures',
  lore_entries: 'Lore',
  world_rules: 'World Rules',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Missions',
  player_characters: 'Runners',
  custom_mechanics: 'Custom Mechanics'
};

const SCI_FI_LABELS: CategoryLabelsMap = {
  npcs: 'NPCs',
  locations: 'Sectors',
  factions: 'Factions',
  planar_forces: 'Cosmic Forces',
  items: 'Tech',
  creatures: 'Xenofauna',
  lore_entries: 'Archives',
  world_rules: 'Physics',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Objectives',
  player_characters: 'Crew',
  custom_mechanics: 'Tech Mods'
};

const MODERN_LABELS: CategoryLabelsMap = {
  npcs: 'NPCs',
  locations: 'Places',
  factions: 'Organizations',
  planar_forces: 'Beliefs',
  items: 'Equipment',
  creatures: 'Creatures',
  lore_entries: 'Background',
  world_rules: 'World Rules',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Tasks',
  player_characters: 'Player Characters',
  custom_mechanics: 'Custom Mechanics'
};

const CUSTOM_LABELS_DEFAULT: CategoryLabelsMap = {
  npcs: 'NPCs',
  locations: 'Locations',
  factions: 'Factions',
  planar_forces: 'Planar Forces',
  items: 'Items',
  creatures: 'Creatures',
  lore_entries: 'Lore',
  world_rules: 'World Rules',
  session_prep: 'Session Prep',
  session_recaps: 'Session Recaps',
  quests: 'Quests',
  player_characters: 'Player Characters',
  custom_mechanics: 'Custom Mechanics'
};

interface ThemeDescriptor {
  id: ThemeOption;
  name: string;
  description: string;
  labels: CategoryLabelsMap;
  previewCategories: string[];
}

const THEME_DESCRIPTORS: ThemeDescriptor[] = [
  {
    id: 'high_fantasy',
    name: 'High Fantasy',
    description: 'Epic worlds of magic, kingdoms, and ancient artifacts',
    labels: HIGH_FANTASY_LABELS,
    previewCategories: ['Pantheon', 'Kingdoms', 'Realms', 'Artifacts']
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-lit streets, mega-corporations, and high-tech low-life',
    labels: CYBERPUNK_LABELS,
    previewCategories: ['Corporations', 'Districts', 'Runners', 'Gear']
  },
  {
    id: 'sci_fi',
    name: 'Sci-Fi',
    description: 'Space exploration, advanced technology, and cosmic mysteries',
    labels: SCI_FI_LABELS,
    previewCategories: ['Archives', 'Sectors', 'Tech Mods', 'Xenofauna']
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary settings with organizations, tasks, and equipment',
    labels: MODERN_LABELS,
    previewCategories: ['Organizations', 'Background', 'Places', 'Equipment']
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Define your own category names to fit your unique setting',
    labels: CUSTOM_LABELS_DEFAULT,
    previewCategories: ['(You choose all names)']
  }
];

interface WizardCompleteData {
  theme: ThemeOption;
  categoryLabels: CategoryLabelsMap;
  enabledCategories: string[];
  worldFoundationsAnswers?: Array<{ questionId: number; answer: string }>;
}

export class CampaignSettingsService {
  /**
   * Get wizard status for campaign
   * Returns shouldShowWizard=true if no settings exist
   */
  static getWizardStatus(campaignId: string, userId: string): { shouldShowWizard: boolean; existingSettings: CampaignSettings | null } {
    // Verify user owns campaign
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    if (campaign.ownerId !== userId) {
      throw new Error('Forbidden');
    }

    // Check if settings exist
    const row = db.prepare(`
      SELECT * FROM campaign_settings WHERE campaign_id = ?
    `).get(campaignId) as any;

    if (!row) {
      return { shouldShowWizard: true, existingSettings: null };
    }

    const settings: CampaignSettings = {
      id: row.id,
      campaign_id: row.campaign_id,
      theme: row.theme,
      category_labels: JSON.parse(row.category_labels),
      enabled_categories: JSON.parse(row.enabled_categories),
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return { shouldShowWizard: false, existingSettings: settings };
  }

  /**
   * Get all theme descriptors (static data)
   */
  static getThemes(): ThemeDescriptor[] {
    return THEME_DESCRIPTORS;
  }

  /**
   * Complete wizard with atomic transaction
   * Creates: campaign_settings with generated campaign bible
   */
  static completeWizard(campaignId: string, userId: string, data: WizardCompleteData): {
    success: boolean;
    settings: CampaignSettings;
    bible: string;
  } {
    // Verify user owns campaign
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) {
      throw new Error('Forbidden');
    }

    // Check if settings already exist
    const existing = db.prepare('SELECT id FROM campaign_settings WHERE campaign_id = ?').get(campaignId);
    if (existing) {
      throw new Error('Wizard already completed');
    }

    // Map preset themes to their labels
    const THEME_LABELS_MAP: Record<string, CategoryLabelsMap> = {
      high_fantasy: HIGH_FANTASY_LABELS,
      cyberpunk: CYBERPUNK_LABELS,
      sci_fi: SCI_FI_LABELS,
      modern: MODERN_LABELS,
      custom: CUSTOM_LABELS_DEFAULT
    };

    const categoryLabels = data.categoryLabels || THEME_LABELS_MAP[data.theme] || CUSTOM_LABELS_DEFAULT;

    const now = Math.floor(Date.now() / 1000);

    // Generate Campaign Bible from questionnaire answers
    const campaignName = campaign.name;
    let campaignBible: string;

    if (data.worldFoundationsAnswers && data.worldFoundationsAnswers.length > 0) {
      // Generate from questionnaire
      campaignBible = BibleGenerationService.generateFromQuestionnaire(campaignName, data.worldFoundationsAnswers);
    } else {
      // Generate default based on theme
      campaignBible = BibleGenerationService.generateDefault(campaignName, data.theme);
    }

    // Atomic transaction
    const transaction = db.transaction(() => {
      // 1. Insert campaign settings with generated bible
      const settingsResult = db.prepare(`
        INSERT INTO campaign_settings (campaign_id, theme, category_labels, enabled_categories, wizard_answers, campaign_bible, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `).get(
        campaignId,
        data.theme,
        JSON.stringify(categoryLabels),
        JSON.stringify(data.enabledCategories),
        data.worldFoundationsAnswers ? JSON.stringify(data.worldFoundationsAnswers) : null,
        campaignBible,
        now,
        now
      ) as any;

      const settings: CampaignSettings = {
        id: settingsResult.id,
        campaign_id: settingsResult.campaign_id,
        theme: settingsResult.theme,
        category_labels: JSON.parse(settingsResult.category_labels),
        enabled_categories: JSON.parse(settingsResult.enabled_categories),
        created_at: settingsResult.created_at,
        updated_at: settingsResult.updated_at
      };

      // 2. Bible has been generated and stored in settings
      // No additional database entries needed - bible is the single source of truth

      return { success: true, settings, bible: campaignBible };
    });

    // Execute transaction with 10s timeout
    try {
      const result = transaction();
      return result;
    } catch (error: any) {
      console.error('Wizard completion transaction failed:', error);
      throw new Error('Transaction failed: ' + error.message);
    }
  }

  /**
   * Get campaign bible markdown
   */
  static getCampaignBible(campaignId: string, userId: string): string | null {
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) {
      throw new Error('Forbidden');
    }

    const row = db.prepare('SELECT campaign_bible FROM campaign_settings WHERE campaign_id = ?')
      .get(campaignId) as { campaign_bible: string | null } | undefined;

    return row?.campaign_bible || null;
  }

  /**
   * Update campaign bible markdown
   */
  static updateCampaignBible(campaignId: string, userId: string, bibleMarkdown: string): void {
    const campaign = CampaignService.getCampaignById(campaignId);
    if (!campaign || campaign.ownerId !== userId) {
      throw new Error('Forbidden');
    }

    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      UPDATE campaign_settings
      SET campaign_bible = ?, updated_at = ?
      WHERE campaign_id = ?
    `).run(bibleMarkdown, now, campaignId);
  }
}
