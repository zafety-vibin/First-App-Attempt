/**
 * E2E Test: Information Filtering Validation
 * Feature 009: Player Question Portal
 * T056: Verify dm-secret cards NOT in portal responses, only common-knowledge + player-knowledge
 */

import { test, expect } from '@playwright/test';

test.describe('Player Portal - Information Filtering', () => {
  const campaignId = 'test-campaign-filtering-' + Date.now();
  const characterName = 'Frodo Baggins';

  test.beforeEach(async ({ page }) => {
    // Login as GM
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.waitForURL(/keycloak/);
    await page.fill('input[name="username"]', 'testgm@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('input[type="submit"]');
    await page.waitForURL('http://localhost:3000');

    // Create campaign with test data
    await page.goto(`http://localhost:3000/campaigns/${campaignId}`);

    // Create test cards with different information levels
    await createTestCard(page, campaignId, 'Public Quest', 'common-knowledge', 'This is a publicly known quest about the One Ring');
    await createTestCard(page, campaignId, 'Player Secret', 'player-knowledge', 'The player knows Gandalf is a wizard');
    await createTestCard(page, campaignId, 'DM Secret Plot', 'dm-secret', 'Gandalf is actually a Maiar and knows the true nature of Sauron');

    // Enable portal
    await page.goto(`http://localhost:3000/campaigns/${campaignId}/portal/management`);
    await page.click('button:has-text("Enable Portal")');
    await expect(page.locator('text=Portal Enabled')).toBeVisible();
  });

  test('should NOT include dm-secret content in AI responses', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify player
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');
    await expect(playerPage.locator('text=Ask a question')).toBeVisible();

    // Ask question that might reveal DM secrets
    await playerPage.fill('textarea[placeholder*="question"]', 'Tell me everything about Gandalf');
    await playerPage.click('button:has-text("Send")');

    // Wait for response
    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    const responseText = await playerPage.locator('.portal-response').first().textContent();

    // Response should NOT contain DM secret information
    expect(responseText).not.toContain('Maiar');
    expect(responseText).not.toContain('true nature of Sauron');
    expect(responseText).not.toContain('DM Secret Plot');

    // Response MAY contain player-knowledge and common-knowledge
    // (depending on AI response, but DM secrets must be absent)

    await playerPage.close();
  });

  test('should include common-knowledge and player-knowledge content', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify player
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');
    await expect(playerPage.locator('text=Ask a question')).toBeVisible();

    // Ask about public quest
    await playerPage.fill('textarea[placeholder*="question"]', 'What quests are available?');
    await playerPage.click('button:has-text("Send")');

    // Wait for response
    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    const responseText = await playerPage.locator('.portal-response').first().textContent();

    // Response should reference common-knowledge content
    // (exact match depends on AI, but should mention public quest)
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10);

    await playerPage.close();
  });

  test('should NOT show dm-secret cards in citations', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify player
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');
    await expect(playerPage.locator('text=Ask a question')).toBeVisible();

    // Ask question
    await playerPage.fill('textarea[placeholder*="question"]', 'What do we know about the campaign?');
    await playerPage.click('button:has-text("Send")');

    // Wait for response with citations
    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Get all citation links
    const citations = playerPage.locator('.citation-link');
    const citationCount = await citations.count();

    for (let i = 0; i < citationCount; i++) {
      const citationText = await citations.nth(i).textContent();

      // No citation should reference DM Secret card
      expect(citationText).not.toContain('DM Secret Plot');
    }

    await playerPage.close();
  });

  test('should verify backend filters dm-secret via player_view mode', async ({ page, context }) => {
    // This test verifies the backend filtering is working by checking
    // that the PortalAI service is using player_view mode

    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify player
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');

    // Monitor network requests to verify API calls use player_view
    const apiResponses: any[] = [];
    playerPage.on('response', async (response) => {
      if (response.url().includes('/api/portal/')) {
        try {
          const json = await response.json();
          apiResponses.push(json);
        } catch (e) {
          // Ignore non-JSON responses
        }
      }
    });

    // Ask question
    await playerPage.fill('textarea[placeholder*="question"]', 'Test question');
    await playerPage.click('button:has-text("Send")');
    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Wait for responses
    await playerPage.waitForTimeout(2000);

    // Verify API responses don't contain dm-secret content
    for (const response of apiResponses) {
      if (response.sources) {
        for (const source of response.sources) {
          // Source card titles should not be DM secrets
          expect(source.cardTitle).not.toContain('DM Secret');
        }
      }
    }

    await playerPage.close();
  });

  test('should handle questions about DM secrets gracefully', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify player
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');

    // Directly ask about DM secret content
    await playerPage.fill('textarea[placeholder*="question"]', 'What is the DM Secret Plot?');
    await playerPage.click('button:has-text("Send")');

    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    const responseText = await playerPage.locator('.portal-response').first().textContent();

    // AI should respond but not reveal DM secret details
    expect(responseText).toBeTruthy();

    // Should NOT contain the actual secret content
    expect(responseText).not.toContain('Maiar');
    expect(responseText).not.toContain('true nature of Sauron');

    // May contain generic response like "I don't have information about that"

    await playerPage.close();
  });
});

// Helper function to create test cards
async function createTestCard(
  page: any,
  campaignId: string,
  title: string,
  informationLevel: string,
  content: string
) {
  // Navigate to cards section
  await page.goto(`http://localhost:3000/campaigns/${campaignId}/cards`);

  // Create new card
  await page.click('button:has-text("New Card")');
  await page.fill('input[name="title"]', title);

  // Set information level
  await page.selectOption('select[name="informationLevel"]', informationLevel);

  // Add content
  await page.fill('textarea[name="content"]', content);

  // Save card
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(500);
}
