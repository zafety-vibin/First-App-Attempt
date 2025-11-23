/**
 * Unit Test: PortalPlayerService - Unique Character Name Validation
 * Feature 009: Player Question Portal
 * T009: Test UNIQUE(campaign_id, character_name) rejects duplicates
 */

import { describe, it, expect } from 'vitest';
import { PortalPlayerService } from '../../src/services/PortalPlayerService';

describe('PortalPlayerService - Unique Name Validation', () => {
  it('should reject duplicate character names in same campaign', async () => {
    // This test will FAIL until PortalPlayerService is implemented
    const service = new PortalPlayerService(null as any);

    // First player succeeds
    await service.identifyPlayer('campaign-123', 'Gandalf');

    // Second player with same name should fail
    await expect(
      service.identifyPlayer('campaign-123', 'Gandalf')
    ).rejects.toThrow('Character name already in use');
  });

  it('should allow same character name in different campaigns', async () => {
    const service = new PortalPlayerService(null as any);

    const result1 = await service.identifyPlayer('campaign-123', 'Gandalf');
    const result2 = await service.identifyPlayer('campaign-456', 'Gandalf');

    expect(result1.player.characterName).toBe('Gandalf');
    expect(result2.player.characterName).toBe('Gandalf');
    expect(result1.player.id).not.toBe(result2.player.id);
  });

  it('should return clear error message for duplicate names', async () => {
    const service = new PortalPlayerService(null as any);

    await service.identifyPlayer('campaign-123', 'Frodo');

    await expect(
      service.identifyPlayer('campaign-123', 'Frodo')
    ).rejects.toThrow('Character name already in use. Please choose a different name.');
  });
});
