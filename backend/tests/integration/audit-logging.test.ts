/**
 * Integration Test: Audit Logging Verification (Scenario 8)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import externalApiRoutes from '../../src/routes/external-api';

describe('Scenario 8: Audit Logging', () => {
  let app: express.Application;
  let campaignId: string;
  const BASE_URL = '/api/v1/external';

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(BASE_URL, externalApiRoutes);

    const { db } = await import('../../src/services/DatabaseService');
    campaignId = uuidv4();

    db.prepare('INSERT INTO campaigns (id, owner_id, name, created_at, updated_at) VALUES (?, ?, ?, strftime(\'%s\', \'now\'), strftime(\'%s\', \'now\'))').run(campaignId, 'test-user', 'Test Campaign');
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  });

  it('should log all operations to api_requests table', async () => {
    const { db } = await import('../../src/services/DatabaseService');

    // Execute operations
    await request(app).get(`${BASE_URL}/campaigns/${campaignId}/database/locations`);
    await request(app).post(`${BASE_URL}/campaigns/${campaignId}/database/factions`).send({ name: 'Test Faction' });
    await request(app).get(`${BASE_URL}/campaigns/${campaignId}/recaps`);

    // Query audit logs
    const logs = db.prepare('SELECT * FROM api_requests WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 3').all(campaignId);

    expect((logs as any[]).length).toBeGreaterThanOrEqual(3);

    // Verify log structure
    (logs as any[]).forEach((log: any) => {
      expect(log.operation_type).toBeTruthy();
      expect(log.result_status).toBe('success');
      expect(log.execution_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
