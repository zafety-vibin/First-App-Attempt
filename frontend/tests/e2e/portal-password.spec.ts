/**
 * E2E Test: Password Protection Flow
 * Feature 009: Player Question Portal
 * T055: Player enters correct password → access granted, wrong password → denied
 */

import { test, expect } from '@playwright/test';

test.describe('Player Portal - Password Protection', () => {
  const campaignId = 'test-campaign-password-' + Date.now();
  const portalPassword = 'secret-password-123';
  const characterName = 'Aragorn';

  test.beforeEach(async ({ page }) => {
    // Login as GM
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.waitForURL(/keycloak/);
    await page.fill('input[name="username"]', 'testgm@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('input[type="submit"]');
    await page.waitForURL('http://localhost:3000');

    // Navigate to portal management
    await page.goto(`http://localhost:3000/campaigns/${campaignId}/portal/management`);

    // Enable portal
    await page.click('button:has-text("Enable Portal")');
    await expect(page.locator('text=Portal Enabled')).toBeVisible();

    // Set password
    await page.fill('input[placeholder*="password"]', portalPassword);
    await page.click('button:has-text("Set Password")');
    await expect(page.locator('text=Password Set')).toBeVisible();
  });

  test('should deny access with wrong password', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Password prompt should appear
    await expect(playerPage.locator('text=Enter Password')).toBeVisible();

    // Enter wrong password
    await playerPage.fill('input[type="password"]', 'wrong-password');
    await playerPage.click('button:has-text("Submit")');

    // Error message should appear
    await expect(playerPage.locator('text=Incorrect password')).toBeVisible({ timeout: 5000 });

    // Should NOT see identity prompt
    await expect(playerPage.locator('text=Who are you in-game?')).not.toBeVisible();

    await playerPage.close();
  });

  test('should grant access with correct password', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Password prompt should appear
    await expect(playerPage.locator('text=Enter Password')).toBeVisible();

    // Enter correct password
    await playerPage.fill('input[type="password"]', portalPassword);
    await playerPage.click('button:has-text("Submit")');

    // Should proceed to identity prompt
    await expect(playerPage.locator('text=Who are you in-game?')).toBeVisible({ timeout: 5000 });

    // Should NOT see password prompt anymore
    await expect(playerPage.locator('text=Enter Password')).not.toBeVisible();

    await playerPage.close();
  });

  test('should remember password after page refresh', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Enter correct password
    await playerPage.fill('input[type="password"]', portalPassword);
    await playerPage.click('button:has-text("Submit")');
    await expect(playerPage.locator('text=Who are you in-game?')).toBeVisible();

    // Refresh page
    await playerPage.reload();

    // Should NOT see password prompt again
    await expect(playerPage.locator('text=Enter Password')).not.toBeVisible();
    await expect(playerPage.locator('text=Who are you in-game?')).toBeVisible();

    await playerPage.close();
  });

  test('should complete full flow with password protection', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Step 1: Enter password
    await playerPage.fill('input[type="password"]', portalPassword);
    await playerPage.click('button:has-text("Submit")');

    // Step 2: Identify player
    await playerPage.waitForSelector('text=Who are you in-game?');
    await playerPage.fill('input[placeholder*="character name"]', characterName);
    await playerPage.click('button:has-text("Continue")');

    // Step 3: Access chat interface
    await expect(playerPage.locator('text=Ask a question')).toBeVisible();

    // Step 4: Ask question
    await playerPage.fill('textarea[placeholder*="question"]', 'What is the capital city?');
    await playerPage.click('button:has-text("Send")');

    // Step 5: Receive response
    await expect(playerPage.locator('.portal-message')).toBeVisible({ timeout: 30000 });

    await playerPage.close();
  });

  test('should allow GM to remove password protection', async ({ page, context }) => {
    // GM removes password
    await page.goto(`http://localhost:3000/campaigns/${campaignId}/portal/management`);
    await page.click('button:has-text("Remove Password")');
    await expect(page.locator('text=Password Removed')).toBeVisible();

    // Player should NOT see password prompt
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Should go directly to identity prompt
    await expect(playerPage.locator('text=Who are you in-game?')).toBeVisible();
    await expect(playerPage.locator('text=Enter Password')).not.toBeVisible();

    await playerPage.close();
  });

  test('should reject empty password', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Try to submit without password
    const submitButton = playerPage.locator('button:has-text("Submit")');

    // Button should be disabled or form validation prevents submission
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(true);

    await playerPage.close();
  });

  test('should handle multiple failed password attempts', async ({ context }) => {
    const playerPage = await context.newPage();
    await playerPage.goto(`http://localhost:3000/portal/${campaignId}`);

    // Attempt 1
    await playerPage.fill('input[type="password"]', 'wrong1');
    await playerPage.click('button:has-text("Submit")');
    await expect(playerPage.locator('text=Incorrect password')).toBeVisible();

    // Attempt 2
    await playerPage.fill('input[type="password"]', 'wrong2');
    await playerPage.click('button:has-text("Submit")');
    await expect(playerPage.locator('text=Incorrect password')).toBeVisible();

    // Attempt 3 - correct password
    await playerPage.fill('input[type="password"]', portalPassword);
    await playerPage.click('button:has-text("Submit")');
    await expect(playerPage.locator('text=Who are you in-game?')).toBeVisible();

    await playerPage.close();
  });
});
