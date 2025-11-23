/**
 * Integration Test: Player Identity with Crypto Token Persistence
 * Feature 009: Player Question Portal
 * T014: Test sessionToken lookup works
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { PortalPlayerService } from '../../src/services/PortalPlayerService';
import { PortalConversationService } from '../../src/services/PortalConversationService';

describe('Player Identity Token Persistence Integration', () => {
  let db: Database.Database;
  let playerService: PortalPlayerService;
  let conversationService: PortalConversationService;

  beforeEach(() => {
    // This test will FAIL until services are implemented
    db = new Database(':memory:');
    // TODO: Run migrations
    playerService = new PortalPlayerService(db);
    conversationService = new PortalConversationService(db);
  });

  it('should create player with session token', async () => {
    const result = await playerService.identifyPlayer('campaign-1', 'Aragorn');

    expect(result.player.id).toBeDefined();
    expect(result.sessionToken).toHaveLength(64);
    expect(result.player.sessionToken).toBe(result.sessionToken);
  });

  it('should retrieve player by session token', async () => {
    const { sessionToken } = await playerService.identifyPlayer('campaign-1', 'Legolas');

    const player = await playerService.getPlayerByToken(sessionToken);

    expect(player).toBeDefined();
    expect(player?.characterName).toBe('Legolas');
    expect(player?.campaignId).toBe('campaign-1');
  });

  it('should persist session token across multiple lookups', async () => {
    const { sessionToken } = await playerService.identifyPlayer('campaign-1', 'Gimli');

    const lookup1 = await playerService.getPlayerByToken(sessionToken);
    const lookup2 = await playerService.getPlayerByToken(sessionToken);

    expect(lookup1?.id).toBe(lookup2?.id);
    expect(lookup1?.sessionToken).toBe(sessionToken);
  });

  it('should create conversation for player on identity', async () => {
    const { player } = await playerService.identifyPlayer('campaign-1', 'Frodo');

    const conversation = await conversationService.getOrCreateByPlayer(player.id);

    expect(conversation.playerId).toBe(player.id);
    expect(conversation.campaignId).toBe('campaign-1');
  });

  it('should return null for invalid session token', async () => {
    const player = await playerService.getPlayerByToken('invalid-token-12345');

    expect(player).toBeNull();
  });
});
