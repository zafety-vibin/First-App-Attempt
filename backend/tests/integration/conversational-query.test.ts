/**
 * Integration Test: Conversational Query Operations (Scenario 1)
 * Feature 018: Tests query workflow with filtering, pagination, sorting
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import externalApiRoutes from '../../src/routes/external-api';

describe('Scenario 1: Conversational Query Operations', () => {
  let app: express.Application;
  let campaignId: string;
  const BASE_URL = '/api/v1/external';

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(BASE_URL, externalApiRoutes);

    const { db } = await import('../../src/services/DatabaseService');
    campaignId = uuidv4();

    // Create test campaign
    db.prepare('INSERT INTO campaigns (id, owner_id, name, created_at, updated_at) VALUES (?, ?, ?, strftime(\'%s\', \'now\'), strftime(\'%s\', \'now\'))').run(campaignId, 'test-user', 'Test Campaign');

    // Create 8 test locations (2 taverns, 2 districts, 4 markets)
    const locations = [
      { name: 'The Rusty Anchor', location_type: 'tavern' },
      { name: 'Silver Tankard Inn', location_type: 'tavern' },
      { name: 'Merchant District', location_type: 'district' },
      { name: 'Docks District', location_type: 'district' },
      { name: 'Grand Bazaar', location_type: 'market' },
      { name: 'Night Market', location_type: 'market' },
      { name: 'Fish Market', location_type: 'market' },
      { name: 'Spice Market', location_type: 'market' },
    ];

    locations.forEach((loc) => {
      db.prepare(`
        INSERT INTO locations (id, campaign_id, name, location_type, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
      `).run(uuidv4(), campaignId, loc.name, loc.location_type);
    });
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  });

  it('should query all locations', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations`)
      .expect(200);

    expect(response.body.data).toHaveLength(8);
    expect(response.body.success).toBe(true);
  });

  it('should filter by location_type', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations`)
      .query({ filter: JSON.stringify({ location_type: 'tavern' }) })
      .expect(200);

    expect(response.body.data).toHaveLength(2);
  });

  it('should search by name', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations`)
      .query({ search: 'Rusty' })
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('The Rusty Anchor');
  });

  it('should paginate results', async () => {
    const page1 = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations`)
      .query({ limit: 5, page: 1 })
      .expect(200);

    expect(page1.body.data).toHaveLength(5);
    expect(page1.body.pagination.page).toBe(1);
    expect(page1.body.pagination.total).toBe(8);
    expect(page1.body.pagination.total_pages).toBe(2);

    const page2 = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations`)
      .query({ limit: 5, page: 2 })
      .expect(200);

    expect(page2.body.data).toHaveLength(3);
    expect(page2.body.pagination.page).toBe(2);
  });

  it('should sort results', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations`)
      .query({ sort: 'name' })
      .expect(200);

    const names = response.body.data.map((loc: any) => loc.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('should filter with X-View-Mode header', async () => {
    // Create one dm_only location
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare(`
      INSERT INTO locations (id, campaign_id, name, player_knowledge, created_at, updated_at, tags, custom_fields, notable_npcs, factions_present, connected_locations)
      VALUES (?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]')
    `).run(uuidv4(), campaignId, 'Secret Location', 'dm_only');

    const dmView = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations`)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    expect(dmView.body.data).toHaveLength(9); // 8 + 1 dm_only

    const playerView = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/database/locations`)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(playerView.body.data).toHaveLength(8); // dm_only filtered out
  });
});
