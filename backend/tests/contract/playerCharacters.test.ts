/**
 * Contract tests for Player Characters API
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
const testFactionId = 'faction-uuid-001';
const testNpcId = 'npc-uuid-001';

describe('GET /api/player-characters', () => {
  it('should list player characters with pagination', async () => {
    const response = await request(app)
      .get('/api/player-characters')
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

  it('should filter player characters by campaign_id', async () => {
    const response = await request(app)
      .get('/api/player-characters')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((pc: any) => {
      expect(pc.campaign_id).toBe(testCampaignId);
    });
  });

  it('should filter player characters by core_status', async () => {
    const response = await request(app)
      .get('/api/player-characters')
      .query({
        campaign_id: testCampaignId,
        core_status: 'active',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((pc: any) => {
      expect(pc.core_status).toBe('active');
    });
  });

  it('should filter player characters by player_knowledge', async () => {
    const response = await request(app)
      .get('/api/player-characters')
      .query({
        campaign_id: testCampaignId,
        player_knowledge: 'common_knowledge',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((pc: any) => {
      expect(pc.player_knowledge).toBe('common_knowledge');
    });
  });

  it('should support pagination with limit and offset', async () => {
    const response = await request(app)
      .get('/api/player-characters')
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
      .get('/api/player-characters')
      .query({
        campaign_id: testCampaignId,
        sort_by: 'name',
        sort_order: 'asc',
      })
      .set('Authorization', validToken)
      .expect(200);

    const names = response.body.data.map((pc: any) => pc.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const response = await request(app)
      .get('/api/player-characters')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    response.body.data.forEach((pc: any) => {
      expect(pc).not.toHaveProperty('dm_secrets');
      expect(pc).not.toHaveProperty('dm_plot_threads');
      expect(pc).not.toHaveProperty('dm_true_motivation');
      expect(pc).not.toHaveProperty('dm_consequences');
    });
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const response = await request(app)
      .get('/api/player-characters')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    // At least one PC should have dm_* fields (may be null)
    const firstPc = response.body.data[0];
    if (firstPc) {
      expect(firstPc).toHaveProperty('dm_secrets');
      expect(firstPc).toHaveProperty('dm_plot_threads');
      expect(firstPc).toHaveProperty('dm_true_motivation');
      expect(firstPc).toHaveProperty('dm_consequences');
    }
  });

  it('should default to dm_view when X-View-Mode header is omitted', async () => {
    const response = await request(app)
      .get('/api/player-characters')
      .query({ campaign_id: testCampaignId })
      .set('Authorization', validToken)
      .expect(200);

    const firstPc = response.body.data[0];
    if (firstPc) {
      expect(firstPc).toHaveProperty('dm_secrets');
      expect(firstPc).toHaveProperty('dm_plot_threads');
      expect(firstPc).toHaveProperty('dm_true_motivation');
      expect(firstPc).toHaveProperty('dm_consequences');
    }
  });

  it('should filter by tags (comma-separated)', async () => {
    const response = await request(app)
      .get('/api/player-characters')
      .query({
        campaign_id: testCampaignId,
        tags: 'fighter,tank',
      })
      .set('Authorization', validToken)
      .expect(200);

    response.body.data.forEach((pc: any) => {
      const hasTag = pc.tags.some((tag: string) =>
        ['fighter', 'tank'].includes(tag)
      );
      expect(hasTag).toBe(true);
    });
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/player-characters')
      .query({ campaign_id: testCampaignId })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /api/player-characters', () => {
  it('should create player character with universal fields and return 201', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Thorgrim Ironhammer',
        description: 'A brave dwarven warrior',
        core_status: 'active',
        player_knowledge: 'common_knowledge',
        tags: ['dwarf', 'fighter'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      campaign_id: testCampaignId,
      name: 'Thorgrim Ironhammer',
      description: 'A brave dwarven warrior',
      core_status: 'active',
      player_knowledge: 'common_knowledge',
      tags: ['dwarf', 'fighter'],
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should create player character with category-specific fields', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Elara Moonwhisper',
        player_name: 'Sarah',
        class: ['Ranger', 'Druid'],
        level: 8,
        race: 'Wood Elf',
        background: 'Outlander',
        personality: 'Quiet and observant, fiercely protective of nature',
        goals: 'Protect the ancient forest from corruption',
        backstory: 'Raised by druids after her village was destroyed',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Elara Moonwhisper',
      player_name: 'Sarah',
      class: ['Ranger', 'Druid'],
      level: 8,
      race: 'Wood Elf',
      background: 'Outlander',
      personality: 'Quiet and observant, fiercely protective of nature',
      goals: 'Protect the ancient forest from corruption',
      backstory: 'Raised by druids after her village was destroyed',
    });
  });

  it('should create player character with art field', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Zara the Bold',
        art: '/uploads/characters/zara-portrait.jpg',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      art: '/uploads/characters/zara-portrait.jpg',
    });
  });

  it('should create player character with art as URL', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Grimgar Steel',
        art: 'https://example.com/art/grimgar.png',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      art: 'https://example.com/art/grimgar.png',
    });
  });

  it('should create player character with faction_affiliations array', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Diplomatic PC',
        faction_affiliations: [testFactionId, 'faction-uuid-002'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      faction_affiliations: [testFactionId, 'faction-uuid-002'],
    });
  });

  it('should create player character with allied_npcs array', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Connected PC',
        allied_npcs: [testNpcId, 'npc-uuid-002'],
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      allied_npcs: [testNpcId, 'npc-uuid-002'],
    });
  });

  it('should create player character with dm_* fields', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Mysterious Hero',
        dm_secrets: 'Actually the lost heir to the throne',
        dm_plot_threads: 'Will be revealed at act 2 finale',
        dm_true_motivation: 'Seeks revenge for family murder',
        dm_consequences: 'May turn to darkness if revenge consumes them',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      dm_secrets: 'Actually the lost heir to the throne',
      dm_plot_threads: 'Will be revealed at act 2 finale',
      dm_true_motivation: 'Seeks revenge for family murder',
      dm_consequences: 'May turn to darkness if revenge consumes them',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        campaign_id: testCampaignId,
        name: 'Public PC',
        dm_secrets: 'Hidden backstory',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).not.toHaveProperty('dm_secrets');
    expect(response.body).not.toHaveProperty('dm_plot_threads');
    expect(response.body).not.toHaveProperty('dm_true_motivation');
    expect(response.body).not.toHaveProperty('dm_consequences');
  });

  it('should create player character with custom_fields JSON object', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Custom PC',
        custom_fields: {
          favorite_food: 'Ale and bread',
          catchphrase: 'By my beard!',
          theme_song: 'https://example.com/dwarf-theme.mp3',
        },
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.custom_fields).toMatchObject({
      favorite_food: 'Ale and bread',
      catchphrase: 'By my beard!',
      theme_song: 'https://example.com/dwarf-theme.mp3',
    });
  });

  it('should require name and campaign_id fields', async () => {
    const response = await request(app)
      .post('/api/player-characters')
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
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test PC',
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate level minimum value of 1', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: 'Test PC',
        level: 0,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate name maxLength of 255', async () => {
    const longName = 'A'.repeat(256);
    const response = await request(app)
      .post('/api/player-characters')
      .set('Authorization', validToken)
      .send({
        campaign_id: testCampaignId,
        name: longName,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/player-characters')
      .send({
        campaign_id: testCampaignId,
        name: 'Test PC',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('GET /api/player-characters/:id', () => {
  it('should return player character by ID with 200', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: pcId,
      campaign_id: expect.any(String),
      name: expect.any(String),
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
      custom_fields: expect.any(Object),
    });
  });

  it('should return player character with all universal fields', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
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

  it('should return player character with category-specific fields', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(response.body).toHaveProperty('player_name');
    expect(response.body).toHaveProperty('class');
    expect(response.body).toHaveProperty('level');
    expect(response.body).toHaveProperty('race');
    expect(response.body).toHaveProperty('background');
    expect(response.body).toHaveProperty('personality');
    expect(response.body).toHaveProperty('goals');
    expect(response.body).toHaveProperty('backstory');
    expect(response.body).toHaveProperty('art');
    expect(response.body).toHaveProperty('faction_affiliations');
    expect(response.body).toHaveProperty('allied_npcs');
    expect(response.body).toHaveProperty('dm_secrets');
    expect(response.body).toHaveProperty('dm_plot_threads');
    expect(response.body).toHaveProperty('dm_true_motivation');
    expect(response.body).toHaveProperty('dm_consequences');
  });

  it('should return class as JSON array', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.class !== null) {
      expect(Array.isArray(response.body.class)).toBe(true);
    }
  });

  it('should return faction_affiliations as JSON array', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(Array.isArray(response.body.faction_affiliations)).toBe(true);
  });

  it('should return allied_npcs as JSON array', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .expect(200);

    expect(Array.isArray(response.body.allied_npcs)).toBe(true);
  });

  it('should return art field as string', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .expect(200);

    if (response.body.art !== null) {
      expect(typeof response.body.art).toBe('string');
    }
  });

  it('should strip dm_* fields in player_view mode', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_secrets');
    expect(response.body).not.toHaveProperty('dm_plot_threads');
    expect(response.body).not.toHaveProperty('dm_true_motivation');
    expect(response.body).not.toHaveProperty('dm_consequences');
  });

  it('should include dm_* fields in dm_view mode', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm_view')
      .expect(200);

    expect(response.body).toHaveProperty('dm_secrets');
    expect(response.body).toHaveProperty('dm_plot_threads');
    expect(response.body).toHaveProperty('dm_true_motivation');
    expect(response.body).toHaveProperty('dm_consequences');
  });

  it('should filter by player_knowledge in player_view mode', async () => {
    const pcId = 'pc-with-dm-only-knowledge';

    const response = await request(app)
      .get(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent player character', async () => {
    const response = await request(app)
      .get('/api/player-characters/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .get('/api/player-characters/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('PUT /api/player-characters/:id', () => {
  it('should update player character and return 200', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        name: 'Updated Name',
        description: 'Updated description',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      id: pcId,
      name: 'Updated Name',
      description: 'Updated description',
      updated_at: expect.any(Number),
    });
  });

  it('should allow partial updates', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        level: 10,
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.level).toBe(10);
  });

  it('should update category-specific fields', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        player_name: 'John',
        class: ['Paladin', 'Sorcerer'],
        race: 'Half-Elf',
        background: 'Noble',
        personality: 'Confident and charismatic',
        goals: 'Redeem family name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      player_name: 'John',
      class: ['Paladin', 'Sorcerer'],
      race: 'Half-Elf',
      background: 'Noble',
      personality: 'Confident and charismatic',
      goals: 'Redeem family name',
    });
  });

  it('should update art field', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        art: '/uploads/characters/updated-portrait.png',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      art: '/uploads/characters/updated-portrait.png',
    });
  });

  it('should update faction_affiliations array', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        faction_affiliations: [testFactionId, 'faction-uuid-003'],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      faction_affiliations: [testFactionId, 'faction-uuid-003'],
    });
  });

  it('should update allied_npcs array', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        allied_npcs: [testNpcId, 'npc-uuid-003'],
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      allied_npcs: [testNpcId, 'npc-uuid-003'],
    });
  });

  it('should update dm_* fields', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        dm_secrets: 'Updated secret',
        dm_plot_threads: 'New plot development',
        dm_true_motivation: 'Deeper motivation revealed',
        dm_consequences: 'Dire consequences if they fail',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      dm_secrets: 'Updated secret',
      dm_plot_threads: 'New plot development',
      dm_true_motivation: 'Deeper motivation revealed',
      dm_consequences: 'Dire consequences if they fail',
    });
  });

  it('should strip dm_* fields in player_view response', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player_view')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).not.toHaveProperty('dm_secrets');
    expect(response.body).not.toHaveProperty('dm_plot_threads');
    expect(response.body).not.toHaveProperty('dm_true_motivation');
    expect(response.body).not.toHaveProperty('dm_consequences');
  });

  it('should update custom_fields', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        custom_fields: {
          new_field: 'new value',
        },
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.custom_fields).toMatchObject({
      new_field: 'new value',
    });
  });

  it('should not allow changing id or campaign_id', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        id: 'new-id',
        campaign_id: 'new-campaign-id',
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.id).toBe(pcId);
    expect(response.body.campaign_id).not.toBe('new-campaign-id');
  });

  it('should validate core_status enum', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        core_status: 'invalid_status',
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should validate level minimum value', async () => {
    const pcId = 'pc-uuid-123';

    const response = await request(app)
      .put(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .send({
        level: -5,
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 for non-existent player character', async () => {
    const response = await request(app)
      .put('/api/player-characters/non-existent-uuid')
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
      .put('/api/player-characters/some-uuid')
      .send({
        name: 'Updated Name',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});

describe('DELETE /api/player-characters/:id', () => {
  it('should delete player character and return 204', async () => {
    const pcId = 'pc-uuid-to-delete';

    await request(app)
      .delete(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 404 for non-existent player character', async () => {
    const response = await request(app)
      .delete('/api/player-characters/non-existent-uuid')
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should handle CASCADE deletion when player character is referenced', async () => {
    const pcId = 'pc-with-relationships';

    // This tests that the database properly handles foreign key constraints
    // When a PC with faction or NPC references is deleted, relationships should be handled gracefully
    await request(app)
      .delete(`/api/player-characters/${pcId}`)
      .set('Authorization', validToken)
      .expect(204);
  });

  it('should return 401 when not authenticated', async () => {
    const response = await request(app)
      .delete('/api/player-characters/some-uuid')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 403 when deleting player character from campaign not owned by user', async () => {
    const otherUserPcId = 'other-user-pc-uuid';

    const response = await request(app)
      .delete(`/api/player-characters/${otherUserPcId}`)
      .set('Authorization', validToken)
      .expect('Content-Type', /json/)
      .expect(403);

    expect(response.body).toHaveProperty('error');
  });
});
