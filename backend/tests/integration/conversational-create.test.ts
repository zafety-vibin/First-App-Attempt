/**
 * Integration Test: Conversational Create Operations (Scenario 2)
 * Feature 018: Tests create workflow with validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import externalApiRoutes from '../../src/routes/external-api';

describe('Scenario 2: Conversational Create Operations', () => {
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

  it('should create faction and verify it exists', async () => {
    // Verify faction doesn't exist
    const before = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/factions`)
      .expect(200);

    const beforeCount = before.body.data.length;

    // Create faction
    const createResponse = await request(app)
      .post(`${BASE_URL}/campaigns/${campaignId}/database/factions`)
      .send({
        name: 'The Red Hand',
        description: 'A secretive thieves guild',
        faction_type: 'criminal_organization',
        power_level: 'regional',
        tags: ['thieves', 'underground']
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.id).toBeTruthy();
    expect(createResponse.body.data.name).toBe('The Red Hand');

    // Verify auto-populated fields
    expect(createResponse.body.data.created_at).toBeGreaterThan(1600000000);
    expect(createResponse.body.data.updated_at).toBe(createResponse.body.data.created_at);

    // Query again and verify faction exists
    const after = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/factions`)
      .expect(200);

    expect(after.body.data).toHaveLength(beforeCount + 1);
    const faction = after.body.data.find((f: any) => f.name === 'The Red Hand');
    expect(faction).toBeTruthy();
  });

  it('should return validation error for missing required field', async () => {
    const response = await request(app)
      .post(`${BASE_URL}/campaigns/${campaignId}/database/npcs`)
      .send({ description: 'No name provided' })
      .expect(400);

    expect(response.body.error.code).toBe('CONSTRAINT_VIOLATION');
    expect(response.body.error.message).toContain('name');
    expect(response.body.error.suggestion).toBeTruthy();
  });
});
