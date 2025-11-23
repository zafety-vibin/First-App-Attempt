/**
 * PortalConfigService
 * Feature 009: Player Question Portal
 *
 * Manages portal configuration per campaign (enable/disable, password, response style)
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import { PortalConfig, ResponseStyle } from '../models/PortalConfig';

export class PortalConfigService {
  constructor(private db: Database.Database) {}

  /**
   * T017: Get portal configuration for campaign
   */
  getConfig(campaignId: string): PortalConfig | null {
    const row = this.db
      .prepare(
        `SELECT id, campaign_id as campaignId, enabled, password_hash as passwordHash,
         response_style as responseStyle, custom_system_prompt as customSystemPrompt,
         created_at as createdAt, updated_at as updatedAt
         FROM portal_configs
         WHERE campaign_id = ?`
      )
      .get(campaignId) as any;

    if (!row) return null;

    return {
      ...row,
      enabled: Boolean(row.enabled),
    };
  }

  /**
   * T017: Create portal configuration for campaign
   */
  create(campaignId: string): PortalConfig {
    const now = Date.now();
    const id = randomUUID();

    this.db
      .prepare(
        `INSERT INTO portal_configs
         (id, campaign_id, enabled, password_hash, response_style, custom_system_prompt, created_at, updated_at)
         VALUES (?, ?, 0, NULL, 'friendly-sage', NULL, ?, ?)`
      )
      .run(id, campaignId, now, now);

    return this.getConfig(campaignId)!;
  }

  /**
   * T017: Get or create portal configuration
   */
  getOrCreate(campaignId: string): PortalConfig {
    const existing = this.getConfig(campaignId);
    if (existing) return existing;
    return this.create(campaignId);
  }

  /**
   * T017: Enable portal
   */
  enable(campaignId: string): void {
    const config = this.getOrCreate(campaignId);
    this.db
      .prepare(
        `UPDATE portal_configs
         SET enabled = 1, updated_at = ?
         WHERE campaign_id = ?`
      )
      .run(Date.now(), campaignId);
  }

  /**
   * T017: Disable portal
   */
  disable(campaignId: string): void {
    this.db
      .prepare(
        `UPDATE portal_configs
         SET enabled = 0, updated_at = ?
         WHERE campaign_id = ?`
      )
      .run(Date.now(), campaignId);
  }

  /**
   * T018: Set password with bcrypt hashing
   * @param password - Plaintext password or null to remove protection
   */
  async setPassword(campaignId: string, password: string | null): Promise<void> {
    const config = this.getOrCreate(campaignId);

    if (password === null) {
      // Remove password protection
      this.db
        .prepare(
          `UPDATE portal_configs
           SET password_hash = NULL, updated_at = ?
           WHERE campaign_id = ?`
        )
        .run(Date.now(), campaignId);
    } else {
      // Hash password with bcrypt (10 salt rounds)
      const passwordHash = await bcrypt.hash(password, 10);
      this.db
        .prepare(
          `UPDATE portal_configs
           SET password_hash = ?, updated_at = ?
           WHERE campaign_id = ?`
        )
        .run(passwordHash, Date.now(), campaignId);
    }
  }

  /**
   * T018: Verify password
   * @returns true if password matches or no password set
   */
  async verifyPassword(campaignId: string, password: string): Promise<boolean> {
    const config = this.getConfig(campaignId);

    // No config or no password hash = no password protection
    if (!config || !config.passwordHash) {
      return true;
    }

    // Compare password with bcrypt hash
    return await bcrypt.compare(password, config.passwordHash);
  }

  /**
   * T019: Set response style
   */
  setResponseStyle(
    campaignId: string,
    responseStyle: ResponseStyle,
    customSystemPrompt?: string | null
  ): void {
    const config = this.getOrCreate(campaignId);

    // Validate custom prompt required for 'custom' style
    if (responseStyle === 'custom' && !customSystemPrompt) {
      throw new Error('customSystemPrompt required when responseStyle is "custom"');
    }

    this.db
      .prepare(
        `UPDATE portal_configs
         SET response_style = ?, custom_system_prompt = ?, updated_at = ?
         WHERE campaign_id = ?`
      )
      .run(
        responseStyle,
        responseStyle === 'custom' ? customSystemPrompt : null,
        Date.now(),
        campaignId
      );
  }

  /**
   * T017: Update portal configuration
   */
  update(campaignId: string, updates: Partial<PortalConfig>): PortalConfig {
    const config = this.getOrCreate(campaignId);
    const now = Date.now();

    // Build dynamic UPDATE query
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.enabled !== undefined) {
      fields.push('enabled = ?');
      values.push(updates.enabled ? 1 : 0);
    }

    if (updates.responseStyle !== undefined) {
      fields.push('response_style = ?');
      values.push(updates.responseStyle);
    }

    if (updates.customSystemPrompt !== undefined) {
      fields.push('custom_system_prompt = ?');
      values.push(updates.customSystemPrompt);
    }

    if (fields.length === 0) {
      return config;
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(campaignId);

    const query = `UPDATE portal_configs SET ${fields.join(', ')} WHERE campaign_id = ?`;
    this.db.prepare(query).run(...values);

    return this.getConfig(campaignId)!;
  }
}
