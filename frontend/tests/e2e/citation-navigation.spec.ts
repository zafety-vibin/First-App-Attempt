/**
 * E2E Test: Citation Click Navigation
 * Feature 009: Player Question Portal
 * T057: Click [1] → navigate to card detail page
 */

import { test, expect } from '@playwright/test';

test.describe('Player Portal - Citation Navigation', () => {
  const campaignId = 'test-campaign-citations-' + Date.now();
  const characterName = 'Legolas';

  // Store card IDs for verification
  let testCardId: string;

  test.beforeEach(async ({ page }) => {
    // Login as GM
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.waitForURL(/keycloak/);
    await page.fill('input[name="username"]', 'testgm@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('input[type="submit"]');
    await page.waitForURL('http://localhost:3000');

    // Create campaign and test card
    await page.goto(`http://localhost:3000/campaigns/${campaignId}`);

    // Create a test card that will be cited
    await page.click('button:has-text("New Card")');
    await page.fill('input[name="title"]', 'The Elven Realm of Mirkwood');
    await page.fill('textarea[name="content"]', 'A great forest realm ruled by Thranduil');
    await page.selectOption('select[name="informationLevel"]', 'common-knowledge');
    await page.click('button:has-text("Save")');

    // Get card ID from URL
    await page.waitForURL(/\/cards\/.+/);
    const url = page.url();
    testCardId = url.split('/cards/')[1];

    // Enable portal
    await page.goto(`http://localhost:3000/campaigns/${campaignId}/portal/management`);
    await page.click('button:has-text("Enable Portal")');
    await expect(page.locator('text=Portal Enabled')).toBeVisible();
  });

  test('should navigate to card detail page when citation is clicked', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify player
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');
    await expect(playerPage.locator('text=Ask a question')).toBeVisible();

    // Ask question that will reference the card
    await playerPage.fill('textarea[placeholder*="question"]', 'Tell me about Mirkwood');
    await playerPage.click('button:has-text("Send")');

    // Wait for response with citations
    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Find and click first citation
    const firstCitation = playerPage.locator('.citation-link').first();
    await expect(firstCitation).toBeVisible();

    // Click citation
    await firstCitation.click();

    // Should navigate to card detail page
    await expect(playerPage).toHaveURL(new RegExp(`/cards/${testCardId}`), { timeout: 5000 });

    // Verify card content is displayed
    await expect(playerPage.locator('text=The Elven Realm of Mirkwood')).toBeVisible();
    await expect(playerPage.locator('text=Thranduil')).toBeVisible();

    await playerPage.close();
  });

  test('should display numbered citations in order', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify player
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');

    // Ask question
    await playerPage.fill('textarea[placeholder*="question"]', 'What information is available?');
    await playerPage.click('button:has-text("Send")');

    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Check citations are numbered
    const citations = playerPage.locator('.citation-link');
    const count = await citations.count();

    if (count > 0) {
      // First citation should be [1]
      const firstCitationText = await citations.first().textContent();
      expect(firstCitationText).toContain('[1]');

      if (count > 1) {
        // Second citation should be [2]
        const secondCitationText = await citations.nth(1).textContent();
        expect(secondCitationText).toContain('[2]');
      }
    }

    await playerPage.close();
  });

  test('should show card title in citation link', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify player
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');

    // Ask question
    await playerPage.fill('textarea[placeholder*="question"]', 'Tell me about the elven realms');
    await playerPage.click('button:has-text("Send")');

    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Check citation contains card title
    const citations = playerPage.locator('.citation-link');
    const count = await citations.count();

    if (count > 0) {
      const firstCitationText = await citations.first().textContent();

      // Should contain part of the card title
      const hasTitle = firstCitationText?.includes('Mirkwood') ||
                      firstCitationText?.includes('Elven') ||
                      firstCitationText?.includes('Session');

      expect(hasTitle).toBeTruthy();
    }

    await playerPage.close();
  });

  test('should handle multiple citations in one response', async ({ context, page }) => {
    // Create additional test cards
    await page.goto(`http://localhost:3000/campaigns/${campaignId}/cards`);

    await page.click('button:has-text("New Card")');
    await page.fill('input[name="title"]', 'The Mines of Moria');
    await page.fill('textarea[name="content"]', 'An ancient dwarven kingdom');
    await page.selectOption('select[name="informationLevel"]', 'common-knowledge');
    await page.click('button:has-text("Save")');

    await page.waitForTimeout(1000);

    await page.click('button:has-text("New Card")');
    await page.fill('input[name="title"]', 'Gandalf the Grey');
    await page.fill('textarea[name="content"]', 'A wise wizard of the Istari');
    await page.selectOption('select[name="informationLevel"]', 'common-knowledge');
    await page.click('button:has-text("Save")');

    // Player asks broad question
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');

    await playerPage.fill('textarea[placeholder*="question"]', 'Tell me about everything in the campaign');
    await playerPage.click('button:has-text("Send")');

    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Should have multiple citations
    const citations = playerPage.locator('.citation-link');
    const count = await citations.count();

    expect(count).toBeGreaterThan(1);

    // Each citation should be clickable
    for (let i = 0; i < count; i++) {
      const citation = citations.nth(i);
      await expect(citation).toBeVisible();

      const citationText = await citation.textContent();
      expect(citationText).toMatch(/\[\d+\]/); // Should have [number] format
    }

    await playerPage.close();
  });

  test('should navigate back to portal after viewing card', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify and ask question
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');

    await playerPage.fill('textarea[placeholder*="question"]', 'What do you know?');
    await playerPage.click('button:has-text("Send")');

    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Click citation to navigate to card
    const firstCitation = playerPage.locator('.citation-link').first();
    await firstCitation.click();

    await expect(playerPage).toHaveURL(/\/cards\/.+/);

    // Navigate back using browser back button
    await playerPage.goBack();

    // Should return to portal with conversation history intact
    await expect(playerPage.locator('text=Ask a question')).toBeVisible();
    await expect(playerPage.locator('text=What do you know?')).toBeVisible();

    await playerPage.close();
  });

  test('should display citation tooltip with card title', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify and ask question
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');

    await playerPage.fill('textarea[placeholder*="question"]', 'Tell me about the forest');
    await playerPage.click('button:has-text("Send")');

    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Check citation has tooltip
    const firstCitation = playerPage.locator('.citation-link').first();
    const title = await firstCitation.getAttribute('title');

    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(0);

    await playerPage.close();
  });
});
