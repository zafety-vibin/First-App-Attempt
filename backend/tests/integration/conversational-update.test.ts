/**
 * Integration Test: Conversational Update Operations (Scenario 3)
 * Feature 018: Tests update workflow with partial updates and timestamp refresh
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import externalApiRoutes from '../../src/routes/external-api';

describe('Scenario 3: Conversational Update Operations', () => {
  let app: express.Application;
  let campaignId: string;
  let npcId: string;
  const BASE_URL = '/api/v1/external';

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(BASE_URL, externalApiRoutes);

    const { db } = await import('../../src/services/DatabaseService');
    campaignId = uuidv4();

    db.prepare('INSERT INTO campaigns (id, owner_id, name, created_at, updated_at) VALUES (?, ?, ?, strftime(\'%s\', \'now\'), strftime(\'%s\', \'now\'))').run(campaignId, 'test-user', 'Test Campaign');

    // Create test NPC
    const response = await request(app)
      .post(`${BASE_URL}/campaigns/${campaignId}/database/npcs`)
      .send({ name: 'Sir Gareth', description: 'A noble knight', alignment: 'Lawful Good' });

    npcId = response.body.data.id;
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  });

  it('should update NPC and refresh updated_at timestamp', async () => {
    // Get original NPC
    const before = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/npcs`)
      .query({ filter: JSON.stringify({ id: npcId }) });

    const originalUpdatedAt = before.body.data[0].updated_at;

    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update NPC
    const updateResponse = await request(app)
      .patch(`${BASE_URL}/campaigns/${campaignId}/database/npcs/${npcId}`)
      .send({
        description: 'A fallen knight corrupted by dark magic',
        alignment: 'Chaotic Evil',
        tags: ['corrupted', 'antagonist']
      })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data.description).toBe('A fallen knight corrupted by dark magic');
    expect(updateResponse.body.data.alignment).toBe('Chaotic Evil');
    expect(updateResponse.body.data.updated_at).toBeGreaterThan(originalUpdatedAt);

    // Other fields should remain unchanged
    expect(updateResponse.body.data.name).toBe('Sir Gareth');
  });

  it('should support partial updates', async () => {
    const response = await request(app)
      .patch(`${BASE_URL}/campaigns/${campaignId}/database/npcs/${npcId}`)
      .send({ description: 'Partially updated' })
      .expect(200);

    expect(response.body.data.description).toBe('Partially updated');
    expect(response.body.data.name).toBe('Sir Gareth'); // Unchanged
  });
});
