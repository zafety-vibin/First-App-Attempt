/**
 * Integration Test - MCP Permission Filtering
 * Verifies campaign ownership and information level filtering
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../src/services/DatabaseService';
import { withPermissions } from '../../src/mcp/middleware/permissions';

describe('MCP Permissions Integration Test', () => {
  let campaignId1: string;
  let campaignId2: string;
  let cardIds: number[] = [];
  let infoLevelIds: number[] = [];

  beforeAll(() => {
    // Create test campaigns with different owners
    campaignId1 = 'test-campaign-perm-1-' + Date.now();
    campaignId2 = 'test-campaign-perm-2-' + Date.now();

    db.prepare(`
      INSERT INTO campaigns (id, name, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(campaignId1, 'User1 Campaign', 'user1', Date.now(), Date.now());

    db.prepare(`
      INSERT INTO campaigns (id, name, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(campaignId2, 'User2 Campaign', 'user2', Date.now(), Date.now());

    // Create information levels for campaign 1
    const levels = [
      { name: 'Common Knowledge', hierarchy_level: 0 },
      { name: 'Player Knowledge', hierarchy_level: 1 },
      { name: 'Hidden Knowledge', hierarchy_level: 2 },
      { name: 'DM Secret', hierarchy_level: 3 }
    ];

    for (const level of levels) {
      const result = db.prepare(`
        INSERT INTO information_levels (campaign_id, name, description, hierarchy_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(campaignId1, level.name, `${level.name} description`, level.hierarchy_level, Date.now(), Date.now());
      infoLevelIds.push(result.lastInsertRowid as number);
    }

    // Create cards with different information levels
    const cards = [
      { title: 'Public NPC', info_level_id: infoLevelIds[0] }, // Common Knowledge
      { title: 'Player Quest', info_level_id: infoLevelIds[1] }, // Player Knowledge
      { title: 'Hidden Plot', info_level_id: infoLevelIds[2] }, // Hidden Knowledge
      { title: 'Secret Boss', info_level_id: infoLevelIds[3] }  // DM Secret
    ];

    for (const card of cards) {
      const result = db.prepare(`
        INSERT INTO cards (campaign_id, title, type, content, information_level_id, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        campaignId1,
        card.title,
        'text',
        JSON.stringify({ text: `Content for ${card.title}` }),
        card.info_level_id,
        0,
        Date.now(),
        Date.now()
      );
      cardIds.push(result.lastInsertRowid as number);
    }
  });

  afterAll(() => {
    // Clean up test data
    db.prepare('DELETE FROM cards WHERE campaign_id IN (?, ?)').run(campaignId1, campaignId2);
    db.prepare('DELETE FROM information_levels WHERE campaign_id = ?').run(campaignId1);
    db.prepare('DELETE FROM campaigns WHERE id IN (?, ?)').run(campaignId1, campaignId2);
  });

  it('should deny access to campaigns not owned by user', async () => {
    // Create a mock handler
    const mockHandler = async (params: any, context: any) => {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true })
        }]
      };
    };

    // Wrap with permissions
    const protectedHandler = withPermissions(mockHandler, {
      requireCampaignOwnership: true
    });

    // User1 accessing their own campaign - should succeed
    const result1 = await protectedHandler(
      { campaign_id: campaignId1 },
      { userId: 'user1' }
    );
    expect(result1.isError).toBeUndefined();

    // User1 accessing User2's campaign - should fail
    const result2 = await protectedHandler(
      { campaign_id: campaignId2 },
      { userId: 'user1' }
    );
    expect(result2.isError).toBe(true);
    const error = JSON.parse(result2.content[0].text);
    expect(error.error).toBe('PERMISSION_DENIED');

    // System context should have access to all campaigns
    const result3 = await protectedHandler(
      { campaign_id: campaignId2 },
      { userId: 'system' }
    );
    expect(result3.isError).toBeUndefined();
  });

  it('should filter cards based on view mode (DM vs Player)', async () => {
    // Create a mock handler that returns cards
    const mockCardHandler = async (params: any, context: any) => {
      const cards = db.prepare(`
        SELECT c.*, il.hierarchy_level
        FROM cards c
        LEFT JOIN information_levels il ON c.information_level_id = il.id
        WHERE c.campaign_id = ?
      `).all(params.campaign_id) as any[];

      // Apply filtering if context has filter function
      const filteredCards = context.informationLevelFilter
        ? cards.filter((c: any) => context.informationLevelFilter(c.hierarchy_level))
        : cards;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ cards: filteredCards })
        }]
      };
    };

    // Test DM mode (all cards visible)
    const dmHandler = withPermissions(mockCardHandler, {
      requireCampaignOwnership: false,
      applyInformationFiltering: true,
      viewMode: 'dm'
    });

    const dmResult = await dmHandler(
      { campaign_id: campaignId1 },
      { userId: 'user1' }
    );

    const dmData = JSON.parse(dmResult.content[0].text);
    expect(dmData.cards).toHaveLength(4); // All 4 cards visible

    // Test Player mode (only hierarchy_level <= 1)
    const playerHandler = withPermissions(mockCardHandler, {
      requireCampaignOwnership: false,
      applyInformationFiltering: true,
      viewMode: 'player'
    });

    const playerResult = await playerHandler(
      { campaign_id: campaignId1 },
      { userId: 'user1' }
    );

    const playerData = JSON.parse(playerResult.content[0].text);
    expect(playerData.cards).toHaveLength(2); // Only Common and Player Knowledge

    // Verify the filtered cards are the correct ones
    const visibleTitles = playerData.cards.map((c: any) => c.title);
    expect(visibleTitles).toContain('Public NPC');
    expect(visibleTitles).toContain('Player Quest');
    expect(visibleTitles).not.toContain('Hidden Plot');
    expect(visibleTitles).not.toContain('Secret Boss');
  });

  it('should handle missing campaign gracefully', async () => {
    const mockHandler = async (params: any, context: any) => {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true })
        }]
      };
    };

    const protectedHandler = withPermissions(mockHandler, {
      requireCampaignOwnership: true
    });

    const result = await protectedHandler(
      { campaign_id: 'non-existent-campaign' },
      { userId: 'user1' }
    );

    expect(result.isError).toBe(true);
    const error = JSON.parse(result.content[0].text);
    expect(error.error).toBe('CAMPAIGN_NOT_FOUND');
  });

  it('should allow handlers without campaign_id parameter', async () => {
    const mockHandler = async (params: any, context: any) => {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ global: true })
        }]
      };
    };

    const protectedHandler = withPermissions(mockHandler, {
      requireCampaignOwnership: true
    });

    // Should not fail if campaign_id is not in params
    const result = await protectedHandler(
      { some_other_param: 'value' },
      { userId: 'user1' }
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.global).toBe(true);
  });
});