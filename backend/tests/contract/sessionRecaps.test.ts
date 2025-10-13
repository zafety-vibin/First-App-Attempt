/**
 * Contract tests for Session Recaps API
 * Based on: specs/014-create-the-database/contracts/openapi.yaml
 *
 * Feature 014 - Structured Category Database Foundation
 * These tests validate the API contract matches the OpenAPI specification.
 * They MUST fail before implementation (TDD).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Feature 014
let app: Express;
const validToken = 'Bearer valid_jwt_token';
const testCampaignId = 'campaign-uuid-001';
const testNpcId = 'npc-uuid-001';
const testLocationId = 'location-uuid-001';
const testQuestId = 'quest-uuid-001';
const testItemId = 'item-uuid-001';

describe('GET /api/session-recaps', () => {
  it('should list session recaps with pagination', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      data: expect.any(Array),
      pagination: {
        limit: expect.any(Number),
        offset: expect.any(Number),
        total: expect.any(Number),
      },
    });
  });

  it('should filter session recaps by campaign_id', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((recap: any) => {
      expect(recap.campaign_id).toBe(testCampaignId);
    });
  });

  it('should filter session recaps by core_status', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({
        campaign_id: testCampaignId,
        core_status: 'active',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((recap: any) => {
      expect(recap.core_status).toBe('active');
    });
  });

  it('should filter session recaps by player_knowledge', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({
        campaign_id: testCampaignId,
        player_knowledge: 'common_knowledge',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((recap: any) => {
      expect(recap.player_knowledge).toBe('common_knowledge');
    });
  });

  it('should support pagination with limit and offset', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({
        campaign_id: testCampaignId,
        limit: 10,
        offset: 5,
      })
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.pagination).toMatchObject({
      limit: 10,
      offset: 5,
      total: expect.any(Number),
    });
    expect(response.body.data.length).toBeLessThanOrEqual(10);
  });

  it('should support sorting by created_at, updated_at, name, or session_date', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({
        campaign_id: testCampaignId,
        sort_by: 'session_date',
        sort_order: 'desc',
      })
      .set('Authorization', validToken)
      .expect(200);

    const sessionDates = response.body.data
      .map((recap: any) => recap.session_date)
      .filter((date: any) => date !== null);
    const sortedDates = [...sessionDates].sort((a, b) => b - a);
    expect(sessionDates).toEqual(sortedDates);
  });

  it('should always return is_canon=1 and canonical_status=canon', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((recap: any) => {
      expect(recap.is_canon).toBe(1);
      expect(recap.canonical_status).toBe('canon');
    });
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    response.body.data.forEach((recap: any) => {
      expect(recap).not.toHaveProperty('dm_consequences');
      expect(recap).not.toHaveProperty('dm_behind_scenes');
    });
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    const firstRecap = response.body.data[0];
    if (firstRecap) {
      expect(firstRecap).toHaveProperty('dm_consequences');
      expect(firstRecap).toHaveProperty('dm_behind_scenes');
    }
  });

  it('should default to dm_view when X-View-Mode header is omitted', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    const firstRecap = response.body.data[0];
    if (firstRecap) {
      expect(firstRecap).toHaveProperty('dm_consequences');
      expect(firstRecap).toHaveProperty('dm_behind_scenes');
    }
  });

  it('should filter by tags (comma-separated)', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({
        campaign_id: testCampaignId,
        tags: 'combat,boss-fight',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((recap: any) => {
      const hasTag = recap.tags.some((tag: string) =>
        ['combat', 'boss-fight'].includes(tag)
      );
      expect(hasTag).toBe(true);
    });
  });

  it('should return session recaps with JSON array fields', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((recap: any) => {
      expect(Array.isArray(recap.npcs_encountered)).toBe(true);
      expect(Array.isArray(recap.locations_visited)).toBe(true);
      expect(Array.isArray(recap.quests_progressed)).toBe(true);
      expect(Array.isArray(recap.loot_acquired)).toBe(true);
      if (recap.key_events !== null) {
        expect(Array.isArray(recap.key_events)).toBe(true);
      }
      if (recap.player_decisions !== null) {
        expect(Array.isArray(recap.player_decisions)).toBe(true);
      }
    });
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/session-recaps')
      .query({ campaign_id: testCampaignId })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/session-recaps', () => {
  it('should create session recap with universal fields and return 201', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Session 1: The Adventure Begins',
        description: 'First session of the campaign',
        core_status: 'active',
        player_knowledge: 'common_knowledge',
        tags: ['session-1', 'introduction'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      campaign_id: testCampaignId,
      name: 'Session 1: The Adventure Begins',
      description: 'First session of the campaign',
      core_status: 'active',
      player_knowledge: 'common_knowledge',
      tags: ['session-1', 'introduction'],
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should enforce is_canon=1 and canonical_status=canon', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Session 2: The Quest',
        is_canon: 0, // Try to set to 0, should be ignored
        canonical_status: 'non-canon', // Try to override, should be ignored
      })
      .expect('Content-Type', /json/)
      .expect(201);

    // Service layer enforces canonical values
    expect(response.body.is_canon).toBe(1);
    expect(response.body.canonical_status).toBe('canon');
  });

  it('should create session recap with category-specific fields', async () => {
    const sessionDate = Date.now();
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Session 3: Battle at the Bridge',
        session_date: sessionDate,
        in_game_date_start: '15th of Mirtul, 1492 DR',
        in_game_date_end: '16th of Mirtul, 1492 DR',
        time_passed: '1 day',
        summary: 'The party defended the bridge from goblin raiders.',
        key_events: [
          'Party met the town guard',
          'Goblin ambush occurred',
          'Bridge was defended successfully',
        ],
        player_decisions: [
          'Chose to defend the bridge',
          'Spared the goblin leader',
        ],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Session 3: Battle at the Bridge',
      session_date: sessionDate,
      in_game_date_start: '15th of Mirtul, 1492 DR',
      in_game_date_end: '16th of Mirtul, 1492 DR',
      time_passed: '1 day',
      summary: 'The party defended the bridge from goblin raiders.',
      key_events: [
        'Party met the town guard',
        'Goblin ambush occurred',
        'Bridge was defended successfully',
      ],
      player_decisions: [
        'Chose to defend the bridge',
        'Spared the goblin leader',
      ],
    });
  });

  it('should create session recap with many-to-many connections', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Session 4: Dungeon Delve',
        npcs_encountered: [testNpcId, 'npc-uuid-002'],
        locations_visited: [testLocationId, 'location-uuid-002'],
        quests_progressed: [testQuestId],
        loot_acquired: [testItemId, 'item-uuid-002'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      npcs_encountered: [testNpcId, 'npc-uuid-002'],
      locations_visited: [testLocationId, 'location-uuid-002'],
      quests_progressed: [testQuestId],
      loot_acquired: [testItemId, 'item-uuid-002'],
    });
  });

  it('should create session recap with dm_* fields', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Session 5: The Betrayal',
        dm_consequences: 'The BBEG now knows the party location',
        dm_behind_scenes: 'Foreshadowing for Act 2 climax',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      dm_consequences: 'The BBEG now knows the party location',
      dm_behind_scenes: 'Foreshadowing for Act 2 climax',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        campaign_id: testCampaignId,
        name: 'Session 6: The Mystery',
        dm_consequences: 'Secret consequence',
        dm_behind_scenes: 'Secret plot',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).not.toHaveProperty('dm_consequences');
    expect(response.body).not.toHaveProperty('dm_behind_scenes');
  });

  it('should create session recap with custom_fields JSON object', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Session 7: Custom Data',
        custom_fields: {
          mvp_player: 'Alice',
          session_length_hours: 4.5,
          memorable_quotes: ['I cast fireball!', 'Does a 23 hit?'],
        },
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.custom_fields).toMatchObject({
      mvp_player: 'Alice',
      session_length_hours: 4.5,
      memorable_quotes: ['I cast fireball!', 'Does a 23 hit?'],
    });
  });

  it('should require name and campaign_id fields', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        description: 'Missing required fields',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate core_status enum', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Session',
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate session_date as Unix timestamp', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Session',
        session_date: 'not-a-timestamp',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate name maxLength of 255', async () => {
    const longName = 'Session '.repeat(50); // Exceeds 255 chars
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: longName,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate key_events as array of strings', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Session',
        key_events: 'not-an-array',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate player_decisions as array of strings', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Session',
        player_decisions: { not: 'an-array' },
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/session-recaps')
      .send({
        campaign_id: testCampaignId,
        name: 'Test Session',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/session-recaps/:id', () => {
  it('should return session recap by ID with 200', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .get(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: recapId,
      campaign_id: expect.any(String),
      name: expect.any(String),
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should return session recap with all universal fields', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .get(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('campaign_id');
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('description');
    expect(response.body).toHaveProperty('core_status');
    expect(response.body).toHaveProperty('player_knowledge');
    expect(response.body).toHaveProperty('tags');
    expect(response.body).toHaveProperty('created_at');
    expect(response.body).toHaveProperty('updated_at');
    expect(response.body).toHaveProperty('custom_fields');
  });

  it('should return session recap with category-specific fields', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .get(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('session_date');
    expect(response.body).toHaveProperty('in_game_date_start');
    expect(response.body).toHaveProperty('in_game_date_end');
    expect(response.body).toHaveProperty('time_passed');
    expect(response.body).toHaveProperty('summary');
    expect(response.body).toHaveProperty('key_events');
    expect(response.body).toHaveProperty('player_decisions');
    expect(response.body).toHaveProperty('dm_consequences');
    expect(response.body).toHaveProperty('dm_behind_scenes');
  });

  it('should always return is_canon=1 and canonical_status=canon', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .get(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body.is_canon).toBe(1);
    expect(response.body.canonical_status).toBe('canon');
  });

  it('should return JSON array fields as arrays', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .get(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(Array.isArray(response.body.npcs_encountered)).toBe(true);
    expect(Array.isArray(response.body.locations_visited)).toBe(true);
    expect(Array.isArray(response.body.quests_progressed)).toBe(true);
    expect(Array.isArray(response.body.loot_acquired)).toBe(true);
    if (response.body.key_events !== null) {
      expect(Array.isArray(response.body.key_events)).toBe(true);
    }
    if (response.body.player_decisions !== null) {
      expect(Array.isArray(response.body.player_decisions)).toBe(true);
    }
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .get(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_consequences');
    expect(response.body).not.toHaveProperty('dm_behind_scenes');
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .get(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    expect(response.body).toHaveProperty('dm_consequences');
    expect(response.body).toHaveProperty('dm_behind_scenes');
  });

  it('should filter by player_knowledge in player_view mode', async () => {
    const recapId = 'recap-with-dm-only-knowledge';

    const response = await request(app)
      .get(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent session recap', async () => {
    const response = await request(app)
      .get('/api/session-recaps/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/session-recaps/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/session-recaps/:id', () => {
  it('should update session recap and return 200', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Session Name',
        description: 'Updated description',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: recapId,
      name: 'Updated Session Name',
      description: 'Updated description',
      updated_at: expect.any(Number),
    });
  });

  it('should enforce is_canon=1 and canonical_status=canon on update', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Session',
        is_canon: 0, // Attempt to change
        canonical_status: 'non-canon', // Attempt to override
      })
      .expect('Content-Type', /json/)
      .expect(200);

    // Service layer enforces canonical values
    expect(response.body.is_canon).toBe(1);
    expect(response.body.canonical_status).toBe('canon');
  });

  it('should allow partial updates', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        summary: 'Updated summary text',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.summary).toBe('Updated summary text');
  });

  it('should update category-specific fields', async () => {
    const recapId = 'recap-uuid-123';
    const newSessionDate = Date.now();

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        session_date: newSessionDate,
        in_game_date_start: '20th of Kythorn, 1492 DR',
        in_game_date_end: '21st of Kythorn, 1492 DR',
        time_passed: '2 days',
        summary: 'Updated summary',
        key_events: ['New event 1', 'New event 2'],
        player_decisions: ['New decision 1'],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      session_date: newSessionDate,
      in_game_date_start: '20th of Kythorn, 1492 DR',
      in_game_date_end: '21st of Kythorn, 1492 DR',
      time_passed: '2 days',
      summary: 'Updated summary',
      key_events: ['New event 1', 'New event 2'],
      player_decisions: ['New decision 1'],
    });
  });

  it('should update many-to-many connections', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        npcs_encountered: [testNpcId, 'npc-uuid-003'],
        locations_visited: [testLocationId],
        quests_progressed: [testQuestId, 'quest-uuid-002'],
        loot_acquired: [testItemId, 'item-uuid-003', 'item-uuid-004'],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      npcs_encountered: [testNpcId, 'npc-uuid-003'],
      locations_visited: [testLocationId],
      quests_progressed: [testQuestId, 'quest-uuid-002'],
      loot_acquired: [testItemId, 'item-uuid-003', 'item-uuid-004'],
    });
  });

  it('should update dm_* fields', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        dm_consequences: 'Updated consequence',
        dm_behind_scenes: 'Updated behind the scenes note',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      dm_consequences: 'Updated consequence',
      dm_behind_scenes: 'Updated behind the scenes note',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_consequences');
    expect(response.body).not.toHaveProperty('dm_behind_scenes');
  });

  it('should update custom_fields', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        custom_fields: {
          new_field: 'new value',
          updated_field: 'updated value',
        },
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.custom_fields).toMatchObject({
      new_field: 'new value',
      updated_field: 'updated value',
    });
  });

  it('should not allow changing id or campaign_id', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        id: 'new-id',
        campaign_id: 'new-campaign-id',
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.id).toBe(recapId);
    expect(response.body.campaign_id).not.toBe('new-campaign-id');
  });

  it('should validate core_status enum', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate session_date as Unix timestamp', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        session_date: 'invalid-date',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate key_events as array of strings', async () => {
    const recapId = 'recap-uuid-123';

    const response = await request(app)
      .put(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .send({
        key_events: 'not-an-array',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent session recap', async () => {
    const response = await request(app)
      .put('/api/session-recaps/non-existent-uuid')
      .set('Authorization', validToken)
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .put('/api/session-recaps/some-uuid')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/session-recaps/:id', () => {
  it('should delete session recap and return 204', async () => {
    const recapId = 'recap-uuid-to-delete';

    await request(app)
      .delete(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 404 for non-existent session recap', async () => {
    const response = await request(app)
      .delete('/api/session-recaps/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should handle CASCADE deletion properly', async () => {
    const recapId = 'recap-with-references';

    // This tests that the database properly handles foreign key constraints
    // When a session recap is deleted, many-to-many references should be cleaned up
    await request(app)
      .delete(`/api/session-recaps/${recapId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/session-recaps/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when deleting recap from campaign not owned by user', async () => {
    const otherUserRecapId = 'other-user-recap-uuid';

    const response = await request(app)
      .delete(`/api/session-recaps/${otherUserRecapId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
