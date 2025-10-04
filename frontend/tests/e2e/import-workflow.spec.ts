/**
 * E2E Test: Import Workflow
 * Task: T072
 * References:
 * - specs/005-create-the-ai/plan.md
 * - specs/005-create-the-ai/research.md
 *
 * Test the complete import workflow from file upload to approval and revert
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Import AI Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to a campaign
    await page.goto('http://localhost:3000');

    // Mock authentication - in real tests this would use actual login
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      }));
    });

    // Navigate to campaign page
    await page.goto('http://localhost:3000/campaigns/test-campaign-123');
    await page.waitForLoadState('networkidle');
  });

  test('complete import workflow: upload → extract → approve → verify', async ({ page }) => {
    // Step 1: Open Import AI tab
    await page.click('button:has-text("Import AI")');
    await expect(page.locator('[data-testid="import-tab"]')).toBeVisible();

    // Step 2: Start import session
    await page.click('button:has-text("Start Import Session")');
    await expect(page.locator('text=Import session created')).toBeVisible();

    // Step 3: Upload a test file
    const fileInput = page.locator('input[type="file"]');
    const testFilePath = path.join(__dirname, 'fixtures', 'test-session-recap.pdf');
    await fileInput.setInputFiles(testFilePath);

    // Wait for file processing
    await expect(page.locator('text=File processed successfully')).toBeVisible({ timeout: 10000 });

    // Step 4: Verify approval summary appears
    await expect(page.locator('[data-testid="approval-summary"]')).toBeVisible();
    await expect(page.locator('text=Entities to Import')).toBeVisible();

    // Check for deduplicated entities
    const entityCards = page.locator('[data-testid="entity-card"]');
    await expect(entityCards).toHaveCount(3); // Assuming test file has 3 entities

    // Step 5: Chat with AI about the entities
    const chatInput = page.locator('input[placeholder*="Ask about the imported content"]');
    await chatInput.fill('What characters did you find?');
    await page.keyboard.press('Enter');

    // Wait for streaming response
    await expect(page.locator('[data-testid="assistant-message"]').last()).toContainText('found', { timeout: 10000 });

    // Step 6: Approve the import
    await page.click('button:has-text("Approve Import")');

    // Wait for approval confirmation
    await expect(page.locator('text=Import approved!')).toBeVisible();
    await expect(page.locator('button:has-text("Revert Import")')).toBeVisible();

    // Step 7: Verify cards were created (navigate to cards)
    await page.keyboard.press('Escape'); // Close the import tab
    await page.click('button:has-text("Cards")');

    // Check that new cards exist
    await expect(page.locator('[data-testid="card-tree"]')).toContainText('Test Character 1');
  });

  test('batch revert functionality', async ({ page }) => {
    // Setup: Complete an import first
    await page.click('button:has-text("Import AI")');
    await page.click('button:has-text("Start Import Session")');

    const fileInput = page.locator('input[type="file"]');
    const testFilePath = path.join(__dirname, 'fixtures', 'test-session-recap.pdf');
    await fileInput.setInputFiles(testFilePath);

    await expect(page.locator('[data-testid="approval-summary"]')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Approve Import")');
    await expect(page.locator('button:has-text("Revert Import")')).toBeVisible();

    // Get the number of cards before revert
    await page.keyboard.press('Escape');
    await page.click('button:has-text("Cards")');
    const cardsBefore = await page.locator('[data-testid="card-item"]').count();

    // Go back and revert
    await page.click('button:has-text("Import AI")');
    await page.click('button:has-text("Revert Import")');

    // Confirm revert dialog
    await page.click('button:has-text("Yes, Revert")');

    // Wait for revert confirmation
    await expect(page.locator('text=Import batch reverted successfully')).toBeVisible();

    // Verify cards were removed
    await page.keyboard.press('Escape');
    await page.click('button:has-text("Cards")');
    const cardsAfter = await page.locator('[data-testid="card-item"]').count();

    expect(cardsAfter).toBeLessThan(cardsBefore);
  });

  test('duplicate detection during import', async ({ page }) => {
    // First import
    await page.click('button:has-text("Import AI")');
    await page.click('button:has-text("Start Import Session")');

    const fileInput = page.locator('input[type="file"]');
    const testFilePath = path.join(__dirname, 'fixtures', 'test-session-recap.pdf');
    await fileInput.setInputFiles(testFilePath);

    await expect(page.locator('[data-testid="approval-summary"]')).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Approve Import")');
    await expect(page.locator('text=Import approved!')).toBeVisible();

    // Start new session and upload same file
    await page.click('button:has-text("Start Import Session")');
    await fileInput.setInputFiles(testFilePath);

    // Check for duplicate markers
    await expect(page.locator('[data-testid="approval-summary"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="duplicate-badge"]')).toBeVisible();
    await expect(page.locator('text=Duplicate')).toHaveCount(3); // All entities should be marked as duplicates
  });

  test('file type validation', async ({ page }) => {
    await page.click('button:has-text("Import AI")');
    await page.click('button:has-text("Start Import Session")');

    const fileInput = page.locator('input[type="file"]');

    // Try uploading an invalid file type
    const invalidFilePath = path.join(__dirname, 'fixtures', 'invalid.exe');
    await fileInput.setInputFiles(invalidFilePath);

    // Should show error message
    await expect(page.locator('text=Unsupported file type')).toBeVisible();
  });

  test('keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+I to open Import AI
    await page.keyboard.press('Control+i');
    await expect(page.locator('[data-testid="import-tab"]')).toBeVisible();

    // Test ESC to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="import-tab"]')).not.toBeVisible();
  });

  test('import session persistence', async ({ page }) => {
    // Start a session
    await page.click('button:has-text("Import AI")');
    await page.click('button:has-text("Start Import Session")');

    // Add some chat messages
    const chatInput = page.locator('input[placeholder*="Ask about the imported content"]');
    await chatInput.fill('Test message');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Test message')).toBeVisible();

    // Close tab
    await page.keyboard.press('Escape');

    // Reopen - should restore session
    await page.click('button:has-text("Import AI")');

    // Messages should still be there
    await expect(page.locator('text=Test message')).toBeVisible();
  });

  test('streaming response handling', async ({ page }) => {
    await page.click('button:has-text("Import AI")');
    await page.click('button:has-text("Start Import Session")');

    // Send a message
    const chatInput = page.locator('input[placeholder*="Ask about the imported content"]');
    await chatInput.fill('Explain the entities in detail');
    await page.keyboard.press('Enter');

    // Check that streaming indicator appears
    await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible();

    // Input should be disabled during streaming
    await expect(chatInput).toBeDisabled();

    // Wait for streaming to complete
    await expect(page.locator('[data-testid="streaming-indicator"]')).not.toBeVisible({ timeout: 15000 });

    // Input should be re-enabled
    await expect(chatInput).toBeEnabled();
  });

  test('error handling and recovery', async ({ page }) => {
    // Simulate network error by going offline
    await page.context().setOffline(true);

    await page.click('button:has-text("Import AI")');
    await page.click('button:has-text("Start Import Session")');

    // Should show error message
    await expect(page.locator('text=Failed to create import session')).toBeVisible();

    // Go back online
    await page.context().setOffline(false);

    // Retry should work
    await page.click('button:has-text("Start Import Session")');
    await expect(page.locator('text=Import session created')).toBeVisible();
  });
});