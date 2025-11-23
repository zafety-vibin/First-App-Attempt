/**
 * Unit Test: PortalConfigService - Bcrypt Password Hashing
 * Feature 009: Player Question Portal
 * T010: Test setPassword hashes, verifyPassword compares
 */

import { describe, it, expect } from 'vitest';
import { PortalConfigService } from '../../src/services/PortalConfigService';

describe('PortalConfigService - Password Management', () => {
  it('should hash password with bcrypt', async () => {
    // This test will FAIL until PortalConfigService is implemented
    const service = new PortalConfigService(null as any);

    await service.setPassword('campaign-123', 'my-secret-password');

    const config = await service.getConfig('campaign-123');
    expect(config.passwordHash).toBeDefined();
    expect(config.passwordHash).not.toBe('my-secret-password'); // Should be hashed
    expect(config.passwordHash?.length).toBeGreaterThan(50); // bcrypt produces ~60 chars
  });

  it('should verify correct password', async () => {
    const service = new PortalConfigService(null as any);

    await service.setPassword('campaign-123', 'correct-password');
    const isValid = await service.verifyPassword('campaign-123', 'correct-password');

    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const service = new PortalConfigService(null as any);

    await service.setPassword('campaign-123', 'correct-password');
    const isValid = await service.verifyPassword('campaign-123', 'wrong-password');

    expect(isValid).toBe(false);
  });

  it('should allow removing password protection', async () => {
    const service = new PortalConfigService(null as any);

    await service.setPassword('campaign-123', 'some-password');
    await service.setPassword('campaign-123', null);

    const config = await service.getConfig('campaign-123');
    expect(config.passwordHash).toBeNull();
  });

  it('should return true when no password is set', async () => {
    const service = new PortalConfigService(null as any);

    const isValid = await service.verifyPassword('campaign-123', 'any-password');

    expect(isValid).toBe(true); // No password protection = always valid
  });
});
