/**
 * Unit Test: PortalTokenTrackerService
 * Feature 009: Player Question Portal
 * T012: Test SQL SUM queries for per-player totals per research.md Topic 5
 */

import { describe, it, expect } from 'vitest';
import { PortalTokenTrackerService } from '../../src/services/PortalTokenTrackerService';

describe('PortalTokenTrackerService', () => {
  it('should record token usage per message', async () => {
    // This test will FAIL until PortalTokenTrackerService is implemented
    const service = new PortalTokenTrackerService(null as any);

    await service.record('player-1', 'campaign-1', 'message-1', 150);

    const usage = await service.getPlayerUsage('player-1');
    expect(usage).toBe(150);
  });

  it('should aggregate token usage per player (SQL SUM)', async () => {
    const service = new PortalTokenTrackerService(null as any);

    await service.record('player-1', 'campaign-1', 'message-1', 100);
    await service.record('player-1', 'campaign-1', 'message-2', 200);
    await service.record('player-1', 'campaign-1', 'message-3', 50);

    const total = await service.getPlayerUsage('player-1');
    expect(total).toBe(350); // SUM(100, 200, 50)
  });

  it('should aggregate token usage per campaign', async () => {
    const service = new PortalTokenTrackerService(null as any);

    await service.record('player-1', 'campaign-1', 'message-1', 100);
    await service.record('player-2', 'campaign-1', 'message-2', 200);

    const total = await service.getCampaignUsage('campaign-1');
    expect(total).toBe(300); // SUM(100, 200)
  });

  it('should get per-player breakdown for monitoring panel', async () => {
    const service = new PortalTokenTrackerService(null as any);

    await service.record('player-1', 'campaign-1', 'message-1', 100);
    await service.record('player-2', 'campaign-1', 'message-2', 200);

    const breakdown = await service.getPerPlayerUsage('campaign-1');

    expect(breakdown).toHaveLength(2);
    expect(breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerName: expect.any(String), tokenCount: 100 }),
        expect.objectContaining({ playerName: expect.any(String), tokenCount: 200 }),
      ])
    );
  });

  it('should isolate usage between campaigns', async () => {
    const service = new PortalTokenTrackerService(null as any);

    await service.record('player-1', 'campaign-1', 'message-1', 100);
    await service.record('player-1', 'campaign-2', 'message-2', 200);

    const campaign1Usage = await service.getCampaignUsage('campaign-1');
    const campaign2Usage = await service.getCampaignUsage('campaign-2');

    expect(campaign1Usage).toBe(100);
    expect(campaign2Usage).toBe(200);
  });
});
