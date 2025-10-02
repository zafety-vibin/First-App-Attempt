/**
 * Campaign model - Represents a TTRPG campaign workspace
 * Based on: specs/002-create-the-authentication/data-model.md
 */

import { Campaign, CampaignRow } from '../../shared/types/Campaign';

/**
 * Transform database row to Campaign entity
 */
export function rowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    settingId: row.setting_id,
    publicUrlId: row.public_url_id,
    publicAccessEnabled: row.public_access_enabled === 1,
    publicPassword: row.public_password,
    lastPublishedAt: row.last_published_at ? new Date(row.last_published_at * 1000) : null,
    createdAt: new Date(row.created_at * 1000),
    updatedAt: new Date(row.updated_at * 1000),
  };
}

/**
 * Transform Campaign entity to database row
 */
export function campaignToRow(campaign: Partial<Campaign>): Partial<CampaignRow> {
  const row: Partial<CampaignRow> = {};

  if (campaign.id !== undefined) row.id = campaign.id;
  if (campaign.name !== undefined) row.name = campaign.name;
  if (campaign.ownerId !== undefined) row.owner_id = campaign.ownerId;
  if (campaign.settingId !== undefined) row.setting_id = campaign.settingId;
  if (campaign.publicUrlId !== undefined) row.public_url_id = campaign.publicUrlId;
  if (campaign.publicAccessEnabled !== undefined)
    row.public_access_enabled = campaign.publicAccessEnabled ? 1 : 0;
  if (campaign.publicPassword !== undefined) row.public_password = campaign.publicPassword;
  if (campaign.lastPublishedAt !== undefined)
    row.last_published_at = campaign.lastPublishedAt
      ? Math.floor(campaign.lastPublishedAt.getTime() / 1000)
      : null;
  if (campaign.createdAt !== undefined)
    row.created_at = Math.floor(campaign.createdAt.getTime() / 1000);
  if (campaign.updatedAt !== undefined)
    row.updated_at = Math.floor(campaign.updatedAt.getTime() / 1000);

  return row;
}
