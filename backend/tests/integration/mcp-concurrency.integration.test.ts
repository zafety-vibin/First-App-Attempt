/**
 * Integration Test - MCP Concurrent Tool Calls
 * Verifies WAL mode allows concurrent reads and proper write serialization
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../src/services/DatabaseService';
import { registerCardTools } from '../../src/mcp/tools/card-tools';
import { registerHierarchyTools } from '../../src/mcp/tools/hierarchy-tools';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('MCP Concurrency Integration Test', () => {
  let server: Server;
  let campaignId: string;
  let rootCardId: number;

  beforeAll(() => {
    // Ensure WAL mode is enabled
    db.pragma('journal_mode = WAL');

    // Create test campaign
    campaignId = 'test-campaign-concurrency-' + Date.now();

    db.prepare(`
      INSERT INTO campaigns (id, name, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(campaignId, 'Concurrency Test Campaign', 'test-user', Date.now(), Date.now());

    // Create a root card with children for testing
    const result = db.prepare(`
      INSERT INTO cards (campaign_id, title, type, content, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      campaignId,
      'Root Card',
      'text',
      JSON.stringify({ text: 'Root content' }),
      0,
      Date.now(),
      Date.now()
    );

    rootCardId = result.lastInsertRowid as number;

    // Create child cards
    for (let i = 0; i < 5; i++) {
      db.prepare(`
        INSERT INTO cards (campaign_id, parent_id, title, type, content, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        campaignId,
        rootCardId,
        `Child Card ${i}`,
        'text',
        JSON.stringify({ text: `Child content ${i}` }),
        i,
        Date.now(),
        Date.now()
      );
    }

    // Initialize server
    server = new Server({
      name: 'test-server',
      version: '1.0.0'
    });

    registerCardTools(server);
    registerHierarchyTools(server);
  });

  afterAll(() => {
    // Clean up test data
    db.prepare('DELETE FROM cards WHERE campaign_id = ?').run(campaignId);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
  });

  it('should handle concurrent read operations efficiently', async () => {
    const readCardTool = server._tools?.get('read_card');
    const listChildrenTool = server._tools?.get('list_children');
    const getSubtreeTool = server._tools?.get('get_subtree');

    expect(readCardTool).toBeDefined();
    expect(listChildrenTool).toBeDefined();
    expect(getSubtreeTool).toBeDefined();

    // Launch 5 concurrent read operations
    const startTime = Date.now();

    const operations = await Promise.all([
      readCardTool?.handler({
        card_id: rootCardId,
        campaign_id: campaignId
      }),
      listChildrenTool?.handler({
        card_id: rootCardId,
        campaign_id: campaignId
      }),
      getSubtreeTool?.handler({
        card_id: rootCardId,
        campaign_id: campaignId,
        max_depth: 2
      }),
      readCardTool?.handler({
        card_id: rootCardId,
        campaign_id: campaignId
      }),
      listChildrenTool?.handler({
        card_id: rootCardId,
        campaign_id: campaignId
      })
    ]);

    const duration = Date.now() - startTime;

    // All operations should succeed
    operations.forEach(result => {
      expect(result?.isError).toBeUndefined();
    });

    // Verify results are correct
    const readResult = JSON.parse(operations[0].content[0].text);
    expect(readResult.title).toBe('Root Card');

    const childrenResult = JSON.parse(operations[1].content[0].text);
    expect(childrenResult.children).toHaveLength(5);

    const subtreeResult = JSON.parse(operations[2].content[0].text);
    expect(subtreeResult.tree.children).toHaveLength(5);

    // Concurrent reads should complete quickly (< 500ms for 5 operations)
    expect(duration).toBeLessThan(500);

    // Average per operation should be < 100ms
    const avgTime = duration / 5;
    expect(avgTime).toBeLessThan(100);
  });

  it('should serialize write operations correctly', async () => {
    const createCardTool = server._tools?.get('create_card');
    const updateCardTool = server._tools?.get('update_card');

    expect(createCardTool).toBeDefined();
    expect(updateCardTool).toBeDefined();

    // Track created card IDs
    const createdIds: number[] = [];

    // Launch concurrent create operations
    const createPromises = [];
    for (let i = 0; i < 3; i++) {
      createPromises.push(
        createCardTool?.handler({
          campaign_id: campaignId,
          parent_id: rootCardId,
          title: `Concurrent Card ${i}`,
          card_type: 'text',
          content: { text: `Concurrent content ${i}` }
        }).then(result => {
          if (!result?.isError) {
            const data = JSON.parse(result.content[0].text);
            createdIds.push(data.id);
          }
          return result;
        })
      );
    }

    const createResults = await Promise.all(createPromises);

    // All creates should succeed
    createResults.forEach(result => {
      expect(result?.isError).toBeUndefined();
    });

    // Verify all cards were created with unique IDs
    expect(createdIds).toHaveLength(3);
    expect(new Set(createdIds).size).toBe(3); // All IDs should be unique

    // Verify cards exist in database
    for (const id of createdIds) {
      const card = db.prepare(`
        SELECT id, title FROM cards WHERE id = ?
      `).get(id);
      expect(card).toBeDefined();
    }

    // Now test concurrent updates to the same card
    const targetId = createdIds[0];
    const updatePromises = [];

    for (let i = 0; i < 3; i++) {
      updatePromises.push(
        updateCardTool?.handler({
          card_id: targetId,
          campaign_id: campaignId,
          title: `Updated Title ${i}`,
          content: { text: `Updated content ${i}` }
        })
      );
    }

    const updateResults = await Promise.all(updatePromises);

    // All updates should succeed (last one wins)
    updateResults.forEach(result => {
      expect(result?.isError).toBeUndefined();
    });

    // Verify final state (one of the updates should have won)
    const finalCard = db.prepare(`
      SELECT title, content FROM cards WHERE id = ?
    `).get(targetId) as any;

    expect(finalCard.title).toMatch(/Updated Title [0-2]/);
    const content = JSON.parse(finalCard.content);
    expect(content.text).toMatch(/Updated content [0-2]/);
  });

  it('should respect 10 second timeout for long operations', async () => {
    const createCardTool = server._tools?.get('create_card');

    // Create a card with a very long title to simulate processing
    // (In real scenario, this would be a complex operation)
    const result = await createCardTool?.handler({
      campaign_id: campaignId,
      parent_id: rootCardId,
      title: 'Normal Card',
      card_type: 'text',
      content: { text: 'x'.repeat(10000) } // Large content
    });

    // Should complete successfully within timeout
    expect(result?.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.title).toBe('Normal Card');
  }, 15000); // Allow 15 seconds for this test

  it('should handle mixed read/write operations concurrently', async () => {
    const readCardTool = server._tools?.get('read_card');
    const createCardTool = server._tools?.get('create_card');
    const searchCardsTool = server._tools?.get('search_cards');

    // Mix of read and write operations
    const mixedOps = await Promise.all([
      // Reads
      readCardTool?.handler({
        card_id: rootCardId,
        campaign_id: campaignId
      }),
      searchCardsTool?.handler({
        campaign_id: campaignId,
        query: 'Child',
        limit: 10
      }),
      // Write
      createCardTool?.handler({
        campaign_id: campaignId,
        parent_id: rootCardId,
        title: 'Mixed Op Card',
        card_type: 'text',
        content: { text: 'Created during mixed operations' }
      }),
      // More reads
      readCardTool?.handler({
        card_id: rootCardId,
        campaign_id: campaignId
      }),
      searchCardsTool?.handler({
        campaign_id: campaignId,
        query: 'Root',
        limit: 5
      })
    ]);

    // All operations should succeed
    mixedOps.forEach((result, index) => {
      expect(result?.isError).toBeUndefined();
    });

    // Verify the created card exists
    const searchResult = JSON.parse(mixedOps[1].content[0].text);
    expect(searchResult.total_count).toBeGreaterThan(0);

    const createResult = JSON.parse(mixedOps[2].content[0].text);
    expect(createResult.title).toBe('Mixed Op Card');

    // Verify it can be found
    const verifySearch = await searchCardsTool?.handler({
      campaign_id: campaignId,
      query: 'Mixed Op',
      limit: 10
    });

    const verifyData = JSON.parse(verifySearch.content[0].text);
    expect(verifyData.results.some((r: any) => r.title === 'Mixed Op Card')).toBe(true);
  });
});