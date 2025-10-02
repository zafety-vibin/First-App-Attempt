/**
 * Campaign Service - Handles campaign CRUD operations
 * Based on: specs/002-create-the-authentication/contracts/campaigns.yaml
 */

import { db } from './DatabaseService';
import { Campaign, CreateCampaignInput, UpdateCampaignInput } from '../../../shared/types/Campaign';
import { rowToCampaign, campaignToRow } from '../models/Campaign';
import { CampaignRow } from '../../../shared/types/Campaign';
import { generatePublicId } from '../utils/generatePublicId';
import crypto from 'crypto';

export class CampaignService {
  /**
   * Get campaigns by owner ID
   */
  static getCampaignsByOwner(ownerId: string, limit = 50, offset = 0): {
    campaigns: Campaign[];
    total: number;
  } {
    // Get total count
    const countResult = db
      .prepare('SELECT COUNT(*) as count FROM campaigns WHERE owner_id = ?')
      .get(ownerId) as { count: number };

    // Get campaigns with pagination, ordered by updated_at DESC
    const rows = db
      .prepare(
        `SELECT * FROM campaigns WHERE owner_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(ownerId, limit, offset) as CampaignRow[];

    return {
      campaigns: rows.map(rowToCampaign),
      total: countResult.count,
    };
  }

  /**
   * Get campaign by ID
   */
  static getCampaignById(id: string): Campaign | null {
    const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as
      | CampaignRow
      | undefined;

    return row ? rowToCampaign(row) : null;
  }

  /**
   * Get campaign by public URL ID
   */
  static getCampaignByPublicId(publicUrlId: string): Campaign | null {
    const row = db
      .prepare('SELECT * FROM campaigns WHERE public_url_id = ? AND public_access_enabled = 1')
      .get(publicUrlId) as CampaignRow | undefined;

    return row ? rowToCampaign(row) : null;
  }

  /**
   * Create new campaign with unique public URL ID
   */
  static createCampaign(input: CreateCampaignInput): Campaign {
    const campaignId = crypto.randomUUID();
    let publicUrlId = generatePublicId();

    const now = Math.floor(Date.now() / 1000);

    // Retry up to 3 times if public_url_id collision (extremely unlikely)
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const stmt = db.prepare(`
          INSERT INTO campaigns (id, name, owner_id, public_url_id, public_access_enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, ?, ?)
        `);

        stmt.run(campaignId, input.name, input.ownerId, publicUrlId, now, now);

        return {
          id: campaignId,
          name: input.name,
          ownerId: input.ownerId,
          publicUrlId,
          publicAccessEnabled: false,
          publicPassword: null,
          lastPublishedAt: null,
          createdAt: new Date(now * 1000),
          updatedAt: new Date(now * 1000),
        };
      } catch (error: any) {
        if (
          error.code === 'SQLITE_CONSTRAINT_UNIQUE' &&
          error.message.includes('public_url_id') &&
          attempts < maxAttempts - 1
        ) {
          // Collision detected, retry with new ID
          attempts++;
          publicUrlId = generatePublicId();
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to generate unique public URL ID');
  }

  /**
   * Update campaign
   */
  static updateCampaign(id: string, input: UpdateCampaignInput): Campaign {
    const existing = this.getCampaignById(id);
    if (!existing) {
      throw new Error('Campaign not found');
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      values.push(input.name);
    }

    if (input.publicAccessEnabled !== undefined) {
      updates.push('public_access_enabled = ?');
      values.push(input.publicAccessEnabled ? 1 : 0);
    }

    if (input.publicPassword !== undefined) {
      updates.push('public_password = ?');
      values.push(input.publicPassword);
    }

    // Always update updated_at
    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);

    // Add id to values for WHERE clause
    values.push(id);

    const stmt = db.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getCampaignById(id)!;
  }

  /**
   * Delete campaign
   */
  static deleteCampaign(id: string): void {
    const stmt = db.prepare('DELETE FROM campaigns WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new Error('Campaign not found');
    }
  }

  /**
   * Check if user owns campaign
   */
  static isOwner(campaignId: string, userId: string): boolean {
    const campaign = this.getCampaignById(campaignId);
    return campaign ? campaign.ownerId === userId : false;
  }
}
