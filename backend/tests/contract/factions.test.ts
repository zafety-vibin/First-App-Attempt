/**
 * Contract tests for Factions API
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
const testLeaderNpcId = 'npc-uuid-001';
const testMemberNpcId = 'npc-uuid-002';
const testAlliedFactionId = 'faction-uuid-002';
const testRivalFactionId = 'faction-uuid-003';
const testLocationId = 'location-uuid-001';

describe('GET /api/factions', () => {
  it('should list factions with pagination', async () => {
    const response = await request(app)
      .get('/api/factions')
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

  it('should filter factions by campaign_id', async () => {
    const response = await request(app)
      .get('/api/factions')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((faction: any) => {
      expect(faction.campaign_id).toBe(testCampaignId);
    });
  });

  it('should filter factions by core_status', async () => {
    const response = await request(app)
      .get('/api/factions')
      .query({
        campaign_id: testCampaignId,
        core_status: 'active',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((faction: any) => {
      expect(faction.core_status).toBe('active');
    });
  });

  it('should filter factions by player_knowledge', async () => {
    const response = await request(app)
      .get('/api/factions')
      .query({
        campaign_id: testCampaignId,
        player_knowledge: 'common_knowledge',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((faction: any) => {
      expect(faction.player_knowledge).toBe('common_knowledge');
    });
  });

  it('should support pagination with limit and offset', async () => {
    const response = await request(app)
      .get('/api/factions')
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

  it('should support sorting by created_at, updated_at, or name', async () => {
    const response = await request(app)
      .get('/api/factions')
      .query({
        campaign_id: testCampaignId,
        sort_by: 'name',
        sort_order: 'asc',
      })
      .set('Authorization', validToken)
      .expect(200);

    const names = response.body.data.map((faction: any) => faction.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const response = await request(app)
      .get('/api/factions')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    response.body.data.forEach((faction: any) => {
      expect(faction).not.toHaveProperty('dm_true_agenda');
    });
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const response = await request(app)
      .get('/api/factions')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    // At least one faction should have dm_* fields (may be null)
    const firstFaction = response.body.data[0];
    if (firstFaction) {
      expect(firstFaction).toHaveProperty('dm_true_agenda');
    }
  });

  it('should default to dm_view when X-View-Mode header is omitted', async () => {
    const response = await request(app)
      .get('/api/factions')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    const firstFaction = response.body.data[0];
    if (firstFaction) {
      expect(firstFaction).toHaveProperty('dm_true_agenda');
    }
  });

  it('should filter by tags (comma-separated)', async () => {
    const response = await request(app)
      .get('/api/factions')
      .query({
        campaign_id: testCampaignId,
        tags: 'guild,criminal',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((faction: any) => {
      const hasTag = faction.tags.some((tag: string) =>
        ['guild', 'criminal'].includes(tag)
      );
      expect(hasTag).toBe(true);
    });
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/factions')
      .query({ campaign_id: testCampaignId })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/factions', () => {
  it('should create faction with universal fields and return 201', async () => {
    const response = await request(app)
      .post('/api/factions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: "The Emerald Enclave",
        description: 'A powerful alliance of druids and rangers protecting nature',
        core_status: 'active',
        player_knowledge: 'common_knowledge',
        tags: ['nature', 'druids'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      campaign_id: testCampaignId,
      name: "The Emerald Enclave",
      description: 'A powerful alliance of druids and rangers protecting nature',
      core_status: 'active',
      player_knowledge: 'common_knowledge',
      tags: ['nature', 'druids'],
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should create faction with category-specific fields', async () => {
    const response = await request(app)
      .post('/api/factions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'The Zhentarim',
        faction_type: 'Criminal Organization',
        power_level: 'Major',
        resources: 'Gold, mercenaries, smuggling routes',
        beliefs: 'Power through any means necessary',
        goals: 'Control trade routes and expand influence',
        methods: 'Intimidation, blackmail, bribery',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'The Zhentarim',
      faction_type: 'Criminal Organization',
      power_level: 'Major',
      resources: 'Gold, mercenaries, smuggling routes',
      beliefs: 'Power through any means necessary',
      goals: 'Control trade routes and expand influence',
      methods: 'Intimidation, blackmail, bribery',
    });
  });

  it('should create faction with foreign key leader_id', async () => {
    const response = await request(app)
      .post('/api/factions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'The Red Wizards',
        leader_id: testLeaderNpcId,
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      leader_id: testLeaderNpcId,
    });
  });

  it('should create faction with JSON array fields', async () => {
    const response = await request(app)
      .post('/api/factions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'The Lords Alliance',
        key_members: [testMemberNpcId, 'npc-uuid-003'],
        allied_factions: [testAlliedFactionId],
        rival_factions: [testRivalFactionId],
        territory: [testLocationId, 'location-uuid-002'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      key_members: [testMemberNpcId, 'npc-uuid-003'],
      allied_factions: [testAlliedFactionId],
      rival_factions: [testRivalFactionId],
      territory: [testLocationId, 'location-uuid-002'],
    });
  });

  it('should create faction with dm_* fields', async () => {
    const response = await request(app)
      .post('/api/factions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: "Harper's Network",
        dm_true_agenda: 'Secretly infiltrating the royal court to prevent war',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      dm_true_agenda: 'Secretly infiltrating the royal court to prevent war',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const response = await request(app)
      .post('/api/factions')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        campaign_id: testCampaignId,
        name: 'Mysterious Guild',
        dm_true_agenda: 'Secret agenda',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).not.toHaveProperty('dm_true_agenda');
  });

  it('should create faction with custom_fields JSON object', async () => {
    const response = await request(app)
      .post('/api/factions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Custom Faction',
        custom_fields: {
          symbol: 'Golden dragon',
          headquarters: 'Castle Blackstone',
          founding_year: 1247,
        },
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.custom_fields).toMatchObject({
      symbol: 'Golden dragon',
      headquarters: 'Castle Blackstone',
      founding_year: 1247,
    });
  });

  it('should require name and campaign_id fields', async () => {
    const response = await request(app)
      .post('/api/factions')
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
      .post('/api/factions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Faction',
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate name maxLength of 255', async () => {
    const longName = 'A'.repeat(256);
    const response = await request(app)
      .post('/api/factions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: longName,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate foreign key leader_id references npcs table', async () => {
    const response = await request(app)
      .post('/api/factions')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test Faction',
        leader_id: 'non-existent-npc-id',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/factions')
      .send({
        campaign_id: testCampaignId,
        name: 'Test Faction',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/factions/:id', () => {
  it('should return faction by ID with 200', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .get(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: factionId,
      campaign_id: expect.any(String),
      name: expect.any(String),
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should return faction with all universal fields', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .get(`/api/factions/${factionId}`)
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

  it('should return faction with category-specific fields', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .get(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('faction_type');
    expect(response.body).toHaveProperty('power_level');
    expect(response.body).toHaveProperty('resources');
    expect(response.body).toHaveProperty('beliefs');
    expect(response.body).toHaveProperty('goals');
    expect(response.body).toHaveProperty('methods');
    expect(response.body).toHaveProperty('leader_id');
    expect(response.body).toHaveProperty('key_members');
    expect(response.body).toHaveProperty('allied_factions');
    expect(response.body).toHaveProperty('rival_factions');
    expect(response.body).toHaveProperty('territory');
    expect(response.body).toHaveProperty('dm_true_agenda');
  });

  it('should return JSON array fields as arrays', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .get(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(Array.isArray(response.body.key_members)).toBe(true);
    expect(Array.isArray(response.body.allied_factions)).toBe(true);
    expect(Array.isArray(response.body.rival_factions)).toBe(true);
    expect(Array.isArray(response.body.territory)).toBe(true);
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .get(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_true_agenda');
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .get(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    expect(response.body).toHaveProperty('dm_true_agenda');
  });

  it('should filter by player_knowledge in player_view mode', async () => {
    const factionId = 'faction-with-dm-only-knowledge';

    const response = await request(app)
      .get(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent faction', async () => {
    const response = await request(app)
      .get('/api/factions/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/factions/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/factions/:id', () => {
  it('should update faction and return 200', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Faction Name',
        description: 'Updated description',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: factionId,
      name: 'Updated Faction Name',
      description: 'Updated description',
      updated_at: expect.any(Number),
    });
  });

  it('should allow partial updates', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        power_level: 'Legendary',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.power_level).toBe('Legendary');
  });

  it('should update category-specific fields', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        faction_type: 'Religious Order',
        power_level: 'Regional',
        resources: 'Temples, priests, holy artifacts',
        beliefs: 'Devotion to the sun god',
        goals: 'Spread the faith across the land',
        methods: 'Missionary work, healing, diplomacy',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      faction_type: 'Religious Order',
      power_level: 'Regional',
      resources: 'Temples, priests, holy artifacts',
      beliefs: 'Devotion to the sun god',
      goals: 'Spread the faith across the land',
      methods: 'Missionary work, healing, diplomacy',
    });
  });

  it('should update foreign key leader_id', async () => {
    const factionId = 'faction-uuid-123';
    const newLeaderId = 'npc-uuid-999';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        leader_id: newLeaderId,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.leader_id).toBe(newLeaderId);
  });

  it('should update JSON array fields', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        key_members: ['npc-uuid-004', 'npc-uuid-005'],
        allied_factions: ['faction-uuid-010'],
        rival_factions: ['faction-uuid-020', 'faction-uuid-021'],
        territory: ['location-uuid-003'],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      key_members: ['npc-uuid-004', 'npc-uuid-005'],
      allied_factions: ['faction-uuid-010'],
      rival_factions: ['faction-uuid-020', 'faction-uuid-021'],
      territory: ['location-uuid-003'],
    });
  });

  it('should update dm_* fields', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        dm_true_agenda: 'Actually working to summon an ancient evil',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      dm_true_agenda: 'Actually working to summon an ancient evil',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_true_agenda');
  });

  it('should update custom_fields', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        custom_fields: {
          new_field: 'new value',
          rank_structure: ['Initiate', 'Adept', 'Master'],
        },
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.custom_fields).toMatchObject({
      new_field: 'new value',
      rank_structure: ['Initiate', 'Adept', 'Master'],
    });
  });

  it('should not allow changing id or campaign_id', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        id: 'new-id',
        campaign_id: 'new-campaign-id',
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.id).toBe(factionId);
    expect(response.body.campaign_id).not.toBe('new-campaign-id');
  });

  it('should validate core_status enum', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate foreign key leader_id references', async () => {
    const factionId = 'faction-uuid-123';

    const response = await request(app)
      .put(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .send({
        leader_id: 'non-existent-npc-id',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent faction', async () => {
    const response = await request(app)
      .put('/api/factions/non-existent-uuid')
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
      .put('/api/factions/some-uuid')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/factions/:id', () => {
  it('should delete faction and return 204', async () => {
    const factionId = 'faction-uuid-to-delete';

    await request(app)
      .delete(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 404 for non-existent faction', async () => {
    const response = await request(app)
      .delete('/api/factions/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should handle CASCADE deletion when faction is referenced by NPCs', async () => {
    const factionId = 'faction-with-members';

    // This tests that the database properly handles foreign key constraints
    // When a faction is deleted, NPCs with faction_id references should be handled gracefully
    await request(app)
      .delete(`/api/factions/${factionId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/factions/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when deleting faction from campaign not owned by user', async () => {
    const otherUserFactionId = 'other-user-faction-uuid';

    const response = await request(app)
      .delete(`/api/factions/${otherUserFactionId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
