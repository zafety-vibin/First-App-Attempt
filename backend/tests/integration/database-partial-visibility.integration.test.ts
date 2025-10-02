/**
 * Integration test: Database Entry Partial Visibility
 * Feature: 004-create-a-tagging
 *
 * Tests end-to-end workflow for database partial visibility:
 * 1. Create database with Player Knowledge field
 * 2. Add hierarchical columns
 * 3. Create secret entries with/without Player Knowledge data
 * 4. Verify partial visibility in Player view
 *
 * These tests MUST fail before implementation (TDD).
 * Task: T016
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';

// Will be implemented in Phase 3.4
let app: Express;
const validToken = 'Bearer valid_jwt_token';
let testCampaignId: string;
let databaseId: string;
let nameColumnId: string;
let playerKnowledgeColumnId: string;
let secretNotesColumnId: string;
let secretEntryWithPKId: string;
let secretEntryWithoutPKId: string;
let publicEntryId: string;

describe('Integration: Database Entry Partial Visibility (T016)', () => {
  beforeAll(async () => {
    // Create test campaign
    const campaignResponse = await request(app)
      .post('/api/campaigns')
      .set('Authorization', validToken)
      .send({ name: 'Database Visibility Test Campaign' });
    testCampaignId = campaignResponse.body.id;
  });

  afterAll(async () => {
    // Clean up test campaign
    await request(app)
      .delete(`/api/campaigns/${testCampaignId}`)
      .set('Authorization', validToken);
  });

  it('should create database card', async () => {
    const response = await request(app)
      .post('/api/cards')
      .set('Authorization', validToken)
      .send({
        type: 'database',
        campaign_id: testCampaignId,
        parent_id: null,
        position: 0,
        title: 'NPCs Database',
      })
      .expect(201);

    databaseId = response.body.id;
  });

  it('should add columns including Player Knowledge field and hierarchical column', async () => {
    const response = await request(app)
      .put(`/api/cards/${databaseId}/schema`)
      .set('Authorization', validToken)
      .send({
        columns: [
          {
            id: 'col-name',
            name: 'Name',
            type: 'text',
            required: true,
            hierarchical: false,
          },
          {
            id: 'col-pk',
            name: 'What Players Know',
            type: 'player-knowledge-text',
            required: false,
            hierarchical: false,
          },
          {
            id: 'col-secret',
            name: 'Secret Notes',
            type: 'text',
            required: false,
            hierarchical: true, // Always hidden in Player View
          },
        ],
      })
      .expect(200);

    nameColumnId = 'col-name';
    playerKnowledgeColumnId = 'col-pk';
    secretNotesColumnId = 'col-secret';

    // Verify only one Player Knowledge field allowed
    const duplicatePKResponse = await request(app)
      .put(`/api/cards/${databaseId}/schema`)
      .set('Authorization', validToken)
      .send({
        columns: [
          { id: 'col-pk-2', name: 'Duplicate PK', type: 'player-knowledge-text', required: false },
        ],
      })
      .expect(422);

    expect(duplicatePKResponse.body.error).toContain('One Player Knowledge field');
  });

  it('should create public entry (system level)', async () => {
    const response = await request(app)
      .post(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .send({
        title: 'Friendly Merchant',
        information_level_id: 'system',
        values: {
          [nameColumnId]: 'Bob the Trader',
          [playerKnowledgeColumnId]: '',
          [secretNotesColumnId]: 'Actually a spy',
        },
      })
      .expect(201);

    publicEntryId = response.body.id;
  });

  it('should create secret entry WITH Player Knowledge data', async () => {
    const response = await request(app)
      .post(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .send({
        title: 'Mysterious Stranger',
        information_level_id: 'dm-secret',
        values: {
          [nameColumnId]: 'Unknown Name',
          [playerKnowledgeColumnId]: 'Seems trustworthy, helped party in tavern brawl',
          [secretNotesColumnId]: 'Actually the BBEG in disguise',
        },
      })
      .expect(201);

    secretEntryWithPKId = response.body.id;
  });

  it('should create secret entry WITHOUT Player Knowledge data', async () => {
    const response = await request(app)
      .post(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .send({
        title: 'Hidden NPC',
        information_level_id: 'dm-secret',
        values: {
          [nameColumnId]: 'Secret Identity',
          [playerKnowledgeColumnId]: '', // Empty Player Knowledge
          [secretNotesColumnId]: 'Totally secret',
        },
      })
      .expect(201);

    secretEntryWithoutPKId = response.body.id;
  });

  it('should show all entries and columns in DM view', async () => {
    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'dm')
      .expect(200);

    // All 3 entries visible
    expect(response.body.entries).toHaveLength(3);

    // All 3 columns in schema
    expect(response.body.schema.columns).toHaveLength(3);
    expect(response.body.schema.columns.map((c: any) => c.id)).toContain(nameColumnId);
    expect(response.body.schema.columns.map((c: any) => c.id)).toContain(playerKnowledgeColumnId);
    expect(response.body.schema.columns.map((c: any) => c.id)).toContain(secretNotesColumnId);

    // Hierarchical flag visible in DM view
    const secretColumn = response.body.schema.columns.find((c: any) => c.id === secretNotesColumnId);
    expect(secretColumn.hierarchical).toBe(true);
  });

  it('should filter entries and columns in Player view', async () => {
    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    // Only 2 entries visible (public + partial visibility)
    expect(response.body.entries).toHaveLength(2);

    // Hierarchical column removed from schema
    expect(response.body.schema.columns).toHaveLength(2);
    expect(response.body.schema.columns.map((c: any) => c.id)).toContain(nameColumnId);
    expect(response.body.schema.columns.map((c: any) => c.id)).toContain(playerKnowledgeColumnId);
    expect(response.body.schema.columns.map((c: any) => c.id)).not.toContain(secretNotesColumnId);

    // Verify partial visibility count
    expect(response.body.partial_visibility_count).toBe(1);
  });

  it('should show public entry fully in Player view', async () => {
    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    const publicEntry = response.body.entries.find((e: any) => e.id === publicEntryId);
    expect(publicEntry).toBeDefined();
    expect(publicEntry.title).toBe('Friendly Merchant');
    expect(publicEntry.partial_visibility).toBe(false);

    // All non-hierarchical columns visible
    expect(publicEntry.values[nameColumnId]).toBe('Bob the Trader');
    expect(publicEntry.values).not.toHaveProperty(secretNotesColumnId); // Hierarchical column hidden
  });

  it('should show secret entry WITH Player Knowledge partially in Player view', async () => {
    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    const partialEntry = response.body.entries.find((e: any) => e.id === secretEntryWithPKId);
    expect(partialEntry).toBeDefined();
    expect(partialEntry.title).toBe('Mysterious Stranger');
    expect(partialEntry.partial_visibility).toBe(true);

    // Only Player Knowledge field visible
    expect(partialEntry.values[playerKnowledgeColumnId]).toBe('Seems trustworthy, helped party in tavern brawl');
    expect(partialEntry.values).not.toHaveProperty(nameColumnId);
    expect(partialEntry.values).not.toHaveProperty(secretNotesColumnId);
  });

  it('should hide secret entry WITHOUT Player Knowledge in Player view', async () => {
    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    const hiddenEntry = response.body.entries.find((e: any) => e.id === secretEntryWithoutPKId);
    expect(hiddenEntry).toBeUndefined();
  });

  it('should allow updating Player Knowledge field to toggle visibility', async () => {
    // Update secret entry without PK to add Player Knowledge
    await request(app)
      .put(`/api/cards/${databaseId}/entries/${secretEntryWithoutPKId}`)
      .set('Authorization', validToken)
      .send({
        values: {
          [playerKnowledgeColumnId]: 'Met briefly at town square',
        },
      })
      .expect(200);

    // Now should be partially visible in Player view
    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    const nowVisibleEntry = response.body.entries.find((e: any) => e.id === secretEntryWithoutPKId);
    expect(nowVisibleEntry).toBeDefined();
    expect(nowVisibleEntry.partial_visibility).toBe(true);
    expect(nowVisibleEntry.values[playerKnowledgeColumnId]).toBe('Met briefly at town square');

    // Partial visibility count increased
    expect(response.body.partial_visibility_count).toBe(2);
  });

  it('should allow removing Player Knowledge to hide entry again', async () => {
    // Update to remove Player Knowledge
    await request(app)
      .put(`/api/cards/${databaseId}/entries/${secretEntryWithPKId}`)
      .set('Authorization', validToken)
      .send({
        values: {
          [playerKnowledgeColumnId]: '',
        },
      })
      .expect(200);

    // Now should be hidden in Player view
    const response = await request(app)
      .get(`/api/cards/${databaseId}/entries`)
      .set('Authorization', validToken)
      .set('X-View-Mode', 'player')
      .expect(200);

    const nowHiddenEntry = response.body.entries.find((e: any) => e.id === secretEntryWithPKId);
    expect(nowHiddenEntry).toBeUndefined();

    // Partial visibility count decreased
    expect(response.body.partial_visibility_count).toBe(1);
  });
});
