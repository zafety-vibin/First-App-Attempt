/**
 * SettingService - Business logic for setting operations
 * Feature: 003-create-a-notion
 */

import { db } from './DatabaseService';
import { Setting, CreateSettingRequest, UpdateSettingRequest } from '../shared/types/Setting';
import { rowToSetting, SettingRow } from '../models/Setting';
import { randomUUID } from 'crypto';

export class SettingService {
  /**
   * Create new setting
   */
  async createSetting(data: CreateSettingRequest, ownerId: string): Promise<Setting> {
    const settingId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    db.prepare(`
      INSERT INTO settings (id, owner_id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(settingId, ownerId, data.name, data.description || null, now, now);

    const row = db.prepare('SELECT * FROM settings WHERE id = ?').get(settingId) as SettingRow;
    return rowToSetting(row);
  }

  /**
   * List all settings owned by user
   */
  async listSettings(ownerId: string): Promise<Setting[]> {
    const rows = db.prepare('SELECT * FROM settings WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId) as SettingRow[];
    return rows.map(rowToSetting);
  }

  /**
   * Get setting by ID
   */
  async getSetting(settingId: string, ownerId: string): Promise<Setting> {
    const row = db.prepare('SELECT * FROM settings WHERE id = ? AND owner_id = ?').get(settingId, ownerId) as SettingRow | undefined;

    if (!row) {
      throw new Error('Setting not found or access denied');
    }

    return rowToSetting(row);
  }

  /**
   * Update setting
   */
  async updateSetting(settingId: string, data: UpdateSettingRequest, ownerId: string): Promise<Setting> {
    // Verify ownership
    const existing = await this.getSetting(settingId, ownerId);

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = strftime(\'%s\', \'now\')');
    values.push(settingId);

    db.prepare(`
      UPDATE settings SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    const row = db.prepare('SELECT * FROM settings WHERE id = ?').get(settingId) as SettingRow;
    return rowToSetting(row);
  }

  /**
   * Delete setting and all campaigns + cards within it (CASCADE)
   */
  async deleteSetting(settingId: string, ownerId: string): Promise<{ deleted_campaigns: number; deleted_cards: number }> {
    // Verify ownership
    await this.getSetting(settingId, ownerId);

    // Count campaigns and cards before deletion
    const campaigns = db.prepare('SELECT id FROM campaigns WHERE setting_id = ?').all(settingId) as { id: string }[];
    const campaignIds = campaigns.map(c => c.id);

    let deletedCards = 0;
    if (campaignIds.length > 0) {
      const placeholders = campaignIds.map(() => '?').join(',');
      const cardsResult = db.prepare(`SELECT COUNT(*) as count FROM cards WHERE campaign_id IN (${placeholders})`).get(...campaignIds) as { count: number };
      deletedCards = cardsResult.count;
    }

    // Delete in transaction (CASCADE via foreign keys)
    db.transaction(() => {
      // Delete cards first
      if (campaignIds.length > 0) {
        const placeholders = campaignIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM cards WHERE campaign_id IN (${placeholders})`).run(...campaignIds);
      }

      // Delete campaigns
      db.prepare('DELETE FROM campaigns WHERE setting_id = ?').run(settingId);

      // Delete setting
      db.prepare('DELETE FROM settings WHERE id = ?').run(settingId);
    })();

    return {
      deleted_campaigns: campaigns.length,
      deleted_cards: deletedCards,
    };
  }

  /**
   * List campaigns in setting
   */
  async listSettingCampaigns(settingId: string, ownerId: string): Promise<any[]> {
    // Verify ownership
    await this.getSetting(settingId, ownerId);

    const campaigns = db.prepare('SELECT * FROM campaigns WHERE setting_id = ? ORDER BY created_at DESC').all(settingId);
    return campaigns as any[];
  }
}
