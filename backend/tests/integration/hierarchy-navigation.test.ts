/**
 * Integration Test: Hierarchy Navigation (Scenario 4)
 * Feature 018: Tests parent-child relationship traversal with depth
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import externalApiRoutes from '../../src/routes/external-api';

describe('Scenario 4: Hierarchy Navigation', () => {
  let app: express.Application;
  let campaignId: string;
  let cityId: string;
  let docksId: string;
  const BASE_URL = '/api/v1/external';

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(BASE_URL, externalApiRoutes);

    const { db } = await import('../../src/services/DatabaseService');
    campaignId = uuidv4();

    db.prepare('INSERT INTO campaigns (id, owner_id, name, created_at, updated_at) VALUES (?, ?, ?, strftime(\'%s\', \'now\'), strftime(\'%s\', \'now\'))').run(campaignId, 'test-user', 'Test Campaign');

    // Create hierarchy: City → District → Tavern
    cityId = uuidv4();
    docksId = uuidv4();
    const tavernId = uuidv4();

    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, location_type, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Greyhaven', 'city', strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(cityId, campaignId);

    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, location_type, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'Docks District', 'district', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(docksId, campaignId, cityId);

    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, location_type, parent_location_id, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, 'The Rusty Anchor', 'tavern', ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(tavernId, campaignId, docksId);
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  });

  it('should get direct children (depth=1)', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations/${cityId}/children`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.parent.name).toBe('Greyhaven');
    expect(response.body.data.children).toHaveLength(1);
    expect(response.body.data.children[0].name).toBe('Docks District');
    expect(response.body.data.depth).toBe(1);
  });

  it('should traverse multiple levels (depth=2)', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations/${cityId}/children`)
      .query({ depth: 2 })
      .expect(200);

    expect(response.body.data.depth).toBe(2);
    expect(response.body.data.children[0].children).toBeDefined();
    expect(response.body.data.children[0].children).toHaveLength(1);
    expect(response.body.data.children[0].children[0].name).toBe('The Rusty Anchor');
  });
});
