/**
 * Integration Test: Portal Enable → Player Access with Password
 * Feature 009: Player Question Portal
 * T013: Test password verification flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { PortalConfigService } from '../../src/services/PortalConfigService';
import { PortalPlayerService } from '../../src/services/PortalPlayerService';

describe('Portal Enable → Password Flow Integration', () => {
  let db: Database.Database;
  let configService: PortalConfigService;
  let playerService: PortalPlayerService;

  beforeEach(() => {
    // This test will FAIL until services are implemented
    db = new Database(':memory:');
    // TODO: Run migrations
    configService = new PortalConfigService(db);
    playerService = new PortalPlayerService(db);
  });

  it('should enable portal and set password', async () => {
    await configService.enable('campaign-1');
    await configService.setPassword('campaign-1', 'dragonborn');

    const config = await configService.getConfig('campaign-1');
    expect(config.enabled).toBe(true);
    expect(config.passwordHash).toBeDefined();
  });

  it('should allow access with correct password', async () => {
    await configService.enable('campaign-1');
    await configService.setPassword('campaign-1', 'secret123');

    const isValid = await configService.verifyPassword('campaign-1', 'secret123');
    expect(isValid).toBe(true);
  });

  it('should deny access with incorrect password', async () => {
    await configService.enable('campaign-1');
    await configService.setPassword('campaign-1', 'secret123');

    const isValid = await configService.verifyPassword('campaign-1', 'wrong-password');
    expect(isValid).toBe(false);
  });

  it('should allow player identity after password verification', async () => {
    await configService.enable('campaign-1');
    await configService.setPassword('campaign-1', 'secret123');

    const passwordValid = await configService.verifyPassword('campaign-1', 'secret123');
    expect(passwordValid).toBe(true);

    // If password valid, allow identity creation
    const result = await playerService.identifyPlayer('campaign-1', 'TestPlayer');
    expect(result.player.characterName).toBe('TestPlayer');
  });

  it('should allow disabling password protection', async () => {
    await configService.enable('campaign-1');
    await configService.setPassword('campaign-1', 'secret123');
    await configService.setPassword('campaign-1', null);

    const config = await configService.getConfig('campaign-1');
    expect(config.passwordHash).toBeNull();
  });
});
