/**
 * Integration Test: Session Recap Timeline Queries (Scenario 5)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import externalApiRoutes from '../../src/routes/external-api';

describe('Scenario 5: Session Recap Timeline Queries', () => {
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

    // Create 5 session recaps
    for (let i = 1; i <= 5; i++) {
      db.prepare(`
        INSERT INTO session_recaps (id, campaign_id, name, session_number, summary, created_at, updated_at, tags, custom_fields, npcs_encountered, locations_visited, quests_progressed, loot_acquired)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'), '[]', '{}', '[]', '[]', '[]', '[]')
      `).run(uuidv4(), campaignId, `Session ${i}`, i, i === 2 || i === 4 ? 'Dragon of Ash Peak battle' : 'Regular session');
    }
  });

  afterAll(async () => {
    const { db } = await import('../../src/services/DatabaseService');
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  });

  it('should query last 3 sessions', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/recaps`)
      .query({ limit: 3 })
      .expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(response.body.pagination.limit).toBe(3);

    // Should be in descending order (5, 4, 3)
    expect(response.body.data[0].session_number).toBe(5);
    expect(response.body.data[1].session_number).toBe(4);
    expect(response.body.data[2].session_number).toBe(3);
  });

  it('should search by content', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/recaps`)
      .query({ search: 'Dragon of Ash Peak' })
      .expect(200);

    expect(response.body.data).toHaveLength(2); // Sessions 2 and 4
    const sessionNumbers = response.body.data.map((r: any) => r.session_number).sort();
    expect(sessionNumbers).toEqual([2, 4]);
  });

  it('should filter by session range', async () => {
    const response = await request(app)
      .get(`${BASE_URL}/campaigns/${campaignId}/recaps`)
      .query({ start_session: 2, end_session: 4 })
      .expect(200);

    expect(response.body.data).toHaveLength(3); // Sessions 2, 3, 4
    const sessionNumbers = response.body.data.map((r: any) => r.session_number).sort();
    expect(sessionNumbers).toEqual([2, 3, 4]);
  });
});
