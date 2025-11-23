/**
 * Unit Test: PortalPlayerService - Crypto Token Generation
 * Feature 009: Player Question Portal
 * T008: Test sessionToken is 64-char hex per research.md Topic 1
 */

import { describe, it, expect } from 'vitest';
import { PortalPlayerService } from '../../src/services/PortalPlayerService';

describe('PortalPlayerService - Crypto Token Generation', () => {
  it('should generate 64-character hex session token', async () => {
    // This test will FAIL until PortalPlayerService is implemented
    const service = new PortalPlayerService(null as any);
    const result = await service.identifyPlayer('campaign-123', 'TestCharacter');

    expect(result.sessionToken).toBeDefined();
    expect(result.sessionToken).toHaveLength(64);
    expect(result.sessionToken).toMatch(/^[0-9a-f]{64}$/); // Hex format
  });

  it('should generate unique tokens for different players', async () => {
    const service = new PortalPlayerService(null as any);
    const result1 = await service.identifyPlayer('campaign-123', 'Player1');
    const result2 = await service.identifyPlayer('campaign-123', 'Player2');

    expect(result1.sessionToken).not.toBe(result2.sessionToken);
  });

  it('should use crypto.randomBytes(32) pattern', async () => {
    const service = new PortalPlayerService(null as any);
    const result = await service.identifyPlayer('campaign-123', 'TestPlayer');

    // 32 bytes = 64 hex characters
    expect(result.sessionToken).toHaveLength(64);
  });
});
