/**
 * InformationLevelService - Business logic for information level operations
 * Feature: 004-create-a-tagging
 * Task: T019
 */

import { db } from './DatabaseService';
import {
  InformationLevel,
  CreateInformationLevelPayload,
  UpdateInformationLevelPayload,
} from '../shared/types/InformationLevel';
import { rowToInformationLevel, InformationLevelRow } from '../models/InformationLevel';
import { randomUUID } from 'crypto';

export class InformationLevelService {
  /**
   * List information levels for campaign (4 defaults + custom levels)
   */
  async listInformationLevels(campaignId: string, userId: string): Promise<InformationLevel[]> {
    // Verify campaign ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(campaignId, userId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Get default levels + custom levels for this campaign
    const rows = db.prepare(`
      SELECT * FROM information_levels
      WHERE campaign_id IS NULL OR campaign_id = ?
      ORDER BY type ASC, name ASC
    `).all(campaignId) as InformationLevelRow[];

    return rows.map(rowToInformationLevel);
  }

  /**
   * Get information level by ID
   */
  async getInformationLevel(levelId: string): Promise<InformationLevel> {
    const row = db.prepare('SELECT * FROM information_levels WHERE id = ?').get(levelId) as InformationLevelRow | undefined;

    if (!row) {
      throw new Error('Information level not found');
    }

    return rowToInformationLevel(row);
  }

  /**
   * Create custom information level
   */
  async createInformationLevel(data: CreateInformationLevelPayload, userId: string): Promise<InformationLevel> {
    // Verify campaign ownership
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(data.campaignId, userId);
    if (!campaign) {
      throw new Error('Campaign not found or access denied');
    }

    // Validate name is unique within campaign
    const existingByName = db.prepare(`
      SELECT * FROM information_levels
      WHERE name = ? AND (campaign_id IS NULL OR campaign_id = ?)
    `).get(data.name, data.campaignId) as InformationLevelRow | undefined;

    if (existingByName) {
      throw new Error('Information level name already exists');
    }

    // Validate hex color format
    if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      throw new Error('Invalid hex color format');
    }

    // Validate name length
    if (data.name.length < 1 || data.name.length > 100) {
      throw new Error('Name must be between 1 and 100 characters');
    }

    const levelId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO information_levels (id, name, color, hierarchical, type, campaign_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'custom', ?, ?, ?)
    `).run(levelId, data.name, data.color, data.hierarchical ? 1 : 0, data.campaignId, now, now);

    const row = db.prepare('SELECT * FROM information_levels WHERE id = ?').get(levelId) as InformationLevelRow;
    return rowToInformationLevel(row);
  }

  /**
   * Update custom information level
   */
  async updateInformationLevel(levelId: string, data: UpdateInformationLevelPayload, userId: string): Promise<InformationLevel> {
    // Get existing level
    const existing = await this.getInformationLevel(levelId);

    // Cannot modify default levels
    if (existing.type === 'default') {
      throw new Error('Cannot modify default information levels');
    }

    // Verify campaign ownership
    if (existing.campaignId) {
      const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(existing.campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found or access denied');
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      // Validate name length
      if (data.name.length < 1 || data.name.length > 100) {
        throw new Error('Name must be between 1 and 100 characters');
      }

      // Check uniqueness
      const existingByName = db.prepare(`
        SELECT * FROM information_levels
        WHERE name = ? AND id != ? AND (campaign_id IS NULL OR campaign_id = ?)
      `).get(data.name, levelId, existing.campaignId) as InformationLevelRow | undefined;

      if (existingByName) {
        throw new Error('Information level name already exists');
      }

      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.color !== undefined) {
      // Validate hex color format
      if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
        throw new Error('Invalid hex color format');
      }

      updates.push('color = ?');
      values.push(data.color);
    }

    if (data.hierarchical !== undefined) {
      updates.push('hierarchical = ?');
      values.push(data.hierarchical ? 1 : 0);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = strftime(\'%s\', \'now\')');
    values.push(levelId);

    db.prepare(`
      UPDATE information_levels SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    const row = db.prepare('SELECT * FROM information_levels WHERE id = ?').get(levelId) as InformationLevelRow;
    return rowToInformationLevel(row);
  }

  /**
   * Delete custom information level and revert all cards to System
   */
  async deleteInformationLevel(levelId: string, userId: string): Promise<{ reverted_cards_count: number; warning: string }> {
    // Get existing level
    const existing = await this.getInformationLevel(levelId);

    // Cannot delete default levels
    if (existing.type === 'default') {
      throw new Error('Cannot delete default information levels');
    }

    // Verify campaign ownership
    if (existing.campaignId) {
      const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND owner_id = ?').get(existing.campaignId, userId);
      if (!campaign) {
        throw new Error('Campaign not found or access denied');
      }
    }

    // Count cards with this level
    const cardsResult = db.prepare('SELECT COUNT(*) as count FROM cards WHERE information_level_id = ?').get(levelId) as { count: number };
    const revertedCount = cardsResult.count;

    // Revert all cards to System level
    db.prepare(`
      UPDATE cards SET information_level_id = 'system', updated_at = strftime('%s', 'now')
      WHERE information_level_id = ?
    `).run(levelId);

    // Delete the information level
    db.prepare('DELETE FROM information_levels WHERE id = ?').run(levelId);

    const warning = `Information Level '${existing.name}' was deleted. ${revertedCount} cards reverted to System. Secrets may now be exposed in Player View.`;

    return {
      reverted_cards_count: revertedCount,
      warning,
    };
  }

  /**
   * Verify information level exists and belongs to campaign (for card assignment)
   */
  async validateLevelForCampaign(levelId: string, campaignId: string): Promise<boolean> {
    const row = db.prepare(`
      SELECT * FROM information_levels
      WHERE id = ? AND (campaign_id IS NULL OR campaign_id = ?)
    `).get(levelId, campaignId) as InformationLevelRow | undefined;

    return !!row;
  }
}
