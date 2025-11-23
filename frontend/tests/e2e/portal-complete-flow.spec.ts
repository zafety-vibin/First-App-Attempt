/**
 * E2E Test: Complete Portal Flow
 * Feature 009: Player Question Portal
 * T054: GM enables → player identifies → asks question → receives AI response with citations
 */

import { test, expect } from '@playwright/test';

test.describe('Player Portal - Complete Flow', () => {
  const campaignId = 'test-campaign-' + Date.now();
  const characterName = 'Gandalf the Grey';
  const testQuestion = 'What happened in the last session?';

  test.beforeEach(async ({ page }) => {
    // Login as GM
    await page.goto('http://localhost:3000');
    await page.click('text=Login');

    // Wait for Keycloak login page
    await page.waitForURL(/keycloak/);

    // Enter credentials (assuming test user exists)
    await page.fill('input[name="username"]', 'testgm@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('input[type="submit"]');

    // Wait for redirect back to app
    await page.waitForURL('http://localhost:3000');

    // Create test campaign if needed
    await page.goto('http://localhost:3000/campaigns');
    const createButton = page.locator('text=Create Campaign');
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.fill('input[name="name"]', `Test Campaign ${campaignId}`);
      await page.click('button:has-text("Create")');
      await page.waitForURL(/\/campaigns\/.+/);
    }
  });

  test('should complete full portal flow from enable to player Q&A', async ({ page, context }) => {
    // Step 1: GM enables portal
    await page.goto(`http://localhost:3000/campaigns/${campaignId}/portal/management`);

    await page.waitForSelector('text=Portal Settings');
    await page.click('button:has-text("Enable Portal")');

    // Wait for enable confirmation
    await expect(page.locator('text=Portal Enabled')).toBeVisible();

    // Step 2: Get public portal URL
    const portalUrl = `http://localhost:3000/portal/${campaignId}`;

    // Step 3: Open player portal in new context (simulating different user)
    const playerPage = await context.newPage();
    await playerPage.goto(portalUrl);

    // Step 4: Player identifies
    await playerPage.waitForSelector('text=Who are you in-game?');
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');

    // Step 5: Player sees chat interface
    await expect(playerPage.locator('text=Ask a question')).toBeVisible();

    // Step 6: Player asks question
    await playerPage.fill('textarea[placeholder*="question"]', testQuestion);
    await playerPage.click('button:has-text("Send")');

    // Step 7: Wait for AI response (may take several seconds)
    await expect(playerPage.locator('text=Thinking...')).toBeVisible({ timeout: 2000 });
    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Step 8: Verify response contains content
    const responseText = await playerPage.locator('.portal-response').first().textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10);

    // Step 9: Verify citations are present
    const citations = playerPage.locator('.citation-link');
    const citationCount = await citations.count();
    expect(citationCount).toBeGreaterThan(0);

    // Step 10: GM can see player activity in monitoring
    await page.goto(`http://localhost:3000/campaigns/${campaignId}/portal/management`);
    await page.click('text=Monitoring');

    await page.waitForSelector('text=Token Usage by Player');
    await expect(page.locator(`text=${characterName}`)).toBeVisible();

    // Step 11: Verify token count is displayed
    const tokenUsage = page.locator('td:has-text("tokens")');
    await expect(tokenUsage).toBeVisible();

    // Cleanup
    await playerPage.close();
  });

  test('should persist player session across page refreshes', async ({ page, context }) => {
    // Enable portal
    await page.goto(`http://localhost:3000/campaigns/${campaignId}/portal/management`);
    await page.click('button:has-text("Enable Portal")');
    await expect(page.locator('text=Portal Enabled')).toBeVisible();

    // Open player portal
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Identify player
    await playerPage.fill('input[placeholder*="character name"]', characterName + '2');
    await playerPage.click('button:has-text("Continue")');
    await expect(playerPage.locator('text=Ask a question')).toBeVisible();

    // Ask first question
    await playerPage.fill('textarea[placeholder*="question"]', 'Test question 1');
    await playerPage.click('button:has-text("Send")');
    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    // Refresh page
    await playerPage.reload();

    // Should still be identified (no identity prompt)
    await expect(playerPage.locator('text=Ask a question')).toBeVisible();
    await expect(playerPage.locator('text=Who are you in-game?')).not.toBeVisible();

    // Conversation history should be loaded
    await expect(playerPage.locator('text=Test question 1')).toBeVisible();

    await playerPage.close();
  });

  test('should show warning about GM credentials', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Warning should be visible
    await expect(
      playerPage.locator('text=This portal uses your GM\'s AI credentials')
    ).toBeVisible();

    await playerPage.close();
  });
});
